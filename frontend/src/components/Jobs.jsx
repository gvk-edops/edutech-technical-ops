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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const steps = [
  { id: "client", title: "Client", icon: MapPin },
  { id: "hardware", title: "Hardware", icon: Monitor },
  { id: "memory", title: "Memory", icon: MemoryStick },
  { id: "storage", title: "Storage", icon: HardDrive },
  { id: "software", title: "Software", icon: Package },
  { id: "review", title: "Review", icon: Check },
];
const emptyForm = {
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
  const activeSteps =
    jobType === "smartboard" ? [steps[0], steps[1], steps[5]] : steps;
  const currentStep = activeSteps[step];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [
        clients,
        smartboards,
        ops,
        rams,
        storage,
        mainSoftware,
        additionalSoftware,
      ] = await Promise.all([
        axios.get(`${API_URL}/clients`),
        axios.get(`${API_URL}/catalogs/smartboard-models`),
        axios.get(`${API_URL}/catalogs/ops-models`),
        axios.get(`${API_URL}/catalogs/ram-specs`),
        axios.get(`${API_URL}/catalogs/storage-specs`),
        axios.get(`${API_URL}/catalogs/main-software`),
        axios.get(`${API_URL}/catalogs/additional-software`),
      ]);
      setData({
        clients: clients.data.data || [],
        smartboards: smartboards.data.data || [],
        ops: ops.data.data || [],
        rams: rams.data.data || [],
        storage: storage.data.data || [],
        mainSoftware: mainSoftware.data.data || [],
        additionalSoftware: additionalSoftware.data.data || [],
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
    if (currentStep.id === "client" && !form.client_id)
      return "Choose a client first";
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
  const toggleSoftware = (key, id, checked) =>
    key(checked ? [...key, id] : key.filter((value) => value !== id));

  const submit = async () => {
    const error = validateStep();
    if (error) return toast.error(error);
    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/jobs`, {
        ...form,
        job_type: jobType,
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

  if (loading)
    return (
      <main className="p-5">
        <p className="py-16 text-center text-muted-foreground">
          Loading job options...
        </p>
      </main>
    );

  if (screen === "overview")
    return (
      <main className="overflow-y-auto p-5">
        <div className="mx-auto max-w-5xl py-4 md:py-10">
          <div className="max-w-2xl">
            <Badge className="mb-4 gap-2">
              <ClipboardCheck className="h-3.5 w-3.5" /> Job workspace
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Build a job with confidence.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Create a clear requirement record for a new smartboard
              installation or an OPS service request. The guided workflow keeps
              every choice organised before anything is saved.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Before you start",
                "Have the client and component requirements ready.",
                MapPin,
              ],
              [
                "What you will define",
                "Hardware, memory, storage, and software needs.",
                Cpu,
              ],
              [
                "How it works",
                "Complete each step, review the summary, then create.",
                Check,
              ],
            ].map(([title, description, Icon]) => (
              <Card
                key={title}
                className="border-sky-100 bg-gradient-to-br from-white to-sky-50/70 dark:border-sky-900 dark:from-slate-950 dark:to-sky-950/30"
              >
                <CardContent className="p-5">
                  <Icon className="h-5 w-5 text-sky-600" />
                  <p className="mt-4 font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-6 max-w-2xl">
            <CardHeader>
              <CardTitle>Ready to begin?</CardTitle>
              <CardDescription>
                Choose the workflow that matches the request.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
        <div className="mx-auto max-w-3xl py-4 md:py-10">
          <Button
            variant="ghost"
            onClick={() => setScreen("overview")}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            What kind of job is this?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tell us what this request needs, and we will show only the relevant
            steps.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card
              className="cursor-pointer border-2 transition-colors hover:border-primary"
              onClick={() => {
                setJobType("smartboard");
                setScreen("wizard");
              }}
            >
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Monitor className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3">Smartboard only</CardTitle>
                <CardDescription>
                  Add a smartboard model and use its catalog description.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Simple 3-step flow</Badge>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-2 transition-colors hover:border-primary"
              onClick={() => {
                setJobType("ops");
                setScreen("wizard");
              }}
            >
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Wrench className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3">OPS only</CardTitle>
                <CardDescription>
                  Configure an OPS unit without selecting a smartboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">OPS requirements</Badge>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer border-2 transition-colors hover:border-primary"
              onClick={() => {
                setJobType("both");
                setScreen("wizard");
              }}
            >
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <CardTitle className="mt-3">Smartboard + OPS</CardTitle>
                <CardDescription>
                  Define the complete combined requirement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Full workflow</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    );

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-white">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Create Job
            </h2>
            <p className="text-sm text-muted-foreground">
              Define the build requirements step by step.
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="border-sky-100 bg-gradient-to-b from-white to-sky-50/70 dark:border-sky-900 dark:from-slate-950 dark:to-sky-950/30 lg:sticky lg:top-5">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Build progress</CardTitle>
            <CardDescription>
              {jobType === "smartboard"
                ? "Smartboard only"
                : jobType === "ops"
                  ? "OPS only"
                  : "Smartboard + OPS"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 p-3 lg:grid-cols-1">
            {activeSteps.map(({ title, icon: Icon }, index) => (
              <button
                type="button"
                key={title}
                onClick={() => index <= step && setStep(index)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left text-xs transition-all ${index === step ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50"}`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
                  {index < step ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <span className="hidden sm:inline lg:inline">{title}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <div>
          <Card className="mx-auto max-w-4xl">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{currentStep.title}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {jobType} job
                </Badge>
              </div>
              <CardDescription>
                Step {step + 1} of {activeSteps.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-muted-foreground">{getStepTip()}</p>
              </div>
              {currentStep.id === "client" && (
                <>
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
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                      <MapPin className="mr-2 inline h-4 w-4" />
                      {selectedClient.district_name},{" "}
                      {selectedClient.province_name}
                    </div>
                  )}
                </>
              )}
              {currentStep.id === "hardware" && (
                <>
                  {jobType === "new" && (
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
                            <SelectValue placeholder="Select smartboard model" />
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
                    <p className="text-sm text-muted-foreground">
                      Selected memory: {selectedRam.brand || "Standard"}{" "}
                      {selectedRam.ddr_version} {selectedRam.capacity_gb} GB
                    </p>
                  )}
                </>
              )}
              {currentStep.id === "storage" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Storage requirements</p>
                      <p className="text-sm text-muted-foreground">
                        Add primary, secondary, or additional drives.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addStorage}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" /> Add drive
                    </Button>
                  </div>
                  {storageRequirements.map((requirement, index) => (
                    <div
                      className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[140px_1fr_auto]"
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
                  <div>
                    <p className="mb-3 font-medium">Main software</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.mainSoftware.map((item) => (
                        <label
                          className="flex items-center gap-2 rounded-md border p-3 text-sm"
                          key={item.id}
                        >
                          <Checkbox
                            checked={mainSoftwareIds.includes(Number(item.id))}
                            onCheckedChange={(checked) =>
                              toggleSoftware(
                                setMainSoftwareIds,
                                Number(item.id),
                                checked,
                              )
                            }
                          />
                          {item.name}
                          {item.version ? ` ${item.version}` : ""}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 font-medium">Additional software</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {data.additionalSoftware.map((item) => (
                        <label
                          className="flex items-center gap-2 rounded-md border p-3 text-sm"
                          key={item.id}
                        >
                          <Checkbox
                            checked={additionalSoftwareIds.includes(
                              Number(item.id),
                            )}
                            onCheckedChange={(checked) =>
                              toggleSoftware(
                                setAdditionalSoftwareIds,
                                Number(item.id),
                                checked,
                              )
                            }
                          />
                          {item.name}
                          {item.version ? ` ${item.version}` : ""}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {currentStep.id === "review" && (
                <div className="space-y-4">
                  {jobType === "smartboard" ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-5 dark:border-sky-800 dark:bg-sky-950/30">
                        <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                          Smartboard model
                        </p>
                        <p className="mt-2 text-xl font-semibold">
                          {selectedSmartboard?.model_name || "Not selected"}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {selectedSmartboard?.description ||
                            "No model description is available in System Configuration."}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This simple job records the selected smartboard model
                        for now. OPS requirements can be added later.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["Client", selectedClient?.name],
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
                          <div
                            className="rounded-lg border bg-muted/30 p-3"
                            key={label}
                          >
                            <p className="text-xs text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-1 font-medium">
                              {value || "Not selected"}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="mb-2 font-medium">Storage</p>
                        {selectedStorage.length ? (
                          selectedStorage.map((item) => (
                            <Badge
                              className="mr-2"
                              variant="secondary"
                              key={item.id}
                            >
                              {item.storage_type}{" "}
                              {item.capacity_gb >= 1024
                                ? `${item.capacity_gb / 1024} TB`
                                : `${item.capacity_gb} GB`}{" "}
                              {item.interface}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No storage requirement
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Review the requirements before creating this job.
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
            <div className="flex justify-between border-t p-6">
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
