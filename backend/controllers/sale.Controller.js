import con from "../config/db.config.js";

const makeInvoiceNo = (saleId) => `SAL-${String(saleId).padStart(6, "0")}`;

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

const getSaleItemsBySaleId = async (conn, saleId) => {
  const [items] = await conn.query(
    `SELECT si.id, si.product_id, p.name AS product_name, p.sku AS product_sku,
            p.is_serialized, si.variant_id, v.variant_name, si.quantity,
            si.unit_price, si.subtotal
     FROM sale_items si
     LEFT JOIN products p ON p.id = si.product_id
     LEFT JOIN product_variants v ON v.id = si.variant_id
     WHERE si.sale_id = ?
     ORDER BY si.id`,
    [saleId],
  );

  if (items.length === 0) {
    return [];
  }

  const [serialRows] = await conn.query(
    `SELECT sale_item_id, serial_number
     FROM product_serials
     WHERE sale_item_id IN (?)
     ORDER BY id`,
    [items.map((item) => item.id)],
  );

  const serialMap = new Map();
  for (const row of serialRows) {
    if (!serialMap.has(row.sale_item_id)) {
      serialMap.set(row.sale_item_id, []);
    }
    serialMap.get(row.sale_item_id).push(row.serial_number);
  }

  return items.map((item) => ({
    ...item,
    serial_numbers: serialMap.get(item.id) || [],
  }));
};

const restoreSaleStock = async (conn, items, saleId, note) => {
  for (const item of items) {
    const quantityDelta = Math.abs(item.quantity);

    if (item.variantId) {
      const [variantUpdate] = await conn.query(
        `UPDATE product_variants
         SET stock_quantity = stock_quantity + ?
         WHERE id = ? AND product_id = ?`,
        [quantityDelta, item.variantId, item.productId],
      );
      if (variantUpdate.affectedRows === 0) {
        throw new Error("Variant stock restore failed");
      }
    } else {
      const [productUpdate] = await conn.query(
        `UPDATE products
         SET stock_quantity = stock_quantity + ?
         WHERE id = ?`,
        [quantityDelta, item.productId],
      );
      if (productUpdate.affectedRows === 0) {
        throw new Error("Product stock restore failed");
      }
    }

    await conn.query(
      `INSERT INTO stock_movements (
        product_id, variant_id, movement_type, quantity, reference_id, reference_type, notes
      ) VALUES (?, ?, 'return', ?, ?, 'return', ?)`,
      [item.productId, item.variantId, quantityDelta, saleId, note],
    );
  }
};

const releaseSaleSerials = async (conn, saleItemIds) => {
  if (!saleItemIds.length) {
    return;
  }

  const [serialRows] = await conn.query(
    `SELECT id FROM product_serials WHERE sale_item_id IN (?)`,
    [saleItemIds],
  );

  if (serialRows.length > 0) {
    await conn.query(
      `UPDATE product_serials
       SET sale_item_id = NULL, status = 'in_stock'
       WHERE sale_item_id IN (?)`,
      [saleItemIds],
    );
  }
};

const adjustSaleStock = async (conn, items, saleId, note) => {
  for (const item of items) {
    const quantityDelta = -Math.abs(item.quantity);

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
      `INSERT INTO stock_movements (
        product_id, variant_id, movement_type, quantity, reference_id, reference_type, notes
      ) VALUES (?, ?, 'sale', ?, ?, 'sale', ?)`,
      [item.productId, item.variantId, quantityDelta, saleId, note],
    );
  }
};

const normalizeSaleItems = async (conn, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one sale item is required");
  }

  let totalAmount = 0;
  const normalizedItems = [];
  const usedSerialNumbers = new Set();

  for (const item of items) {
    const productId = Number(item.product_id);
    const requestedQuantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const variantId = item.variant_id ? Number(item.variant_id) : null;
    const serialNumbers = parseSerialNumbers(item.serial_numbers);

    if (!productId) throw new Error("Each item requires a product");
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error("Each item unit price must be valid");
    }

    const [[product]] = await conn.query(
      "SELECT id, is_serialized FROM products WHERE id = ?",
      [productId],
    );
    if (!product) throw new Error(`Product not found for item ${productId}`);

    if (variantId) {
      const [[variant]] = await conn.query(
        "SELECT id, additional_price FROM product_variants WHERE id = ? AND product_id = ?",
        [variantId, productId],
      );
      if (!variant) throw new Error(`Variant not found for item ${productId}`);
    }

    let quantity = requestedQuantity;
    if (product.is_serialized) {
      if (serialNumbers.length === 0) {
        throw new Error(`Item ${productId}: serial numbers are required`);
      }
      const uniqueSerials = new Set(serialNumbers);
      if (uniqueSerials.size !== serialNumbers.length) {
        throw new Error(`Item ${productId}: serial numbers must be unique`);
      }
      for (const serialNumber of serialNumbers) {
        if (usedSerialNumbers.has(serialNumber)) {
          throw new Error(
            `Item ${productId}: serial ${serialNumber} is duplicated in this sale`,
          );
        }
        usedSerialNumbers.add(serialNumber);
      }
      quantity = serialNumbers.length;
    }

    if (!quantity || quantity <= 0) {
      throw new Error("Each item quantity must be greater than zero");
    }

    totalAmount += quantity * unitPrice;
    normalizedItems.push({
      productId,
      variantId,
      quantity,
      unitPrice,
      subtotal: quantity * unitPrice,
      serialNumbers: product.is_serialized ? serialNumbers : [],
      isSerialized: !!product.is_serialized,
    });
  }

  return { totalAmount, normalizedItems };
};

