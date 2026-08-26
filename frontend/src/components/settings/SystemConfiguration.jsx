import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

// ── Generic catalog table component ─────────────────
function CatalogTable({
  title,
  items,
  columns,
  onAdd,
  onEdit,
  onDelete,
  loading,
}) {
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
                      {item[c.key] ?? "—"}
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

  const fetch = async () => {
    try {
      const { data } = await axios.get(`${API_URL}${endpoint}`);
      setItems(data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetch();
  }, [endpoint]);

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
  useEffect(() => setForm(initial || {}), [initial, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the catalog item details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label>
                {f.label}
                {f.required ? " *" : ""}
              </Label>
              {f.type === "select" ? (
                <Select
                  value={form[f.key] || ""}
                  onValueChange={(v) => set(f.key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${f.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={f.type || "text"}
                  value={form[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <AlertDialogFooter>
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
function CatalogSection({ endpoint, title, description, columns, fields }) {
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

// ── Main component ────────────────────────────────────
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

      <Tabs defaultValue="smartboards">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="smartboards">Smartboard Models</TabsTrigger>
          <TabsTrigger value="ops">OPS Models</TabsTrigger>
          <TabsTrigger value="ram">RAM Specs</TabsTrigger>
          <TabsTrigger value="storage">Storage Specs</TabsTrigger>
          <TabsTrigger value="netcards">Network Cards</TabsTrigger>
          <TabsTrigger value="mainsw">Main Software</TabsTrigger>
          <TabsTrigger value="addsw">Additional Software</TabsTrigger>
        </TabsList>

        {/* Smartboard Models */}
        <TabsContent value="smartboards">
          <CatalogSection
            endpoint="/catalogs/smartboard-models"
            title="Smartboard Models"
            description="Smartboard models used in jobs"
            columns={[
              { key: "model_name", label: "Model" },
              { key: "brand", label: "Brand" },
              { key: "description", label: "Description" },
            ]}
            fields={[
              { key: "model_name", label: "Model Name", required: true },
              { key: "brand", label: "Brand" },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>

        {/* OPS Models */}
        <TabsContent value="ops">
          <CatalogSection
            endpoint="/catalogs/ops-models"
            title="OPS Models"
            description="OPS unit processor specifications"
            columns={[
              { key: "model_name", label: "Model" },
              { key: "processor_series", label: "Series" },
              { key: "processor_core", label: "Core" },
              { key: "base_speed_ghz", label: "GHz" },
            ]}
            fields={[
              { key: "model_name", label: "Model Name", required: true },
              {
                key: "processor_series",
                label: "Processor Series",
                type: "select",
                options: ["i", "ultra"],
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
        </TabsContent>

        {/* RAM Specs */}
        <TabsContent value="ram">
          <CatalogSection
            endpoint="/catalogs/ram-specs"
            title="RAM Specifications"
            description="DDR version and capacity combinations"
            columns={[
              { key: "ddr_version", label: "DDR Version" },
              { key: "capacity_gb", label: "Capacity (GB)" },
              { key: "description", label: "Description" },
            ]}
            fields={[
              {
                key: "ddr_version",
                label: "DDR Version (e.g. DDR4)",
                required: true,
              },
              {
                key: "capacity_gb",
                label: "Capacity (GB)",
                type: "number",
                required: true,
              },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>

        {/* Storage Specs */}
        <TabsContent value="storage">
          <CatalogSection
            endpoint="/catalogs/storage-specs"
            title="Storage Specifications"
            description="Form factor, interface, type, and capacity"
            columns={[
              { key: "form_factor", label: "Form Factor" },
              { key: "interface", label: "Interface" },
              { key: "storage_type", label: "Type" },
              { key: "capacity_gb", label: "GB" },
            ]}
            fields={[
              {
                key: "form_factor",
                label: 'Form Factor (e.g. M.2, 2.5")',
                required: true,
              },
              {
                key: "interface",
                label: "Interface (e.g. NVMe, SATA)",
                required: true,
              },
              {
                key: "storage_type",
                label: "Type",
                type: "select",
                options: ["SSD", "HDD"],
                required: true,
              },
              {
                key: "capacity_gb",
                label: "Capacity (GB)",
                type: "number",
                required: true,
              },
              { key: "description", label: "Description" },
            ]}
          />
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

        {/* Main Software Catalog */}
        <TabsContent value="mainsw">
          <CatalogSection
            endpoint="/catalogs/main-software"
            title="Main Software Catalog"
            description="Licensed software: Windows, Office, IQ Whiteboard, Antivirus"
            columns={[
              { key: "software_type", label: "Type" },
              { key: "name", label: "Name" },
              { key: "version", label: "Version" },
            ]}
            fields={[
              {
                key: "software_type",
                label: "Software Type",
                type: "select",
                options: ["windows", "office", "iq_whiteboard", "antivirus"],
                required: true,
              },
              { key: "name", label: "Name", required: true },
              { key: "version", label: "Version" },
              { key: "description", label: "Description" },
            ]}
          />
        </TabsContent>

        {/* Additional Software Catalog */}
        <TabsContent value="addsw">
          <CatalogSection
            endpoint="/catalogs/additional-software"
            title="Additional Software Catalog"
            description="Non-licensed software: VLC, Chrome, etc."
            columns={[
              { key: "name", label: "Name" },
              { key: "version", label: "Version" },
              { key: "description", label: "Description" },
            ]}
            fields={[
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
