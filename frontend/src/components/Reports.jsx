import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { Download, FileText, Loader2, BarChart2, Search, History, Users, Activity, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState("assemblies");
  
  // Tab 1: Assemblies
  const [assemblies, setAssemblies] = useState([]);
  const [assembliesLoading, setAssembliesLoading] = useState(false);

  // Tab 2: Unit History
  const [searchSerial, setSearchSerial] = useState("");
  const [unitHistory, setUnitHistory] = useState(null);
  const [unitHistoryLoading, setUnitHistoryLoading] = useState(false);

  // Tab 3: Technician Performance
  const [techPerformance, setTechPerformance] = useState([]);
  const [techPerformanceLoading, setTechPerformanceLoading] = useState(false);

  // Tab 4: Inventory Consumption
  const [inventoryConsumption, setInventoryConsumption] = useState({ ramUsage: [], storageUsage: [] });
  const [inventoryConsumptionLoading, setInventoryConsumptionLoading] = useState(false);

  // Tab 5: Job Progress
  const [jobProgress, setJobProgress] = useState([]);
  const [jobProgressLoading, setJobProgressLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "assemblies" && assemblies.length === 0) fetchAssemblies();
    if (activeTab === "technician" && techPerformance.length === 0) fetchTechPerformance();
    if (activeTab === "inventory" && inventoryConsumption.ramUsage.length === 0) fetchInventoryConsumption();
    if (activeTab === "jobs" && jobProgress.length === 0) fetchJobProgress();
  }, [activeTab, assemblies.length, techPerformance.length, inventoryConsumption.ramUsage.length, jobProgress.length]);

  const fetchAssemblies = async () => {
    try {
      setAssembliesLoading(true);
      const res = await axios.get(`${API_URL}/reports/assembly-details`, { withCredentials: true });
      if (res.data.Status) setAssemblies(res.data.data);
      else toast.error(res.data.Error || "Failed to fetch assemblies");
    } catch { toast.error("Server error"); }
    finally { setAssembliesLoading(false); }
  };

  const fetchUnitHistory = async (e) => {
    e.preventDefault();
    if (!searchSerial.trim()) return toast.warning("Enter a serial number");
    try {
      setUnitHistoryLoading(true);
      const res = await axios.get(`${API_URL}/reports/unit-history?serial=${searchSerial}`, { withCredentials: true });
      if (res.data.Status) {
        if (!res.data.data) {
          toast.info("No unit found for this serial.");
          setUnitHistory(null);
        } else {
          setUnitHistory(res.data.data);
        }
      } else toast.error(res.data.Error);
    } catch { toast.error("Server error"); }
    finally { setUnitHistoryLoading(false); }
  };

  const fetchTechPerformance = async () => {
    try {
      setTechPerformanceLoading(true);
      const res = await axios.get(`${API_URL}/reports/technician-performance`, { withCredentials: true });
      if (res.data.Status) setTechPerformance(res.data.data);
    } catch { toast.error("Server error"); }
    finally { setTechPerformanceLoading(false); }
  };

  const fetchInventoryConsumption = async () => {
    try {
      setInventoryConsumptionLoading(true);
      const res = await axios.get(`${API_URL}/reports/inventory-consumption`, { withCredentials: true });
      if (res.data.Status) setInventoryConsumption(res.data.data);
    } catch { toast.error("Server error"); }
    finally { setInventoryConsumptionLoading(false); }
  };

  const fetchJobProgress = async () => {
    try {
      setJobProgressLoading(true);
      const res = await axios.get(`${API_URL}/reports/job-progress`, { withCredentials: true });
      if (res.data.Status) setJobProgress(res.data.data);
    } catch { toast.error("Server error"); }
    finally { setJobProgressLoading(false); }
  };

  const handleExportExcel = async () => {
    try {
      const res = await axios.get(`${API_URL}/reports/assembly-details/export/excel`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Assembly_Report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel exported successfully");
    } catch { toast.error("Failed to export Excel"); }
  };

  const handleExportPDF = async () => {
    try {
      const res = await axios.get(`${API_URL}/reports/assembly-details/export/pdf`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Assembly_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF exported successfully");
    } catch { toast.error("Failed to export PDF"); }
  };

  return (
    <main className="overflow-y-auto p-4 sm:p-5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced Reporting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Explore unit histories, performance metrics, and inventory usage.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto md:h-10 mb-6">
          <TabsTrigger value="assemblies" className="gap-2"><BarChart2 className="h-4 w-4" /> All Assemblies</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Unit History</TabsTrigger>
          <TabsTrigger value="technician" className="gap-2"><Users className="h-4 w-4" /> Tech Performance</TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2"><Activity className="h-4 w-4" /> Inventory Usage</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-2"><Target className="h-4 w-4" /> Job Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="assemblies">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Comprehensive Assembly Log</CardTitle>
                <CardDescription>High-level overview. Export to Excel or PDF for full hardware/software serials.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExportPDF} disabled={assembliesLoading || assemblies.length === 0}>
                  <FileText className="w-4 h-4 mr-2 text-red-600" /> Export PDF
                </Button>
                <Button onClick={handleExportExcel} disabled={assembliesLoading || assemblies.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-secondary/10">
                      <TableHead>Assembly Date</TableHead>
                      <TableHead>Job Number</TableHead>
                      <TableHead>Smartboard</TableHead>
                      <TableHead>OPS</TableHead>
                      <TableHead>Tech</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assembliesLoading ? (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                    ) : assemblies.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No assemblies found.</TableCell></TableRow>
                    ) : (
                      assemblies.map((row) => (
                        <TableRow key={row.unit_id} className="text-sm">
                          <TableCell className="font-medium">{row.assembly_date ? new Date(row.assembly_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{row.job_number}</TableCell>
                          <TableCell>{row.smartboard_model || '-'}</TableCell>
                          <TableCell>{row.ops_model}</TableCell>
                          <TableCell>{row.assembled_by}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Individual Unit History</CardTitle>
              <CardDescription>Search by OPS serial, Motherboard serial, or Job number to see a unit's complete lifecycle.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={fetchUnitHistory} className="flex gap-2 max-w-lg mb-8">
                <Input placeholder="Enter serial number or job number..." value={searchSerial} onChange={(e) => setSearchSerial(e.target.value)} />
                <Button type="submit" disabled={unitHistoryLoading}>
                  {unitHistoryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </form>

              {unitHistory && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Job Number</p>
                      <p className="text-lg font-mono">{unitHistory.job_number}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase bg-emerald-100 text-emerald-800 border-emerald-200">
                        {unitHistory.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Motherboard Serial</p>
                      <p className="text-sm font-mono">{unitHistory.motherboard_serial}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">OPS Serial</p>
                      <p className="text-sm font-mono">{unitHistory.ops_serial}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Assembly Technician</p>
                      <p className="text-sm">{unitHistory.technician_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Assembly Completed</p>
                      <p className="text-sm">{unitHistory.assembly_completed_at ? new Date(unitHistory.assembly_completed_at).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>

                  {unitHistory.repairs && unitHistory.repairs.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4 border-b pb-2">Repair History</h3>
                      <div className="space-y-4">
                        {unitHistory.repairs.map((repair, idx) => (
                          <div key={idx} className="bg-muted/30 p-4 rounded-lg border">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-mono text-sm font-semibold">{repair.repair_number}</span>
                                <span className="ml-3 text-xs text-muted-foreground">{new Date(repair.created_at).toLocaleDateString()}</span>
                              </div>
                              <span className="text-xs uppercase font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{repair.status}</span>
                            </div>
                            <p className="text-sm mt-2"><span className="font-medium">Issue:</span> {repair.reported_issue}</p>
                            <p className="text-sm mt-1"><span className="font-medium">Technician:</span> {repair.technician || 'Unassigned'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technician">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Technician Performance</CardTitle>
              <CardDescription>Number of successful assemblies completed by each technician.</CardDescription>
            </CardHeader>
            <CardContent>
              {techPerformanceLoading ? (
                <div className="h-64 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="h-[400px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={techPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="full_name" tick={{fontSize: 12}} />
                      <YAxis allowDecimals={false} />
                      <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                      <Bar dataKey="assemblies_completed" name="Assemblies" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">RAM Consumption</CardTitle>
                <CardDescription>Total RAM modules used in assemblies.</CardDescription>
              </CardHeader>
              <CardContent>
                {inventoryConsumptionLoading ? (
                  <div className="h-64 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryConsumption.ramUsage}
                          dataKey="used_count"
                          nameKey="capacity_gb"
                          cx="50%" cy="50%" outerRadius={100}
                          label={({capacity_gb, used_count}) => `${capacity_gb}GB (${used_count})`}
                        >
                          {inventoryConsumption.ramUsage?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Storage Consumption</CardTitle>
                <CardDescription>Total storage devices used in assemblies.</CardDescription>
              </CardHeader>
              <CardContent>
                {inventoryConsumptionLoading ? (
                  <div className="h-64 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inventoryConsumption.storageUsage}
                          dataKey="used_count"
                          nameKey="capacity_gb"
                          cx="50%" cy="50%" outerRadius={100}
                          label={({capacity_gb, storage_type, used_count}) => `${capacity_gb}GB ${storage_type} (${used_count})`}
                        >
                          {inventoryConsumption.storageUsage?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Progress Overview</CardTitle>
              <CardDescription>Active job assembly completion status.</CardDescription>
            </CardHeader>
            <CardContent>
              {jobProgressLoading ? (
                 <div className="h-32 flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : jobProgress.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">No active jobs.</p>
              ) : (
                 <div className="space-y-6">
                   {jobProgress.map((job) => {
                     const percent = job.total_units > 0 ? Math.round((job.completed_units / job.total_units) * 100) : 0;
                     return (
                       <div key={job.id} className="space-y-2">
                         <div className="flex justify-between text-sm">
                           <span className="font-semibold">{job.client_name} - <span className="font-mono text-muted-foreground">{job.job_number}</span></span>
                           <span className="font-medium">{job.completed_units} / {job.total_units} Assembled ({percent}%)</span>
                         </div>
                         <Progress value={percent} className="h-2" />
                       </div>
                     );
                   })}
                 </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </main>
  );
}
