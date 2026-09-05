import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Cpu,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { API_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const initialData = {
  stats: {
    totalJobs: 0,
    activeJobs: 0,
    readyForDelivery: 0,
    availableInventory: 0,
    activeRepairs: 0,
    outstandingBorrowings: 0,
  },
  breakdowns: { jobs: {}, inventory: {}, repairs: {}, borrowings: {} },
  componentTotals: {},
  recentJobs: [],
};

const statusLabels = {
  created: "Created",
  assembly_in_progress: "Assembly",
  ready_for_delivery: "Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

const jobChartConfig = {
  count: { label: "Jobs", color: "#147d92" },
};

const inventoryChartConfig = {
  in_stock: { label: "In stock", color: "#2f9e75" },
  assigned: { label: "Assigned", color: "#e2a72e" },
  faulty: { label: "Faulty", color: "#d95d5d" },
  borrowed: { label: "Borrowed", color: "#7967b7" },
};

const workloadChartConfig = {
  count: { label: "Items", color: "#d17b45" },
};

function formatDate(value) {
  if (!value) return "No required date";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function chartRows(values, labels = {}) {
  return Object.entries(values || {})
    .filter(([, count]) => Number(count) > 0)
    .map(([key, count]) => ({
      key,
      label: labels[key] || key.replaceAll("_", " "),
      count: Number(count),
    }));
}

function BreakdownRow({ label, value, badge, tone = "text-foreground" }) {
  return (
    <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border/60 py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className={`text-xl font-bold tabular-nums ${tone}`}>
          {value.toLocaleString()}
        </span>
        <Badge
          variant="outline"
          className="max-w-24 truncate rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        >
          {badge}
        </Badge>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`${API_URL}/dashboard/overview`, {
        withCredentials: true,
      });
      if (response.data.success) setData(response.data);
      else setError(response.data.error || "Unable to load dashboard data");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "Unable to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const jobRows = useMemo(
    () => chartRows(data.breakdowns.jobs, statusLabels),
    [data.breakdowns.jobs],
  );
  const inventoryRows = useMemo(
    () =>
      chartRows(data.breakdowns.inventory, inventoryChartConfig).map((row) => ({
        ...row,
        fill: inventoryChartConfig[row.key]?.color || "#147d92",
      })),
    [data.breakdowns.inventory],
  );
  const workloadRows = useMemo(
    () => [
      {
        label: "Open repairs",
        count:
          (data.breakdowns.repairs.open || 0) +
          (data.breakdowns.repairs.in_progress || 0),
      },
      {
        label: "Borrowed items",
        count: data.breakdowns.borrowings.borrowed || 0,
      },
      {
        label: "Returned items",
        count: data.breakdowns.borrowings.returned || 0,
      },
      {
        label: "Consumed items",
        count: data.breakdowns.borrowings.consumed || 0,
      },
    ],
    [data.breakdowns.repairs, data.breakdowns.borrowings],
  );
  const componentRows = [
    ["OPS", "OPS"],
    ["RAM", "RAM"],
    ["Storage", "Storage"],
    ["Network cards", "Network cards"],
  ];

  return (
    <main className="min-h-full overflow-y-auto bg-muted/20 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              Technical operations
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Operations dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A live statistical view of delivery, assembly, inventory, and
              service workload.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            <Button
              variant="outline"
              size="icon"
              onClick={loadDashboard}
              disabled={loading}
              title="Refresh dashboard"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between gap-4 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadDashboard}>
              Retry
            </Button>
          </div>
        )}

        <section className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="flex h-full min-w-0 flex-col rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <ClipboardList className="h-4 w-4 text-sky-600" /> Work
                  pipeline
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Job movement through operations
                </p>
              </div>
              <Badge variant="outline">{data.stats.totalJobs} total</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center space-y-0 pt-5">
              {loading ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <BreakdownRow
                    label="Active jobs"
                    value={data.stats.activeJobs}
                    badge="In progress"
                    tone="text-sky-700"
                  />
                  <BreakdownRow
                    label="Ready for delivery"
                    value={data.stats.readyForDelivery}
                    badge="Handover"
                    tone="text-emerald-700"
                  />
                  <BreakdownRow
                    label="Completed"
                    value={data.breakdowns.jobs.completed || 0}
                    badge="Closed"
                    tone="text-muted-foreground"
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex h-full min-w-0 flex-col rounded-lg">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Cpu className="h-4 w-4 text-amber-600" /> Inventory status
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Component availability and risk
                </p>
              </div>
              <Badge variant="outline">
                {data.stats.availableInventory} available
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center space-y-0 pt-5">
              {loading ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {componentRows.map(([label, key]) => (
                    <BreakdownRow
                      key={key}
                      label={label}
                      value={data.componentTotals[key] || 0}
                      badge="Total"
                      tone="text-amber-700"
                    />
                  ))}
                  <div className="mt-2 border-t border-border/60 pt-2">
                    <BreakdownRow
                      label="In stock"
                      value={data.breakdowns.inventory.in_stock || 0}
                      badge="Available"
                      tone="text-emerald-700"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex h-full min-w-0 flex-col rounded-lg md:col-span-2 xl:col-span-1">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b pb-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Wrench className="h-4 w-4 text-rose-600" /> Service & custody
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  After-service attention items
                </p>
              </div>
              <Badge variant="outline">Needs review</Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-center space-y-0 pt-5">
              {loading ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <BreakdownRow
                    label="Open repairs"
                    value={data.stats.activeRepairs}
                    badge="Service"
                    tone="text-rose-700"
                  />
                  <BreakdownRow
                    label="Borrowed items"
                    value={data.stats.outstandingBorrowings}
                    badge="Custody"
                    tone="text-violet-700"
                  />
                  <BreakdownRow
                    label="Returned items"
                    value={data.breakdowns.borrowings.returned || 0}
                    badge="Returned"
                    tone="text-emerald-700"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Job pipeline
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                How work is distributed across the delivery lifecycle.
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={jobChartConfig}
                className="h-[280px] w-full"
              >
                <BarChart
                  data={jobRows}
                  accessibilityLayer
                  margin={{ left: -20, right: 12, top: 8 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(value) =>
                      value.length > 13 ? `${value.slice(0, 12)}...` : value
                    }
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Inventory health
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Current status across OPS, RAM, storage, and network cards.
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={inventoryChartConfig}
                className="h-[280px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="label" />}
                  />
                  <Pie
                    data={inventoryRows}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={62}
                    outerRadius={94}
                    paddingAngle={3}
                  >
                    {inventoryRows.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="label" />}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold">
                Service workload
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Repair and technician custody activity.
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={workloadChartConfig}
                className="h-[230px] w-full"
              >
                <BarChart
                  data={workloadRows}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ left: 18, right: 12 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    width={92}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">
                  Recent jobs
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest work entering the operations queue.
                </p>
              </div>
              <Badge variant="outline">{data.stats.totalJobs} total</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Loading
                  operations data
                </div>
              ) : data.recentJobs.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No jobs have been created yet.
                </p>
              ) : (
                <div className="divide-y">
                  {data.recentJobs.slice(0, 6).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/20"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {job.job_number} · {job.client_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.district_name} · {job.units_assembled || 0} units
                          assembled · due {formatDate(job.required_date)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          job.status === "ready_for_delivery"
                            ? "default"
                            : "secondary"
                        }
                        className="shrink-0"
                      >
                        {statusLabels[job.status] || job.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Metrics are
          refreshed from the operations database.
        </div>
      </div>
    </main>
  );
}
