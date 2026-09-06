import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  FileSearch,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const pretty = (value) =>
  value
    ?.replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "—";
const readableDetails = (value) => {
  if (!value) return "—";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Object.entries(parsed)
      .map(
        ([key, item]) =>
          `${pretty(key)}: ${typeof item === "object" ? JSON.stringify(item) : item}`,
      )
      .join(" · ");
  } catch {
    return String(value);
  }
};
const emptyOverview = {
  summary: {},
  actions: [],
  entities: [],
  actors: [],
  hourly: [],
  performance: {},
  generated_at: null,
};

export default function AuditPortal() {
  const navigate = useNavigate();
  const [authorised, setAuthorised] = useState(null);
  const [logs, setLogs] = useState([]);
  const [options, setOptions] = useState({
    actions: [],
    entityTypes: [],
    users: [],
  });
  const [filters, setFilters] = useState({
    action: "all",
    entityType: "all",
    userId: "all",
    from: "",
    to: "",
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, limit: 50 });
  const [overview, setOverview] = useState(emptyOverview);
  const [live, setLive] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/auth/me`)
      .then((response) => setAuthorised(response.data.user?.role === "auditor"))
      .catch(() => setAuthorised(false));
  }, []);

  const load = useCallback(async () => {
    if (!authorised) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filters.action !== "all") params.set("action", filters.action);
      if (filters.entityType !== "all")
        params.set("entity_type", filters.entityType);
      if (filters.userId !== "all") params.set("user_id", filters.userId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const [logsResponse, optionsResponse] = await Promise.all([
        axios.get(`${API_URL}/audit/logs?${params}`),
        axios.get(`${API_URL}/audit/filters`),
      ]);
      setLogs(logsResponse.data.data || []);
      setPagination(logsResponse.data.pagination || { total: 0, limit: 50 });
      setOptions(
        optionsResponse.data.data || {
          actions: [],
          entityTypes: [],
          users: [],
        },
      );
    } catch (errorResponse) {
      toast.error(
        errorResponse.response?.data?.Error || "Could not load audit records",
      );
    } finally {
      setLoading(false);
    }
  }, [authorised, filters, page]);

  const refreshOverview = useCallback(async () => {
    if (!authorised) return;
    try {
      const { data } = await axios.get(`${API_URL}/audit/overview`);
      if (data.Status) {
        setOverview(data.data || emptyOverview);
        setLive(true);
      }
    } catch {
      setLive(false);
    }
  }, [authorised]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!authorised) return undefined;
    const interval = window.setInterval(load, 10000);
    return () => window.clearInterval(interval);
  }, [authorised, load]);
  useEffect(() => {
    refreshOverview();
    const interval = window.setInterval(refreshOverview, 10000);
    return () => window.clearInterval(interval);
  }, [refreshOverview]);

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (authorised === null)
    return (
      <div className="flex min-h-svh items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (!authorised)
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/30 p-5">
        <div className="max-w-md rounded-xl border bg-background p-8 text-center space-y-4 shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="text-xl font-bold">Auditor access required</h1>
          <p className="text-sm text-muted-foreground">
            This independent audit portal is available only to accounts with the
            auditor role.
          </p>
          <Button onClick={() => navigate("/login", { replace: true })}>
            Go to Login
          </Button>
        </div>
      </div>
    );

  const pages = Math.max(Math.ceil(pagination.total / pagination.limit), 1);
  const update = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const maxActionCount = Math.max(
    ...overview.actions.map((item) => Number(item.count)),
    1,
  );

  return (
    <main className="min-h-svh bg-muted/30 p-5 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-background px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold">Audit Portal</h1>
              <p className="text-xs text-muted-foreground">
                Read-only activity record · Auditor access
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={live ? "default" : "secondary"} className="gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-300" : "bg-muted-foreground"}`}
              />{" "}
              {live ? "Live" : "Offline"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                load();
                refreshOverview();
              }}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [
              "Total events",
              overview.summary.total,
              FileSearch,
              "all recorded activity",
            ],
            [
              "Last 24 hours",
              overview.summary.last_24_hours,
              Activity,
              "recent activity",
            ],
            [
              "Last hour",
              overview.summary.last_hour,
              Zap,
              "near real-time pulse",
            ],
            ["Active actors", overview.summary.actors, Users, "unique users"],
            [
              "Entity types",
              overview.summary.entities,
              BarChart3,
              "tracked surfaces",
            ],
          ].map(([label, value, Icon, note]) => (
            <div
              key={label}
              className="rounded-xl border bg-background p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {Number(value || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border bg-background p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Activity pulse</h2>
                <p className="text-xs text-muted-foreground">
                  Events grouped by hour · updates every 10 seconds
                </p>
              </div>
              <Badge variant="outline">24h</Badge>
            </div>
            <div className="flex h-40 items-end gap-1.5 border-b border-l px-2 pb-0">
              {overview.hourly.length === 0 ? (
                <p className="mb-4 w-full text-center text-xs text-muted-foreground">
                  No activity in the last 24 hours.
                </p>
              ) : (
                overview.hourly.map((item) => (
                  <div
                    key={item.hour}
                    className="group flex h-full flex-1 flex-col justify-end"
                    title={`${item.hour}: ${item.count} events`}
                  >
                    <div
                      className="min-h-1 rounded-t bg-primary/75 transition-all group-hover:bg-primary"
                      style={{
                        height: `${Math.max((Number(item.count) / Math.max(...overview.hourly.map((entry) => Number(entry.count)), 1)) * 100, 3)}%`,
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border bg-background p-5 shadow-sm">
              <h2 className="font-semibold">Top actions</h2>
              <div className="mt-4 space-y-3">
                {overview.actions.slice(0, 5).map((item) => (
                  <div key={item.action}>
                    <div className="mb-1 flex justify-between gap-3 text-xs">
                      <span className="truncate">{item.action}</span>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(Number(item.count) / maxActionCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-5 shadow-sm">
              <h2 className="font-semibold">Tracked entities</h2>
              <div className="mt-4 space-y-2">
                {overview.entities.slice(0, 5).map((item) => (
                  <div
                    key={item.entity_type}
                    className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs"
                  >
                    <span>{pretty(item.entity_type)}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Server performance</h2>
              <p className="text-xs text-muted-foreground">
                Read-only health metrics from the audit API server.
              </p>
            </div>
            <Badge variant="outline">
              Node {overview.performance?.nodeVersion || "—"}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "API database latency",
                `${overview.performance?.dbLatencyMs || 0} ms`,
              ],
              [
                "Server uptime",
                `${Math.floor((overview.performance?.uptimeSeconds || 0) / 3600)}h ${Math.floor(((overview.performance?.uptimeSeconds || 0) % 3600) / 60)}m`,
              ],
              ["Memory RSS", `${overview.performance?.memoryRssMb || 0} MB`],
              ["Heap used", `${overview.performance?.heapUsedMb || 0} MB`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <Select
              value={filters.action}
              onValueChange={(value) => update("action", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {options.actions.map((item) => (
                  <SelectItem key={item.action} value={item.action}>
                    {item.action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entity</Label>
            <Select
              value={filters.entityType}
              onValueChange={(value) => update("entityType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                {options.entityTypes.map((item) => (
                  <SelectItem key={item.entity_type} value={item.entity_type}>
                    {pretty(item.entity_type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Actor</Label>
            <Select
              value={filters.userId}
              onValueChange={(value) => update("userId", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                {options.users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.full_name} ({user.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={filters.from}
              onChange={(event) => update("from", event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => update("to", event.target.value)}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <div className="border-b px-5 py-3 text-sm text-muted-foreground">
            {pagination.total} record{pagination.total === 1 ? "" : "s"}
          </div>
          {loading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              No activity matches these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b last:border-0 align-top"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {log.full_name || "System"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.username || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {pretty(log.entity_type)}
                        {log.entity_id ? ` #${log.entity_id}` : ""}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-muted-foreground break-words">
                        {readableDetails(log.details)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.ip_address || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
