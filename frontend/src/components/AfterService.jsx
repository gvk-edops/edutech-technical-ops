import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Wrench, Plus, Search, RefreshCw, ChevronLeft, ScanLine,
  CheckCircle2, Clock, XCircle, Cpu, MemoryStick,
  HardDrive, Wifi, KeyRound, User, CalendarDays, MapPin,
  ArrowRightLeft, Check, HeartPulse,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── constants ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  open:        { label: "Open",        color: "bg-slate-100 text-slate-600 border-slate-200",   icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700 border-amber-200",   icon: Wrench },
  completed:   { label: "Completed",   color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed:      { label: "Closed",      color: "bg-sky-100 text-sky-700 border-sky-200",          icon: XCircle },
};

const COMPONENT_META = {
  ops:          { label: "OPS Unit",     icon: Cpu,          color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  ram:          { label: "RAM Module",   icon: MemoryStick,  color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-200" },
  storage:      { label: "Storage",      icon: HardDrive,    color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200" },
  wifi_card:    { label: "Wi-Fi Card",   icon: Wifi,         color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-200" },
  software_key: { label: "Software Key", icon: KeyRound,     color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200" },
};

const fmtCap = (gb) => (gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.open;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.color}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

// ── Create Repair Sheet ────────────────────────────────────────────────────────

function SearchCreateRepairSheet({ open, onClose, onCreated }) {
  const [serial, setSerial] = useState("");
  const [units, setUnits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [issue, setIssue] = useState("");
  const [techId, setTechId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [technicians, setTechnicians] = useState([]);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      axios.get(`${API_URL}/afterservice/technicians`).then((r) => setTechnicians(r.data.data || [])).catch(() => {});
      setTimeout(() => searchRef.current?.focus(), 150);
    } else {
      setSerial(""); setUnits([]); setSelectedUnit(null); setIssue(""); setTechId("");
    }
  }, [open]);

  const handleSearch = async () => {
    if (!serial.trim()) return;
    setSearching(true);
    try {
      const res = await axios.get(`${API_URL}/afterservice/units?serial=${encodeURIComponent(serial)}`);
      setUnits(res.data.data || []);
      if (res.data.data?.length === 0) toast.error("No units found for that serial");
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  };

  const handleSubmit = async () => {
    if (!selectedUnit) return toast.error("Select a unit first");
    if (!issue.trim()) return toast.error("Describe the reported issue");
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/afterservice`, {
        assembled_unit_id: selectedUnit.id,
        client_id: selectedUnit.client_id,
        reported_issue: issue,
        technician_id: techId || null,
        start_date: startDate || null,
      });
      toast.success(`${res.data.repair_number} created`);
      onCreated();
      onClose();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to create"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-200">
              <Wrench className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <SheetTitle className="text-base">New After-Service Job</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Search the unit by OPS serial number.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Unit search */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Find Unit</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Scan or type OPS serial…"
                  className="pl-9 font-mono"
                />
              </div>
              <Button variant="outline" onClick={handleSearch} disabled={searching} className="shrink-0">
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {units.length > 0 && (
              <div className="space-y-1.5">
                {units.map((u) => (
                  <button key={u.id} onClick={() => setSelectedUnit(u)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors space-y-0.5
                      ${selectedUnit?.id === u.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-semibold">{u.ops_serial}</p>
                      <span className={`text-xs rounded-full border px-2 py-0.5 capitalize
                        ${u.status === "in_repair" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {u.status?.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{u.ops_model} · {u.client_name} · {u.district_name}</p>
                    <p className="text-xs text-muted-foreground">Job: {u.job_number}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedUnit && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 space-y-0.5">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <p className="font-semibold text-sm text-emerald-800">{selectedUnit.ops_serial}</p>
                </div>
                <p className="text-xs text-emerald-700">{selectedUnit.client_name} · {selectedUnit.ops_model}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Issue */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue Details</p>
            <div className="space-y-1.5">
              <Label>Reported Issue <span className="text-destructive">*</span></Label>
              <Textarea value={issue} onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the problem reported by the client…" rows={4} />
            </div>
          </div>

          <Separator />

          {/* Assignment */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assignment</p>
            <div className="space-y-1.5">
              <Label>Assign Technician</Label>
              <Select value={techId} onValueChange={setTechId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !selectedUnit} className="min-w-28">
            {saving ? "Creating…" : "Create Job"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Replacement Sheet ──────────────────────────────────────────────────────────

function ReplacementSheet({ open, onClose, repairId, onDone }) {
  const [type, setType] = useState("");
  const [oldId, setOldId] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newId, setNewId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  // software-specific
  const [swCatalogId, setSwCatalogId] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseType, setLicenseType] = useState("lifetime");
  const [subStart, setSubStart] = useState("");
  const [subEnd, setSubEnd] = useState("");
  // available stock for hardware
  const [stock, setStock] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setType(""); setOldId(""); setNewSerial(""); setNewId(""); setNotes("");
      setSwCatalogId(""); setLicenseKey(""); setLicenseType("lifetime"); setSubStart(""); setSubEnd("");
      setStock([]);
    }
  }, [open]);

  const searchStock = async (serial) => {
    if (!serial.trim() || type === "software_key") return;
    setStockLoading(true);
    // For storage we need specId — just search all in_stock storage by serial
    try {
      let rows = [];
      if (type === "ops") {
        const r = await axios.get(`${API_URL}/inventory/ops?status=in_stock`);
        rows = (r.data.data || []).filter((i) => i.serial_number.includes(serial));
      } else if (type === "ram") {
        const r = await axios.get(`${API_URL}/inventory/ram?status=in_stock`);
        rows = (r.data.data || []).filter((i) => i.serial_number.includes(serial));
      } else if (type === "storage") {
        const r = await axios.get(`${API_URL}/inventory/storage?status=in_stock`);
        rows = (r.data.data || []).filter((i) => i.serial_number.includes(serial));
      } else if (type === "wifi_card") {
        const r = await axios.get(`${API_URL}/inventory/network_card?status=in_stock`);
        rows = (r.data.data || []).filter((i) => i.serial_number.includes(serial));
      }
      setStock(rows.slice(0, 10));
    } catch { setStock([]); }
    finally { setStockLoading(false); }
  };

  const handleSubmit = async () => {
    if (!type) return toast.error("Select component type");
    setSaving(true);
    try {
      const payload = { component_type: type, old_inventory_id: oldId || null, notes: notes || null };
      if (type === "software_key") {
        Object.assign(payload, { software_catalog_id: swCatalogId, license_key: licenseKey, license_type: licenseType, subscription_start_date: subStart || null, subscription_end_date: subEnd || null });
      } else {
        payload.new_inventory_id = newId || null;
      }
      await axios.post(`${API_URL}/afterservice/${repairId}/replacement`, payload);
      toast.success("Replacement logged");
      onDone();
      onClose();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <SheetTitle className="text-base">Log Replacement</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Record a component swap for this repair.</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-1.5">
            <Label>Component Type <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(COMPONENT_META).map(([key, m]) => {
                const Icon = m.icon;
                return (
                  <button key={key} onClick={() => { setType(key); setStock([]); setNewId(""); setNewSerial(""); }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors
                      ${type === key ? `${m.bg} ${m.border} ${m.color}` : "hover:bg-muted/50"}`}>
                    <Icon className="h-5 w-5" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {type && type !== "software_key" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Old Component ID (optional)</Label>
                <Input value={oldId} onChange={(e) => setOldId(e.target.value)} placeholder="ID of faulty component" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New Component Serial</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input value={newSerial} onChange={(e) => setNewSerial(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchStock(newSerial)}
                      placeholder="Scan or type serial…" className="pl-9 font-mono" />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => searchStock(newSerial)} disabled={stockLoading}>
                    {stockLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {stock.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {stock.map((s) => (
                      <button key={s.id} onClick={() => { setNewId(String(s.id)); setNewSerial(s.serial_number); setStock([]); }}
                        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors
                          ${newId === String(s.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                        <span className="font-mono">{s.serial_number}</span>
                        <span className="text-xs text-muted-foreground">{s.spec_label || s.model_name || ""}</span>
                      </button>
                    ))}
                  </div>
                )}
                {newId && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> ID {newId} selected</p>
                )}
              </div>
            </>
          )}

          {type === "software_key" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Software Catalog ID</Label>
                <Input value={swCatalogId} onChange={(e) => setSwCatalogId(e.target.value)} placeholder="e.g. 1" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New License Key <span className="text-destructive">*</span></Label>
                <Input value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX" className="font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">License Type</Label>
                  <Select value={licenseType} onValueChange={setLicenseType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                      <SelectItem value="subscription">Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {licenseType === "subscription" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start Date</Label>
                    <Input type="date" value={subStart} onChange={(e) => setSubStart(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" value={subEnd} onChange={(e) => setSubEnd(e.target.value)} className="h-8 text-xs" />
                  </div>
                </div>
              )}
            </>
          )}

          {type && (
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for replacement…" rows={2} />
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !type} className="min-w-28">
            {saving ? "Saving…" : "Log Replacement"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Repair Detail ──────────────────────────────────────────────────────────────

function RepairDetail({ repairId, onBack }) {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/afterservice/${repairId}`);
      setRepair(res.data.data);
      setNotes(res.data.data.notes || "");
    } catch { toast.error("Failed to load repair"); }
    finally { setLoading(false); }
  }, [repairId]);

  useEffect(() => { load(); }, [load]);

  const handleStatus = async (status) => {
    setSavingStatus(true);
    try {
      await axios.patch(`${API_URL}/afterservice/${repairId}/status`, { status });
      toast.success("Status updated");
      load();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed"); }
    finally { setSavingStatus(false); }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await axios.patch(`${API_URL}/afterservice/${repairId}/notes`, { notes });
      toast.success("Notes saved");
    } catch { toast.error("Failed to save notes"); }
    finally { setSavingNotes(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!repair) return null;

  const nextStatuses = {
    open: ["in_progress", "closed"],
    in_progress: ["completed", "closed"],
    completed: ["closed"],
    closed: [],
  }[repair.status] || [];

  return (
    <div className="space-y-5">
      <ReplacementSheet open={replacementOpen} onClose={() => setReplacementOpen(false)} repairId={repairId} onDone={load} />

      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" /> All Jobs
      </Button>

      {/* Header */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xl font-bold">{repair.repair_number}</p>
            <p className="text-muted-foreground">{repair.client_name}{repair.client_phone ? ` · ${repair.client_phone}` : ""}</p>
          </div>
          <StatusBadge status={repair.status} />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {repair.technician_name && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{repair.technician_name}</span>}
          {repair.start_date && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Started {fmtDate(repair.start_date)}</span>}
          {repair.end_date && <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Completed {fmtDate(repair.end_date)}</span>}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Reported Issue</p>
          <p className="text-sm">{repair.reported_issue}</p>
        </div>

        {nextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((s) => {
              const m = STATUS_META[s];
              const Icon = m.icon;
              return (
                <Button key={s} variant="outline" size="sm" onClick={() => handleStatus(s)} disabled={savingStatus} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" /> Mark {m.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Unit info */}
      <div className="rounded-xl border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 border border-violet-200">
            <Cpu className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="font-mono font-bold">{repair.ops_serial}</p>
            <p className="text-xs text-muted-foreground">{repair.ops_model} · MB: {repair.motherboard_serial}</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs capitalize">{repair.unit_status?.replaceAll("_", " ")}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Job: {repair.job_number}</p>

        <Separator />

        {/* Current components */}
        <div className="grid gap-2 sm:grid-cols-2">
          {repair.rams?.length > 0 && repair.rams.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-sky-50/50 border-sky-200 px-3 py-2">
              <MemoryStick className="h-4 w-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-xs truncate">{r.serial_number}</p>
                <p className="text-xs text-muted-foreground">{r.ddr_version} {fmtCap(r.capacity_gb)}{r.brand ? ` · ${r.brand}` : ""}</p>
              </div>
            </div>
          ))}
          {repair.storages?.length > 0 && repair.storages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-amber-50/50 border-amber-200 px-3 py-2">
              <HardDrive className="h-4 w-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-xs truncate">{s.serial_number}</p>
                <p className="text-xs text-muted-foreground capitalize">{s.role}: {s.storage_type} {fmtCap(s.capacity_gb)}</p>
              </div>
            </div>
          ))}
          {repair.wifi?.serial_number && (
            <div className="flex items-center gap-2 rounded-lg border bg-emerald-50/50 border-emerald-200 px-3 py-2">
              <Wifi className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-xs truncate">{repair.wifi.serial_number}</p>
                <p className="text-xs text-muted-foreground">{repair.wifi.model_name}</p>
              </div>
            </div>
          )}
          {repair.software?.length > 0 && repair.software.map((sw, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-rose-50/50 border-rose-200 px-3 py-2">
              <KeyRound className="h-4 w-4 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{sw.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{sw.license_key}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Replacement log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Replacements <span className="text-muted-foreground font-normal text-sm">({repair.replacements?.length || 0})</span></p>
          {repair.status !== "closed" && (
            <Button size="sm" onClick={() => setReplacementOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Log Replacement
            </Button>
          )}
        </div>

        {repair.replacements?.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No replacements logged yet.
          </div>
        )}

        {repair.replacements?.map((r) => {
          const meta = COMPONENT_META[r.component_type] || COMPONENT_META.ops;
          const Icon = meta.icon;
          return (
            <div key={r.id} className={`rounded-xl border p-4 space-y-2 ${meta.bg} ${meta.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(r.replacement_date)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                {r.old_inventory_id && <span className="font-mono bg-white/70 border rounded px-1.5 py-0.5">Old ID: {r.old_inventory_id}</span>}
                {r.old_inventory_id && r.new_inventory_id && <ArrowRightLeft className="h-3 w-3" />}
                {r.new_inventory_id && <span className="font-mono bg-white/70 border rounded px-1.5 py-0.5">New ID: {r.new_inventory_id}</span>}
              </div>
              {r.notes && <p className="text-xs text-muted-foreground">{r.notes}</p>}
              {r.technician_name && <p className="text-xs text-muted-foreground">By {r.technician_name}</p>}
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="font-semibold text-sm">Service Notes</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about this repair…" rows={3} />
        <Button size="sm" variant="outline" onClick={handleSaveNotes} disabled={savingNotes}>
          {savingNotes ? "Saving…" : "Save Notes"}
        </Button>
      </div>
    </div>
  );
}

// ── Job Units panel ────────────────────────────────────────────────────────────

function JobUnits({ job, onBack, onRepairOpen }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_URL}/afterservice/jobs/${job.id}/units`)
      .then((r) => setUnits(r.data.data || []))
      .catch(() => toast.error("Failed to load units"))
      .finally(() => setLoading(false));
  }, [job.id]);

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" /> All Jobs
      </Button>

      <div className="rounded-xl border p-4 space-y-1">
        <p className="font-bold text-lg">{job.job_number}</p>
        <p className="text-sm text-muted-foreground">{job.client_name} · {job.district_name}</p>
        <p className="text-xs text-muted-foreground">{job.ops_model}</p>
      </div>

      <p className="text-sm font-semibold">Assembled Units <span className="text-muted-foreground font-normal">({units.length})</span></p>

      {loading ? (
        <div className="flex justify-center py-10"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : units.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No assembled units found.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {units.map((u) => (
            <div key={u.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 border border-violet-200">
                  <Cpu className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-bold text-sm">{u.ops_serial}</p>
                  <p className="text-xs text-muted-foreground">{u.ops_model}</p>
                </div>
                <span className={`text-xs rounded-full border px-2 py-0.5 capitalize shrink-0
                  ${u.status === "in_repair" ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                  {u.status?.replaceAll("_", " ")}
                </span>
              </div>

              {u.active_repair_id ? (
                <Button size="sm" variant="outline" className="w-full gap-1.5"
                  onClick={() => onRepairOpen(u.active_repair_id)}>
                  <Wrench className="h-3.5 w-3.5" /> View Repair · {u.repair_number}
                </Button>
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">
                  Create a repair from the Jobs page.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Create Repair Sheet (unit pre-selected) ────────────────────────────────────

function CreateRepairSheet({ open, onClose, onCreated, preselectedUnit, preselectedJob }) {
  const [issue, setIssue] = useState("");
  const [techId, setTechId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [technicians, setTechnicians] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      axios.get(`${API_URL}/afterservice/technicians`).then((r) => setTechnicians(r.data.data || [])).catch(() => {});
    } else {
      setIssue(""); setTechId("");
      setStartDate(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!issue.trim()) return toast.error("Describe the reported issue");
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/afterservice`, {
        assembled_unit_id: preselectedUnit.id,
        client_id: preselectedJob.client_id,
        reported_issue: issue,
        technician_id: techId || null,
        start_date: startDate || null,
      });
      toast.success(`${res.data.repair_number} created`);
      onCreated();
      onClose();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to create"); }
    finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <div className="px-6 py-5 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-200">
              <HeartPulse className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <SheetTitle className="text-base">New Repair Job</SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {preselectedUnit?.ops_serial} · {preselectedJob?.client_name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="rounded-lg border bg-violet-50 border-violet-200 px-3 py-2.5 flex items-center gap-3">
            <Cpu className="h-4 w-4 text-violet-600 shrink-0" />
            <div>
              <p className="font-mono font-semibold text-sm">{preselectedUnit?.ops_serial}</p>
              <p className="text-xs text-muted-foreground">{preselectedUnit?.ops_model}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reported Issue <span className="text-destructive">*</span></Label>
            <Textarea value={issue} onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe the problem reported by the client…" rows={4} />
          </div>

          <div className="space-y-1.5">
            <Label>Assign Technician</Label>
            <Select value={techId} onValueChange={setTechId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                {technicians.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving} className="min-w-28">
            {saving ? "Creating…" : "Create Job"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main AfterService page ─────────────────────────────────────────────────────

export default function AfterService() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedRepairId, setSelectedRepairId] = useState(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/afterservice/jobs`);
      const data = res.data.data || [];
      setJobs(data);
      // auto-select job from query param (coming from Jobs page)
      const jobId = searchParams.get("job");
      if (jobId) {
        const found = data.find((j) => String(j.id) === jobId);
        if (found) setSelectedJob(found);
      }
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  }, [searchParams]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // repair detail view
  if (selectedRepairId) return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl py-4">
        <RepairDetail repairId={selectedRepairId}
          onBack={() => setSelectedRepairId(null)} />
      </div>
    </main>
  );

  // job units view
  if (selectedJob) return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl py-4">
        <JobUnits
          job={selectedJob}
          onBack={() => setSelectedJob(null)}
          onRepairOpen={(id) => setSelectedRepairId(id)}
        />
      </div>
    </main>
  );

  // job list view
  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">After Service</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Select a job to manage unit repairs.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={loadJobs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center space-y-2">
            <HeartPulse className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No jobs available for after-service</p>
            <p className="text-sm text-muted-foreground">Jobs appear here once they are ready for delivery or completed.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <button key={job.id} onClick={() => setSelectedJob(job)}
                className="rounded-xl border p-4 text-left space-y-3 hover:border-primary hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold group-hover:text-primary transition-colors">{job.job_number}</p>
                    <p className="text-sm text-muted-foreground truncate">{job.client_name}</p>
                  </div>
                  {job.units_in_repair > 0 && (
                    <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 border-rose-200">
                      {job.units_in_repair} in repair
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/40 border px-3 py-2">
                  <Cpu className="h-4 w-4 text-violet-500 shrink-0" />
                  <p className="text-sm font-medium truncate">{job.ops_model}</p>
                </div>

                <Separator />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.district_name}</span>
                  <span>{job.units_ready} unit{job.units_ready !== 1 ? "s" : ""} assembled</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
