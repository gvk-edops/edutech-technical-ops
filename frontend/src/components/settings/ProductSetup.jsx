import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Tag,
  Zap,
  Ruler,
  Link2,
  Package,
} from "lucide-react";

// ── tiny reusable inline-edit dialog ─────────────────────────────────────────

function ItemDialog({ open, onOpenChange, title, fields, onSave, saving }) {
  const [vals, setVals] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      fields.forEach((f) => {
        init[f.key] = f.initial ?? "";
      });
      setVals(init);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = (e) => {
    e.preventDefault();
    onSave(vals);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-1">
          {fields.map((f) =>
            f.type === "switch" ? (
              <div key={f.key} className="flex items-center justify-between">
                <Label>{f.label}</Label>
                <Switch
                  checked={!!vals[f.key]}
                  onCheckedChange={(v) =>
                    setVals((p) => ({ ...p, [f.key]: v }))
                  }
                />
              </div>
            ) : f.type === "select" ? (
              <div key={f.key} className="space-y-1">
                <Label>
                  {f.label}
                  {f.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Select
                  value={vals[f.key]?.toString() || ""}
                  onValueChange={(v) => setVals((p) => ({ ...p, [f.key]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${f.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o.value} value={o.value.toString()}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div key={f.key} className="space-y-1">
                <Label>
                  {f.label}
                  {f.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
                <Input
                  value={vals[f.key] || ""}
                  onChange={(e) =>
                    setVals((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  placeholder={f.placeholder || ""}
                  required={f.required}
                />
              </div>
            ),
          )}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ target, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onOpenChange(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{target?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. Items linked to products cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function ProductSetup() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [attributes, setAttributes] = useState([]);

  // selected category for attribute-link panel
  const [selectedCat, setSelectedCat] = useState(null);
  const [catAttrs, setCatAttrs] = useState([]);

  // dialog state: { type, item }  type = "category"|"brand"|"attribute"|"catattr"
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, item }

  // ── fetch ──────────────────────────────────────────────────────────────

  const fetchAll = useCallback(() => {
    axios
      .get(`${API_URL}/products/categories`)
      .then((r) => setCategories(r.data.data || []));
    axios
      .get(`${API_URL}/products/brands`)
      .then((r) => setBrands(r.data.data || []));
    axios
      .get(`${API_URL}/products/attributes`)
      .then((r) => setAttributes(r.data.data || []));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fetchCatAttrs = useCallback((catId) => {
    axios
      .get(`${API_URL}/products/categories/${catId}/attribute-links`)
      .then((r) => setCatAttrs(r.data.data || []));
  }, []);

  useEffect(() => {
    if (selectedCat) fetchCatAttrs(selectedCat.id);
    else setCatAttrs([]);
  }, [selectedCat, fetchCatAttrs]);

  // ── save handlers ──────────────────────────────────────────────────────

  const handleSave = async (vals) => {
    setSaving(true);
    try {
      const { type, item } = dialog;

      if (type === "category") {
        item
          ? await axios.put(`${API_URL}/products/categories/${item.id}`, vals)
          : await axios.post(`${API_URL}/products/categories`, vals);
        fetchAll();
      } else if (type === "brand") {
        item
          ? await axios.put(`${API_URL}/products/brands/${item.id}`, vals)
          : await axios.post(`${API_URL}/products/brands`, vals);
        fetchAll();
      } else if (type === "attribute") {
        item
          ? await axios.put(`${API_URL}/products/attributes/${item.id}`, vals)
          : await axios.post(`${API_URL}/products/attributes`, vals);
        fetchAll();
      } else if (type === "catattr") {
        if (item) {
          await axios.put(
            `${API_URL}/products/category-attribute-links/${item.id}`,
            { required: vals.required },
          );
        } else {
          await axios.post(
            `${API_URL}/products/categories/${selectedCat.id}/attribute-links`,
            {
              attribute_id: parseInt(vals.attribute_id),
              required: vals.required,
            },
          );
        }
        fetchCatAttrs(selectedCat.id);
      }

      toast.success("Saved");
      setDialog(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── delete handlers ────────────────────────────────────────────────────

  const handleDelete = async () => {
    const { type, item } = deleteTarget;
    try {
      if (type === "category")
        await axios.delete(`${API_URL}/products/categories/${item.id}`);
      else if (type === "brand")
        await axios.delete(`${API_URL}/products/brands/${item.id}`);
      else if (type === "attribute")
        await axios.delete(`${API_URL}/products/attributes/${item.id}`);
      else if (type === "catattr")
        await axios.delete(
          `${API_URL}/products/category-attribute-links/${item.id}`,
        );
      toast.success("Deleted");
      fetchAll();
      if (type === "catattr" && selectedCat) fetchCatAttrs(selectedCat.id);
      if (type === "category" && selectedCat?.id === item.id)
        setSelectedCat(null);
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── dialog field configs ───────────────────────────────────────────────

  const dialogFields = () => {
    if (!dialog) return [];
    const { type, item } = dialog;
    if (type === "category")
      return [
        {
          key: "name",
          label: "Category Name",
          required: true,
          initial: item?.name,
          placeholder: "e.g. Bulbs",
        },
        {
          key: "description",
          label: "Description",
          initial: item?.description,
          placeholder: "Optional",
        },
      ];
    if (type === "brand")
      return [
        {
          key: "name",
          label: "Brand Name",
          required: true,
          initial: item?.name,
          placeholder: "e.g. Philips",
        },
      ];
    if (type === "attribute")
      return [
        {
          key: "name",
          label: "Attribute Name",
          required: true,
          initial: item?.name,
          placeholder: "e.g. Wattage",
        },
        {
          key: "unit",
          label: "Unit",
          initial: item?.unit,
          placeholder: "e.g. W (optional)",
        },
      ];
    if (type === "catattr") {
      if (item)
        return [
          {
            key: "required",
            label: "Required field",
            type: "switch",
            initial: !!item.required,
          },
        ];
      const linked = catAttrs.map((a) => a.attribute_id);
      const available = attributes.filter((a) => !linked.includes(a.id));
      return [
        {
          key: "attribute_id",
          label: "Attribute",
          required: true,
          type: "select",
          options: available.map((a) => ({
            value: a.id,
            label: a.unit ? `${a.name} (${a.unit})` : a.name,
          })),
        },
        {
          key: "required",
          label: "Required field",
          type: "switch",
          initial: false,
        },
      ];
    }
    return [];
  };

  const dialogTitle = () => {
    if (!dialog) return "";
    const { type, item } = dialog;
    const action = item ? "Edit" : "Add";
    if (type === "category") return `${action} Category`;
    if (type === "brand") return `${action} Brand`;
    if (type === "attribute") return `${action} Attribute`;
    if (type === "catattr")
      return item
        ? "Edit Attribute Link"
        : `Link Attribute to "${selectedCat?.name}"`;
    return "";
  };

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/settings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure categories, brands, and attributes before adding products
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/products")}
          className="gap-2"
        >
          <Package className="h-4 w-4" /> Go to Products
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Categories ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Categories</CardTitle>
                <CardDescription className="text-xs">
                  Product groupings (e.g. Bulbs, Wires)
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialog({ type: "category", item: null })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No categories yet
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedCat?.id === c.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() =>
                      setSelectedCat(selectedCat?.id === c.id ? null : c)
                    }
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {c.product_count} products
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialog({ type: "category", item: c });
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ type: "category", item: c });
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Brands ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Brands</CardTitle>
                <CardDescription className="text-xs">
                  Manufacturers (e.g. Philips, Bixton)
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialog({ type: "brand", item: null })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {brands.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No brands yet
              </p>
            ) : (
              <div className="space-y-2">
                {brands.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{b.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {b.product_count} products
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDialog({ type: "brand", item: b })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setDeleteTarget({ type: "brand", item: b })
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Attributes ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <Ruler className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Attributes</CardTitle>
                <CardDescription className="text-xs">
                  Specs like Voltage, Wattage, Gauge
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setDialog({ type: "attribute", item: null })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {attributes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No attributes yet
              </p>
            ) : (
              <div className="space-y-2">
                {attributes.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      {a.unit && (
                        <p className="text-xs text-muted-foreground">
                          Unit: {a.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {a.category_count} categories
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setDialog({ type: "attribute", item: a })
                        }
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setDeleteTarget({ type: "attribute", item: a })
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Category → Attribute Links ── */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Category Attributes</CardTitle>
                <CardDescription className="text-xs">
                  {selectedCat
                    ? `Attributes for "${selectedCat.name}" — click a category to change`
                    : "Select a category on the left to manage its attributes"}
                </CardDescription>
              </div>
            </div>
            {selectedCat && (
              <Button
                size="sm"
                onClick={() => setDialog({ type: "catattr", item: null })}
                disabled={
                  attributes.filter(
                    (a) =>
                      !catAttrs.map((ca) => ca.attribute_id).includes(a.id),
                  ).length === 0
                }
              >
                <Plus className="h-3 w-3 mr-1" /> Link
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedCat ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                ← Select a category to see its attributes
              </p>
            ) : catAttrs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No attributes linked to this category yet
              </p>
            ) : (
              <div className="space-y-2">
                {catAttrs.map((ca) => (
                  <div
                    key={ca.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{ca.name}</p>
                      {ca.unit && (
                        <p className="text-xs text-muted-foreground">
                          Unit: {ca.unit}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={ca.required ? "default" : "outline"}
                        className="text-xs"
                      >
                        {ca.required ? "Required" : "Optional"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDialog({ type: "catattr", item: ca })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setDeleteTarget({ type: "catattr", item: ca })
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialogs ── */}
      <ItemDialog
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialogTitle()}
        fields={dialogFields()}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteConfirm
        target={deleteTarget?.item}
        onOpenChange={setDeleteTarget}
        onConfirm={handleDelete}
      />
    </main>
  );
}
