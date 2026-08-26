import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Building2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const EMPTY_FORM = { name: "", address: "", district_id: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsResponse, locationsResponse] = await Promise.all([
        axios.get(`${API_URL}/clients`),
        fetch("/districts.json").then((response) => response.json()),
      ]);
      setClients(clientsResponse.data.data || []);
      setLocations(locationsResponse || []);
    } catch {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateField = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };
  const openEdit = (client) => {
    setEditId(client.id);
    setForm({
      name: client.name || "",
      address: client.address || "",
      district_id: String(client.district_id || ""),
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.district_id)
      return toast.error("Client name and district are required");
    setSaving(true);
    try {
      const payload = { ...form, district_id: Number(form.district_id) };
      if (editId) await axios.put(`${API_URL}/clients/${editId}`, payload);
      else await axios.post(`${API_URL}/clients`, payload);
      toast.success(editId ? "Client updated" : "Client created");
      setSheetOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.Error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = useMemo(() => {
    const query = search.toLowerCase().trim();
    return clients.filter((client) =>
      [client.name, client.address, client.district_name, client.province_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [clients, search]);

  const districtsByProvince = useMemo(
    () =>
      locations.reduce((groups, location) => {
        const province = location.province || "Other";
        if (!groups[province]) groups[province] = [];
        groups[province].push(location);
        return groups;
      }, {}),
    [locations],
  );

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search clients..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> New Client
        </Button>
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">
          Loading clients...
        </p>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No clients found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="group border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-50 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-sky-800 dark:from-slate-950 dark:via-sky-950/40 dark:to-cyan-950/40"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-white">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {client.name}
                    </CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {client.district_name}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => openEdit(client)}
                    aria-label={`Edit ${client.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => setDeleteTarget(client)}
                    aria-label={`Delete ${client.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>
                    {client.address || "Address not provided"}
                    {client.province_name ? `, ${client.province_name}` : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto px-6 sm:max-w-xl">
          <SheetHeader className="border-b pb-5">
            <SheetTitle>{editId ? "Edit Client" : "Add Client"}</SheetTitle>
            <SheetDescription>
              Set the client identity and service location for future jobs.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-8 py-6">
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-4 text-sm dark:border-sky-900 dark:bg-sky-950/30">
              <p className="font-medium text-sky-950 dark:text-sky-100">
                Client details
              </p>
              <p className="mt-1 text-muted-foreground">
                Fields marked with * are required.
              </p>
            </div>
            <section className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold">Identity</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Start with the organisation&apos;s name.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-name">Client Name *</Label>
                <Input
                  id="client-name"
                  autoFocus
                  placeholder="e.g. Central College"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </div>
            </section>
            <section className="space-y-5 border-t pt-6">
              <div>
                <h3 className="text-sm font-semibold">Location</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Choose where this client is based.
                </p>
              </div>
              <div className="space-y-2">
                <Label>District *</Label>
                <Select
                  value={form.district_id}
                  onValueChange={(value) => updateField("district_id", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a district" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(districtsByProvince).map(
                      ([province, provinceLocations]) => (
                        <SelectGroup key={province}>
                          <SelectLabel>{province} Province</SelectLabel>
                          {provinceLocations.map((location) => (
                            <SelectItem
                              key={location.id}
                              value={String(location.id)}
                            >
                              {location.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The province is determined automatically.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address">Address</Label>
                <Textarea
                  id="client-address"
                  rows={4}
                  placeholder="Enter the client's full address"
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                />
              </div>
            </section>
            <SheetFooter className="border-t pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : editId
                    ? "Update Client"
                    : "Create Client"}
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
            <AlertDialogTitle>Delete client?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Clients linked to jobs may not be
              deletable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await axios.delete(`${API_URL}/clients/${deleteTarget.id}`);
                  toast.success("Client deleted");
                  fetchData();
                } catch (error) {
                  toast.error(error.response?.data?.Error || "Delete failed");
                } finally {
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
