import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, ShoppingCart, Search, Loader2 } from "lucide-react";

const formatToday = () => new Date().toISOString().slice(0, 10);

const createItem = () => ({
  localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  product_id: "",
  variant_id: "",
  quantity: "1",
  cost_price: "",
  variants: [],
});

const createEmptyForm = () => ({
  supplier_id: "",
  purchase_date: formatToday(),
  items: [createItem()],
});

const EMPTY_FORM = createEmptyForm();

export default function Purchases() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [itemLoadingId, setItemLoadingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/purchases`),
      axios.get(`${API_URL}/suppliers`),
      axios.get(`${API_URL}/products`),
    ])
      .then(([purchaseRes, supplierRes, productRes]) => {
        setPurchases(purchaseRes.data.data || []);
        setSuppliers(supplierRes.data.data || []);
        setProducts(productRes.data.data || []);
      })
      .catch(() => toast.error("Failed to load purchase data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const updateItem = (index, patch) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const handleProductChange = async (index, productId) => {
    updateItem(index, { product_id: productId, variant_id: "", variants: [] });

    if (!productId) {
      updateItem(index, { cost_price: "", variants: [] });
      return;
    }

    setItemLoadingId(index);
    try {
      const response = await axios.get(`${API_URL}/products/${productId}`);
      const product = response.data.data;
      updateItem(index, {
        cost_price: product.cost_price?.toString() ?? "",
        variants: (product.variants || []).map((variant) => ({
          id: variant.id,
          name: variant.variant_name,
        })),
      });
    } catch {
      toast.error("Failed to load product details");
    } finally {
      setItemLoadingId(null);
    }
  };

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, createItem()] }));
  const removeItem = (index) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const validate = () => {
    if (!form.supplier_id) return "Supplier is required";
    if (form.items.length === 0) return "Add at least one item";
    for (let i = 0; i < form.items.length; i += 1) {
      const item = form.items[i];
      if (!item.product_id) return `Item ${i + 1}: product is required`;
      if (item.variants.length > 0 && !item.variant_id)
        return `Item ${i + 1}: variant is required`;
      if (!Number(item.quantity) || Number(item.quantity) <= 0)
        return `Item ${i + 1}: valid quantity is required`;
      if (
        item.cost_price === "" ||
        Number.isNaN(Number(item.cost_price)) ||
        Number(item.cost_price) < 0
      ) {
        return `Item ${i + 1}: valid cost price is required`;
      }
    }
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    const payload = {
      supplier_id: Number(form.supplier_id),
      purchase_date: form.purchase_date,
      items: form.items.map((item) => ({
        product_id: Number(item.product_id),
        variant_id: item.variant_id ? Number(item.variant_id) : null,
        quantity: Number(item.quantity),
        cost_price: Number(item.cost_price),
      })),
    };

    try {
      await axios.post(`${API_URL}/purchases`, payload);
      toast.success("Purchase created");
      setSheetOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    const query = search.toLowerCase();
    return purchases.filter((purchase) =>
      [purchase.invoice_no, purchase.supplier_name, purchase.purchase_date]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [purchases, search]);

  const totalAmount = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.cost_price || 0),
        0,
      ),
    [form.items],
  );

  const productOptions = products;
  const supplierOptions = suppliers;

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice, supplier, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> New Purchase
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No purchases yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-medium font-mono">
                      {purchase.invoice_no}
                    </TableCell>
                    <TableCell>{purchase.supplier_name || "—"}</TableCell>
                    <TableCell>{purchase.purchase_date || "—"}</TableCell>
                    <TableCell className="text-right">
                      {purchase.item_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      Rs. {Number(purchase.total_amount || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-4xl">
          <SheetHeader className="mb-4 px-6 pt-6">
            <SheetTitle>Create Purchase</SheetTitle>
            <SheetDescription>
              Select a supplier and add products received into stock.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.supplier_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, supplier_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOptions.map((supplier) => (
                      <SelectItem
                        key={supplier.id}
                        value={supplier.id.toString()}
                      >
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={form.purchase_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      purchase_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Items
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add products and quantities received from the supplier.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-2"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {form.items.map((item, index) => {
                  const selectedProduct = productOptions.find(
                    (product) => product.id.toString() === item.product_id,
                  );
                  const rowSubtotal =
                    Number(item.quantity || 0) * Number(item.cost_price || 0);
                  return (
                    <div
                      key={item.localId}
                      className="rounded-lg border p-4 space-y-4 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                        <div className="space-y-1 lg:col-span-5">
                          <Label>
                            Product <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) =>
                              void handleProductChange(index, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {productOptions.map((product) => (
                                <SelectItem
                                  key={product.id}
                                  value={product.id.toString()}
                                >
                                  {product.name}{" "}
                                  {product.sku ? `(${product.sku})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 lg:col-span-3">
                          <Label>Variant</Label>
                          <Select
                            value={item.variant_id}
                            onValueChange={(value) =>
                              updateItem(index, { variant_id: value })
                            }
                            disabled={!selectedProduct?.variant_count}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  selectedProduct?.variant_count
                                    ? "Select variant"
                                    : "No variants"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(item.variants || []).map((variant) => (
                                <SelectItem
                                  key={variant.id}
                                  value={variant.id.toString()}
                                >
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, {
                                quantity: event.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                          <Label>Cost</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.cost_price}
                            onChange={(event) =>
                              updateItem(index, {
                                cost_price: event.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          {itemLoadingId === index ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin" />{" "}
                              Loading product details
                            </span>
                          ) : selectedProduct ? (
                            `Selected: ${selectedProduct.name}`
                          ) : (
                            "Choose a product to auto-fill cost and variants"
                          )}
                        </span>
                        <span className="font-medium text-foreground">
                          Subtotal: Rs. {rowSubtotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-md bg-muted/60 px-4 py-3 text-sm flex items-center justify-between">
                <span>Total Amount</span>
                <span className="font-semibold">
                  Rs. {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create Purchase"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is not implemented yet for posted inventory movements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteTarget(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
