import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Plus,
  Upload,
  Search,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// ── constants ─────────────────────────────────────────────────────────────────

const TYPES = [
  { key: "ops", label: "OPS Units", icon: Cpu },
  { key: "ram", label: "RAM", icon: MemoryStick },
  { key: "storage", label: "Storage", icon: HardDrive },
  { key: "network_card", label: "Network Cards", icon: Wifi },
];

const STATUS_COLORS = {
  in_stock: "bg-emerald-100 text-emerald-700 border-emerald-200",
  assigned: "bg-sky-100 text-sky-700 border-sky-200",
  reserved: "bg-amber-100 text-amber-700 border-amber-200",
  faulty: "bg-rose-100 text-rose-700 border-rose-200",
  retired: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUSES = ["in_stock", "assigned", "reserved", "faulty", "retired"];

const specDisplay = (type, row) => {
  if (type === "ram") return `${row.ddr_version} ${row.capacity_gb}GB${row.bus_speed_mhz ? ` ${row.bus_speed_mhz}MHz` : ""}`;
  if (type === "storage") return `${row.storage_type} ${row.form_factor} ${row.interface} ${row.capacity_gb >= 1024 ? row.capacity_gb / 1024 + "TB" : row.capacity_gb + "GB"}`;
  return row.spec_label || row.model_name || "—";
};

const specOptionLabel = (type, s) => {
  if (type === "ram") return `${s.ddr_version} ${s.capacity_gb}GB${s.bus_speed_mhz ? ` ${s.bus_speed_mhz}MHz` : ""}`;
  if (type === "storage") return `${s.storage_type} ${s.form_factor} ${s.interface} ${s.capacity_gb >= 1024 ? s.capacity_gb / 1024 + "TB" : s.capacity_gb + "GB"}`;
  return s.model_name;
};

// ── component ─────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [activeType, setActiveType] = useState("ops");
  const [items, setItems] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // single add sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [singleForm, setSingleForm] = useState({});
  const [saving, setSaving] = useState(false);

  // batch sheet
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [batchSpecId, setBatchSpecId] = useState("");
  const [batchBrand, setBatchBrand] = useState("");
  const [batchDesc, setBatchDesc] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);
  const batchRef = useRef(null);

  const loadItems = useCallback(async (type) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/inventory/${type}`);
      setItems(res.data.data || []);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpecs = useCallback(async (type) => {
    try {
      const res = await axios.get(`${API_URL}/inventory/${type}/specs`);
      setSpecs(res.data.data || []);
    } catch {
      toast.error("Failed to load specs");
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory/summary`);
      setSummary(res.data.data || {});
    } catch {}
  }, []);

  useEffect(() => {
    loadItems(activeType);
    loadSpecs(activeType);
    loadSummary();
    setSearch("");
    setFilterStatus("all");
  }, [activeType, loadItems, loadSpecs, loadSummary]);

  // ── single add ──────────────────────────────────────────────────────────────

  const openSingle = () => {
    setSingleForm({ spec_id: "", serial_number: "", motherboard_serial: "", brand: "", notes: "", batch_description: "" });
    setSheetOpen(true);
  };

  const submitSingle = async () => {
    if (!singleForm.spec_id || !singleForm.serial_number?.trim())
      return toast.error("Spec and serial number are required");
    if (activeType === "ops" && !singleForm.motherboard_serial?.trim())
      return toast.error("Motherboard serial is required for OPS");
    setSaving(true);
    try {
      await axios.post(`${API_URL}/inventory/${activeType}/single`, singleForm);
      toast.success("Item added");
      setSheetOpen(false);
      loadItems(activeType);
      loadSummary();
    } catch (e) {
      toast.error(e.response?.data?.Error || "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  // ── batch add ───────────────────────────────────────────────────────────────

  const openBatch = () => {
    setBatchText("");
    setBatchSpecId("");
    setBatchBrand("");
    setBatchDesc("");
    setBatchOpen(true);
    setTimeout(() => batchRef.current?.focus(), 100);
  };

  const submitBatch = async () => {
    if (!batchSpecId) return toast.error("Select a spec first");
    const lines = batchText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("Enter at least one serial number");

    const items = lines.map((line) => {
      if (activeType === "ops") {
        const [serial_number, motherboard_serial] = line.split(/[\t,]/);
        return { serial_number: serial_number?.trim(), motherboard_serial: motherboard_serial?.trim(), spec_id: batchSpecId };
      }
      return { serial_number: line, spec_id: batchSpecId, brand: batchBrand || null };
    });

    setBatchSaving(true);
    try {
      const res = await axios.post(`${API_URL}/inventory/${activeType}/batch`, {
        items,
        batch_description: batchDesc || null,
      });
      const { inserted, errors } = res.data;
      toast.success(`${inserted} item(s) added${errors?.length ? `, ${errors.length} skipped` : ""}`);
      if (errors?.length) errors.forEach((e) => toast.warning(e));
      setBatchOpen(false);
      loadItems(activeType);
      loadSummary();
    } catch (e) {
      toast.error(e.response?.data?.Error || "Batch import failed");
    } finally {
      setBatchSaving(false);
    }
  };

  // ── status update ───────────────────────────────────────────────────────────

  const changeStatus = async (item, status) => {
    try {
      await axios.patch(`${API_URL}/inventory/${activeType}/${item.id}/status`, { status });
      toast.success("Status updated");
      loadItems(activeType);
      loadSummary();
    } catch (e) {
      toast.error(e.response?.data?.Error || "Failed to update status");
    }
  };

  // ── filtered list ───────────────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.serial_number?.toLowerCase().includes(q) ||
      (item.motherboard_serial || "").toLowerCase().includes(q) ||
      (item.brand || "").toLowerCase().includes(q) ||
      specDisplay(activeType, item).toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeSummary = summary[activeType] || {};
  const totalInStock = activeSummary.in_stock || 0;
  const totalAssigned = activeSummary.assigned || 0;
  const totalFaulty = activeSummary.faulty || 0;

  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage OPS units, RAM, storage, and network cards.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openBatch} className="gap-1.5">
              <Upload className="h-4 w-4" /> Batch Import
            </Button>
            <Button size="sm" onClick={openSingle} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TYPES.map(({ key, label, icon: Icon }) => {
            const s = summary[key] || {};
            const inStock = s.in_stock || 0;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${activeType === key ? "ring-2 ring-primary" : "hover:shadow-sm"}`}
                onClick={() => setActiveType(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold">{inStock}</p>
                  <p className="text-xs text-muted-foreground">in stock</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Type tabs + stats row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={activeType} onValueChange={setActiveType}>
            <TabsList>
              {TYPES.map(({ key, label, icon: Icon }) => (
                <TabsTrigger key={key} value={key} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">{totalInStock} in stock</span>
            <span>·</span>
            <span className="text-sky-600 font-medium">{totalAssigned} assigned</span>
            <span>·</span>
            <span className="text-rose-600 font-medium">{totalFaulty} faulty</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { loadItems(activeType); loadSummary(); }}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search serial, brand, spec…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Number</TableHead>
                {activeType === "ops" && <TableHead>Motherboard Serial</TableHead>}
                <TableHead>Spec / Model</TableHead>
                {(activeType === "ram" || activeType === "storage") && <TableHead>Brand</TableHead>}
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.serial_number}</TableCell>
                    {activeType === "ops" && (
                      <TableCell className="font-mono text-sm text-muted-foreground">{item.motherboard_serial}</TableCell>
                    )}
                    <TableCell className="text-sm">{specDisplay(activeType, item)}</TableCell>
                    {(activeType === "ram" || activeType === "storage") && (
                      <TableCell className="text-sm text-muted-foreground">{item.brand || "—"}</TableCell>
                    )}
                    <TableCell className="text-xs text-muted-foreground">{item.batch_description || `#${item.batch_id}`}</TableCell>
                    <TableCell>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[item.status] || ""}`}>
                        {item.status?.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                            Status <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STATUSES.filter((s) => s !== item.status && s !== "assigned").map((s) => (
                            <DropdownMenuItem key={s} onClick={() => changeStatus(item, s)} className="capitalize text-sm">
                              {s.replace("_", " ")}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Single Add Sheet ──────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          {/* fixed header */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-center gap-3">
              {(() => { const Icon = TYPES.find((t) => t.key === activeType)?.icon; return Icon ? <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div> : null; })()}
              <div>
                <SheetTitle className="text-base">Add {TYPES.find((t) => t.key === activeType)?.label}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the item details below.</p>
              </div>
            </div>
          </div>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Section: Specification */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specification</p>
              <div className="space-y-1.5">
                <Label>Model / Spec <span className="text-destructive">*</span></Label>
                <Select value={singleForm.spec_id} onValueChange={(v) => setSingleForm((f) => ({ ...f, spec_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a spec" /></SelectTrigger>
                  <SelectContent>
                    {specs.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{specOptionLabel(activeType, s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(activeType === "ram" || activeType === "storage") && (
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Input
                    value={singleForm.brand || ""}
                    onChange={(e) => setSingleForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="e.g. Samsung, Kingston"
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Section: Serial Numbers */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Serial Numbers</p>
              <div className="space-y-1.5">
                <Label>Serial Number <span className="text-destructive">*</span></Label>
                <Input
                  value={singleForm.serial_number || ""}
                  onChange={(e) => setSingleForm((f) => ({ ...f, serial_number: e.target.value }))}
                  placeholder="Scan or type serial"
                  className="font-mono"
                  autoFocus
                />
              </div>
              {activeType === "ops" && (
                <div className="space-y-1.5">
                  <Label>Motherboard Serial <span className="text-destructive">*</span></Label>
                  <Input
                    value={singleForm.motherboard_serial || ""}
                    onChange={(e) => setSingleForm((f) => ({ ...f, motherboard_serial: e.target.value }))}
                    placeholder="Scan or type motherboard serial"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">The motherboard serial uniquely identifies the unit even if the cover is swapped.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Section: Batch & Notes */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch & Notes</p>
              <div className="space-y-1.5">
                <Label>Batch Description</Label>
                <Input
                  value={singleForm.batch_description || ""}
                  onChange={(e) => setSingleForm((f) => ({ ...f, batch_description: e.target.value }))}
                  placeholder="e.g. Purchase order #123"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  value={singleForm.notes || ""}
                  onChange={(e) => setSingleForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes about this item"
                />
              </div>
            </div>
          </div>

          {/* fixed footer */}
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={submitSingle} disabled={saving} className="min-w-24">
              {saving ? "Saving…" : "Add Item"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Batch Import Sheet ────────────────────────────────────────────── */}
      <Sheet open={batchOpen} onOpenChange={setBatchOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
          {/* fixed header */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <SheetTitle className="text-base">Batch Import</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{TYPES.find((t) => t.key === activeType)?.label} — scan or paste multiple serials.</p>
              </div>
            </div>
          </div>

          {/* scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* Section: Specification */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specification</p>
              <div className="space-y-1.5">
                <Label>Model / Spec <span className="text-destructive">*</span></Label>
                <Select value={batchSpecId} onValueChange={setBatchSpecId}>
                  <SelectTrigger><SelectValue placeholder="Select spec — applies to all items" /></SelectTrigger>
                  <SelectContent>
                    {specs.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{specOptionLabel(activeType, s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(activeType === "ram" || activeType === "storage") && (
                <div className="space-y-1.5">
                  <Label>Brand <span className="text-muted-foreground text-xs">(applies to all)</span></Label>
                  <Input value={batchBrand} onChange={(e) => setBatchBrand(e.target.value)} placeholder="e.g. Samsung" />
                </div>
              )}
            </div>

            <Separator />

            {/* Section: Serials */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Serial Numbers</p>
                {batchText && (
                  <span className="text-xs font-medium text-primary">
                    {batchText.split("\n").filter((l) => l.trim()).length} item(s)
                  </span>
                )}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                {activeType === "ops" ? (
                  <><p>One per line: <span className="font-mono bg-muted px-1 rounded">serial_number,motherboard_serial</span></p><p>Tab-separated also works. Scan barcodes directly.</p></>
                ) : (
                  <p>One serial number per line. Point your barcode scanner here and scan away.</p>
                )}
              </div>
              <Textarea
                ref={batchRef}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={activeType === "ops" ? "SN001,MB001\nSN002,MB002" : "SN001\nSN002\nSN003"}
                rows={12}
                className="font-mono text-sm resize-none"
              />
            </div>

            <Separator />

            {/* Section: Batch info */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch Info</p>
              <div className="space-y-1.5">
                <Label>Batch Description</Label>
                <Input value={batchDesc} onChange={(e) => setBatchDesc(e.target.value)} placeholder="e.g. Purchase order #123" />
              </div>
            </div>
          </div>

          {/* fixed footer */}
          <div className="border-t px-6 py-4 flex items-center justify-between gap-2 bg-background">
            <p className="text-xs text-muted-foreground">
              {batchText.split("\n").filter((l) => l.trim()).length} serial(s) ready to import
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
              <Button onClick={submitBatch} disabled={batchSaving} className="min-w-24">
                {batchSaving ? "Importing…" : "Import"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