export const getSales = async (req, res) => {
  try {
    const [rows] = await con.query(
      `SELECT s.id, s.invoice_no, s.sale_date, s.total_amount, s.discount,
              s.final_amount, s.payment_method, s.status,
              COALESCE(c.name, 'Walk-in') AS customer_name,
              COUNT(si.id) AS item_count
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       GROUP BY s.id
       ORDER BY s.sale_date DESC`,
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const [[sale]] = await con.query(
      `SELECT s.id, s.customer_id, c.name AS customer_name, s.invoice_no,
              s.sale_date, s.total_amount, s.discount, s.final_amount,
              s.payment_method, s.sold_by, s.status
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?`,
      [req.params.id],
    );

    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    const items = await getSaleItemsBySaleId(con, req.params.id);
    res.json({ success: true, data: { ...sale, items } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAvailableSerials = async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const variantId = req.query.variant_id
      ? Number(req.query.variant_id)
      : null;
    const search = String(req.query.search || "").trim();

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, error: "Product is required" });
    }

    const [rows] = await con.query(
      `SELECT id, serial_number
       FROM product_serials
       WHERE product_id = ?
         AND variant_id <=> ?
         AND status = 'in_stock'
         AND (? = '' OR serial_number LIKE CONCAT('%', ?, '%'))
       ORDER BY created_at, id`,
      [productId, variantId, search, search],
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createSale = async (req, res) => {
  const {
    customer_id,
    payment_method,
    discount = 0,
    sale_date,
    items,
  } = req.body;
  const conn = await con.getConnection();

  try {
    await conn.beginTransaction();

    if (customer_id) {
      const [[customer]] = await conn.query(
        "SELECT id FROM customers WHERE id = ?",
        [customer_id],
      );
      if (!customer) {
        throw new Error("Customer not found");
      }
    }

    const { totalAmount, normalizedItems } = await normalizeSaleItems(
      conn,
      items,
    );
    const discountValue = Number(discount) || 0;
    const finalAmount = Math.max(totalAmount - discountValue, 0);

    const [saleResult] = await conn.query(
      `INSERT INTO sales (customer_id, invoice_no, total_amount, discount, final_amount, payment_method, sold_by, sale_date, status)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 'active')`,
      [
        customer_id || null,
        null,
        totalAmount,
        discountValue,
        finalAmount,
        payment_method || "cash",
        sale_date || null,
      ],
    );

    const saleId = saleResult.insertId;
    const invoiceNo = makeInvoiceNo(saleId);

    await conn.query("UPDATE sales SET invoice_no = ? WHERE id = ?", [
      invoiceNo,
      saleId,
    ]);

    for (const item of normalizedItems) {
      if (item.isSerialized) {
        const [serialRows] = await conn.query(
          `SELECT id, serial_number
           FROM product_serials
           WHERE product_id = ?
             AND variant_id <=> ?
             AND serial_number IN (?)
             AND status = 'in_stock'
           FOR UPDATE`,
          [item.productId, item.variantId, item.serialNumbers],
        );

        if (serialRows.length !== item.serialNumbers.length) {
          throw new Error(
            `Item ${item.productId}: one or more serial numbers are unavailable`,
          );
        }

        const serialIdMap = new Map(
          serialRows.map((row) => [row.serial_number, row.id]),
        );

        const [saleItemResult] = await conn.query(
          `INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.productId,
            item.variantId,
            item.quantity,
            item.unitPrice,
            item.subtotal,
          ],
        );

        for (const serialNumber of item.serialNumbers) {
          await conn.query(
            `UPDATE product_serials
             SET sale_item_id = ?, status = 'sold'
             WHERE id = ?`,
            [saleItemResult.insertId, serialIdMap.get(serialNumber)],
          );
        }

        await adjustSaleStock(conn, [item], saleId, "Sale stock reduction");
        continue;
      }

      const [saleItemResult] = await conn.query(
        `INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.productId,
          item.variantId,
          item.quantity,
          item.unitPrice,
          item.subtotal,
        ],
      );

      await adjustSaleStock(conn, [item], saleId, "Sale stock reduction");
    }

    await conn.commit();
    res.json({ success: true, id: saleId, invoice_no: invoiceNo });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

export const updateSale = async (req, res) => {
  const {
    customer_id,
    payment_method,
    discount = 0,
    sale_date,
    items,
  } = req.body;
  const saleId = req.params.id;
  const conn = await con.getConnection();

  try {
    await conn.beginTransaction();

    const [[sale]] = await conn.query(
      "SELECT id, status FROM sales WHERE id = ?",
      [saleId],
    );

    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    if (sale.status === "canceled") {
      return res
        .status(400)
        .json({ success: false, error: "Canceled sales cannot be edited" });
    }

    if (customer_id) {
      const [[customer]] = await conn.query(
        "SELECT id FROM customers WHERE id = ?",
        [customer_id],
      );
      if (!customer) {
        throw new Error("Customer not found");
      }
    }

    const oldItems = await getSaleItemsBySaleId(conn, saleId);
    const oldSaleItemIds = oldItems.map((item) => item.id);

    await restoreSaleStock(
      conn,
      oldItems.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      })),
      saleId,
      "Sale edit reversal",
    );

    await releaseSaleSerials(conn, oldSaleItemIds);
    await conn.query("DELETE FROM sale_items WHERE sale_id = ?", [saleId]);

    const { totalAmount, normalizedItems } = await normalizeSaleItems(
      conn,
      items,
    );
    const discountValue = Number(discount) || 0;
    const finalAmount = Math.max(totalAmount - discountValue, 0);

    await conn.query(
      `UPDATE sales
       SET customer_id = ?, total_amount = ?, discount = ?, final_amount = ?, payment_method = ?, sale_date = ?, status = 'active'
       WHERE id = ?`,
      [
        customer_id || null,
        totalAmount,
        discountValue,
        finalAmount,
        payment_method || "cash",
        sale_date || null,
        saleId,
      ],
    );

    for (const item of normalizedItems) {
      if (item.isSerialized) {
        const [serialRows] = await conn.query(
          `SELECT id, serial_number
           FROM product_serials
           WHERE product_id = ?
             AND variant_id <=> ?
             AND serial_number IN (?)
             AND status = 'in_stock'
           FOR UPDATE`,
          [item.productId, item.variantId, item.serialNumbers],
        );

        if (serialRows.length !== item.serialNumbers.length) {
          throw new Error(
            `Item ${item.productId}: one or more serial numbers are unavailable`,
          );
        }

        const serialIdMap = new Map(
          serialRows.map((row) => [row.serial_number, row.id]),
        );

        const [saleItemResult] = await conn.query(
          `INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            saleId,
            item.productId,
            item.variantId,
            item.quantity,
            item.unitPrice,
            item.subtotal,
          ],
        );

        for (const serialNumber of item.serialNumbers) {
          await conn.query(
            `UPDATE product_serials
             SET sale_item_id = ?, status = 'sold'
             WHERE id = ?`,
            [saleItemResult.insertId, serialIdMap.get(serialNumber)],
          );
        }

        await adjustSaleStock(
          conn,
          [item],
          saleId,
          "Sale edit stock reduction",
        );
        continue;
      }

      await conn.query(
        `INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.productId,
          item.variantId,
          item.quantity,
          item.unitPrice,
          item.subtotal,
        ],
      );

      await adjustSaleStock(conn, [item], saleId, "Sale edit stock reduction");
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res
      .status(err.message === "Sale not found" ? 404 : 400)
      .json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

export const cancelSale = async (req, res) => {
  const saleId = req.params.id;
  const conn = await con.getConnection();

  try {
    await conn.beginTransaction();

    const [[sale]] = await conn.query(
      "SELECT id, status FROM sales WHERE id = ?",
      [saleId],
    );

    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    if (sale.status === "canceled") {
      return res
        .status(400)
        .json({ success: false, error: "Sale is already canceled" });
    }

    const oldItems = await getSaleItemsBySaleId(conn, saleId);
    const oldSaleItemIds = oldItems.map((item) => item.id);

    await restoreSaleStock(
      conn,
      oldItems.map((item) => ({
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
      })),
      saleId,
      "Sale canceled",
    );

    await releaseSaleSerials(conn, oldSaleItemIds);
    await conn.query("DELETE FROM sale_items WHERE sale_id = ?", [saleId]);
    await conn.query("UPDATE sales SET status = 'canceled' WHERE id = ?", [
      saleId,
    ]);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res
      .status(err.message === "Sale not found" ? 404 : 400)
      .json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};
