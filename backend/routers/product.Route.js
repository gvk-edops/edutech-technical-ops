import express from "express";
import {
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, updateCategory, deleteCategory,
  getBrands, createBrand, updateBrand, deleteBrand,
  getAttributes, createAttribute, updateAttribute, deleteAttribute,
  getCategoryAttributesByCategory, addCategoryAttribute, updateCategoryAttribute, removeCategoryAttribute,
  getCategoryAttributes,
  generateSku,
  getDashboardStats,
} from "../controllers/product.Controller.js";
import { verifyAdmin } from "../middleware/auth.js";

const router = express.Router();

// SKU generation
router.get("/generate-sku", verifyAdmin, generateSku);

// Dashboard (before /:id)
router.get("/dashboard-stats", verifyAdmin, getDashboardStats);

// Categories (before /:id)
router.get("/categories", verifyAdmin, getCategories);
router.post("/categories", verifyAdmin, createCategory);
router.put("/categories/:id", verifyAdmin, updateCategory);
router.delete("/categories/:id", verifyAdmin, deleteCategory);
router.get("/categories/:categoryId/attributes", verifyAdmin, getCategoryAttributes);
router.get("/categories/:categoryId/attribute-links", verifyAdmin, getCategoryAttributesByCategory);
router.post("/categories/:categoryId/attribute-links", verifyAdmin, addCategoryAttribute);

// Category attribute links
router.put("/category-attribute-links/:id", verifyAdmin, updateCategoryAttribute);
router.delete("/category-attribute-links/:id", verifyAdmin, removeCategoryAttribute);

// Brands (before /:id)
router.get("/brands", verifyAdmin, getBrands);
router.post("/brands", verifyAdmin, createBrand);
router.put("/brands/:id", verifyAdmin, updateBrand);
router.delete("/brands/:id", verifyAdmin, deleteBrand);

// Attributes (before /:id)
router.get("/attributes", verifyAdmin, getAttributes);
router.post("/attributes", verifyAdmin, createAttribute);
router.put("/attributes/:id", verifyAdmin, updateAttribute);
router.delete("/attributes/:id", verifyAdmin, deleteAttribute);

// Products (/:id last)
router.get("/", verifyAdmin, getProducts);
router.post("/", verifyAdmin, createProduct);
router.get("/:id", verifyAdmin, getProductById);
router.put("/:id", verifyAdmin, updateProduct);
router.delete("/:id", verifyAdmin, deleteProduct);

export default router;
