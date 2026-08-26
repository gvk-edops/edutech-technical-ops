import con from "../config/db.config.js";

const makeInvoiceNo = (purchaseId) =>
  `PUR-${String(purchaseId).padStart(6, "0")}`;

const parseSerialNumbers = (serialNumbers) => {
  if (Array.isArray(serialNumbers)) {
    return serialNumbers.map((serial) => String(serial).trim()).filter(Boolean);
  }

  if (typeof serialNumbers === "string") {
    return serialNumbers
      .split(/\r?\n/)
      .map((serial) => serial.trim())
      .filter(Boolean);
  }

  return [];
};

const buildPurchaseItems = async (conn, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one purchase item is required");
  }

  let totalAmount = 0;
  const normalizedItems = [];

  for (const item of items) {
    const productId = Number(item.product_id);
    const quantity = Number(item.quantity);
    const costPrice = Number(item.cost_price);
    const variantId = item.variant_id ? Number(item.variant_id) : null;
    const serialNumbers = parseSerialNumbers(item.serial_numbers);

    if (!productId) throw new Error("Each item requires a product");
    if (Number.isNaN(costPrice) || costPrice < 0)
      throw new Error("Each item cost price must be valid");

    const [[product]] = await conn.query(
      "SELECT id, is_serialized FROM products WHERE id = ?",
      [productId],
    );
    if (!product) throw new Error(`Product not found for item ${productId}`);

    const normalizedQuantity = product.is_serialized
      ? serialNumbers.length
      : quantity;

    if (!normalizedQuantity || normalizedQuantity <= 0) {
      throw new Error(
        product.is_serialized
          ? `Item ${productId}: serial numbers are required`
          : "Each item quantity must be greater than zero",
      );
    }

    if (product.is_serialized && serialNumbers.length !== normalizedQuantity) {
      throw new Error(`Item ${productId}: serial count must match quantity`);
    }

    if (product.is_serialized && serialNumbers.length === 0) {
      throw new Error(`Item ${productId}: serial numbers are required`);
    }

    if (variantId) {
      const [[variant]] = await conn.query(
        "SELECT id FROM product_variants WHERE id = ? AND product_id = ?",
        [variantId, productId],
      );
      if (!variant) throw new Error(`Variant not found for item ${productId}`);
    }

    const subtotal = normalizedQuantity * costPrice;
    totalAmount += subtotal;
    normalizedItems.push({
      productId,
      variantId,
      quantity: normalizedQuantity,
      costPrice,
      subtotal,
      serialNumbers: product.is_serialized ? serialNumbers : [],
      isSerialized: !!product.is_serialized,
    });
  }

  return { totalAmount, normalizedItems };
};

