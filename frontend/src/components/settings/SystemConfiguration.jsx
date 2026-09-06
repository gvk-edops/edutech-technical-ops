import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
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
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Cpu,
  Gauge,
  Database,
  Monitor,
  MemoryStick,
  HardDrive,
  CircuitBoard,
  Disc3,
  Network,
  Package,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { RamSpecCard } from "@/components/RamSpecCard";
import { StorageSpecCard } from "@/components/StorageSpecCard";

const getStorageType = (storageType, formFactor, iface) => {
  if (storageType === "HDD") return "2.5-hdd";
  if (formFactor === "mSATA") return "msata";
  if (formFactor === "M.2" && iface === "NVMe") return "m2-nvme";
  if (formFactor === "M.2" && iface === "SATA") return "m2-sata";
  return "2.5-ssd";
};

const processorSeriesStyles = {
  i3: "border-[#8bd8f7] bg-[#e8f8ff] text-[#005b9f] dark:border-[#0071c5] dark:bg-[#003b63] dark:text-[#8bd8f7]",
  i5: "border-[#66c7ef] bg-[#dff4ff] text-[#005b9f] dark:border-[#008bd2] dark:bg-[#00456f] dark:text-[#a6e4ff]",
  i7: "border-[#33b6e7] bg-[#d5f1fc] text-[#004f8c] dark:border-[#00a4df] dark:bg-[#00537f] dark:text-[#c2efff]",
  i9: "border-[#009fdb] bg-[#c9edfa] text-[#003f70] dark:border-[#00c7fd] dark:bg-[#0068b5] dark:text-white",
  "Ultra 3":
    "border-[#8bd8f7] bg-[#e8f8ff] text-[#005b9f] dark:border-[#0071c5] dark:bg-[#003b63] dark:text-[#8bd8f7]",
  "Ultra 5":
    "border-[#66c7ef] bg-[#dff4ff] text-[#005b9f] dark:border-[#008bd2] dark:bg-[#00456f] dark:text-[#a6e4ff]",
  "Ultra 7":
    "border-[#33b6e7] bg-[#d5f1fc] text-[#004f8c] dark:border-[#00a4df] dark:bg-[#00537f] dark:text-[#c2efff]",
  "Ultra 9":
    "border-[#009fdb] bg-[#c9edfa] text-[#003f70] dark:border-[#00c7fd] dark:bg-[#0068b5] dark:text-white",
};

const getProcessorSeriesLabel = (item) => {
  if (item.processor_series !== "i" && item.processor_series !== "ultra") {
    return item.processor_series || "—";
  }

  const coreNumber = String(item.processor_core || "").match(/\d+/)?.[0];
  return coreNumber
    ? `${item.processor_series === "ultra" ? "Ultra " : "i"}${coreNumber}`
    : item.processor_series;
};

const getProcessorSeriesDisplayLabel = (item) => {
  const seriesLabel = getProcessorSeriesLabel(item);
  if (seriesLabel.startsWith("Ultra ")) return seriesLabel.toUpperCase();
  if (seriesLabel.startsWith("i")) return `Core ${seriesLabel}`;
  return "Processor series not specified";
};

const storageOptions = {
  type: ["SSD", "HDD"],
  formFactor: {
    SSD: ["M.2", "mSATA", "2.5"],
    HDD: ["2.5", "3.5"],
  },
  interface: {
    SSD: {
      "M.2": ["NVMe", "SATA"],
      mSATA: ["SATA"],
      2.5: ["SATA"],
    },
    HDD: ["SATA", "SAS"],
  },
  capacity: {
    SSD: [
      { value: "128", label: "128 GB" },
      { value: "256", label: "256 GB" },
      { value: "512", label: "512 GB" },
      { value: "1024", label: "1 TB" },
      { value: "2048", label: "2 TB" },
      { value: "4096", label: "4 TB" },
    ],
    HDD: [
      { value: "500", label: "500 GB" },
      { value: "1024", label: "1 TB" },
      { value: "2048", label: "2 TB" },
      { value: "4096", label: "4 TB" },
      { value: "8192", label: "8 TB" },
    ],
  },
};

