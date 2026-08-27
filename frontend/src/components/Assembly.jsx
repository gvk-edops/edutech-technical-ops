import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Cpu, MemoryStick, HardDrive, Wifi, Package, CheckCircle2,
  ChevronLeft, ChevronRight, AlertTriangle, Trash2, Plus,
  ScanLine, RefreshCw, Check, Wrench, CalendarDays, MapPin,
  KeyRound, Monitor, ShieldCheck, X,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

// ── constants ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: "ops",      label: "OPS Unit",   icon: Cpu,          color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-200" },
  { id: "ram",      label: "RAM",        icon: MemoryStick,  color: "text-sky-600",    bg: "bg-sky-50",     border: "border-sky-200" },
  { id: "storage",  label: "Storage",    icon: HardDrive,    color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-200" },
  { id: "wifi",     label: "Wi-Fi Card", icon: Wifi,         color: "text-emerald-600",bg: "bg-emerald-50", border: "border-emerald-200" },
  { id: "software", label: "Software",   icon: Package,      color: "text-rose-600",   bg: "bg-rose-50",    border: "border-rose-200" },
  { id: "complete", label: "Complete",   icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",   border: "border-green-200" },
];

const fmtCap = (gb) => (gb >= 1024 ? `${gb / 1024}TB` : `${gb}GB`);

const JOB_STATUS_COLOR = {
  created: "bg-slate-100 text-slate-600 border-slate-200",
  assembly_in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  ready_for_delivery: "bg-sky-100 text-sky-700 border-sky-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// ── reusable pieces ────────────────────────────────────────────────────────────

function ScanInput({ placeholder, onScan, autoFocus, disabled }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus) setTimeout(() => ref.current?.focus(), 150); }, [autoFocus]);
  return (
    <div className="relative">
      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={ref}
        className="pl-9 font-mono text-sm"
        placeholder={placeholder}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.value.trim()) {
            onScan(e.target.value.trim());
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

function WarnBadge({ text }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
      <AlertTriangle className="h-3 w-3" /> {text}
    </span>
  );
}

