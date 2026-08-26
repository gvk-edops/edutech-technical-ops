import { useState, useEffect, useCallback } from "react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  PackageX,
  AlertTriangle,
  Settings2,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const EMPTY_VARIANT = {
  id: null,
  variant_name: "",
  sku: "",
  barcode: "",
  additional_price: "",
  stock_quantity: "",
};

const EMPTY_FORM = {
  category_id: "",
  brand_id: "",
  name: "",
  sku: "",
  barcode: "",
  description: "",
  cost_price: "",
  selling_price: "",
  stock_quantity: "0",
  reorder_level: "0",
  status: "active",
  is_serialized: false,
  attributes: [],
  variants: [],
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Products() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // delete dialog
  const [deleteTarget, setDeleteTarget] = useState(null);

  // view mode
  const [viewMode, setViewMode] = useState("table");

  // ── data fetching ────────────────────────────────────────────────────────

  const fetchProducts = useCallback(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/products`)
      .then((r) => setProducts(r.data.data || []))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
    axios
      .get(`${API_URL}/products/categories`)
      .then((r) => setCategories(r.data.data || []));
    axios
      .get(`${API_URL}/products/brands`)
      .then((r) => setBrands(r.data.data || []));
  }, [fetchProducts]);

  // Load category attributes whenever category changes
  useEffect(() => {
    if (!form.category_id) {
      setForm((prev) => ({ ...prev, attributes: [] }));
      return;
    }
    axios
      .get(`${API_URL}/products/categories/${form.category_id}/attributes`)
      .then((r) => {
        const attrs = r.data.data || [];
        setForm((prev) => ({
          ...prev,
          attributes: attrs.map((a) => ({
            attribute_id: a.id,
            name: a.name,
            unit: a.unit,
            required: !!a.required,
            value:
              prev.attributes.find((x) => x.attribute_id === a.id)?.value ?? "",
          })),
        }));
      })
      .catch(() => setForm((prev) => ({ ...prev, attributes: [] })));
  }, [form.category_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── sheet open/close ─────────────────────────────────────────────────────

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (product) => {
    setEditId(product.id);
    // Pre-fill basic fields immediately, attributes/variants load after
    setForm({
      category_id: product.category_id?.toString() ?? "",
      brand_id: product.brand_id?.toString() ?? "",
      name: product.name ?? "",
      sku: product.sku ?? "",
      barcode: product.barcode ?? "",
      description: product.description ?? "",
      cost_price: product.cost_price ?? "",
      selling_price: product.selling_price ?? "",
      stock_quantity: product.stock_quantity?.toString() ?? "0",
      reorder_level: product.reorder_level?.toString() ?? "0",
      status: product.status ?? "active",
      is_serialized: !!product.is_serialized,
      attributes: [],
      variants: [],
    });
    setSheetOpen(true);

    // Fetch full detail (attributes + variants)
    axios
      .get(`${API_URL}/products/${product.id}`)
      .then((r) => {
        const p = r.data.data;
        setForm((prev) => ({
          ...prev,
          attributes: (p.attributes || []).map((a) => ({
            attribute_id: a.attribute_id,
            name: a.attribute_name,
            unit: a.unit,
            required: !!a.required,
            value: a.value ?? "",
          })),
          variants: (p.variants || []).map((v) => ({
            id: v.id,
            variant_name: v.variant_name ?? "",
            sku: v.sku ?? "",
            barcode: v.barcode ?? "",
            additional_price: v.additional_price?.toString() ?? "",
            stock_quantity: v.stock_quantity?.toString() ?? "",
          })),
        }));
      })
      .catch(() => toast.error("Failed to load product details"));
  };

  // ── form helpers ─────────────────────────────────────────────────────────

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setAttrValue = (idx, value) =>
    setForm((prev) => {
      const attributes = [...prev.attributes];
      attributes[idx] = { ...attributes[idx], value };
      return { ...prev, attributes };
    });

  const addVariant = () =>
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { ...EMPTY_VARIANT }],
    }));

  const removeVariant = (idx) =>
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== idx),
    }));

  const setVariantField = (idx, key, value) =>
    setForm((prev) => {
      const variants = [...prev.variants];
      variants[idx] = { ...variants[idx], [key]: value };
      return { ...prev, variants };
    });

  // Auto-generate variant SKU from product SKU + variant name
  const generateVariantSku = (productSku, variantName) => {
    if (!productSku || !variantName) return "";
    const slugified = variantName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]/g, "");
    return `${productSku}-${slugified}`;
  };

  // ── validation ───────────────────────────────────────────────────────────

  const validate = () => {
    if (!form.category_id) return "Category is required";
    if (!form.name.trim()) return "Product name is required";
    if (form.variants.length === 0 && !form.sku.trim())
      return "SKU is required";
    if (form.cost_price === "" || isNaN(Number(form.cost_price)))
      return "Valid cost price is required";
    if (form.selling_price === "" || isNaN(Number(form.selling_price)))
      return "Valid selling price is required";

    for (const attr of form.attributes) {
      if (attr.required && !attr.value.trim())
        return `${attr.name} is required`;
    }

    for (let i = 0; i < form.variants.length; i++) {
      const v = form.variants[i];
      if (!v.variant_name.trim()) return `Variant ${i + 1}: name is required`;
      if (!v.sku.trim()) return `Variant ${i + 1}: SKU is required`;
    }

    return null;
  };

  // ── submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      category_id: parseInt(form.category_id),
      brand_id: form.brand_id ? parseInt(form.brand_id) : null,
      cost_price: parseFloat(form.cost_price) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      reorder_level: parseInt(form.reorder_level) || 0,
      is_serialized: !!form.is_serialized,
      barcode: form.barcode.trim() || null,
      variants: form.variants.map((v) => ({
        ...v,
        sku: v.sku.trim() || null,
        barcode: v.barcode.trim() || null,
        additional_price: parseFloat(v.additional_price) || 0,
        stock_quantity: parseInt(v.stock_quantity) || 0,
      })),
    };

    try {
      if (editId) {
        await axios.put(`${API_URL}/products/${editId}`, payload);
        toast.success("Product updated");
      } else {
        await axios.post(`${API_URL}/products`, payload);
        toast.success("Product created");
      }
      setSheetOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── delete ───────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    try {
      const response = await axios.delete(
        `${API_URL}/products/${deleteTarget.id}`,
      );
      toast.success(
        response.data?.deleted ? "Product deleted" : "Product deactivated",
      );
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete product");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── filtered list ────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.category_name || "").toLowerCase().includes(q) ||
      (p.brand_name || "").toLowerCase().includes(q)
    );
  });

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <main className="overflow-y-auto p-5">
      {/* Search + View Toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, category, brand…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-md overflow-hidden shrink-0">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode("table")}
              title="Table view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-none h-9 w-9"
              onClick={() => setViewMode("card")}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings/product-setup")}
          >
            <Settings2 className="h-4 w-4 mr-1.5" /> Setup
          </Button>
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {/* Table / Card */}
      {loading ? (
        <p className="text-muted-foreground text-center py-16">Loading…</p>
      ) : viewMode === "card" ? (
        filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">
            <PackageX className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No products found
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((p) => {
              const lowStock =
                p.reorder_level > 0 && p.stock_quantity <= p.reorder_level;
              return (
                <div
                  key={p.id}
                  className="border rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="bg-muted h-36 flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PackageX className="h-10 w-10 opacity-20" />
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <p className="font-medium text-sm leading-tight line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {p.sku}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.category_name}
                      {p.brand_name ? ` · ${p.brand_name}` : ""}
                    </p>
                    <p className="text-sm font-semibold mt-auto">
                      Rs. {Number(p.selling_price).toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs ${lowStock ? "text-destructive font-semibold" : "text-muted-foreground"}`}
                      >
                        Stock: {p.stock_quantity}
                        {lowStock && (
                          <AlertTriangle className="inline h-3 w-3 ml-0.5" />
                        )}
                      </span>
                      <Badge
                        variant={
                          p.status === "active" ? "default" : "secondary"
                        }
                        className="text-xs px-1.5 py-0"
                      >
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Cost (Rs.)</TableHead>
                <TableHead className="text-right">Price (Rs.)</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-12"
                  >
                    <PackageX className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const lowStock =
                    p.reorder_level > 0 && p.stock_quantity <= p.reorder_level;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        {p.sku}
                      </TableCell>
                      <TableCell>{p.category_name}</TableCell>
                      <TableCell>{p.brand_name || "—"}</TableCell>
                      <TableCell className="text-right">
                        {Number(p.cost_price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(p.selling_price).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            lowStock ? "text-destructive font-semibold" : ""
                          }
                        >
                          {p.stock_quantity}
                          {lowStock && (
                            <AlertTriangle className="inline h-3 w-3 ml-1" />
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "active" ? "default" : "secondary"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Product Form Sheet ─────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto p-0">
          <SheetHeader className="mb-4 px-6 pt-6">
            <SheetTitle>
              {editId ? "Edit Product" : "Add New Product"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pb-6 px-6">
            {/* ── Section 1: Basic Info ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Basic Information
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div className="space-y-1">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setField("category_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand */}
                <div className="space-y-1">
                  <Label>Brand</Label>
                  <Select
                    value={form.brand_id || "none"}
                    onValueChange={(v) =>
                      setField("brand_id", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None —</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name */}
                <div className="space-y-1 col-span-2">
                  <Label>
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="e.g. Bixton LED Bulb 9W"
                  />
                </div>

                {/* SKU */}
                <div className="space-y-1">
                  <Label>
                    SKU <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setField("sku", e.target.value)}
                    placeholder="e.g. BIX-LED-001"
                    className="font-mono"
                  />
                </div>

                {/* Barcode */}
                <div className="space-y-1">
                  <Label>Barcode</Label>
                  <Input
                    value={form.barcode}
                    onChange={(e) => setField("barcode", e.target.value)}
                    placeholder="Optional"
                    className="font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Optional product description"
                    rows={2}
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Serialized product</Label>
                    <p className="text-xs text-muted-foreground">
                      Track unique serial numbers instead of loose stock.
                    </p>
                  </div>
                  <Checkbox
                    checked={!!form.is_serialized}
                    onCheckedChange={(checked) => {
                      const nextValue = !!checked;
                      setField("is_serialized", nextValue);
                      if (nextValue && !editId) {
                        setField("stock_quantity", "0");
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── Section 2: Pricing & Stock ── */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pricing & Stock
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>
                    Cost Price (Rs.) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) => setField("cost_price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>
                    Selling Price (Rs.){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_price}
                    onChange={(e) => setField("selling_price", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={(e) => setField("stock_quantity", e.target.value)}
                    disabled={form.variants.length > 0 || form.is_serialized}
                  />
                  {form.is_serialized ? (
                    <p className="text-xs text-muted-foreground">
                      Stock is managed from serial numbers entered during
                      purchases.
                    </p>
                  ) : form.variants.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Stock is managed per-variant when variants exist
                    </p>
                  ) : (
                    !editId && (
                      <p className="text-xs text-muted-foreground">
                        Initial stock — logged as adjustment
                      </p>
                    )
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.reorder_level}
                    onChange={(e) => setField("reorder_level", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when stock ≤ this value
                  </p>
                </div>
              </div>

              {/* Margin indicator */}
              {form.cost_price &&
                form.selling_price &&
                Number(form.cost_price) > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted rounded px-3 py-2">
                    Margin: Rs.{" "}
                    {(
                      Number(form.selling_price) - Number(form.cost_price)
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{" "}
                    (
                    {(
                      ((Number(form.selling_price) - Number(form.cost_price)) /
                        Number(form.cost_price)) *
                      100
                    ).toFixed(1)}
                    %)
                  </div>
                )}
            </section>

            {/* ── Section 3: Attributes (dynamic per category) ── */}
            {form.attributes.length > 0 && (
              <>
                <Separator />
                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Attributes
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {form.attributes.map((attr, i) => (
                      <div key={attr.attribute_id} className="space-y-1">
                        <Label>
                          {attr.name}
                          {attr.unit && (
                            <span className="text-muted-foreground ml-1">
                              ({attr.unit})
                            </span>
                          )}
                          {attr.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                        <Input
                          value={attr.value}
                          onChange={(e) => setAttrValue(i, e.target.value)}
                          placeholder={
                            attr.unit ? `e.g. 12 ${attr.unit}` : "Enter value"
                          }
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* ── Section 4: Variants ── */}
            <Separator />
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Variants
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    e.g. different wattages or sizes — each has its own SKU and
                    additional price
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Variant
                </Button>
              </div>

              {form.variants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                  No variants — product sold as a single unit
                </p>
              ) : (
                <div className="space-y-3">
                  {form.variants.map((v, i) => (
                    <div
                      key={i}
                      className="border rounded-md p-3 space-y-3 relative"
                    >
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <p className="text-xs font-medium text-muted-foreground">
                        Variant {i + 1}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 col-span-2">
                          <Label className="text-xs">
                            Variant Name{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={v.variant_name}
                            onChange={(e) => {
                              const newName = e.target.value;
                              setVariantField(i, "variant_name", newName);
                              // Auto-generate SKU if empty or was auto-generated (starts with product SKU)
                              if (
                                newName.trim() &&
                                (!v.sku || v.sku.startsWith(form.sku))
                              ) {
                                const autoSku = generateVariantSku(
                                  form.sku,
                                  newName,
                                );
                                setVariantField(i, "sku", autoSku);
                              }
                            }}
                            placeholder="e.g. 9W, 15W, Red"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            SKU <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={v.sku}
                            onChange={(e) =>
                              setVariantField(i, "sku", e.target.value)
                            }
                            placeholder="e.g. BIX-LED-001-9W"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Barcode</Label>
                          <Input
                            value={v.barcode}
                            onChange={(e) =>
                              setVariantField(i, "barcode", e.target.value)
                            }
                            placeholder="Optional"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Additional Price (Rs.)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={v.additional_price}
                            onChange={(e) =>
                              setVariantField(
                                i,
                                "additional_price",
                                e.target.value,
                              )
                            }
                            placeholder="0.00"
                          />
                          {form.selling_price && v.additional_price && (
                            <p className="text-xs text-muted-foreground">
                              Final: Rs.{" "}
                              {(
                                Number(form.selling_price) +
                                Number(v.additional_price)
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Stock Quantity</Label>
                          <Input
                            type="number"
                            min="0"
                            value={v.stock_quantity}
                            onChange={(e) =>
                              setVariantField(
                                i,
                                "stock_quantity",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <SheetFooter className="pt-2 px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving…"
                  : editId
                    ? "Save Changes"
                    : "Create Product"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.status === "inactive"
                ? "Delete Product?"
                : "Deactivate Product?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.status === "inactive" ? (
                <>
                  <strong>{deleteTarget?.name}</strong> is already inactive and
                  will be permanently removed if you continue.
                </>
              ) : (
                <>
                  <strong>{deleteTarget?.name}</strong> will be marked inactive
                  and hidden from sales. Stock movements and history are
                  preserved.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteTarget?.status === "inactive" ? "Delete" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