const getCatalogIcon = (columns, item = {}) => {
  const keys = columns.map((column) => column.key);
  if (keys.includes("processor_series")) return Cpu;
  if (keys.includes("ddr_version")) return MemoryStick;
  if (keys.includes("storage_type"))
    return item.storage_type === "SSD" ? CircuitBoard : Disc3;
  if (keys.includes("software_type")) return Package;
  if (keys.includes("model_name") && keys.includes("brand")) return Monitor;
  return Network;
};

const getCatalogCardStyle = (columns, item) => {
  const keys = columns.map((column) => column.key);
  if (keys.includes("storage_type")) {
    const isHdd = item.storage_type === "HDD";
    return {
      card: isHdd
        ? "border-amber-200 bg-gradient-to-br from-white via-amber-50 to-orange-100/70 dark:border-amber-800 dark:from-slate-950 dark:via-amber-950/40 dark:to-orange-950/50"
        : "border-cyan-200 bg-gradient-to-br from-white via-cyan-50 to-sky-100/70 dark:border-cyan-800 dark:from-slate-950 dark:via-cyan-950/40 dark:to-sky-950/50",
      icon: isHdd ? "from-amber-500 to-orange-500" : "from-cyan-500 to-sky-500",
      title: isHdd
        ? "text-amber-950 dark:text-amber-100"
        : "text-cyan-950 dark:text-cyan-100",
      tile: isHdd
        ? "border-amber-100 bg-gradient-to-br from-white/90 to-amber-100/60 dark:border-amber-900 dark:from-amber-950/50 dark:to-orange-950/40"
        : "border-cyan-100 bg-gradient-to-br from-white/90 to-cyan-100/60 dark:border-cyan-900 dark:from-cyan-950/50 dark:to-sky-950/40",
      badge: item.form_factor,
      badgeStyle: isHdd
        ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "border-cyan-300 bg-cyan-100 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
    };
  }
  return {
    card: "border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-100/70 dark:border-sky-800 dark:from-slate-950 dark:via-sky-950/50 dark:to-cyan-950/50",
    icon: "from-sky-500 to-cyan-500",
    title: "text-sky-950 dark:text-sky-100",
    tile: "border-sky-100 bg-gradient-to-br from-white/90 to-sky-100/60 dark:border-sky-900 dark:from-sky-950/50 dark:to-cyan-950/40",
  };
};

