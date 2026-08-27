import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Monitor,
  Package,
  Plus,
  Trash2,
  Cpu,
  MemoryStick,
  HardDrive,
  ClipboardCheck,
  Wrench,
  Lightbulb,
  CalendarDays,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const steps = [
  { id: "client", title: "Client", icon: MapPin },
  { id: "hardware", title: "Hardware", icon: Monitor },
  { id: "memory", title: "Memory", icon: MemoryStick },
  { id: "storage", title: "Storage", icon: HardDrive },
  { id: "software", title: "Software", icon: Package },
  { id: "review", title: "Review", icon: Check },
];
const emptyForm = {
  job_date: "",
  client_id: "",
  smartboard_model_id: "",
  smartboard_count: "1",
  ops_model_id: "",
  ram_ddr_version: "",
  ram_capacity_gb: "",
};

export default function Jobs() {
  const [data, setData] = useState({
    clients: [],
    smartboards: [],
    ops: [],
    rams: [],
    storage: [],
    mainSoftware: [],
    additionalSoftware: [],
  });
  const [form, setForm] = useState(emptyForm);
  const [storageRequirements, setStorageRequirements] = useState([]);
  const [mainSoftwareIds, setMainSoftwareIds] = useState([]);
  const [additionalSoftwareIds, setAdditionalSoftwareIds] = useState([]);
  const [step, setStep] = useState(0);
  const [screen, setScreen] = useState("overview");
  const [jobType, setJobType] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("create");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const activeSteps =
    jobType === "smartboard" ? [steps[0], steps[1], steps[5]] : steps;
  const currentStep = activeSteps[step];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const requests = await Promise.allSettled([
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/catalogs/smartboard-models`),
        axios.get(`${API_URL}/catalogs/ops-models`),
        axios.get(`${API_URL}/catalogs/ram-specs`),
        axios.get(`${API_URL}/catalogs/storage-specs`),
        axios.get(`${API_URL}/catalogs/main-software`),
        axios.get(`${API_URL}/catalogs/additional-software`),
      ]);
      const getData = (result) =>
        result.status === "fulfilled" ? result.value.data.data || [] : [];
      setData({
        clients: getData(requests[0]),
        smartboards: getData(requests[1]),
        ops: getData(requests[2]),
        rams: getData(requests[3]),
        storage: getData(requests[4]),
        mainSoftware: getData(requests[5]),
        additionalSoftware: getData(requests[6]),
      });
    } catch {
      toast.error("Could not load job options");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/jobs`);
      setJobs(response.data.data || []);
    } catch {
      toast.error("Could not load jobs");
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (workspaceTab === "view") loadJobs();
  }, [workspaceTab, loadJobs]);

  const selectedClient = data.clients.find(
    (client) => String(client.id) === form.client_id,
  );
  const selectedSmartboard = data.smartboards.find(
    (item) => String(item.id) === form.smartboard_model_id,
  );
  const selectedRam = data.rams.find(
    (ram) => ram.ddr_version === form.ram_ddr_version,
  );
  const selectedStorage = useMemo(
    () =>
      data.storage.filter((item) =>
        storageRequirements.some(
          (requirement) =>
            String(requirement.storage_spec_id) === String(item.id),
        ),
      ),
    [data.storage, storageRequirements],
  );
  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const validateStep = () => {
    if (currentStep.id === "client" && (!form.client_id || !form.job_date))
      return !form.client_id ? "Choose a client first" : "Choose a job date";
    if (
      currentStep.id === "hardware" &&
      ((jobType !== "smartboard" && !form.ops_model_id) ||
        (form.smartboard_model_id && Number(form.smartboard_count) < 1))
    )
      return form.smartboard_model_id
        ? "Enter a valid smartboard quantity"
        : "Choose an OPS model";
    if (
      currentStep.id === "memory" &&
      (!form.ram_ddr_version ||
        !form.ram_capacity_gb ||
        Number(form.ram_capacity_gb) < 1)
    )
      return "Choose RAM type and required capacity";
    if (
      currentStep.id === "storage" &&
      storageRequirements.some(
        (requirement) => !requirement.role || !requirement.storage_spec_id,
      )
    )
      return "Complete each storage requirement";
    return null;
  };
  const next = () => {
    const error = validateStep();
    if (error) return toast.error(error);
    setStep((current) => Math.min(current + 1, activeSteps.length - 1));
  };
  const addStorage = () =>
    setStorageRequirements((current) => [
      ...current,
      {
        role: current.length === 0 ? "primary" : "secondary",
        storage_spec_id: "",
      },
    ]);
  const updateStorage = (index, key, value) =>
    setStorageRequirements((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  const toggleSoftware = (setIds, id, checked) =>
    setIds((currentIds) =>
      checked
        ? [...new Set([...currentIds, id])]
        : currentIds.filter((value) => value !== id),
    );

  const submit = async () => {
    const error = validateStep();
    if (error) return toast.error(error);
    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/jobs`, {
        ...form,
        job_type: jobType,
        job_date: form.job_date,
        client_id: Number(form.client_id),
        smartboard_model_id: form.smartboard_model_id
          ? Number(form.smartboard_model_id)
          : null,
        smartboard_count: form.smartboard_model_id
          ? Number(form.smartboard_count)
          : 0,
        ops_model_id: form.ops_model_id ? Number(form.ops_model_id) : null,
        ram_capacity_gb: form.ram_capacity_gb
          ? Number(form.ram_capacity_gb)
          : null,
        storage_requirements: storageRequirements.map((item) => ({
          ...item,
          storage_spec_id: Number(item.storage_spec_id),
        })),
        main_software_ids: mainSoftwareIds,
        additional_software_ids: additionalSoftwareIds,
      });
      toast.success(`${response.data.job_number} created`);
      setForm(emptyForm);
      setStorageRequirements([]);
      setMainSoftwareIds([]);
      setAdditionalSoftwareIds([]);
      setStep(0);
      setJobType("");
      setScreen("overview");
      loadJobs();
    } catch (errorResponse) {
      toast.error(
        errorResponse.response?.data?.Error || "Could not create job",
      );
    } finally {
      setSaving(false);
    }
  };

  const getStepTip = () => {
    if (currentStep.id === "client")
      return "Choose the client first. Its district will be used automatically for this job.";
    if (currentStep.id === "hardware") {
      if (jobType === "smartboard")
        return "Select the smartboard model. Its catalog description is shown on the review step.";
      if (jobType === "ops")
        return "Choose the OPS model for this request. Smartboard details are not needed.";
      return "Select the smartboard and OPS model for this combined requirement.";
    }
    if (currentStep.id === "memory")
      return "RAM capacity is the total memory required for the finished unit.";
    if (currentStep.id === "storage")
      return "Add only the drives the job needs. Storage roles help technicians assemble the unit correctly.";
    if (currentStep.id === "software")
      return "Software selections are optional and can be left empty when no software is required.";
    return "Check every requirement before creating the job.";
  };

  const workspaceTabs = (
    <Tabs value={workspaceTab} onValueChange={setWorkspaceTab} className="mb-6">
      <TabsList className="grid h-11 w-full max-w-md grid-cols-2">
        <TabsTrigger value="create" className="gap-2">
          <Plus className="h-4 w-4" /> Create Job
        </TabsTrigger>
        <TabsTrigger value="view" className="gap-2">
          <ClipboardCheck className="h-4 w-4" /> View Jobs
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  if (loading)
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-5">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">
            Loading job options...
          </p>
        </div>
      </main>
    );

  const statusColor = (status) => {
    if (status === "completed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "ready_for_delivery") return "bg-sky-100 text-sky-700 border-sky-200";
    if (status === "assembly_in_progress") return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "cancelled") return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  if (workspaceTab === "view")
    return (
      <main className="overflow-y-auto p-5">
        <div className="mx-auto max-w-6xl py-4 md:py-8">
          {workspaceTabs}
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
              <p className="mt-1 text-muted-foreground">
                Review job scopes, requirements, and current status.
              </p>
            </div>
            <Button
              onClick={() => {
                setWorkspaceTab("create");
                setScreen("type");
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> New Job
            </Button>
          </div>
          {jobsLoading ? (
            <p className="py-16 text-center text-muted-foreground">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                No jobs created yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {jobs.map((job) => (
                <Card key={job.id} className="flex flex-col overflow-hidden shadow-sm">
                  {/* Header */}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-bold tracking-tight">
                          {job.job_number}
                        </CardTitle>
                        <CardDescription className="mt-0.5 truncate">
                          {job.client_name}
                        </CardDescription>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusColor(job.status)}`}>
                        {job.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                    {/* Location + scope row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.district_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {job.required_date
                          ? new Date(job.required_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                          : "No date set"}
                      </span>
                    </div>

                    <Separator />

                    {/* Scope badge */}
                    <div className="flex items-center gap-2">
                      {job.job_type === "smartboard" && <Monitor className="h-3.5 w-3.5 text-sky-500" />}
                      {job.job_type === "ops" && <Wrench className="h-3.5 w-3.5 text-amber-500" />}
                      {job.job_type === "both" && <BriefcaseBusiness className="h-3.5 w-3.5 text-emerald-500" />}
                      <span className="text-xs font-medium capitalize">
                        {job.job_type === "both" ? "Smartboard + OPS" : job.job_type === "smartboard" ? "Smartboard only" : "OPS only"}
                      </span>
                    </div>

                    {/* Hardware */}
                    <div className="space-y-2 text-sm">
                      {job.smartboard_model && (
                        <div className="flex items-start gap-2">
                          <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Smartboard</p>
                            <p className="font-medium truncate">{job.smartboard_model}</p>
                            {job.smartboard_count > 0 && (
                              <p className="text-xs text-muted-foreground">Qty: {job.smartboard_count}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {job.ops_model && (
                        <div className="flex items-start gap-2">
                          <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">OPS Model</p>
                            <p className="font-medium truncate">{job.ops_model}</p>
                          </div>
                        </div>
                      )}
                      {job.ram_ddr_version && (
                        <div className="flex items-start gap-2">
                          <MemoryStick className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">RAM</p>
                            <p className="font-medium">{job.ram_ddr_version} — {job.ram_capacity_gb} GB</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Storage */}
                    {job.storage_requirements?.length > 0 && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <HardDrive className="h-3 w-3" /> Storage
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.storage_requirements.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-xs capitalize">
                              {s.role}: {s.storage_type} {s.capacity_gb >= 1024 ? `${s.capacity_gb / 1024} TB` : `${s.capacity_gb} GB`} {s.interface}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Software */}
                    {(job.main_software?.length > 0 || job.additional_software?.length > 0) && (
                      <div>
                        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          <Package className="h-3 w-3" /> Software
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.main_software.map((s, i) => (
                            <Badge key={`m-${i}`} variant="outline" className="text-xs">
                              {s.name}{s.version ? ` ${s.version}` : ""}
                            </Badge>
                          ))}
                          {job.additional_software.map((s, i) => (
                            <Badge key={`a-${i}`} variant="outline" className="text-xs text-muted-foreground">
                              {s.name}{s.version ? ` ${s.version}` : ""}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto border-t pt-3 text-[11px] text-muted-foreground">
                      Created by {job.created_by_name || "—"} · {new Date(job.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    );

  if (screen === "overview")
    return (
      <main className="overflow-y-auto p-5">
        <div className="mx-auto max-w-6xl py-6 md:py-8">
          {workspaceTabs}
          <Badge variant="secondary" className="mb-5 gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Job workspace
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Build a job with confidence.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            Create a clear requirement record for a new smartboard installation
            or an OPS service request.
          </p>
          <Separator className="my-8" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              [
                "Before you start",
                "Have the client and component requirements ready.",
                MapPin,
                "text-sky-600",
              ],
              [
                "What you will define",
                "Hardware, memory, storage, and software needs.",
                Cpu,
                "text-violet-600",
              ],
              [
                "How it works",
                "Complete each step, review the summary, then create.",
                Check,
                "text-emerald-600",
              ],
            ].map(([title, description, Icon, color]) => (
              <Card key={title}>
                <CardContent className="p-5">
                  <div
                    className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-6">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="font-semibold">Ready to begin?</p>
                <p className="text-sm text-muted-foreground">
                  Choose the workflow that matches the request.
                </p>
              </div>
              <Button onClick={() => setScreen("type")} className="gap-2">
                Create Job <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );

  if (screen === "type")
    return (
      <main className="overflow-y-auto p-5">
        <div className="mx-auto max-w-6xl py-6 md:py-8">
          {workspaceTabs}
          <Button
            variant="ghost"
            onClick={() => setScreen("overview")}
            className="mb-6 gap-2 -ml-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            What kind of job is this?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select a workflow — only the relevant steps will be shown.
          </p>
          <Separator className="my-6" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                type: "smartboard",
                label: "Smartboard only",
                desc: "Add a smartboard model and use its catalog description.",
                icon: Monitor,
                badge: "3-step flow",
                color:
                  "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
              },
              {
                type: "ops",
                label: "OPS only",
                desc: "Configure an OPS unit without selecting a smartboard.",
                icon: Wrench,
                badge: "OPS requirements",
                color:
                  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
              },
              {
                type: "both",
                label: "Smartboard + OPS",
                desc: "Define the complete combined requirement.",
                icon: BriefcaseBusiness,
                badge: "Full workflow",
                color:
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
              },
            ].map(({ type, label, desc, icon: Icon, badge, color }) => (
              <Card
                key={type}
                className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-md"
                onClick={() => {
                  setJobType(type);
                  setScreen("wizard");
                }}
              >
                <CardHeader className="pb-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-3 text-base">{label}</CardTitle>
                  <CardDescription className="text-sm">{desc}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    );

  return (
    <main className="overflow-y-auto p-5">
      <div className="mx-auto mb-5 max-w-6xl">
        {workspaceTabs}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScreen("type")}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Create Job
              </h2>
              <p className="text-xs text-muted-foreground">
                Define the build requirements step by step.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="capitalize hidden sm:flex">
            {jobType === "smartboard"
              ? "Smartboard only"
              : jobType === "ops"
                ? "OPS only"
                : "Smartboard + OPS"}
          </Badge>
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl items-start gap-5">
        <Card className="sticky top-5 w-[200px] shrink-0">
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm">Progress</CardTitle>
            <Progress
              value={((step + 1) / activeSteps.length) * 100}
              className="h-1.5 mt-1"
            />
            <p className="text-xs text-muted-foreground">
              {step + 1} of {activeSteps.length} steps
            </p>
          </CardHeader>
          <Separator />
          <CardContent className="grid grid-cols-3 gap-1.5 p-2 lg:grid-cols-1">
            {activeSteps.map(({ title, icon: Icon }, index) => (
              <Button
                key={title}
                type="button"
                variant="ghost"
                onClick={() => index <= step && setStep(index)}
                className={`h-auto justify-start gap-2.5 px-2 py-2 text-xs ${
                  index === step
                    ? "bg-primary/10 text-primary font-semibold hover:bg-primary/10"
                    : index < step
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground cursor-default"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    index === step
                      ? "border-primary bg-primary text-primary-foreground"
                      : index < step
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                        : "border-muted-foreground/30"
                  }`}
                >
                  {index < step ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </span>
                <span className="hidden sm:inline lg:inline">{title}</span>
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0 flex-1">
          <Card className="mx-auto max-w-4xl">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    {(() => {
                      const Icon = currentStep.icon;
                      return <Icon className="h-4 w-4" />;
                    })()}
                  </div>
                  <CardTitle className="text-lg">{currentStep.title}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Step {step + 1} / {activeSteps.length}
                </Badge>
              </div>
              <Progress
                value={((step + 1) / activeSteps.length) * 100}
                className="h-1 mt-3"
              />
            </CardHeader>
            <Separator />
            <CardContent className="space-y-5 pt-5">
              <div className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-muted-foreground">{getStepTip()}</p>
              </div>
              {currentStep.id === "client" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="job-date">Required date *</Label>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="job-date"
                        type="date"
                        value={form.job_date}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(event) =>
                          update("job_date", event.target.value)
                        }
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the date this job is required or scheduled for.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select
                      value={form.client_id}
                      onValueChange={(value) => update("client_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.clients.map((client) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedClient && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">
                        {selectedClient.district_name}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-muted-foreground">
                        {selectedClient.province_name} Province
                      </span>
                    </div>
                  )}
                </>
              )}
              {currentStep.id === "hardware" && (
                <>
                  {(jobType === "smartboard" || jobType === "both") && (
                    <>
                      <div className="space-y-2">
                        <Label>Smartboard Model (optional)</Label>
                        <Select
                          value={form.smartboard_model_id}
                          onValueChange={(value) =>
                            update("smartboard_model_id", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                data.smartboards.length
                                  ? "Select smartboard model"
                                  : "No smartboard models available"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {data.smartboards.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.brand ? `${item.brand} - ` : ""}
                                {item.model_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Number of Smartboards (optional)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={form.smartboard_count}
                          onChange={(event) =>
                            update("smartboard_count", event.target.value)
                          }
                        />
                      </div>
                    </>
                  )}
                  {jobType !== "smartboard" && (
                    <div className="space-y-2">
                      <Label>OPS Model *</Label>
                      <Select
                        value={form.ops_model_id}
                        onValueChange={(value) => update("ops_model_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select OPS model" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.ops.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.model_name} - {item.processor_core}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
              {currentStep.id === "memory" && (
                <>
                  <div className="space-y-2">
                    <Label>RAM DDR Version *</Label>
                    <Select
                      value={form.ram_ddr_version}
                      onValueChange={(value) =>
                        update("ram_ddr_version", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select DDR version" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          ...new Set(data.rams.map((item) => item.ddr_version)),
                        ].map((version) => (
                          <SelectItem key={version} value={version}>
                            {version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Total RAM Required (GB) *</Label>
                    <Select
                      value={form.ram_capacity_gb}
                      onValueChange={(value) =>
                        update("ram_capacity_gb", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select capacity" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.rams
                          .filter(
                            (item) =>
                              !form.ram_ddr_version ||
                              item.ddr_version === form.ram_ddr_version,
                          )
                          .map((item) => (
                            <SelectItem
                              key={item.id}
                              value={String(item.capacity_gb)}
                            >
                              {item.capacity_gb} GB
                              {item.brand ? ` - ${item.brand}` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedRam && (
                    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                      <MemoryStick className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">
                        {selectedRam.brand || "Standard"}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-muted-foreground">
                        {selectedRam.ddr_version} &mdash;{" "}
                        {selectedRam.capacity_gb} GB
                      </span>
                    </div>
                  )}
                </>
              )}
              {currentStep.id === "storage" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Storage drives</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add primary, secondary, or additional drives.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStorage}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add drive
                    </Button>
                  </div>
                  {storageRequirements.length === 0 && (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No drives added yet. Click &ldquo;Add drive&rdquo; to
                      begin.
                    </div>
                  )}
                  {storageRequirements.map((requirement, index) => (
                    <div
                      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[130px_1fr_auto]"
                      key={`${requirement.role}-${index}`}
                    >
                      <Select
                        value={requirement.role}
                        onValueChange={(value) =>
                          updateStorage(index, "role", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["primary", "secondary", "tertiary", "additional"]
                            .filter(
                              (role) =>
                                !storageRequirements.some(
                                  (item, itemIndex) =>
                                    itemIndex !== index && item.role === role,
                                ),
                            )
                            .map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(requirement.storage_spec_id)}
                        onValueChange={(value) =>
                          updateStorage(index, "storage_spec_id", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select storage specification" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.storage.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.storage_type} - {item.form_factor} -{" "}
                              {item.interface} -{" "}
                              {item.capacity_gb >= 1024
                                ? `${item.capacity_gb / 1024} TB`
                                : `${item.capacity_gb} GB`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setStorageRequirements((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        aria-label="Remove storage requirement"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </>
              )}
              {currentStep.id === "software" && (
                <div className="space-y-6">
                  {[
                    {
                      label: "Main software",
                      items: data.mainSoftware,
                      ids: mainSoftwareIds,
                      setter: setMainSoftwareIds,
                    },
                    {
                      label: "Additional software",
                      items: data.additionalSoftware,
                      ids: additionalSoftwareIds,
                      setter: setAdditionalSoftwareIds,
                    },
                  ].map(({ label, items, ids, setter }) => (
                    <div key={label}>
                      <p className="mb-3 text-sm font-medium">{label}</p>
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          None configured.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {items.map((item) => (
                            <Label
                              key={item.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                            >
                              <Checkbox
                                checked={ids.includes(Number(item.id))}
                                onCheckedChange={(checked) =>
                                  toggleSoftware(
                                    setter,
                                    Number(item.id),
                                    checked,
                                  )
                                }
                              />
                              <span>
                                {item.name}
                                {item.version ? ` ${item.version}` : ""}
                              </span>
                            </Label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {currentStep.id === "review" && (
                <div className="space-y-4">
                  {jobType === "smartboard" ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Smartboard model
                        </p>
                        <p className="mt-2 text-xl font-semibold">
                          {selectedSmartboard?.model_name || "Not selected"}
                        </p>
                        <Separator className="my-3" />
                        <p className="text-sm leading-6 text-muted-foreground">
                          {selectedSmartboard?.description ||
                            "No model description available in System Configuration."}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This job records the selected smartboard model. OPS
                        requirements can be added later.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ["Client", selectedClient?.name],
                          ["Required date", form.job_date],
                          ["District", selectedClient?.district_name],
                          [
                            "Smartboard",
                            data.smartboards.find(
                              (item) =>
                                String(item.id) === form.smartboard_model_id,
                            )?.model_name,
                          ],
                          ["Quantity", form.smartboard_count],
                          [
                            "OPS",
                            data.ops.find(
                              (item) => String(item.id) === form.ops_model_id,
                            )?.model_name,
                          ],
                          [
                            "RAM",
                            `${form.ram_ddr_version} ${form.ram_capacity_gb} GB`,
                          ],
                        ].map(([label, value]) => (
                          <div className="rounded-lg border p-3" key={label}>
                            <p className="text-xs text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {value || (
                                <span className="text-muted-foreground italic">
                                  Not selected
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                      <Separator />
                      <div>
                        <p className="mb-2 text-sm font-medium">Storage</p>
                        {selectedStorage.length ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedStorage.map((item) => (
                              <Badge variant="secondary" key={item.id}>
                                {item.storage_type}{" "}
                                {item.capacity_gb >= 1024
                                  ? `${item.capacity_gb / 1024} TB`
                                  : `${item.capacity_gb} GB`}{" "}
                                {item.interface}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No storage requirement
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <Separator />
            <div className="flex justify-between p-4">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((current) => current - 1)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < activeSteps.length - 1 ? (
                <Button type="button" onClick={next} className="gap-2">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? "Creating..." : "Create Job"}{" "}
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
