import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
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
import {
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  Loader2,
  BadgePercent,
  ScanSearch,
  Pencil,
  Ban,
  Printer,
} from "lucide-react";
import SalesInvoice from "@/components/SalesInvoice";

const formatToday = () => new Date().toISOString().slice(0, 10);

const createItem = () => ({
  localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  product_id: "",
  variant_id: "",
  quantity: "1",
  unit_price: "",
  variants: [],
  is_serialized: false,
  serial_options: [],
  serial_numbers: [],
});

const createEmptyForm = () => ({
  id: null,
  customer_id: "",
  payment_method: "cash",
  discount: "0",
  sale_date: formatToday(),
  status: "active",
  items: [createItem()],
});

const parseSerialNumbers = (value) =>
  value.map((serial) => String(serial || "").trim()).filter(Boolean);

export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [itemLoadingId, setItemLoadingId] = useState(null);
  const [lookupItemIndex, setLookupItemIndex] = useState(0);
  const [lookupQuery, setLookupQuery] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);

  const openInvoice = async (saleId) => {
    try {
      const res = await axios.get(`${API_URL}/sales/${saleId}`);
      setInvoiceSale(res.data.data);
    } catch {
      toast.error("Failed to load invoice");
    }
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/sales`),
      axios.get(`${API_URL}/products`),
    ])
      .then(([salesRes, productRes]) => {
        setSales(salesRes.data.data || []);
        setProducts(productRes.data.data || []);
      })
      .catch(() => toast.error("Failed to load sales data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => setForm(createEmptyForm());

  const openAdd = () => {
    resetForm();
    setEditId(null);
    setSheetOpen(true);
  };

  const openEdit = async (saleId) => {
    setHydrating(true);
    try {
      const response = await axios.get(`${API_URL}/sales/${saleId}`);
      const sale = response.data.data;

      const hydratedItems = await Promise.all(
        (sale.items || []).map(async (item) => {
          let variants = [];
          try {
            const productResponse = await axios.get(
              `${API_URL}/products/${item.product_id}`,
            );
            variants = (productResponse.data.data.variants || []).map(
              (variant) => ({
                id: variant.id,
                name: variant.variant_name,
              }),
            );
          } catch {
            variants = [];
          }

          return {
            localId: `sale-${item.id}`,
            id: item.id,
            product_id: item.product_id.toString(),
            variant_id: item.variant_id ? item.variant_id.toString() : "",
            quantity: item.quantity.toString(),
            unit_price: item.unit_price.toString(),
            variants,
            is_serialized: !!item.is_serialized,
            serial_options: (item.serial_numbers || []).map(
              (serialNumber, serialIndex) => ({
                id: serialIndex + 1,
                serial_number: serialNumber,
              }),
            ),
            serial_numbers: (item.serial_numbers || []).slice(),
          };
        }),
      );

      setEditId(sale.id);
      setForm({
        id: sale.id,
        customer_id: sale.customer_id?.toString() ?? "",
        payment_method: sale.payment_method ?? "cash",
        discount: sale.discount?.toString() ?? "0",
        sale_date: sale.sale_date ? sale.sale_date.slice(0, 16) : formatToday(),
        status: sale.status ?? "active",
        items: hydratedItems.length > 0 ? hydratedItems : [createItem()],
      });
      setLookupItemIndex(0);
      setLookupQuery("");
      setSheetOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load sale details");
    } finally {
      setHydrating(false);
    }
  };

  const updateItem = (index, patch) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, createItem()],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addSerial = (index) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[index];
      if (!item) return prev;
      item.serial_numbers = [...item.serial_numbers, ""];
      items[index] = item;
      return { ...prev, items };
    });
  };

  const assignSerialFromLookup = (serialNumber) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[lookupItemIndex];
      if (!item) return prev;
      if (item.serial_numbers.includes(serialNumber)) return prev;
      item.serial_numbers = [...item.serial_numbers, serialNumber];
      items[lookupItemIndex] = item;
      return { ...prev, items };
    });
  };

  const removeSerialValue = (itemIndex, serialNumber) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[itemIndex];
      if (!item) return prev;
      item.serial_numbers = item.serial_numbers.filter(
        (value) => value !== serialNumber,
      );
      items[itemIndex] = item;
      return { ...prev, items };
    });
  };

  const removeSerial = (itemIndex, serialIndex) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[itemIndex];
      if (!item) return prev;
      item.serial_numbers = item.serial_numbers.filter(
        (_, idx) => idx !== serialIndex,
      );
      items[itemIndex] = item;
      return { ...prev, items };
    });
  };

  const setSerialValue = (itemIndex, serialIndex, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = items[itemIndex];
      if (!item) return prev;
      const serials = [...item.serial_numbers];
      serials[serialIndex] = value;
      item.serial_numbers = serials;
      items[itemIndex] = item;
      return { ...prev, items };
    });
  };

  const syncProductToItem = async (index, productId, variantId = "") => {
    if (!productId) {
      updateItem(index, {
        unit_price: "",
        variants: [],
        variant_id: "",
        is_serialized: false,
        serial_options: [],
        serial_numbers: [],
      });
      return;
    }

    setItemLoadingId(index);
    try {
      const response = await axios.get(`${API_URL}/products/${productId}`);
      const product = response.data.data;
      const variants = (product.variants || []).map((variant) => ({
        id: variant.id,
        name: variant.variant_name,
        additional_price: Number(variant.additional_price || 0),
      }));

      const selectedVariant = variants.find(
        (variant) => variant.id.toString() === String(variantId || ""),
      );

      updateItem(index, {
        variants,
        is_serialized: !!product.is_serialized,
        unit_price: (
          Number(product.selling_price || 0) +
          Number(selectedVariant?.additional_price || 0)
        ).toString(),
        serial_numbers: [],
        serial_options: [],
        variant_id:
          variants.length > 0 && selectedVariant
            ? selectedVariant.id.toString()
            : variants.length === 0
              ? ""
              : variantId,
      });

      if (product.is_serialized) {
        const serialResponse = await axios.get(
          `${API_URL}/sales/products/${productId}/serials`,
          {
            params: { variant_id: variantId || undefined, search: lookupQuery },
          },
        );

        updateItem(index, {
          serial_options: serialResponse.data.data || [],
        });
      }
    } catch {
      toast.error("Failed to load product details");
    } finally {
      setItemLoadingId(null);
    }
  };

  const refreshLookupSerials = async (itemIndex) => {
    const item = form.items[itemIndex];
    if (!item?.product_id || !item.is_serialized) return;

    const response = await axios.get(
      `${API_URL}/sales/products/${item.product_id}/serials`,
      {
        params: {
          variant_id: item.variant_id || undefined,
          search: lookupQuery,
        },
      },
    );

    updateItem(itemIndex, {
      serial_options: response.data.data || [],
    });
  };

  const handleVariantChange = async (index, variantId) => {
    updateItem(index, { variant_id: variantId, serial_numbers: [] });
    const item = form.items[index];
    if (item?.product_id) {
      await syncProductToItem(index, item.product_id, variantId);
      if (item.is_serialized) {
        await refreshLookupSerials(index);
      }
    }
  };

  const validate = () => {
    if (form.items.length === 0) return "Add at least one item";

    for (let i = 0; i < form.items.length; i += 1) {
      const item = form.items[i];
      if (!item.product_id) return `Item ${i + 1}: product is required`;
      if (item.variants.length > 0 && !item.variant_id) {
        return `Item ${i + 1}: variant is required`;
      }
      if (item.is_serialized) {
        const chosenSerials = parseSerialNumbers(item.serial_numbers);
        if (chosenSerials.length === 0) {
          return `Item ${i + 1}: add at least one serial number`;
        }
      } else if (!Number(item.quantity) || Number(item.quantity) <= 0) {
        return `Item ${i + 1}: valid quantity is required`;
      }
      if (item.unit_price === "" || Number.isNaN(Number(item.unit_price))) {
        return `Item ${i + 1}: valid unit price is required`;
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
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      payment_method: form.payment_method,
      discount: Number(form.discount) || 0,
      sale_date: form.sale_date,
      items: form.items.map((item) => ({
        product_id: Number(item.product_id),
        variant_id: item.variant_id ? Number(item.variant_id) : null,
        quantity: item.is_serialized
          ? parseSerialNumbers(item.serial_numbers).length
          : Number(item.quantity),
        unit_price: Number(item.unit_price),
        serial_numbers: item.is_serialized
          ? parseSerialNumbers(item.serial_numbers)
          : [],
      })),
    };

    try {
      if (editId) {
        await axios.put(`${API_URL}/sales/${editId}`, payload);
        toast.success("Sale updated");
      } else {
        await axios.post(`${API_URL}/sales`, payload);
        toast.success("Sale created");
      }
      setSheetOpen(false);
      resetForm();
      setEditId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredSales = useMemo(() => {
    const query = search.toLowerCase();
    return sales.filter((sale) =>
      [sale.invoice_no, sale.customer_name, sale.sale_date, sale.payment_method]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [sales, search]);

  const totalAmount = useMemo(() => {
    const total = form.items.reduce((sum, item) => {
      const quantity = item.is_serialized
        ? parseSerialNumbers(item.serial_numbers).length
        : Number(item.quantity || 0);
      return sum + quantity * Number(item.unit_price || 0);
    }, 0);
    return Math.max(total - (Number(form.discount) || 0), 0);
  }, [form.items, form.discount]);

  const activeLookupItem = form.items[lookupItemIndex];
  const lookupSerialOptions = useMemo(() => {
    if (!activeLookupItem?.serial_options?.length) return [];
    const query = lookupQuery.toLowerCase();
    return activeLookupItem.serial_options.filter((option) =>
      option.serial_number.toLowerCase().includes(query),
    );
  }, [activeLookupItem, lookupQuery]);

  const handleCancelSale = async () => {
    if (!cancelTarget) return;

    try {
      await axios.patch(`${API_URL}/sales/${cancelTarget.id}/cancel`);
      toast.success("Sale canceled");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Cancel failed");
    } finally {
      setCancelTarget(null);
    }
  };

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice, customer, date, payment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> New Sale
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
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No sales yet
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium font-mono">
                      {sale.invoice_no}
                    </TableCell>
                    <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                    <TableCell>{sale.sale_date || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {sale.payment_method || "cash"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sale.status === "canceled" ? "secondary" : "default"
                        }
                        className="capitalize"
                      >
                        {sale.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {sale.item_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      Rs. {Number(sale.final_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void openInvoice(sale.id)}
                        title="Print invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void openEdit(sale.id)}
                        disabled={sale.status === "canceled" || hydrating}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCancelTarget(sale)}
                        disabled={sale.status === "canceled"}
                      >
                        <Ban className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) resetForm();
        }}
      >
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-5xl">
          <SheetHeader className="mb-4 px-6 pt-6">
            <SheetTitle>{editId ? "Edit Sale" : "Create Sale"}</SheetTitle>
            <SheetDescription>
              Add products, select serials for serialized stock, and post the
              sale.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select
                  value={form.payment_method}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, payment_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Discount (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      discount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Sale Date</Label>
                <Input
                  type="datetime-local"
                  value={form.sale_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sale_date: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Serial Lookup
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Search in-stock serials for the selected serialized item and
                    add them quickly.
                  </p>
                </div>
                <Select
                  value={lookupItemIndex.toString()}
                  onValueChange={(value) => setLookupItemIndex(Number(value))}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Pick item" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.items.map((item, index) => (
                      <SelectItem key={item.localId} value={index.toString()}>
                        Item {index + 1}
                        {item.product_id
                          ? ` · ${products.find((p) => p.id.toString() === item.product_id)?.name || "Product"}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={lookupQuery}
                  onChange={(event) => {
                    setLookupQuery(event.target.value);
                    void refreshLookupSerials(lookupItemIndex);
                  }}
                  placeholder="Search serial number"
                />
              </div>

              {!activeLookupItem?.product_id ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  Choose a product in the item list to load its available
                  serials.
                </p>
              ) : activeLookupItem?.is_serialized ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {lookupSerialOptions.length === 0 ? (
                    <p className="sm:col-span-2 lg:col-span-3 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                      No matching in-stock serials found.
                    </p>
                  ) : (
                    lookupSerialOptions.map((serial) => (
                      <button
                        type="button"
                        key={serial.id}
                        className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm hover:border-primary"
                        onClick={() =>
                          assignSerialFromLookup(serial.serial_number)
                        }
                      >
                        <span className="font-mono">
                          {serial.serial_number}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Add
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  The selected item is not serialized.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Items
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Serialized products require one serial number per unit.
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
                  const selectedProduct = products.find(
                    (product) => product.id.toString() === item.product_id,
                  );
                  const itemQuantity = item.is_serialized
                    ? parseSerialNumbers(item.serial_numbers).length
                    : Number(item.quantity || 0);
                  const rowSubtotal =
                    itemQuantity * Number(item.unit_price || 0);

                  return (
                    <div
                      key={item.localId}
                      className="rounded-lg border p-4 space-y-4 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
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
                            onValueChange={(value) => {
                              setLookupItemIndex(index);
                              updateItem(index, {
                                product_id: value,
                                variant_id: "",
                              });
                              void syncProductToItem(index, value);
                            }}
                            disabled={hydrating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
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
                            onValueChange={(value) => {
                              setLookupItemIndex(index);
                              updateItem(index, { variant_id: value });
                              void handleVariantChange(index, value);
                            }}
                            disabled={!item.variants.length || hydrating}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  item.variants.length
                                    ? "Select variant"
                                    : "No variants"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {item.variants.map((variant) => (
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
                            value={
                              item.is_serialized ? itemQuantity : item.quantity
                            }
                            onChange={(event) =>
                              updateItem(index, {
                                quantity: event.target.value,
                              })
                            }
                            disabled={item.is_serialized || hydrating}
                          />
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                          <Label>Unit Price</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(event) =>
                              updateItem(index, {
                                unit_price: event.target.value,
                              })
                            }
                            disabled={hydrating}
                          />
                        </div>

                        {selectedProduct?.is_serialized && (
                          <div className="space-y-2 lg:col-span-12">
                            <div className="flex items-center justify-between">
                              <Label>Serial Numbers</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addSerial(index)}
                                disabled={!item.product_id || hydrating}
                              >
                                Add Serial
                              </Button>
                            </div>

                            {item.serial_numbers.length === 0 ? (
                              <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                                Add one serial for each unit sold.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {item.serial_numbers.map(
                                  (serial, serialIndex) => {
                                    return (
                                      <div
                                        key={`${item.localId}-serial-${serialIndex}`}
                                        className="flex items-center gap-2"
                                      >
                                        <Select
                                          value={serial}
                                          onValueChange={(value) =>
                                            setSerialValue(
                                              index,
                                              serialIndex,
                                              value,
                                            )
                                          }
                                          disabled={
                                            hydrating ||
                                            !item.serial_options.length
                                          }
                                        >
                                          <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Select serial" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {item.serial_options.map(
                                              (option) => (
                                                <SelectItem
                                                  key={option.id}
                                                  value={option.serial_number}
                                                  disabled={item.serial_numbers.some(
                                                    (value, idx) =>
                                                      idx !== serialIndex &&
                                                      value ===
                                                        option.serial_number,
                                                  )}
                                                >
                                                  {option.serial_number}
                                                </SelectItem>
                                              ),
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            removeSerial(index, serialIndex)
                                          }
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Quantity is derived from the number of serials
                              selected.
                            </p>
                          </div>
                        )}
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
                            "Choose a product to load price and serials"
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

              <div className="flex items-center justify-between rounded-md bg-muted/60 px-4 py-3 text-sm">
                <span className="inline-flex items-center gap-2">
                  <BadgePercent className="h-4 w-4" /> Final Amount
                </span>
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
              <Button type="submit" disabled={saving || hydrating}>
                {saving ? "Saving…" : editId ? "Save Changes" : "Create Sale"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <SalesInvoice
        sale={invoiceSale}
        open={!!invoiceSale}
        onClose={() => setInvoiceSale(null)}
      />

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{cancelTarget?.invoice_no}</strong> will be canceled and
              all serials and stock will be returned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              className="bg-destructive hover:bg-destructive/90"
            >
              Cancel Sale
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
