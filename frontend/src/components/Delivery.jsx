import { useCallback, useEffect, useState } from "react";
import { Check, ChevronLeft, Cpu, MapPin, Monitor, RefreshCw, Truck } from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const formatDate = (date) => date
  ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  : "No date set";

function DeliveryDetail({ jobId, onBack }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/delivery/jobs/${jobId}`);
      const data = response.data.data;
      setJob(data);
      setSelectedIds(data.units.filter((unit) => unit.status === "assembled").map((unit) => unit.id));
    } catch (errorResponse) {
      toast.error(errorResponse.response?.data?.Error || "Could not load delivery job");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const toggleUnit = (unitId, checked) => {
    setSelectedIds((current) => checked
      ? [...new Set([...current, unitId])]
      : current.filter((id) => id !== unitId));
  };

  const confirm = async () => {
    if (job.job_type !== "smartboard" && selectedIds.length === 0)
      return toast.error("Select at least one assembled unit");
    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/delivery/jobs/${job.id}`, {
        unit_ids: selectedIds,
        delivered_at: deliveryDate || null,
      });
      const { delivered_count: deliveredCount, job_completed: jobCompleted } = response.data;
      toast.success(jobCompleted
        ? "Delivery confirmed — job completed"
        : `${deliveredCount} unit${deliveredCount === 1 ? "" : "s"} marked delivered`);
      if (jobCompleted) onBack();
      else load();
    } catch (errorResponse) {
      toast.error(errorResponse.response?.data?.Error || "Could not confirm delivery");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!job) return null;

  const assembledUnits = job.units.filter((unit) => unit.status === "assembled");
  const isSmartboardOnly = job.job_type === "smartboard";

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" /> Ready Jobs
      </Button>

      <div className="rounded-xl border p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-bold">{job.job_number}</p>
            <p className="text-muted-foreground">{job.client_name}</p>
          </div>
          <Badge className="bg-sky-100 text-sky-700 border border-sky-200">Ready for delivery</Badge>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.district_name}</span>
          <span>Required {formatDate(job.required_date)}</span>
          {job.client_phone && <span>{job.client_phone}</span>}
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          {isSmartboardOnly ? <Monitor className="h-4 w-4 text-sky-600" /> : <Cpu className="h-4 w-4 text-violet-600" />}
          <span>{isSmartboardOnly ? `${job.smartboard_model} × ${job.smartboard_count}` : job.ops_model}</span>
        </div>
      </div>

      <div className="rounded-xl border p-5 space-y-4">
        <div>
          <p className="font-semibold">Confirm Delivery</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSmartboardOnly
              ? "Confirm that the smartboard order has been delivered."
              : "Select the assembled OPS units included in this delivery."}
          </p>
        </div>

        {!isSmartboardOnly && (
          <div className="space-y-2">
            {job.units.map((unit) => {
              const canDeliver = unit.status === "assembled";
              const checked = selectedIds.includes(unit.id);
              return (
                <label key={unit.id} className={`flex items-center gap-3 rounded-lg border px-3 py-3 ${canDeliver ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}>
                  <Checkbox checked={checked} disabled={!canDeliver} onCheckedChange={(value) => toggleUnit(unit.id, value === true)} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-medium text-sm">{unit.ops_serial}</p>
                    <p className="text-xs text-muted-foreground">{unit.ops_model}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{unit.status.replaceAll("_", " ")}</Badge>
                </label>
              );
            })}
          </div>
        )}

        {!isSmartboardOnly && assembledUnits.length === 0 && (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No assembled units are awaiting delivery.</p>
        )}

        <Separator />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <Label htmlFor="delivery-date">Delivery Date</Label>
            <Input id="delivery-date" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
          </div>
          <Button onClick={confirm} disabled={saving || (!isSmartboardOnly && selectedIds.length === 0)} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Confirm Delivery
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Delivery() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/delivery/jobs`);
      setJobs(response.data.data || []);
    } catch (errorResponse) {
      toast.error(errorResponse.response?.data?.Error || "Could not load ready deliveries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (selectedJobId) return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-3xl py-4">
        <DeliveryDetail jobId={selectedJobId} onBack={() => { setSelectedJobId(null); load(); }} />
      </div>
    </main>
  );

  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Delivery</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Confirm completed jobs as they leave the workshop.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed p-16 text-center space-y-2">
            <Truck className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">No jobs awaiting delivery</p>
            <p className="text-sm text-muted-foreground">Completed assembly jobs will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => (
              <button key={job.id} onClick={() => setSelectedJobId(job.id)} className="rounded-xl border p-4 text-left space-y-3 hover:border-primary hover:shadow-md transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold group-hover:text-primary transition-colors">{job.job_number}</p>
                    <p className="text-sm text-muted-foreground truncate">{job.client_name}</p>
                  </div>
                  <Badge className="bg-sky-100 text-sky-700 border border-sky-200">Ready</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{job.district_name}</div>
                <Separator />
                <div className="flex items-center gap-2 text-sm">
                  {job.job_type === "smartboard" ? <Monitor className="h-4 w-4 text-sky-600" /> : <Cpu className="h-4 w-4 text-violet-600" />}
                  <span className="truncate">{job.job_type === "smartboard" ? job.smartboard_model : job.ops_model}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{job.job_type === "smartboard" ? `${job.smartboard_count} smartboard${job.smartboard_count === 1 ? "" : "s"}` : `${job.awaiting_delivery} unit${job.awaiting_delivery === 1 ? "" : "s"} awaiting`}</span>
                  <span className="flex items-center gap-1 text-primary font-medium"><Truck className="h-3.5 w-3.5" /> Deliver</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