const adjustPurchaseStock = async (
  conn,
  items,
  direction,
  purchaseId,
  note,
) => {
  for (const item of items) {
    const quantityDelta = item.quantity * direction;

    if (item.variantId) {
      const [variantUpdate] = await conn.query(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity + ?
         WHERE id = ? AND product_id = ?`,
        [quantityDelta, item.variantId, item.productId],
      );
      if (variantUpdate.affectedRows === 0) {
        throw new Error("Variant stock update failed");
      }
    } else {
      const [productUpdate] = await conn.query(
        `UPDATE products
         SET stock_quantity = stock_quantity + ?
         WHERE id = ?`,
        [quantityDelta, item.productId],
      );
      if (productUpdate.affectedRows === 0) {
        throw new Error("Product stock update failed");
      }
    }

    await conn.query(
      `INSERT INTO stock_movements (product_id, variant_id, movement_type, quantity, reference_id, reference_type, notes)
       VALUES (?, ?, 'adjustment', ?, ?, 'adjustment', ?)`,
      [item.productId, item.variantId, quantityDelta, purchaseId, note],
    );
  }
};

const getPurchaseItemsByPurchaseId = async (conn, purchaseId) => {
  const [items] = await conn.query(
    `SELECT pi.id, pi.product_id, p.name AS product_name, p.sku AS product_sku,
            p.is_serialized, pi.variant_id, v.variant_name, pi.quantity, pi.cost_price, pi.subtotal
     FROM purchase_items pi
     LEFT JOIN products p ON p.id = pi.product_id
     LEFT JOIN product_variants v ON v.id = pi.variant_id
     WHERE pi.purchase_id = ?
     ORDER BY pi.id`,
    [purchaseId],
  );

  if (items.length === 0) {
    return [];
  }

  const [serialRows] = await conn.query(
    `SELECT purchase_item_id, serial_number
     FROM product_serials
     WHERE purchase_item_id IN (?)
     ORDER BY id`,
    [items.map((item) => item.id)],
  );

  const serialMap = new Map();
  for (const row of serialRows) {
    if (!serialMap.has(row.purchase_item_id)) {
      serialMap.set(row.purchase_item_id, []);
    }
    serialMap.get(row.purchase_item_id).push(row.serial_number);
  }

  return items.map((item) => ({
    ...item,
    serial_numbers: serialMap.get(item.id) || [],
  }));
};

export const getPurchases = async (req, res) => {
  try {
    const [rows] = await con.query(`
      SELECT p.id, p.invoice_no, p.purchase_date, p.total_amount, p.status, p.created_at,
             s.name AS supplier_name,
             COUNT(pi.id) AS item_count
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN purchase_items pi ON pi.purchase_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const [[purchase]] = await con.query(
      `SELECT p.id, p.supplier_id, s.name AS supplier_name, p.invoice_no, p.purchase_date,
              p.total_amount, p.status, p.created_at
       FROM purchases p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = ?`,
      [req.params.id],
    );

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, error: "Purchase not found" });
    }

    const items = await getPurchaseItemsByPurchaseId(con, req.params.id);
    res.json({ success: true, data: { ...purchase, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createPurchase = async (req, res) => {
  const { supplier_id, purchase_date, items } = req.body;

  if (!supplier_id) {
    return res
      .status(400)
      .json({ success: false, error: "Supplier is required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: "At least one purchase item is required",
    });
  }

  const conn = await con.getConnection();

  try {
    await conn.beginTransaction();

    const [[supplier]] = await conn.query(
      "SELECT id FROM suppliers WHERE id = ?",
      [supplier_id],
    );
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const { totalAmount, normalizedItems } = await buildPurchaseItems(
      conn,
      items,
    );

    const [purchaseResult] = await conn.query(
      `INSERT INTO purchases (supplier_id, invoice_no, total_amount, purchase_date, created_by)
       VALUES (?, ?, ?, ?, NULL)`,
      [supplier_id, null, totalAmount, purchase_date || null],
    );

    const purchaseId = purchaseResult.insertId;
    const invoiceNo = makeInvoiceNo(purchaseId);

    await conn.query("UPDATE purchases SET invoice_no = ? WHERE id = ?", [
      invoiceNo,
      purchaseId,
    ]);

    await adjustPurchaseStock(
      conn,
      normalizedItems,
      1,
      purchaseId,
      "Purchase stock receipt",
    );

    for (const item of normalizedItems) {
      const [purchaseItemResult] = await conn.query(
        `INSERT INTO purchase_items (purchase_id, product_id, variant_id, quantity, cost_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          purchaseId,
          item.productId,
          item.variantId,
          item.quantity,
          item.costPrice,
          item.subtotal,
        ],
      );

      if (item.isSerialized) {
        for (const serialNumber of item.serialNumbers) {
          await conn.query(
            `INSERT INTO product_serials (product_id, variant_id, serial_number, purchase_item_id, status)
             VALUES (?, ?, ?, ?, 'in_stock')`,
            [
              item.productId,
              item.variantId,
              serialNumber,
              purchaseItemResult.insertId,
            ],
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, id: purchaseId, invoice_no: invoiceNo });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

export const updatePurchase = async (req, res) => {
  const { supplier_id, purchase_date, items } = req.body;
  const purchaseId = req.params.id;
  const conn = await con.getConnection();

  try {
    await conn.beginTransaction();

    const [[purchase]] = await conn.query(
      "SELECT id, status FROM purchases WHERE id = ?",
      [purchaseId],
    );

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, error: "Purchase not found" });
    }

    if (purchase.status === "canceled") {
      return res
        .status(400)
        .json({ success: false, error: "Canceled purchases cannot be edited" });
    }

    const [[supplier]] = await conn.query(
      "SELECT id FROM suppliers WHERE id = ?",
      [supplier_id],
    );
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    const oldItems = await getPurchaseItemsByPurchaseId(conn, purchaseId);

    const [oldPurchaseItemIds] = await conn.query(
      "SELECT id FROM purchase_items WHERE purchase_id = ?",
      [purchaseId],
    );
    const { totalAmount, normalizedItems } = await buildPurchaseItems(
      conn,
      items,
    );

    await adjustPurchaseStock(
      conn,
      oldItems.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      })),
      -1,
      purchaseId,
      "Purchase edit reversal",
    );

    if (oldPurchaseItemIds.length > 0) {
      await conn.query(
        "DELETE FROM product_serials WHERE purchase_item_id IN (?)",
        [oldPurchaseItemIds.map((item) => item.id)],
      );
    }

    await conn.query("DELETE FROM purchase_items WHERE purchase_id = ?", [
      purchaseId,
    ]);

    await conn.query(
      `UPDATE purchases
       SET supplier_id = ?, purchase_date = ?, total_amount = ?, status = 'active'
       WHERE id = ?`,
      [supplier_id, purchase_date || null, totalAmount, purchaseId],
    );

    await adjustPurchaseStock(
      conn,
      normalizedItems,
      1,
      purchaseId,
      "Purchase edit stock update",
    );

    for (const item of normalizedItems) {
      const [purchaseItemResult] = await conn.query(
        `INSERT INTO purchase_items (purchase_id, product_id, variant_id, quantity, cost_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          purchaseId,
          item.productId,
          item.variantId,
          item.quantity,
          item.costPrice,
          item.subtotal,
        ],
      );

      if (item.isSerialized) {
        for (const serialNumber of item.serialNumbers) {
          await conn.query(
            `INSERT INTO product_serials (product_id, variant_id, serial_number, purchase_item_id, status)
             VALUES (?, ?, ?, ?, 'in_stock')`,
            [
              item.productId,
              item.variantId,
              serialNumber,
              purchaseItemResult.insertId,
            ],
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(err.message === "Purchase not found" ? 404 : 400).json({
      success: false,
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

export const cancelPurchase = async (req, res) => {
  const purchaseId = req.params.id;
  const conn = await con.getConnection();

  try {
    await conn.beginTransaction();

    const [[purchase]] = await conn.query(
      "SELECT id, status FROM purchases WHERE id = ?",
      [purchaseId],
    );

    if (!purchase) {
      return res
        .status(404)
        .json({ success: false, error: "Purchase not found" });
    }

    if (purchase.status === "canceled") {
      return res
        .status(400)
        .json({ success: false, error: "Purchase is already canceled" });
    }

    const oldItems = await getPurchaseItemsByPurchaseId(conn, purchaseId);

    const [oldPurchaseItemIds] = await conn.query(
      "SELECT id FROM purchase_items WHERE purchase_id = ?",
      [purchaseId],
    );

    await adjustPurchaseStock(
      conn,
      oldItems.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      })),
      -1,
      purchaseId,
      "Purchase canceled",
    );

    if (oldPurchaseItemIds.length > 0) {
      await conn.query(
        "DELETE FROM product_serials WHERE purchase_item_id IN (?)",
        [oldPurchaseItemIds.map((item) => item.id)],
      );
    }

    await conn.query("UPDATE purchases SET status = 'canceled' WHERE id = ?", [
      purchaseId,
    ]);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(err.message === "Purchase not found" ? 404 : 400).json({
      success: false,
      error: err.message,
    });
  } finally {
    conn.release();
  }
};
