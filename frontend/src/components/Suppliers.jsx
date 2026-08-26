import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/utils/axios";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Pencil, Trash2, Search, Truck } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchSuppliers = useCallback(() => {
    setLoading(true);
    axios
      .get(`${API_URL}/suppliers`)
      .then((response) => setSuppliers(response.data.data || []))
      .catch(() => toast.error("Failed to load suppliers"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const resetForm = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const openAdd = () => {
    resetForm();
    setSheetOpen(true);
  };

  const openEdit = (supplier) => {
    setEditId(supplier.id);
    setForm({
      name: supplier.name ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
    });
    setSheetOpen(true);
  };

  const validate = () => {
    if (!form.name.trim()) return "Supplier name is required";
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    };

    try {
      if (editId) {
        await axios.put(`${API_URL}/suppliers/${editId}`, payload);
        toast.success("Supplier updated");
      } else {
        await axios.post(`${API_URL}/suppliers`, payload);
        toast.success("Supplier created");
      }

      setSheetOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await axios.delete(`${API_URL}/suppliers/${deleteTarget.id}`);
      toast.success("Supplier deleted");
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.error || "Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredSuppliers = useMemo(() => {
    const query = search.toLowerCase();
    return suppliers.filter((supplier) => {
      return [supplier.name, supplier.phone, supplier.email, supplier.address]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [search, suppliers]);

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> New Supplier
        </Button>
      </div>


      {loading ? (
        <p className="py-16 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No suppliers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{supplier.phone || "—"}</p>
                        <p className="text-muted-foreground">
                          {supplier.email || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                      {supplier.address || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {supplier.purchase_count || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      Rs.{" "}
                      {Number(
                        supplier.total_purchase_amount || 0,
                      ).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(supplier)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="mb-4 px-6 pt-6">
            <SheetTitle>{editId ? "Edit Supplier" : "Add Supplier"}</SheetTitle>
            <SheetDescription>
              Keep supplier details organized for purchase and stock workflows.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-6">
            <div className="space-y-1">
              <Label>
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Bixton Trading"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  placeholder="e.g. 0771234567"
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="supplier@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea
                rows={4}
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="Optional supplier address"
              />
            </div>

            <SheetFooter className="px-0 pt-2">
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
                    : "Create Supplier"}
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
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be removed if it is not
              linked to purchases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
