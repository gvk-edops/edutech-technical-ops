import { useCallback, useEffect, useRef, useState } from "react";
import {
  Cpu, HardDrive, MemoryStick, Wifi, Plus, Upload, Search,
  RefreshCw, ChevronDown, ChevronRight, Pencil, Trash2, X,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";

// ── constants ──────────────────────────────────────────────────────────────────

const TYPES = [
  { key: "ops", label: "OPS Units", icon: Cpu, color: "text-violet-600", bg: "bg-violet-50" },
  { key: "ram", label: "RAM", icon: MemoryStick, color: "text-sky-600", bg: "bg-sky-50" },
  { key: "storage", label: "Storage", icon: HardDrive, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "network_card", label: "Network Cards", icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50" },
];

const STATUS_COLORS = {
  in_stock: "bg-emerald-100 text-emerald-700 border-emerald-200",
  assigned: "bg-sky-100 text-sky-700 border-sky-200",
  reserved: "bg-amber-100 text-amber-700 border-amber-200",
  faulty: "bg-rose-100 text-rose-700 border-rose-200",
  retired: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUSES = ["in_stock", "assigned", "reserved", "faulty", "retired"];

const SPEC_KEY = {
  ops: "ops_model_id",
  ram: "ram_spec_id",
  storage: "storage_spec_id",
  network_card: "model_id",
};

const fmtCap = (gb) => gb >= 1024 ? gb / 1024 + "TB" : gb + "GB";

const specDisplay = (type, row) => {
  if (type === "ram") return `${row.ddr_version} ${fmtCap(row.capacity_gb)}${row.bus_speed_mhz ? ` ${row.bus_speed_mhz}MHz` : ""}`;
  if (type === "storage") return `${row.storage_type} ${row.form_factor} ${row.interface} ${fmtCap(row.capacity_gb)}`;
  return row.spec_label || row.model_name || "—";
};

const specOptionLabel = (type, s) => {
  if (type === "ram") return `${s.ddr_version} ${fmtCap(s.capacity_gb)}${s.bus_speed_mhz ? ` ${s.bus_speed_mhz}MHz` : ""}`;
  if (type === "storage") return `${s.storage_type} ${s.form_factor} ${s.interface} ${fmtCap(s.capacity_gb)}`;
  return s.model_name;
};

// ── tree builders ──────────────────────────────────────────────────────────────

function buildOpsTree(rows) {
  return rows.map((r) => ({
    id: `ops-${r.spec_id}`, specId: r.spec_id, label: r.model_name,
    in_stock: +r.in_stock, assigned: +r.assigned, faulty: +r.faulty,
    reserved: +r.reserved, retired: +r.retired, total: +r.total,
  }));
}

function buildRamTree(rows) {
  const ddrs = {};
  for (const r of rows) {
    if (!ddrs[r.ddr_version]) ddrs[r.ddr_version] = { label: r.ddr_version, children: [], in_stock: 0, assigned: 0, faulty: 0, reserved: 0, retired: 0, total: 0 };
    const d = ddrs[r.ddr_version];
    d.children.push({ id: `ram-${r.spec_id}`, specId: r.spec_id, label: fmtCap(r.capacity_gb), in_stock: +r.in_stock, assigned: +r.assigned, faulty: +r.faulty, reserved: +r.reserved, retired: +r.retired, total: +r.total });
    d.in_stock += +r.in_stock; d.assigned += +r.assigned; d.faulty += +r.faulty;
    d.reserved += +r.reserved; d.retired += +r.retired; d.total += +r.total;
  }
  return Object.entries(ddrs).map(([k, v]) => ({ id: `ram-ddr-${k}`, label: k, ...v }));
}

function buildStorageTree(rows) {
  const types = {};
  for (const r of rows) {
    const tk = r.storage_type;
    if (!types[tk]) types[tk] = { label: tk, children: {}, in_stock: 0, assigned: 0, faulty: 0, reserved: 0, retired: 0, total: 0 };
    const t = types[tk];
    t.in_stock += +r.in_stock; t.assigned += +r.assigned; t.faulty += +r.faulty;
    t.reserved += +r.reserved; t.retired += +r.retired; t.total += +r.total;

    const ik = r.interface;
    if (!t.children[ik]) t.children[ik] = { label: ik, children: {}, in_stock: 0, assigned: 0, faulty: 0, reserved: 0, retired: 0, total: 0 };
    const iface = t.children[ik];
    iface.in_stock += +r.in_stock; iface.assigned += +r.assigned; iface.faulty += +r.faulty;
    iface.reserved += +r.reserved; iface.retired += +r.retired; iface.total += +r.total;

    const fk = r.form_factor;
    if (!iface.children[fk]) iface.children[fk] = { label: fk, children: [], in_stock: 0, assigned: 0, faulty: 0, reserved: 0, retired: 0, total: 0 };
    const ff = iface.children[fk];
    ff.in_stock += +r.in_stock; ff.assigned += +r.assigned; ff.faulty += +r.faulty;
    ff.reserved += +r.reserved; ff.retired += +r.retired; ff.total += +r.total;
    ff.children.push({ id: `storage-${r.spec_id}`, specId: r.spec_id, label: fmtCap(r.capacity_gb), in_stock: +r.in_stock, assigned: +r.assigned, faulty: +r.faulty, reserved: +r.reserved, retired: +r.retired, total: +r.total });
  }

  return Object.entries(types).map(([tk, tv]) => ({
    id: `storage-type-${tk}`, label: tk, ...tv,
    children: Object.entries(tv.children).map(([ik, iv]) => ({
      id: `storage-iface-${tk}-${ik}`, label: ik, ...iv,
      children: Object.entries(iv.children).map(([fk, fv]) => ({
        id: `storage-ff-${tk}-${ik}-${fk}`, label: fk, ...fv,
      })),
    })),
  }));
}

function buildNetworkTree(rows) {
  return rows.map((r) => ({
    id: `net-${r.spec_id}`, specId: r.spec_id, label: r.model_name,
    in_stock: +r.in_stock, assigned: +r.assigned, faulty: +r.faulty,
    reserved: +r.reserved, retired: +r.retired, total: +r.total,
  }));
}

// collect all specIds under a tree node (leaf = [specId], branch = all descendant specIds)
function collectSpecIds(node) {
  if (node.specId != null) return [node.specId];
  const kids = node.children || [];
  return kids.flatMap(collectSpecIds);
}

// ── TreeNode ───────────────────────────────────────────────────────────────────

function StockDot({ count, color }) {
  if (!count) return null;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${color.replace("text-", "bg-")}`} />
      {count}
    </span>
  );
}

function TreeNode({ node, depth = 0, activeSpecIds, onSelect, openNodes, toggleOpen }) {
  const isLeaf = !node.children?.length;
  const isOpen = openNodes.has(node.id);
  const specIds = collectSpecIds(node);
  const isActive = specIds.length > 0 && specIds.every((id) => activeSpecIds?.includes(id)) && activeSpecIds?.length === specIds.length;
  const hasActive = specIds.some((id) => activeSpecIds?.includes(id));

  const indent = depth * 12;

  return (
    <div>
      <button
        onClick={() => {
          if (!isLeaf) toggleOpen(node.id);
          onSelect(node);
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors text-sm
          ${isActive ? "bg-primary/10 text-primary font-medium" : hasActive ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {!isLeaf ? (
          <span className="shrink-0 text-muted-foreground">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        ) : (
          <span className="h-3 w-3 shrink-0" />
        )}
        <span className="flex-1 truncate leading-tight">{node.label}</span>
        <span className="flex items-center gap-1.5 shrink-0 ml-1">
          <StockDot count={node.in_stock} color="text-emerald-600" />
          {node.faulty > 0 && <StockDot count={node.faulty} color="text-rose-500" />}
        </span>
      </button>
      {!isLeaf && isOpen && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              activeSpecIds={activeSpecIds}
              onSelect={onSelect}
              openNodes={openNodes}
              toggleOpen={toggleOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── InventoryTree sidebar ──────────────────────────────────────────────────────

function InventoryTree({ treeSummary, activeType, setActiveType, activeSpecIds, setActiveSpecIds }) {
  const [openNodes, setOpenNodes] = useState(new Set());

  const toggleOpen = (id) =>
    setOpenNodes((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // auto-open top-level nodes when type changes
  useEffect(() => {
    const data = treeSummary[activeType] || [];
    if (activeType === "ram") {
      const tree = buildRamTree(data);
      setOpenNodes(new Set(tree.map((n) => n.id)));
    } else if (activeType === "storage") {
      const tree = buildStorageTree(data);
      setOpenNodes(new Set(tree.map((n) => n.id)));
    } else {
      setOpenNodes(new Set());
    }
  }, [activeType, treeSummary]);

  const handleSelect = (node) => {
    const ids = collectSpecIds(node);
    if (ids.length === 0) return;
    const same = activeSpecIds?.length === ids.length && ids.every((id) => activeSpecIds.includes(id));
    setActiveSpecIds(same ? null : ids);
  };

  const handleTypeClick = (key) => {
    setActiveType(key);
    setActiveSpecIds(null);
  };

  return (
    <nav className="w-56 shrink-0 sticky top-0 self-start space-y-1">
      {TYPES.map(({ key, label, icon: Icon, color, bg }) => {
        const data = treeSummary[key] || [];
        const isActive = activeType === key;

        let tree = [];
        if (key === "ops") tree = buildOpsTree(data);
        else if (key === "ram") tree = buildRamTree(data);
        else if (key === "storage") tree = buildStorageTree(data);
        else tree = buildNetworkTree(data);

        const totalStock = data.reduce((a, r) => a + (+r.in_stock || 0), 0);

        return (
          <div key={key} className={`rounded-lg border overflow-hidden transition-all ${isActive ? "border-border shadow-sm" : "border-transparent"}`}>
            {/* category header */}
            <button
              onClick={() => handleTypeClick(key)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors
                ${isActive ? `${bg} ${color} font-semibold` : "hover:bg-muted/60 text-foreground font-medium"}`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? color : "text-muted-foreground"}`} />
              <span className="flex-1 text-sm">{label}</span>
              <span className={`text-xs font-bold tabular-nums ${isActive ? color : "text-muted-foreground"}`}>{totalStock}</span>
            </button>

            {/* tree nodes */}
            {isActive && tree.length > 0 && (
              <div className="px-1 pb-2 pt-0.5 border-t bg-background">
                {/* "All" row */}
                <button
                  onClick={() => setActiveSpecIds(null)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-sm transition-colors
                    ${!activeSpecIds ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  <span className="h-3 w-3 shrink-0" />
                  <span className="flex-1">All</span>
                  <span className="text-[10px] font-semibold text-muted-foreground">{data.reduce((a, r) => a + (+r.total || 0), 0)}</span>
                </button>
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    activeSpecIds={activeSpecIds}
                    onSelect={handleSelect}
                    openNodes={openNodes}
                    toggleOpen={toggleOpen}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export default function Inventory() {
  const [activeType, setActiveType] = useState("ops");
  const [items, setItems] = useState([]);
  const [specs, setSpecs] = useState([]);
  const [treeSummary, setTreeSummary] = useState({ ops: [], ram: [], storage: [], network_card: [] });
  const [activeSpecIds, setActiveSpecIds] = useState(null); // null = all
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [singleForm, setSingleForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

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
    } catch { toast.error("Failed to load inventory"); }
    finally { setLoading(false); }
  }, []);

  const loadSpecs = useCallback(async (type) => {
    try {
      const res = await axios.get(`${API_URL}/inventory/${type}/specs`);
      setSpecs(res.data.data || []);
    } catch { toast.error("Failed to load specs"); }
  }, []);

  const loadTree = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory/tree-summary`);
      setTreeSummary(res.data.data || {});
    } catch {}
  }, []);

  useEffect(() => {
    loadItems(activeType);
    loadSpecs(activeType);
    loadTree();
    setSearch("");
    setFilterStatus("all");
    setActiveSpecIds(null);
  }, [activeType, loadItems, loadSpecs, loadTree]);

  const reload = () => { loadItems(activeType); loadTree(); };

  // ── single add ───────────────────────────────────────────────────────────────

  const openSingle = () => {
    setSingleForm({ spec_id: "", serial_number: "", motherboard_serial: "", brand: "", notes: "", batch_description: "" });
    setSheetOpen(true);
  };

  const submitSingle = async () => {
    if (!singleForm.spec_id || !singleForm.serial_number?.trim()) return toast.error("Spec and serial number are required");
    if (activeType === "ops" && !singleForm.motherboard_serial?.trim()) return toast.error("Motherboard serial is required for OPS");
    setSaving(true);
    try {
      await axios.post(`${API_URL}/inventory/${activeType}/single`, singleForm);
      toast.success("Item added");
      setSheetOpen(false);
      reload();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to add item"); }
    finally { setSaving(false); }
  };

  // ── batch add ────────────────────────────────────────────────────────────────

  const openBatch = () => {
    setBatchText(""); setBatchSpecId(""); setBatchBrand(""); setBatchDesc("");
    setBatchOpen(true);
    setTimeout(() => batchRef.current?.focus(), 100);
  };

  const submitBatch = async () => {
    if (!batchSpecId) return toast.error("Select a spec first");
    const lines = batchText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return toast.error("Enter at least one serial number");
    const batchItems = lines.map((line) => {
      if (activeType === "ops") {
        const [serial_number, motherboard_serial] = line.split(/[\t,]/);
        return { serial_number: serial_number?.trim(), motherboard_serial: motherboard_serial?.trim(), spec_id: batchSpecId };
      }
      return { serial_number: line, spec_id: batchSpecId, brand: batchBrand || null };
    });
    setBatchSaving(true);
    try {
      const res = await axios.post(`${API_URL}/inventory/${activeType}/batch`, { items: batchItems, batch_description: batchDesc || null });
      const { inserted, errors } = res.data;
      toast.success(`${inserted} item(s) added${errors?.length ? `, ${errors.length} skipped` : ""}`);
      if (errors?.length) errors.forEach((e) => toast.warning(e));
      setBatchOpen(false);
      reload();
    } catch (e) { toast.error(e.response?.data?.Error || "Batch import failed"); }
    finally { setBatchSaving(false); }
  };

  // ── status update ────────────────────────────────────────────────────────────

  const changeStatus = async (item, status) => {
    try {
      await axios.patch(`${API_URL}/inventory/${activeType}/${item.id}/status`, { status });
      toast.success("Status updated");
      reload();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to update status"); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      spec_id: String(item[SPEC_KEY[activeType]] || ""),
      serial_number: item.serial_number || "",
      motherboard_serial: item.motherboard_serial || "",
      brand: item.brand || "",
      notes: item.notes || "",
    });
  };

  const submitEdit = async () => {
    if (!editForm.spec_id || !editForm.serial_number?.trim()) return toast.error("Spec and serial number are required");
    if (activeType === "ops" && !editForm.motherboard_serial?.trim()) return toast.error("Motherboard serial is required for OPS");
    setEditSaving(true);
    try {
      await axios.patch(`${API_URL}/inventory/${activeType}/${editItem.id}`, editForm);
      toast.success("Inventory item updated");
      setEditItem(null);
      reload();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to update item"); }
    finally { setEditSaving(false); }
  };

  const removeItem = async (item) => {
    if (!window.confirm(`Remove ${item.serial_number}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/inventory/${activeType}/${item.id}`);
      toast.success("Inventory item removed");
      reload();
    } catch (e) { toast.error(e.response?.data?.Error || "Failed to remove item"); }
  };

  // ── filtered list ────────────────────────────────────────────────────────────

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      item.serial_number?.toLowerCase().includes(q) ||
      (item.motherboard_serial || "").toLowerCase().includes(q) ||
      (item.brand || "").toLowerCase().includes(q) ||
      specDisplay(activeType, item).toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchSpec = !activeSpecIds || activeSpecIds.includes(item[SPEC_KEY[activeType]]);
    return matchSearch && matchStatus && matchSpec;
  });

  const typeData = treeSummary[activeType] || [];
  const totalStock = typeData.reduce((a, r) => a + (+r.in_stock || 0), 0);
  const totalAssigned = typeData.reduce((a, r) => a + (+r.assigned || 0), 0);
  const totalFaulty = typeData.reduce((a, r) => a + (+r.faulty || 0), 0);

  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-7xl space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage OPS units, RAM, storage, and network cards.</p>
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

        {/* Two-column layout */}
        <div className="flex gap-5 items-start">

          {/* Left: tree sidebar */}
          <InventoryTree
            treeSummary={treeSummary}
            activeType={activeType}
            setActiveType={setActiveType}
            activeSpecIds={activeSpecIds}
            setActiveSpecIds={setActiveSpecIds}
          />

          {/* Right: table panel */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Stats + refresh row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {activeSpecIds && (
                  <button
                    onClick={() => setActiveSpecIds(null)}
                    className="flex items-center gap-1 text-primary hover:underline font-medium"
                  >
                    <X className="h-3 w-3" /> Clear filter
                  </button>
                )}
                {activeSpecIds && <span className="text-border">|</span>}
                <span className="text-emerald-600 font-medium">{totalStock} in stock</span>
                <span>·</span>
                <span className="text-sky-600 font-medium">{totalAssigned} assigned</span>
                <span>·</span>
                <span className="text-rose-600 font-medium">{totalFaulty} faulty</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reload}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search serial, brand, spec…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="flex items-center text-xs text-muted-foreground px-1">
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
              </span>
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
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">Loading…</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">No items found.</TableCell>
                    </TableRow>
                  ) : filtered.map((item) => (
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
                        <div className="flex justify-end gap-1">
                          {item.status !== "assigned" && (
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
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={item.status === "assigned"} title="Edit item" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={item.status === "assigned"} title="Remove item" onClick={() => removeItem(item)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Single Add Sheet ──────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
          <div className="px-6 py-5 border-b">
            <div className="flex items-center gap-3">
              {(() => { const Icon = TYPES.find((t) => t.key === activeType)?.icon; return Icon ? <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div> : null; })()}
              <div>
                <SheetTitle className="text-base">Add {TYPES.find((t) => t.key === activeType)?.label}</SheetTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the item details below.</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specification</p>
              <div className="space-y-1.5">
                <Label>Model / Spec <span className="text-destructive">*</span></Label>
                <Select value={singleForm.spec_id} onValueChange={(v) => setSingleForm((f) => ({ ...f, spec_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a spec" /></SelectTrigger>
                  <SelectContent>
                    {specs.map((s) => <SelectItem key={s.id} value={String(s.id)}>{specOptionLabel(activeType, s)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(activeType === "ram" || activeType === "storage") && (
                <div className="space-y-1.5">
                  <Label>Brand</Label>
                  <Input value={singleForm.brand || ""} onChange={(e) => setSingleForm((f) => ({ ...f, brand: e.target.value }))} placeholder="e.g. Samsung, Kingston" />
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Serial Numbers</p>
              <div className="space-y-1.5">
                <Label>Serial Number <span className="text-destructive">*</span></Label>
                <Input value={singleForm.serial_number || ""} onChange={(e) => setSingleForm((f) => ({ ...f, serial_number: e.target.value }))} placeholder="Scan or type serial" className="font-mono" autoFocus />
              </div>
              {activeType === "ops" && (
                <div className="space-y-1.5">
                  <Label>Motherboard Serial <span className="text-destructive">*</span></Label>
                  <Input value={singleForm.motherboard_serial || ""} onChange={(e) => setSingleForm((f) => ({ ...f, motherboard_serial: e.target.value }))} placeholder="Scan or type motherboard serial" className="font-mono" />
                  <p className="text-xs text-muted-foreground">The motherboard serial uniquely identifies the unit even if the cover is swapped.</p>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch & Notes</p>
              <div className="space-y-1.5">
                <Label>Batch Description</Label>
                <Input value={singleForm.batch_description || ""} onChange={(e) => setSingleForm((f) => ({ ...f, batch_description: e.target.value }))} placeholder="e.g. Purchase order #123" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={singleForm.notes || ""} onChange={(e) => setSingleForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this item" />
              </div>
            </div>
          </div>
          <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={submitSingle} disabled={saving} className="min-w-24">{saving ? "Saving…" : "Add Item"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Batch Import Sheet ────────────────────────────────────────────── */}
      <Sheet open={batchOpen} onOpenChange={setBatchOpen}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specification</p>
              <div className="space-y-1.5">
                <Label>Model / Spec <span className="text-destructive">*</span></Label>
                <Select value={batchSpecId} onValueChange={setBatchSpecId}>
                  <SelectTrigger><SelectValue placeholder="Select spec — applies to all items" /></SelectTrigger>
                  <SelectContent>
                    {specs.map((s) => <SelectItem key={s.id} value={String(s.id)}>{specOptionLabel(activeType, s)}</SelectItem>)}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Serial Numbers</p>
                {batchText && <span className="text-xs font-medium text-primary">{batchText.split("\n").filter((l) => l.trim()).length} item(s)</span>}
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                {activeType === "ops" ? (
                  <><p>One per line: <span className="font-mono bg-muted px-1 rounded">serial_number,motherboard_serial</span></p><p>Tab-separated also works.</p></>
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
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch Info</p>
              <div className="space-y-1.5">
                <Label>Batch Description</Label>
                <Input value={batchDesc} onChange={(e) => setBatchDesc(e.target.value)} placeholder="e.g. Purchase order #123" />
              </div>
            </div>
          </div>
          <div className="border-t px-6 py-4 flex items-center justify-between gap-2 bg-background">
            <p className="text-xs text-muted-foreground">{batchText.split("\n").filter((l) => l.trim()).length} serial(s) ready to import</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
              <Button onClick={submitBatch} disabled={batchSaving} className="min-w-24">{batchSaving ? "Importing…" : "Import"}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