function StepPill({ step, index, current }) {
  const Icon = step.icon;
  const isDone = index < current;
  const isActive = index === current;
  return (
    <div className={`flex flex-col items-center gap-1.5 transition-opacity ${isActive || isDone ? "opacity-100" : "opacity-30"}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all
        ${isActive ? `${step.bg} ${step.border} ${step.color}` : isDone ? "bg-green-50 border-green-400 text-green-600" : "bg-muted border-border text-muted-foreground"}`}>
        {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <span className={`text-[10px] font-semibold hidden sm:block ${isActive ? step.color : isDone ? "text-green-600" : "text-muted-foreground"}`}>
        {step.label}
      </span>
    </div>
  );
}

function StepShell({ stepIndex, children, onBack, onNext, nextLabel = "Continue", nextDisabled, saving }) {
  const step = STEPS[stepIndex];
  const Icon = step.icon;
  return (
    <div className="space-y-5">
      <div className={`flex items-center gap-4 rounded-xl border p-4 ${step.bg} ${step.border}`}>
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border ${step.border}`}>
          <Icon className={`h-7 w-7 ${step.color}`} />
        </div>
        <div>
          <p className={`text-xl font-bold ${step.color}`}>{step.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Step {stepIndex + 1} of {STEPS.length}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
      <div className="flex justify-between pt-2 border-t">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={nextDisabled || saving} className="gap-2 min-w-36">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : nextLabel === "Complete Unit" ? <><CheckCircle2 className="h-4 w-4" /> Complete Unit</> : <>{nextLabel} <ChevronRight className="h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
}

// ── Step 0: OPS ────────────────────────────────────────────────────────────────

function StepOps({ job, onStarted }) {
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [scanValue, setScanValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/assembly/available-ops/${job.id}`);
      setAvailable(res.data.data || []);
    } catch { toast.error("Failed to load OPS units"); }
    finally { setLoading(false); }
  }, [job.id]);

  useEffect(() => { load(); }, [load]);

  const handleScan = (val) => {
    const found = available.find(
      (u) => u.serial_number === val || u.motherboard_serial === val
    );
    if (!found) return toast.error(`Serial "${val}" not found in stock`);
    setSelected(found);
  };

  const handleStart = async () => {
    if (!selected) return toast.error("Select an OPS unit first");
    setSaving(true);
    try {
      const res = await axios.post(`${API_URL}/assembly/start`, {
        job_id: job.id,
        ops_inventory_id: selected.id,
      });
      toast.success("Assembly unit started");
      onStarted(res.data.unit_id, selected);
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to start"); }
    finally { setSaving(false); }
  };

  return (
    <StepShell stepIndex={0} onBack={() => {}} onNext={handleStart} nextLabel="Continue" nextDisabled={!selected} saving={saving}>
      <div className="space-y-1.5">
        <Label>Scan OPS Serial Number</Label>
        <ScanInput
          placeholder="Scan serial or motherboard serial…"
          onScan={handleScan}
          autoFocus
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Required: <span className="font-medium">{job.ops_model}</span>
        </p>
      </div>

      {selected && (
        <div className={`rounded-lg border p-3 space-y-1 ${selected.matched ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm font-mono">{selected.serial_number}</p>
            {!selected.matched && <WarnBadge text="Model mismatch" />}
            {selected.matched && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Matched</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{selected.model_name} · MB: {selected.motherboard_serial}</p>
          {!selected.matched && (
            <p className="text-xs text-amber-700 mt-1">
              Job requires <strong>{job.ops_model}</strong> but this unit is <strong>{selected.model_name}</strong>. You can still proceed.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or pick from available stock</p>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No OPS units in stock</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {available.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors
                  ${selected?.id === u.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <div>
                  <p className="font-mono font-medium">{u.serial_number}</p>
                  <p className="text-xs text-muted-foreground">{u.model_name}</p>
                </div>
                {!u.matched && <WarnBadge text="Mismatch" />}
                {u.matched && <span className="text-xs text-emerald-600 font-medium">✓ Match</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </StepShell>
  );
}

// ── Step 1: RAM ────────────────────────────────────────────────────────────────

function StepRam({ job, unitId, onDone }) {
  const [available, setAvailable] = useState([]);
  const [added, setAdded] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/assembly/available-ram/${job.id}`);
      setAvailable(res.data.data || []);
    } catch { toast.error("Failed to load RAM"); }
    finally { setLoading(false); }
  }, [job.id]);

  useEffect(() => { load(); }, [load]);

  const totalAdded = added.reduce((s, r) => s + Number(r.capacity_gb), 0);
  const required = Number(job.ram_capacity_gb);
  const met = totalAdded >= required;

  const handleScan = async (val) => {
    const found = available.find((r) => r.serial_number === val);
    if (!found) return toast.error(`Serial "${val}" not found in stock`);
    if (added.find((r) => r.id === found.id)) return toast.error("Already added");
    setSaving(true);
    try {
      await axios.post(`${API_URL}/assembly/${unitId}/ram`, { ram_inventory_id: found.id });
      setAdded((prev) => [...prev, found]);
      setAvailable((prev) => prev.filter((r) => r.id !== found.id));
      toast.success(`${found.ddr_version} ${fmtCap(found.capacity_gb)} added`);
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to add RAM"); }
    finally { setSaving(false); }
  };

  const handleRemove = async (ram) => {
    try {
      await axios.delete(`${API_URL}/assembly/${unitId}/ram/${ram.id}`);
      setAdded((prev) => prev.filter((r) => r.id !== ram.id));
      setAvailable((prev) => [...prev, ram]);
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to remove"); }
  };

  return (
    <StepShell stepIndex={1} onBack={() => onDone(-1)} onNext={() => { if (!met) { toast.error(`Need ${required}GB, have ${totalAdded}GB`); return; } onDone(1); }} nextLabel="Continue" saving={saving}>
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-xs text-muted-foreground">Required</p>
          <p className="font-bold">{job.ram_ddr_version} · {required}GB total</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Added</p>
          <p className={`font-bold text-lg ${met ? "text-emerald-600" : "text-amber-600"}`}>{totalAdded}GB</p>
        </div>
      </div>

      {/* progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${met ? "bg-emerald-500" : "bg-amber-400"}`}
          style={{ width: `${Math.min((totalAdded / required) * 100, 100)}%` }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Scan RAM Serial</Label>
        <ScanInput placeholder="Scan RAM serial number…" onScan={handleScan} autoFocus disabled={saving} />
        {!met && <p className="text-xs text-amber-600">Still need {required - totalAdded}GB more</p>}
      </div>

      {added.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Added modules</p>
          {added.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border bg-sky-50 border-sky-200 px-3 py-2">
              <div>
                <p className="font-mono text-sm font-medium">{r.serial_number}</p>
                <p className="text-xs text-muted-foreground">{r.ddr_version} {fmtCap(r.capacity_gb)}{r.brand ? ` · ${r.brand}` : ""}</p>
              </div>
              {!r.matched && <WarnBadge text="DDR mismatch" />}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(r)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available stock</p>
        {loading ? <p className="text-sm text-muted-foreground text-center py-3">Loading…</p> : available.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No RAM in stock</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {available.map((r) => (
              <button key={r.id} onClick={() => handleScan(r.serial_number)}
                className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-mono font-medium">{r.serial_number}</p>
                  <p className="text-xs text-muted-foreground">{r.ddr_version} {fmtCap(r.capacity_gb)}{r.brand ? ` · ${r.brand}` : ""}</p>
                </div>
                {!r.matched && <WarnBadge text="Mismatch" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </StepShell>
  );
}

// ── Step 2: Storage ────────────────────────────────────────────────────────────

function StepStorage({ job, unitId, onDone }) {
  const [availableMap, setAvailableMap] = useState({});
  const [added, setAdded] = useState([]);
  const [saving, setSaving] = useState(false);

  const reqs = job.storage_requirements || [];

  const loadSpec = useCallback(async (specId) => {
    try {
      const res = await axios.get(`${API_URL}/assembly/available-storage/${specId}`);
      setAvailableMap((prev) => ({ ...prev, [specId]: res.data.data || [] }));
    } catch {}
  }, []);

  useEffect(() => {
    reqs.forEach((r) => loadSpec(r.storage_spec_id));
  }, [reqs, loadSpec]);

  const handleScan = async (val, req) => {
    const pool = availableMap[req.storage_spec_id] || [];
    const found = pool.find((s) => s.serial_number === val);
    if (!found) return toast.error(`Serial "${val}" not found for this spec`);
    if (added.find((s) => s.id === found.id)) return toast.error("Already added");
    setSaving(true);
    try {
      await axios.post(`${API_URL}/assembly/${unitId}/storage`, {
        storage_inventory_id: found.id,
        role: req.role,
      });
      setAdded((prev) => [...prev, { ...found, role: req.role, storage_spec_id: req.storage_spec_id }]);
      setAvailableMap((prev) => ({
        ...prev,
        [req.storage_spec_id]: (prev[req.storage_spec_id] || []).filter((s) => s.id !== found.id),
      }));
      toast.success(`${req.role} storage added`);
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to add storage"); }
    finally { setSaving(false); }
  };

  const handleRemove = async (item) => {
    try {
      await axios.delete(`${API_URL}/assembly/${unitId}/storage/${item.id}`);
      setAdded((prev) => prev.filter((s) => s.id !== item.id));
      setAvailableMap((prev) => ({
        ...prev,
        [item.storage_spec_id]: [...(prev[item.storage_spec_id] || []), item],
      }));
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to remove"); }
  };

  const allFilled = reqs.every((r) => added.find((a) => a.role === r.role));

  return (
    <StepShell stepIndex={2} onBack={() => onDone(-1)} onNext={() => { if (!allFilled) { toast.error("Complete all required storage roles"); return; } onDone(1); }} nextLabel="Continue" saving={saving}>
      {reqs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          No storage requirements for this job.
        </div>
      ) : (
        reqs.map((req) => {
          const filledItem = added.find((a) => a.role === req.role);
          const pool = availableMap[req.storage_spec_id] || [];
          return (
            <div key={req.role} className={`rounded-xl border p-4 space-y-3 ${filledItem ? "border-amber-300 bg-amber-50/50" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold capitalize">{req.role} Drive</p>
                  <p className="text-xs text-muted-foreground">
                    {req.storage_type} · {req.form_factor} · {req.interface} · {fmtCap(req.capacity_gb)}
                  </p>
                </div>
                {filledItem ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Filled</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                )}
              </div>
              {filledItem ? (
                <div className="flex items-center justify-between rounded-lg bg-white border px-3 py-2">
                  <div>
                    <p className="font-mono text-sm font-medium">{filledItem.serial_number}</p>
                    <p className="text-xs text-muted-foreground">{filledItem.brand || "—"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(filledItem)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <ScanInput placeholder={`Scan ${req.role} drive serial…`} onScan={(v) => handleScan(v, req)} disabled={saving} />
                  {pool.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {pool.map((s) => (
                        <button key={s.id} onClick={() => handleScan(s.serial_number, req)}
                          className="w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/50">
                          <span className="font-mono">{s.serial_number}</span>
                          <span className="text-xs text-muted-foreground">{s.brand || "—"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </StepShell>
  );
}

// ── Step 3: Wi-Fi ──────────────────────────────────────────────────────────────

function StepWifi({ unitId, onDone }) {
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState(null);
  const [skipped, setSkipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/assembly/available-network-cards`)
      .then((r) => setAvailable(r.data.data || []))
      .catch(() => toast.error("Failed to load network cards"))
      .finally(() => setLoading(false));
  }, []);

  const handleScan = (val) => {
    const found = available.find((c) => c.serial_number === val);
    if (!found) return toast.error(`Serial "${val}" not found`);
    setSelected(found);
    setSkipped(false);
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/assembly/${unitId}/wifi`, {
        wifi_card_inventory_id: skipped ? null : selected?.id || null,
      });
      onDone(1);
    } catch (e) { toast.error(e.response?.data?.Error || "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <StepShell stepIndex={3} onBack={() => onDone(-1)} onNext={handleNext} nextLabel="Continue" saving={saving}>
      <div className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
        Wi-Fi card is optional. Skip if not required for this unit.
      </div>

      <div className="space-y-1.5">
        <Label>Scan Wi-Fi Card Serial</Label>
        <ScanInput placeholder="Scan serial number…" onScan={handleScan} autoFocus disabled={loading || saving} />
      </div>

      {selected && !skipped && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5">
          <div>
            <p className="font-mono text-sm font-medium">{selected.serial_number}</p>
            <p className="text-xs text-muted-foreground">{selected.model_name}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {!loading && available.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {available.map((c) => (
              <button key={c.id} onClick={() => { setSelected(c); setSkipped(false); }}
                className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors
                  ${selected?.id === c.id && !skipped ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                <span className="font-mono">{c.serial_number}</span>
                <span className="text-xs text-muted-foreground">{c.model_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" className="w-full text-muted-foreground" onClick={() => { setSkipped(true); setSelected(null); }}>
        {skipped ? <><Check className="h-4 w-4 mr-2 text-emerald-600" /> Skipping Wi-Fi</> : "Skip — No Wi-Fi card for this unit"}
      </Button>
    </StepShell>
  );
}

// ── Step 4: Software ───────────────────────────────────────────────────────────

function StepSoftware({ job, unitId, onDone }) {
  const reqs = useMemo(() => job.main_software_requirements || [], [job.main_software_requirements]);
  const [keys, setKeys] = useState(() =>
    Object.fromEntries(reqs.map((r) => [r.software_catalog_id, { software_key_id: "", saved: false }]))
  );
  const [availableKeys, setAvailableKeys] = useState({});
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all(reqs.map((req) => axios.get(`${API_URL}/software-keys?status=purchased&software_catalog_id=${req.software_catalog_id}`)))
      .then((responses) => {
        if (!active) return;
        setAvailableKeys(Object.fromEntries(responses.map((response, index) => [reqs[index].software_catalog_id, response.data.data || []])));
      })
      .catch(() => active && toast.error("Failed to load available software keys"))
      .finally(() => active && setLoadingKeys(false));
    return () => { active = false; };
  }, [reqs]);

  const update = (id, field, val) =>
    setKeys((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val, saved: false } }));

  const saveKey = async (req) => {
    const k = keys[req.software_catalog_id];
    if (!k.software_key_id) return toast.error("Select an available software key");
    setSaving(true);
    try {
      await axios.post(`${API_URL}/assembly/${unitId}/software`, {
        software_catalog_id: req.software_catalog_id,
        software_key_id: Number(k.software_key_id),
      });
      setKeys((prev) => ({ ...prev, [req.software_catalog_id]: { ...prev[req.software_catalog_id], saved: true } }));
      toast.success(`${req.name} key saved`);
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to save key"); }
    finally { setSaving(false); }
  };

  const allSaved = reqs.every((r) => keys[r.software_catalog_id]?.saved);

  return (
    <StepShell stepIndex={4} onBack={() => onDone(-1)}
      onNext={() => { if (reqs.length > 0 && !allSaved) { toast.error("Save all software keys first"); return; } onDone(1); }}
      nextLabel="Continue" saving={saving}>
      {reqs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
          No software requirements for this job.
        </div>
      ) : (
        reqs.map((req) => {
          const k = keys[req.software_catalog_id];
          return (
            <div key={req.software_catalog_id} className={`rounded-xl border p-4 space-y-3 ${k.saved ? "border-emerald-300 bg-emerald-50/40" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-rose-500" />
                  <div>
                    <p className="font-semibold text-sm">{req.name}{req.version ? ` ${req.version}` : ""}</p>
                    <p className="text-xs text-muted-foreground capitalize">{req.software_type?.replace("_", " ")}</p>
                  </div>
                </div>
                {k.saved && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><Check className="h-3 w-3 mr-1" />Saved</Badge>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Available License Key *</Label>
                <Select value={k.software_key_id} onValueChange={(value) => update(req.software_catalog_id, "software_key_id", value)} disabled={k.saved || loadingKeys}>
                  <SelectTrigger><SelectValue placeholder={loadingKeys ? "Loading keys..." : "Select a purchased key"} /></SelectTrigger>
                  <SelectContent>
                    {(availableKeys[req.software_catalog_id] || []).map((key) => (
                      <SelectItem key={key.id} value={String(key.id)}>{key.license_key}{key.license_type === "subscription" && key.subscription_end_date ? ` · expires ${key.subscription_end_date}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loadingKeys && (availableKeys[req.software_catalog_id] || []).length === 0 && <p className="text-xs text-amber-700">No purchased keys are available for this software.</p>}
              </div>

              {!k.saved && (
                <Button size="sm" onClick={() => saveKey(req)} disabled={saving} className="w-full gap-2">
                  <ShieldCheck className="h-4 w-4" /> Save Key
                </Button>
              )}
              {k.saved && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs text-emerald-700">Assigned key is locked for this unit.</p>
              )}
            </div>
          );
        })
      )}
    </StepShell>
  );
}

// ── Step 5: Complete ───────────────────────────────────────────────────────────

function StepComplete({ unitId, opsSerial, onDone }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/assembly/${unitId}/complete`, { notes });
      toast.success("Unit assembled successfully!");
      onDone();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to complete"); }
    finally { setSaving(false); }
  };

  return (
    <StepShell stepIndex={5} onBack={() => onDone(-1)} onNext={handleComplete} nextLabel="Complete Unit" saving={saving}>
      <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-center space-y-2">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
        <p className="font-bold text-lg text-green-700">Ready to complete</p>
        <p className="text-sm text-muted-foreground">OPS unit <span className="font-mono font-medium">{opsSerial}</span> has been assembled.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this unit…" rows={3} />
      </div>
    </StepShell>
  );
}

// ── Unit Wizard ────────────────────────────────────────────────────────────────

function UnitWizard({ job, onBack, onUnitDone }) {
  const isSmartboardOnly = job.job_type === "smartboard";

  // smartboard-only: skip OPS/RAM/Storage/WiFi — just Software + Complete
  // for smartboard-only we create a pseudo unit with no OPS scan
  const activeSteps = isSmartboardOnly
    ? STEPS.filter((s) => s.id === "software" || s.id === "complete")
    : STEPS;

  const [step, setStep] = useState(0);
  const [unitId, setUnitId] = useState(null);
  const [opsSerial, setOpsSerial] = useState("");

  // For smartboard-only, auto-create a unit stub on mount (no OPS needed)
  useEffect(() => {
    if (!isSmartboardOnly || unitId) return;
    // smartboard jobs have no ops_inventory_id requirement — skip startAssembly
    // we'll mark unitId as -1 to signal "no unit yet, complete step will handle"
  }, [isSmartboardOnly, unitId]);

  const globalIndex = (localStep) => STEPS.indexOf(activeSteps[localStep]);

  const handleStep = (dir) => {
    if (dir === -1 && step === 0) { onBack(); return; }
    setStep((s) => s + dir);
  };

  return (
    <div className="space-y-6">
      {/* step progress bar */}
      <div className="flex items-center justify-between px-2">
        {activeSteps.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <StepPill step={s} index={i} current={step} />
            {i < activeSteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors ${i < step ? "bg-green-400" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* OPS step — only for ops/both */}
      {!isSmartboardOnly && step === 0 && (
        <StepOps job={job} onStarted={(id, ops) => { setUnitId(id); setOpsSerial(ops.serial_number); setStep(1); }} />
      )}
      {!isSmartboardOnly && step === 1 && unitId && (
        <StepRam job={job} unitId={unitId} onDone={handleStep} />
      )}
      {!isSmartboardOnly && step === 2 && unitId && (
        <StepStorage job={job} unitId={unitId} onDone={handleStep} />
      )}
      {!isSmartboardOnly && step === 3 && unitId && (
        <StepWifi unitId={unitId} onDone={handleStep} />
      )}

      {/* Software step */}
      {activeSteps[step]?.id === "software" && (
        <StepSoftware
          job={job}
          unitId={unitId}
          isSmartboardOnly={isSmartboardOnly}
          onUnitCreated={(id) => setUnitId(id)}
          onDone={handleStep}
        />
      )}

      {/* Complete step */}
      {activeSteps[step]?.id === "complete" && (
        <StepComplete
          unitId={unitId}
          opsSerial={isSmartboardOnly ? "(smartboard job)" : opsSerial}
          onDone={(dir) => {
            if (dir === -1) { setStep((s) => s - 1); return; }
            onUnitDone();
          }}
        />
      )}
    </div>
  );
}

// ── Job Detail (unit list + start new unit) ────────────────────────────────────

function JobDetail({ jobId, onBack }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/assembly/jobs/${jobId}`);
      setJob(res.data.data);
    } catch { toast.error("Failed to load job"); }
    finally { setLoading(false); }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!job) return null;

  if (wizardOpen) return (
    <UnitWizard job={job} onBack={() => setWizardOpen(false)} onUnitDone={() => { setWizardOpen(false); load(); }} />
  );

  const unitStatusColor = {
    assembly_in_progress: "bg-amber-100 text-amber-700 border-amber-200",
    assembled: "bg-sky-100 text-sky-700 border-sky-200",
    ready_for_delivery: "bg-emerald-100 text-emerald-700 border-emerald-200",
    delivered: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" /> All Jobs
      </Button>

      {/* job summary card */}
      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold">{job.job_number}</p>
            <p className="text-muted-foreground">{job.client_name}</p>
          </div>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${JOB_STATUS_COLOR[job.status] || ""}`}>
            {job.status?.replaceAll("_", " ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.district_name}</span>
          {job.required_date && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(job.required_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>}
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {job.ops_model && <div><p className="text-xs text-muted-foreground">OPS Model</p><p className="font-medium">{job.ops_model}</p></div>}
          {job.ram_ddr_version && <div><p className="text-xs text-muted-foreground">RAM</p><p className="font-medium">{job.ram_ddr_version} · {job.ram_capacity_gb}GB</p></div>}
          {job.smartboard_model && <div><p className="text-xs text-muted-foreground">Smartboard</p><p className="font-medium">{job.smartboard_model}</p></div>}
        </div>
        {job.storage_requirements?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.storage_requirements.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs capitalize">
                {s.role}: {s.storage_type} {fmtCap(s.capacity_gb)} {s.interface}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* assembled units */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Assembled Units <span className="text-muted-foreground font-normal text-sm">({job.units?.length || 0})</span></p>
          <Button size="sm" onClick={() => setWizardOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Assemble Unit
          </Button>
        </div>

        {job.units?.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
            No units assembled yet. Click "Assemble Unit" to start.
          </div>
        )}

        {job.units?.map((unit) => (
          <div key={unit.id} className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-500" />
                <p className="font-mono font-semibold">{unit.ops_serial}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${unitStatusColor[unit.status] || ""}`}>
                {unit.status?.replaceAll("_", " ")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <span><span className="font-medium text-foreground">Model:</span> {unit.ops_model}</span>
              <span><span className="font-medium text-foreground">MB:</span> {unit.motherboard_serial}</span>
              {unit.wifi_serial && <span><span className="font-medium text-foreground">Wi-Fi:</span> {unit.wifi_serial}</span>}
            </div>
            {unit.rams?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {unit.rams.map((r) => (
                  <Badge key={r.ram_inventory_id} variant="secondary" className="text-xs">
                    <MemoryStick className="h-3 w-3 mr-1" />{r.ddr_version} {fmtCap(r.capacity_gb)}
                  </Badge>
                ))}
              </div>
            )}
            {unit.storages?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {unit.storages.map((s) => (
                  <Badge key={s.storage_inventory_id} variant="outline" className="text-xs capitalize">
                    <HardDrive className="h-3 w-3 mr-1" />{s.role}: {s.storage_type} {fmtCap(s.capacity_gb)}
                  </Badge>
                ))}
              </div>
            )}
            {unit.software?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {unit.software.map((sw) => (
                  <Badge key={sw.software_catalog_id} variant="outline" className="text-xs">
                    <KeyRound className="h-3 w-3 mr-1" />{sw.name}
                  </Badge>
                ))}
              </div>
            )}
            {unit.technician_name && (
              <p className="text-xs text-muted-foreground">By {unit.technician_name}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Assembly page ─────────────────────────────────────────────────────────

export default function Assembly() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/assembly/jobs`);
      setJobs(res.data.data || []);
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (selectedJobId) return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl py-4">
        <JobDetail jobId={selectedJobId} onBack={() => { setSelectedJobId(null); load(); }} />
      </div>
    </main>
  );

  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assembly</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Select a job to start or continue assembling units.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center space-y-2">
            <Wrench className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No jobs ready for assembly</p>
            <p className="text-sm text-muted-foreground">Jobs with status "created" or "assembly in progress" will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => {
              const urgency = job.required_date && new Date(job.required_date) < new Date(Date.now() + 3 * 86400000);
              return (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className="rounded-xl border p-4 text-left space-y-3 hover:border-primary hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold group-hover:text-primary transition-colors">{job.job_number}</p>
                      <p className="text-sm text-muted-foreground truncate">{job.client_name}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${JOB_STATUS_COLOR[job.status] || ""}`}>
                      {job.status?.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.district_name}</span>
                    {job.required_date && (
                      <span className={`flex items-center gap-1 ${urgency ? "text-rose-600 font-medium" : ""}`}>
                        <CalendarDays className="h-3 w-3" />
                        {new Date(job.required_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        {urgency && " · Urgent"}
                      </span>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2 text-xs">
                    {job.smartboard_model && (
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5">
                        <Monitor className="h-3 w-3" /> {job.smartboard_model}
                        {job.smartboard_count > 1 && <span className="font-semibold">×{job.smartboard_count}</span>}
                      </span>
                    )}
                    {job.ops_model && (
                      <span className="flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700 px-2 py-0.5">
                        <Cpu className="h-3 w-3" /> {job.ops_model}
                      </span>
                    )}
                    {job.ram_ddr_version && (
                      <span className="flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 text-sky-700 px-2 py-0.5">
                        <MemoryStick className="h-3 w-3" /> {job.ram_ddr_version} {job.ram_capacity_gb}GB
                      </span>
                    )}
                    {job.storage_requirements?.length > 0 && job.storage_requirements.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 capitalize">
                        <HardDrive className="h-3 w-3" /> {s.role}: {s.storage_type} {fmtCap(s.capacity_gb)}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{job.units_assembled} unit{job.units_assembled !== 1 ? "s" : ""} assembled</span>
                    <span className="text-primary font-medium group-hover:underline">Open →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