function CatalogTable({
  items,
  columns,
  onAdd,
  onEdit,
  onDelete,
  cardLayout = false,
}) {
  const [intelLogos, setIntelLogos] = useState(null);

  useEffect(() => {
    fetch("/intel-logos.json")
      .then((response) => response.json())
      .then(setIntelLogos)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No items yet
        </p>
      ) : cardLayout ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const isOpsCard = columns.some(
              (column) => column.key === "processor_series",
            );
            if (!isOpsCard) {
              const [titleColumn, ...detailColumns] = columns;
              const CatalogIcon = getCatalogIcon(columns, item);
              const cardStyle = getCatalogCardStyle(columns, item);
              return (
                <Card
                  key={item.id}
                  className={`h-full shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${cardStyle.card}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm ${cardStyle.icon}`}
                          >
                            <CatalogIcon
                              className="h-5 w-5"
                              strokeWidth={1.8}
                            />
                          </span>
                          <CardTitle
                            className={`truncate text-base ${cardStyle.title}`}
                          >
                            {item[titleColumn.key] ?? "Unnamed item"}
                          </CardTitle>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <CardDescription>{titleColumn.label}</CardDescription>
                          {cardStyle.badge && (
                            <Badge
                              variant="outline"
                              className={cardStyle.badgeStyle}
                            >
                              {cardStyle.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => onEdit(item)}
                          aria-label={`Edit ${item[titleColumn.key] || "item"}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                          onClick={() => onDelete(item)}
                          aria-label={`Delete ${item[titleColumn.key] || "item"}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 p-4 pt-2 text-sm">
                    {detailColumns.map((column) => (
                      <div
                        key={column.key}
                        className={`rounded-md p-2.5 shadow-sm last:col-span-2 ${cardStyle.tile}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <CatalogIcon className="h-3.5 w-3.5 text-sky-600 dark:text-cyan-400" />
                          <p className="text-xs text-muted-foreground">
                            {column.label}
                          </p>
                        </div>
                        <p className="mt-1 break-words font-medium">
                          {column.format
                            ? column.format(item[column.key])
                            : (item[column.key] ?? "—")}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            }
            return (
              <Card
                key={item.id}
                className="group relative h-full overflow-hidden border-[#b9def2] border-t-4 border-t-[#0068b5] bg-gradient-to-br from-white via-[#f4f9ff] to-[#dff4ff] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-[#0068b5] dark:border-t-[#00c7fd] dark:from-[#001e36] dark:via-[#00285a] dark:to-[#003b63]"
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#0068b5] dark:text-[#00c7fd]">
                      {intelLogos?.brand ? (
                        <img
                          src={intelLogos.brand}
                          alt="Intel"
                          className="h-7 w-auto transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <span className="inline-flex h-6 items-center rounded-[50%] border-2 border-current px-2 text-xs font-black italic tracking-tight">
                          intel
                        </span>
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                        Processor
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="border-[#b9def2] bg-white/70 text-[#0068b5] hover:bg-[#e8f8ff] hover:text-[#00285a] dark:border-[#0071c5] dark:bg-white/10 dark:text-[#00c7fd] dark:hover:bg-[#003b63]"
                        onClick={() => onEdit(item)}
                        aria-label={`Edit ${item.model_name || "model"}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="border-red-200 bg-white/70 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:bg-white/10 dark:hover:bg-red-950"
                        onClick={() => onDelete(item)}
                        aria-label={`Delete ${item.model_name || "model"}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="truncate text-lg font-bold tracking-tight text-[#00285a] dark:text-white">
                        {item.model_name || "Unnamed model"}
                      </CardTitle>
                      <CardDescription>
                        {getProcessorSeriesDisplayLabel(item)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-md border border-[#b9def2] bg-gradient-to-br from-[#e8f8ff] to-[#c9edfa]/80 p-2 dark:border-[#0068b5] dark:from-[#003b63] dark:to-[#00456f]/60">
                      <Cpu className="h-4 w-4 text-[#0068b5] dark:text-[#00c7fd]" />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Core count
                      </p>
                      <p className="mt-1 font-medium">
                        {item.processor_count ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-md border border-[#8bd8f7] bg-gradient-to-br from-[#dff4ff] to-[#b9e8fa]/80 p-2 dark:border-[#008bd2] dark:from-[#00456f] dark:to-[#00537f]/60">
                      <Gauge className="h-4 w-4 text-[#0068b5] dark:text-[#00c7fd]" />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Base speed
                      </p>
                      <p className="mt-1 font-medium">
                        {item.base_speed_ghz != null
                          ? `${item.base_speed_ghz} GHz`
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-md border border-[#66c7ef] bg-gradient-to-br from-[#c9edfa] to-[#8bd8f7]/70 p-2 dark:border-[#00a4df] dark:from-[#00537f] dark:to-[#0068b5]/60">
                      <Database className="h-4 w-4 text-[#0068b5] dark:text-[#00c7fd]" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Cache
                      </p>
                      <p className="mt-1 font-medium">
                        {item.cache_mb != null ? `${item.cache_mb} MB` : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="relative mt-3 min-h-14 border-t border-[#b9def2] pt-2.5 dark:border-[#0068b5]">
                    <div className="pr-24">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0068b5] dark:text-[#00c7fd]">
                        Description
                      </p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        {item.description || "No description provided."}
                      </p>
                    </div>
                    <div className="absolute bottom-0 right-0 flex h-12 w-24 items-end justify-end">
                      {intelLogos?.series?.[getProcessorSeriesLabel(item)] ? (
                        <img
                          src={intelLogos.series[getProcessorSeriesLabel(item)]}
                          alt={`Intel ${getProcessorSeriesLabel(item)}`}
                          title={`Intel ${getProcessorSeriesLabel(item)}`}
                          className="m-0 max-h-12 max-w-full w-auto object-contain"
                        />
                      ) : (
                        <Badge
                          variant="outline"
                          className={
                            processorSeriesStyles[
                              getProcessorSeriesLabel(item)
                            ] || "bg-muted"
                          }
                        >
                          {getProcessorSeriesLabel(item)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left px-3 py-2 font-medium">
                    {c.label}
                  </th>
                ))}
                <th className="w-20 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      {c.format ? c.format(item[c.key]) : (item[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Catalog hook ─────────────────────────────────────
function useCatalog(endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}${endpoint}`);
      setItems(data.data || []);
    } catch (err) {
      console.error("Failed to fetch catalogs:", err);
    }
  }, [endpoint]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = async (item) => {
    setLoading(true);
    try {
      if (item.id) await axios.put(`${API_URL}${endpoint}/${item.id}`, item);
      else await axios.post(`${API_URL}${endpoint}`, item);
      await fetch();
      toast.success("Saved");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.Error || "Save failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${API_URL}${endpoint}/${id}`);
      await fetch();
      toast.success("Deleted");
    } catch (err) {
      toast.error(err.response?.data?.Error || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, save, remove, refetch: fetch };
}

// ── Field form dialog ─────────────────────────────────
function ItemDialog({
  open,
  onOpenChange,
  title,
  fields,
  initial,
  onSave,
  loading,
}) {
  const [form, setForm] = useState(initial || {});
  const [cpuSpecs, setCpuSpecs] = useState([]);
  const isOpsForm = fields.some((field) => field.key === "processor_series");
  const isRamForm = fields.some((field) => field.key === "ddr_version");
  const isStorageForm = fields.some((field) => field.key === "storage_type");

  useEffect(() => {
    if (!isOpsForm) return;
    axios
      .get(`${API_URL}/catalogs/ops-cpu-specs`, { withCredentials: true })
      .then(({ data }) => setCpuSpecs(data.data?.processors || []))
      .catch(() => {});
  }, [isOpsForm]);
  useEffect(() => {
    const sourceForm = initial || {};
    const validCapacities = storageOptions.capacity[sourceForm.storage_type];
    const nextForm =
      validCapacities &&
      !validCapacities.some(
        (option) => option.value === String(sourceForm.capacity_gb),
      )
        ? { ...sourceForm, capacity_gb: validCapacities[0].value }
        : sourceForm;
    if (nextForm.storage_type === "HDD") {
      setForm({ ...nextForm, form_factor: "2.5", interface: "SATA" });
    } else if (
      nextForm.storage_type === "SSD" &&
      (nextForm.form_factor === "2.5" || nextForm.form_factor === "mSATA")
    ) {
      setForm({ ...nextForm, interface: "SATA" });
    } else {
      setForm(nextForm);
    }
  }, [initial, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setModelName = (value) => {
    const matchedCpu = cpuSpecs.find(
      (cpu) => value.trim().toLowerCase() === cpu.model.toLowerCase(),
    );
    setForm((current) =>
      matchedCpu
        ? {
            ...current,
            model_name: value,
            processor_series: matchedCpu.series,
            processor_core: matchedCpu.core,
            processor_count: String(matchedCpu.cores),
            base_speed_ghz: String(matchedCpu.base_speed_ghz),
            cache_mb: String(matchedCpu.cache_mb),
          }
        : { ...current, model_name: value },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={`max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6 ${isRamForm || isStorageForm ? "max-w-2xl" : ""}`}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the catalog item details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div
          className={
            isRamForm || isStorageForm
              ? "flex min-w-0 flex-col gap-4 sm:flex-row"
              : "min-w-0"
          }
        >
          {isRamForm && (
            <div className="flex-1 min-w-0">
              <RamSpecCard
                preview
                ddrVersion={form.ddr_version}
                capacity={
                  form.capacity_gb != null && form.capacity_gb !== ""
                    ? `${form.capacity_gb} GB`
                    : undefined
                }
                busSpeed={
                  form.bus_speed_mhz ? `${form.bus_speed_mhz} MHz` : undefined
                }
                description={form.description}
              />
            </div>
          )}
          {isStorageForm && (
            <div className="flex-1 min-w-0">
              <StorageSpecCard
                preview
                type={getStorageType(
                  form.storage_type,
                  form.form_factor,
                  form.interface,
                )}
                capacity={
                  form.capacity_gb != null && form.capacity_gb !== ""
                    ? Number(form.capacity_gb) >= 1024
                      ? `${Number(form.capacity_gb) / 1024} TB`
                      : `${form.capacity_gb} GB`
                    : undefined
                }
                description={form.description}
              />
            </div>
          )}
          <div
            className={`min-w-0 space-y-3 py-2${isRamForm || isStorageForm ? " flex-1" : ""}`}
          >
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                {f.type === "select" ? (
                  <Select
                    value={form[f.key] || ""}
                    onValueChange={(v) => {
                      if (f.key === "model_name" && isOpsForm) {
                        setModelName(v);
                      } else if (f.key === "storage_type" && v === "HDD") {
                        setForm((current) => ({
                          ...current,
                          form_factor: "2.5",
                          interface: "SATA",
                          capacity_gb: storageOptions.capacity.HDD.some(
                            (option) => option.value === current.capacity_gb,
                          )
                            ? current.capacity_gb
                            : storageOptions.capacity.HDD[0].value,
                        }));
                      } else if (f.key === "storage_type" && v === "SSD") {
                        setForm((current) => ({
                          ...current,
                          storage_type: v,
                          capacity_gb: storageOptions.capacity.SSD.some(
                            (option) => option.value === current.capacity_gb,
                          )
                            ? current.capacity_gb
                            : storageOptions.capacity.SSD[0].value,
                        }));
                      } else if (
                        f.key === "form_factor" &&
                        form.storage_type === "SSD" &&
                        (v === "2.5" || v === "mSATA")
                      ) {
                        setForm((current) => ({
                          ...current,
                          form_factor: v,
                          interface: "SATA",
                        }));
                      } else {
                        set(f.key, v);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${f.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(typeof f.options === "function"
                        ? f.options(form, cpuSpecs)
                        : f.options
                      ).map((o) => {
                        const option =
                          typeof o === "string" ? { value: o, label: o } : o;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type || "text"}
                    value={form[f.key] || ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      f.key === "model_name" && isOpsForm
                        ? setModelName(e.target.value)
                        : set(f.key, e.target.value)
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <AlertDialogFooter className="sticky bottom-0 -mx-4 -mb-4 border-t bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:p-6">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async () => {
              const ok = await onSave(form);
              if (ok) onOpenChange(false);
            }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Catalog section wrapper ───────────────────────────
function CatalogSection({
  endpoint,
  title,
  description,
  columns,
  fields,
  cardLayout = true,
}) {
  const { items, loading, save, remove } = useCatalog(endpoint);
  const [dialog, setDialog] = useState(null); // { item } or null
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <CatalogTable
          items={items}
          columns={columns}
          loading={loading}
          cardLayout={cardLayout}
          onAdd={() => setDialog({ item: {} })}
          onEdit={(item) => setDialog({ item })}
          onDelete={(item) => setDeleteTarget(item)}
        />
      </CardContent>

      <ItemDialog
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.item?.id ? `Edit ${title}` : `Add ${title}`}
        fields={fields}
        initial={dialog?.item}
        loading={loading}
        onSave={save}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function OpsSpecsJsonEditor() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const openEditor = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_URL}/catalogs/ops-cpu-specs`);
      setValue(JSON.stringify(data.data, null, 2));
      setOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.Error || "Could not load OPS specs");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      toast.error("Enter valid JSON before saving");
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${API_URL}/catalogs/ops-cpu-specs`, parsed);
      toast.success("OPS processor JSON updated");
      setOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.Error || "Could not save OPS specs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openEditor}
        disabled={loading}
      >
        <Pencil className="mr-2 h-4 w-4" /> Edit processor JSON
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-h-[calc(100dvh-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:max-w-3xl sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit OPS processor JSON</AlertDialogTitle>
            <AlertDialogDescription>
              Update the processor suggestions used to auto-fill OPS model
              fields. The root object must contain a processors array, and each
              item must have a model.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-h-[420px] resize-y font-mono text-xs"
            spellCheck={false}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button onClick={save} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save JSON
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── RAM Catalog Section ─────────────────────────────────
const ramFields = [
  { key: "ddr_version", label: "DDR Version (e.g. DDR4)", required: true },
  {
    key: "capacity_gb",
    label: "Capacity (GB)",
    type: "number",
    required: true,
  },
  { key: "bus_speed_mhz", label: "Bus Speed (MHz, e.g. 3200)", type: "number" },
  { key: "description", label: "Description" },
];

function RamCatalogSection() {
  const { items, loading, save, remove } = useCatalog("/catalogs/ram-specs");
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setDialog({ item: {} })}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No items yet
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <RamSpecCard
              key={item.id}
              ddrVersion={item.ddr_version}
              capacity={
                item.capacity_gb != null ? `${item.capacity_gb} GB` : undefined
              }
              busSpeed={
                item.bus_speed_mhz ? `${item.bus_speed_mhz} MHz` : undefined
              }
              description={item.description}
              onEdit={() => setDialog({ item })}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      <ItemDialog
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.item?.id ? "Edit RAM Spec" : "Add RAM Spec"}
        fields={ramFields}
        initial={dialog?.item}
        loading={loading}
        onSave={save}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Storage Catalog Section ──────────────────────────
const storageFields = [
  {
    key: "storage_type",
    label: "Type",
    type: "select",
    options: ["SSD", "HDD"],
    required: true,
  },
  {
    key: "form_factor",
    label: "Form Factor",
    type: "select",
    options: (form) => storageOptions.formFactor[form.storage_type] || [],
    required: true,
  },
  {
    key: "interface",
    label: "Interface",
    type: "select",
    options: (form) =>
      form.storage_type === "SSD"
        ? storageOptions.interface.SSD[form.form_factor] || []
        : storageOptions.interface[form.storage_type] || [],
    required: true,
  },
  {
    key: "capacity_gb",
    label: "Capacity",
    type: "select",
    options: (form) => storageOptions.capacity[form.storage_type] || [],
    required: true,
  },
  { key: "description", label: "Description" },
];

function StorageCatalogSection() {
  const { items, loading, save, remove } = useCatalog(
    "/catalogs/storage-specs",
  );
  const [dialog, setDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={() => setDialog({ item: {} })}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No items yet
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <StorageSpecCard
              key={item.id}
              type={getStorageType(
                item.storage_type,
                item.form_factor,
                item.interface,
              )}
              capacity={
                item.capacity_gb != null
                  ? Number(item.capacity_gb) >= 1024
                    ? `${Number(item.capacity_gb) / 1024} TB`
                    : `${item.capacity_gb} GB`
                  : undefined
              }
              description={item.description}
              onEdit={() => setDialog({ item })}
              onDelete={() => setDeleteTarget(item)}
            />
          ))}
        </div>
      )}

      <ItemDialog
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        title={dialog?.item?.id ? "Edit Storage Spec" : "Add Storage Spec"}
        fields={storageFields}
        initial={dialog?.item}
        loading={loading}
        onSave={save}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main component ────────────────────────────────────
function ServerAuditVisibility() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/settings/system`)
      .then(({ data }) => {
        setEnabled(data.data?.audit_activity_visibility !== "0");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = async (value) => {
    setEnabled(value);
    try {
      await axios.put(`${API_URL}/settings/system`, {
        settings: { audit_activity_visibility: value ? "1" : "0" },
      });
      toast.success(
        `Auditor activity visibility ${value ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      setEnabled(!value);
      toast.error(
        error.response?.data?.message || "Could not update server setting",
      );
    }
  };

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Auditor activity visibility</p>
          <p className="text-sm text-muted-foreground">
            Server-level control for audit logs, activity statistics, and
            performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={enabled ? "default" : "secondary"}>
            {enabled ? "Visible" : "Hidden"}
          </Badge>
          <Switch
            checked={enabled}
            disabled={loading}
            onCheckedChange={update}
            aria-label="Toggle auditor activity visibility"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SystemConfiguration() {
  const navigate = useNavigate();

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/settings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <ServerAuditVisibility />

      <Tabs defaultValue="smartboards">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="smartboards">Smartboard Models</TabsTrigger>
          <TabsTrigger value="ops">OPS Models</TabsTrigger>
          <TabsTrigger value="ram">RAM Specs</TabsTrigger>
          <TabsTrigger value="storage">Storage Specs</TabsTrigger>
          <TabsTrigger value="netcards">Network Cards</TabsTrigger>
          <TabsTrigger value="software">Software</TabsTrigger>
        </TabsList>

        {/* Smartboard Models */}
        <TabsContent value="smartboards">
          <CatalogSection
            endpoint="/catalogs/smartboard-models"
            title="Smartboard Models"
            description="Smartboard models used in jobs"
            columns={[
              { key: "brand", label: "Brand" },
              { key: "model_name", label: "Model" },
              { key: "description", label: "Description" },
            ]}
            fields={[
              { key: "brand", label: "Brand" },
              { key: "model_name", label: "Model Name", required: true },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>

        {/* OPS Models */}
        <TabsContent value="ops">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Processor suggestion catalog</p>
                <p className="text-sm text-muted-foreground">
                  Maintain the JSON list used by the OPS model form.
                </p>
              </div>
              <OpsSpecsJsonEditor />
            </div>
            <CatalogSection
              endpoint="/catalogs/ops-models"
              title="OPS Models"
              description="OPS unit processor specifications"
              cardLayout
              columns={[
                { key: "model_name", label: "Model" },
                { key: "processor_series", label: "Series" },
                { key: "processor_core", label: "Core" },
                { key: "base_speed_ghz", label: "GHz" },
                { key: "cache_mb", label: "Cache (MB)" },
                { key: "description", label: "Description" },
              ]}
              fields={[
                {
                  key: "model_name",
                  label: "OPS Model",
                  type: "select",
                  options: (_, cpuSpecs) => cpuSpecs.map((cpu) => cpu.model),
                  required: true,
                },
                {
                  key: "processor_series",
                  label: "Processor Series",
                  type: "select",
                  options: [
                    "i3",
                    "i5",
                    "i7",
                    "i9",
                    "Ultra 3",
                    "Ultra 5",
                    "Ultra 7",
                    "Ultra 9",
                  ],
                  required: true,
                },
                {
                  key: "processor_core",
                  label: "Processor Core (e.g. i5, i7)",
                  required: true,
                },
                { key: "processor_count", label: "Core Count", type: "number" },
                {
                  key: "base_speed_ghz",
                  label: "Base Speed (GHz)",
                  type: "number",
                },
                { key: "cache_mb", label: "Cache (MB)", type: "number" },
                { key: "description", label: "Description" },
              ]}
            />
          </div>
        </TabsContent>

        {/* RAM Specs */}
        <TabsContent value="ram">
          <RamCatalogSection />
        </TabsContent>

        {/* Storage Specs */}
        <TabsContent value="storage">
          <StorageCatalogSection />
        </TabsContent>

        {/* Network Card Models */}
        <TabsContent value="netcards">
          <CatalogSection
            endpoint="/catalogs/network-card-models"
            title="Network Card Models"
            description="Wi-Fi / network card models"
            columns={[
              { key: "model_name", label: "Model" },
              { key: "description", label: "Description" },
            ]}
            fields={[
              { key: "model_name", label: "Model Name", required: true },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>

        {/* Unified Software Catalog */}
        <TabsContent value="software">
          <CatalogSection
            endpoint="/catalogs/software"
            title="Software Catalog"
            description="Manage main and additional software in one catalog"
            columns={[
              { key: "software_type", label: "Type" },
              { key: "name", label: "Name" },
              { key: "version", label: "Version" },
              { key: "description", label: "Description" },
            ]}
            fields={[
              {
                key: "software_type",
                label: "Software Type",
                type: "select",
                options: ["main", "additional"],
                required: true,
              },
              { key: "name", label: "Name", required: true },
              { key: "version", label: "Version" },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
