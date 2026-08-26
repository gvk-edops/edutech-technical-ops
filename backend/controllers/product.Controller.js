import con from "../config/db.config.js";

// ── Products ──────────────────────────────────────────────────────────────────

export const getProducts = async (req, res) => {
  try {
    const [products] = await con.query(`
            SELECT p.id, p.category_id, p.brand_id, p.name, p.sku, p.barcode, p.description,
             p.cost_price, p.selling_price,
             -- If product has variants, prefer sum of variant stock; otherwise use product stock_quantity
             COALESCE(SUM(v.stock_quantity), p.stock_quantity) AS stock_quantity,
              p.is_serialized, p.reorder_level, p.image_url, p.status, p.created_at, p.updated_at,
             c.name AS category_name, b.name AS brand_name,
             COUNT(v.id) AS variant_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN product_variants v ON v.product_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const [rows] = await con.query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN brands b ON p.brand_id = b.id
       WHERE p.id = ?`,
      [req.params.id],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });

    const [attributes] = await con.query(
      `SELECT pav.attribute_id, pav.value, a.name AS attribute_name, a.unit, ca.required
       FROM product_attribute_values pav
       JOIN attributes a ON pav.attribute_id = a.id
       JOIN category_attributes ca ON ca.attribute_id = a.id AND ca.category_id = ?
       WHERE pav.product_id = ?`,
      [rows[0].category_id, req.params.id],
    );
    const [variants] = await con.query(
      "SELECT * FROM product_variants WHERE product_id = ? ORDER BY id",
      [req.params.id],
    );

    res.json({ success: true, data: { ...rows[0], attributes, variants } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createProduct = async (req, res) => {
  const conn = await con.getConnection();
  try {
    await conn.beginTransaction();
    const {
      category_id,
      brand_id,
      name,
      sku,
      barcode,
      description,
      cost_price,
      selling_price,
      stock_quantity,
      is_serialized,
      reorder_level,
      image_url,
      status,
      attributes = [],
      variants = [],
    } = req.body;

    const [result] = await conn.query(
      `INSERT INTO products (category_id, brand_id, name, sku, barcode, description,
        cost_price, selling_price, stock_quantity, is_serialized, reorder_level, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        brand_id || null,
        name,
        sku,
        barcode || null,
        description || null,
        cost_price || 0,
        selling_price || 0,
        stock_quantity || 0,
        Number(is_serialized) ? 1 : 0,
        reorder_level || 0,
        image_url || null,
        status || "active",
      ],
    );
    const productId = result.insertId;

    for (const attr of attributes) {
      if (
        attr.value !== "" &&
        attr.value !== null &&
        attr.value !== undefined
      ) {
        await conn.query(
          "INSERT INTO product_attribute_values (product_id, attribute_id, value) VALUES (?, ?, ?)",
          [productId, attr.attribute_id, attr.value],
        );
      }
    }

    for (const variant of variants) {
      if (!variant.variant_name) continue;
      await conn.query(
        `INSERT INTO product_variants (product_id, variant_name, sku, barcode, additional_price, stock_quantity)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          productId,
          variant.variant_name,
          variant.sku || null,
          variant.barcode || null,
          variant.additional_price || 0,
          variant.stock_quantity || 0,
        ],
      );
    }

    const initialStock = parseInt(stock_quantity) || 0;
    if (initialStock > 0) {
      await conn.query(
        `INSERT INTO stock_movements (product_id, variant_id, movement_type, quantity, reference_type, notes)
         VALUES (?, NULL, 'adjustment', ?, 'adjustment', 'Initial stock on product creation')`,
        [productId, initialStock],
      );
    }

    await conn.commit();
    res.json({ success: true, id: productId });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      const field = err.message.includes("sku") ? "SKU" : "Barcode";
      return res
        .status(400)
        .json({ success: false, error: `${field} already exists` });
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

export const updateProduct = async (req, res) => {
  const conn = await con.getConnection();
  try {
    await conn.beginTransaction();
    const {
      category_id,
      brand_id,
      name,
      sku,
      barcode,
      description,
      cost_price,
      selling_price,
      stock_quantity,
      is_serialized,
      reorder_level,
      image_url,
      status,
      attributes = [],
      variants = [],
    } = req.body;
    const productId = req.params.id;

    const [[old]] = await conn.query(
      "SELECT stock_quantity FROM products WHERE id = ?",
      [productId],
    );

    await conn.query(
      `UPDATE products SET category_id=?, brand_id=?, name=?, sku=?, barcode=?,
        description=?, cost_price=?, selling_price=?, stock_quantity=?,
        is_serialized=?, reorder_level=?, image_url=?, status=? WHERE id=?`,
      [
        category_id,
        brand_id || null,
        name,
        sku,
        barcode || null,
        description || null,
        cost_price,
        selling_price,
        stock_quantity,
        Number(is_serialized) ? 1 : 0,
        reorder_level,
        image_url || null,
        status,
        productId,
      ],
    );

    await conn.query(
      "DELETE FROM product_attribute_values WHERE product_id = ?",
      [productId],
    );
    for (const attr of attributes) {
      if (
        attr.value !== "" &&
        attr.value !== null &&
        attr.value !== undefined
      ) {
        await conn.query(
          "INSERT INTO product_attribute_values (product_id, attribute_id, value) VALUES (?, ?, ?)",
          [productId, attr.attribute_id, attr.value],
        );
      }
    }

    const [existingVariants] = await conn.query(
      "SELECT id FROM product_variants WHERE product_id = ?",
      [productId],
    );
    const incomingIds = variants.filter((v) => v.id).map((v) => v.id);
    for (const v of existingVariants.filter(
      (v) => !incomingIds.includes(v.id),
    )) {
      await conn.query("DELETE FROM product_variants WHERE id = ?", [v.id]);
    }

    for (const variant of variants) {
      if (!variant.variant_name) continue;
      if (variant.id) {
        await conn.query(
          `UPDATE product_variants SET variant_name=?, sku=?, barcode=?,
            additional_price=?, stock_quantity=? WHERE id=? AND product_id=?`,
          [
            variant.variant_name,
            variant.sku || null,
            variant.barcode || null,
            variant.additional_price || 0,
            variant.stock_quantity || 0,
            variant.id,
            productId,
          ],
        );
      } else {
        await conn.query(
          `INSERT INTO product_variants (product_id, variant_name, sku, barcode, additional_price, stock_quantity)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            productId,
            variant.variant_name,
            variant.sku || null,
            variant.barcode || null,
            variant.additional_price || 0,
            variant.stock_quantity || 0,
          ],
        );
      }
    }

    const diff =
      (parseInt(stock_quantity) || 0) - (parseInt(old?.stock_quantity) || 0);
    if (diff !== 0) {
      await conn.query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes)
         VALUES (?, 'adjustment', ?, 'adjustment', ?)`,
        [
          productId,
          diff,
          `Manual stock adjustment: ${diff > 0 ? "+" : ""}${diff}`,
        ],
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      const field = err.message.includes("sku") ? "SKU" : "Barcode";
      return res
        .status(400)
        .json({ success: false, error: `${field} already exists` });
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const [rows] = await con.query("SELECT status FROM products WHERE id = ?", [
      req.params.id,
    ]);

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, error: "Product not found" });
    }

    if (rows[0].status === "inactive") {
      await con.query("DELETE FROM products WHERE id = ?", [req.params.id]);
      return res.json({ success: true, deleted: true });
    }

    await con.query("UPDATE products SET status = 'inactive' WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true, deleted: false });
  } catch (err) {
    if (
      err.code === "ER_ROW_IS_REFERENCED_2" ||
      err.code === "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "This product is still referenced by stock or transaction records and cannot be deleted.",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Categories ────────────────────────────────────────────────────────────────

export const getCategories = async (req, res) => {
  try {
    const [rows] = await con.query(`
      SELECT c.*, COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id ORDER BY c.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, error: "Name is required" });
  try {
    const [r] = await con.query(
      "INSERT INTO categories (name, description) VALUES (?, ?)",
      [name.trim(), description?.trim() || null],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, error: "Category name already exists" });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateCategory = async (req, res) => {
  const { name, description } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, error: "Name is required" });
  try {
    await con.query("UPDATE categories SET name=?, description=? WHERE id=?", [
      name.trim(),
      description?.trim() || null,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, error: "Category name already exists" });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await con.query("DELETE FROM categories WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(400).json({
        success: false,
        error: "Category is used by existing products",
      });
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Brands ────────────────────────────────────────────────────────────────────

export const getBrands = async (req, res) => {
  try {
    const [rows] = await con.query(`
      SELECT b.*, COUNT(p.id) AS product_count
      FROM brands b
      LEFT JOIN products p ON p.brand_id = b.id
      GROUP BY b.id ORDER BY b.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createBrand = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, error: "Name is required" });
  try {
    const [r] = await con.query("INSERT INTO brands (name) VALUES (?)", [
      name.trim(),
    ]);
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, error: "Brand name already exists" });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateBrand = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, error: "Name is required" });
  try {
    await con.query("UPDATE brands SET name=? WHERE id=?", [
      name.trim(),
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, error: "Brand name already exists" });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteBrand = async (req, res) => {
  try {
    await con.query("DELETE FROM brands WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res
        .status(400)
        .json({ success: false, error: "Brand is used by existing products" });
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Attributes ────────────────────────────────────────────────────────────────

export const getAttributes = async (req, res) => {
  try {
    const [rows] = await con.query(`
      SELECT a.*, COUNT(ca.id) AS category_count
      FROM attributes a
      LEFT JOIN category_attributes ca ON ca.attribute_id = a.id
      GROUP BY a.id ORDER BY a.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createAttribute = async (req, res) => {
  const { name, unit } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, error: "Name is required" });
  try {
    const [r] = await con.query(
      "INSERT INTO attributes (name, unit) VALUES (?, ?)",
      [name.trim(), unit?.trim() || null],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, error: "Attribute name already exists" });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateAttribute = async (req, res) => {
  const { name, unit } = req.body;
  if (!name?.trim())
    return res.status(400).json({ success: false, error: "Name is required" });
  try {
    await con.query("UPDATE attributes SET name=?, unit=? WHERE id=?", [
      name.trim(),
      unit?.trim() || null,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ success: false, error: "Attribute name already exists" });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteAttribute = async (req, res) => {
  try {
    await con.query("DELETE FROM attributes WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(400).json({
        success: false,
        error: "Attribute is used by categories or products",
      });
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Category Attributes ───────────────────────────────────────────────────────

export const getCategoryAttributesByCategory = async (req, res) => {
  try {
    const [rows] = await con.query(
      `SELECT ca.id, ca.attribute_id, ca.required, a.name, a.unit
       FROM category_attributes ca
       JOIN attributes a ON ca.attribute_id = a.id
       WHERE ca.category_id = ? ORDER BY ca.id`,
      [req.params.categoryId],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const addCategoryAttribute = async (req, res) => {
  const { attribute_id, required } = req.body;
  if (!attribute_id)
    return res
      .status(400)
      .json({ success: false, error: "Attribute is required" });
  try {
    const [r] = await con.query(
      "INSERT INTO category_attributes (category_id, attribute_id, required) VALUES (?, ?, ?)",
      [req.params.categoryId, attribute_id, required ? 1 : 0],
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({
        success: false,
        error: "Attribute already linked to this category",
      });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateCategoryAttribute = async (req, res) => {
  const { required } = req.body;
  try {
    await con.query("UPDATE category_attributes SET required=? WHERE id=?", [
      required ? 1 : 0,
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const removeCategoryAttribute = async (req, res) => {
  try {
    await con.query("DELETE FROM category_attributes WHERE id=?", [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Category Attributes (for product form) ────────────────────────────────────

export const getCategoryAttributes = async (req, res) => {
  try {
    const [rows] = await con.query(
      `SELECT a.id, a.name, a.unit, ca.required
       FROM attributes a
       JOIN category_attributes ca ON a.id = ca.attribute_id
       WHERE ca.category_id = ? ORDER BY ca.id`,
      [req.params.categoryId],
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── SKU Generation ───────────────────────────────────────────────────────────

export const generateSku = async (req, res) => {
  const { category_id, brand_id } = req.query;
  try {
    // Get category prefix (first 3 letters, uppercase)
    let catPrefix = "PRD";
    if (category_id) {
      const [[cat]] = await con.query(
        "SELECT name FROM categories WHERE id = ?",
        [category_id],
      );
      if (cat)
        catPrefix = cat.name
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 3)
          .toUpperCase();
    }

    // Get brand prefix (first 3 letters, uppercase)
    let brandPrefix = "";
    if (brand_id) {
      const [[brand]] = await con.query(
        "SELECT name FROM brands WHERE id = ?",
        [brand_id],
      );
      if (brand)
        brandPrefix = brand.name
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 3)
          .toUpperCase();
    }

    // Build prefix: BRAND-CAT or just CAT
    const prefix = brandPrefix ? `${brandPrefix}-${catPrefix}` : catPrefix;

    // Find highest existing sequence for this prefix
    const [rows] = await con.query(
      "SELECT sku FROM products WHERE sku LIKE ? ORDER BY sku DESC LIMIT 50",
      [`${prefix}-%`],
    );

    let maxSeq = 0;
    const seqRegex = new RegExp(`^${prefix.replace("-", "\\-")}-(\\d+)$`);
    for (const row of rows) {
      const match = row.sku.match(seqRegex);
      if (match) {
        const n = parseInt(match[1]);
        if (n > maxSeq) maxSeq = n;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, "0");
    res.json({ success: true, sku: `${prefix}-${nextSeq}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export const getDashboardStats = async (req, res) => {
  try {
    const [[{ totalProducts }]] = await con.query(
      "SELECT COUNT(*) AS totalProducts FROM products WHERE status = 'active'",
    );
    const [[{ totalCategories }]] = await con.query(
      "SELECT COUNT(*) AS totalCategories FROM categories",
    );
    const [[{ lowStock }]] = await con.query(
      "SELECT COUNT(*) AS lowStock FROM products WHERE stock_quantity <= reorder_level AND reorder_level > 0 AND status = 'active'",
    );
    const [[{ todaySales }]] = await con.query(
      "SELECT COALESCE(SUM(final_amount), 0) AS todaySales FROM sales WHERE DATE(sale_date) = CURDATE()",
    );
    const [recentSales] = await con.query(
      `SELECT s.id, s.invoice_no, s.final_amount, s.sale_date, s.payment_method,
              COALESCE(c.name, 'Walk-in') AS customer_name
       FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
       ORDER BY s.sale_date DESC LIMIT 5`,
    );
    const [lowStockProducts] = await con.query(
      `SELECT id, name, sku, stock_quantity, reorder_level FROM products
       WHERE stock_quantity <= reorder_level AND reorder_level > 0 AND status = 'active'
       ORDER BY stock_quantity ASC LIMIT 5`,
    );
    res.json({
      success: true,
      stats: { totalProducts, totalCategories, lowStock, todaySales },
      recentSales,
      lowStockProducts,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
