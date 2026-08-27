import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, RefreshCw, Search } from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const STATUS_STYLE = {
  purchased: "bg-emerald-100 text-emerald-700 border-emerald-200",
  assigned: "bg-sky-100 text-sky-700 border-sky-200",
  revoked: "bg-rose-100 text-rose-700 border-rose-200",
  expired: "bg-amber-100 text-amber-700 border-amber-200",
};

const emptyForm = {
  software_catalog_id: "",
  license_key: "",
  license_type: "lifetime",
  subscription_start_date: "",
  subscription_end_date: "",
  notes: "",
};

function AddKeySheet({ open, onClose, catalogs, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) setForm(emptyForm); }, [open]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.software_catalog_id || !form.license_key.trim())
      return toast.error("Select software and enter the license key");
    if (form.license_type === "subscription" && !form.subscription_end_date)
      return toast.error("Subscription end date is required");
    setSaving(true);
    try {
      await axios.post(`${API_URL}/software-keys`, {
        ...form,
        software_catalog_id: Number(form.software_catalog_id),
      });
      toast.success("Software key added to inventory");
      onCreated();
      onClose();
    } catch (errorResponse) {
      toast.error(errorResponse.response?.data?.Error || "Could not add software key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <div className="border-b px-6 py-5">
          <SheetTitle className="text-base">Add Software Key</SheetTitle>
          <p className="mt-1 text-xs text-muted-foreground">Add a purchased key so it is available for assembly.</p>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label>Software <span className="text-destructive">*</span></Label>
            <Select value={form.software_catalog_id} onValueChange={(value) => update("software_catalog_id", value)}>
              <SelectTrigger><SelectValue placeholder="Select software" /></SelectTrigger>
              <SelectContent>
                {catalogs.map((catalog) => <SelectItem key={catalog.id} value={String(catalog.id)}>{catalog.name}{catalog.version ? ` ${catalog.version}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>License Key <span className="text-destructive">*</span></Label>
            <Input value={form.license_key} onChange={(event) => update("license_key", event.target.value)} className="font-mono" placeholder="XXXXX-XXXXX-XXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>License Type</Label>
            <Select value={form.license_type} onValueChange={(value) => update("license_type", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lifetime">Lifetime</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.license_type === "subscription" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.subscription_start_date} onChange={(event) => update("subscription_start_date", event.target.value)} /></div>
              <div className="space-y-1.5"><Label>End Date <span className="text-destructive">*</span></Label><Input type="date" value={form.subscription_end_date} onChange={(event) => update("subscription_end_date", event.target.value)} /></div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Purchase reference or internal notes..." rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Adding..." : "Add Key"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SoftwareKeys() {
  const [keys, setKeys] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [catalogId, setCatalogId] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysResponse, catalogsResponse] = await Promise.all([
        axios.get(`${API_URL}/software-keys`),
        axios.get(`${API_URL}/catalogs/main-software`),
      ]);
      setKeys(keysResponse.data.data || []);
      setCatalogs(catalogsResponse.data.data || []);
    } catch (errorResponse) {
      toast.error(errorResponse.response?.data?.Error || "Could not load software keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    axios.get(`${API_URL}/auth/me`)
      .then((response) => setCanManage(["admin", "manager"].includes(response.data.user?.role)))
      .catch(() => setCanManage(false));
  }, []);

  const filteredKeys = useMemo(() => keys.filter((key) => {
    const matchesSearch = !search.trim() || [key.license_key, key.software_name, key.software_version]
      .filter(Boolean).some((value) => value.toLowerCase().includes(search.trim().toLowerCase()));
    return matchesSearch
      && (status === "all" || key.status === status)
      && (catalogId === "all" || String(key.software_catalog_id) === catalogId);
  }), [keys, search, status, catalogId]);

  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-6xl space-y-5 py-4">
        <AddKeySheet open={addOpen} onClose={() => setAddOpen(false)} catalogs={catalogs} onCreated={load} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Software Keys</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage purchased, assigned, revoked, and subscription keys.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh keys"><RefreshCw className="h-4 w-4" /></Button>
            {canManage && <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Key</Button>}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border p-4 md:grid-cols-3">
          <div className="relative md:col-span-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search key or software..." className="pl-9" /></div>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="purchased">Purchased</SelectItem><SelectItem value="assigned">Assigned</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="revoked">Revoked</SelectItem></SelectContent></Select>
          <Select value={catalogId} onValueChange={setCatalogId}><SelectTrigger><SelectValue placeholder="All software" /></SelectTrigger><SelectContent><SelectItem value="all">All software</SelectItem>{catalogs.map((catalog) => <SelectItem key={catalog.id} value={String(catalog.id)}>{catalog.name}{catalog.version ? ` ${catalog.version}` : ""}</SelectItem>)}</SelectContent></Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center space-y-2"><KeyRound className="mx-auto h-10 w-10 text-muted-foreground" /><p className="font-medium">No software keys found</p><p className="text-sm text-muted-foreground">Add purchased keys to make them available for assembly.</p></div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Software</th><th className="px-4 py-3 font-medium">License Key</th><th className="px-4 py-3 font-medium">Type</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Assignment / Expiry</th></tr></thead>
                <tbody>{filteredKeys.map((key) => (
                  <tr key={key.id} className="border-b last:border-0">
                    <td className="px-4 py-3"><p className="font-medium">{key.software_name}</p><p className="text-xs text-muted-foreground">{key.software_version || key.software_type}</p></td>
                    <td className="px-4 py-3 font-mono text-xs">{key.license_key}</td>
                    <td className="px-4 py-3 capitalize">{key.license_type}</td>
                    <td className="px-4 py-3"><Badge className={`capitalize border ${STATUS_STYLE[key.status] || ""}`}>{key.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{key.assigned_ops_serial ? `Assigned to ${key.assigned_ops_serial}` : key.license_type === "subscription" ? `Expires ${key.subscription_end_date ? new Date(key.subscription_end_date).toLocaleDateString("en-GB") : "—"}` : "Available"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
