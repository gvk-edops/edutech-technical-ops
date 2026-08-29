import { useState, useEffect, useMemo, useRef } from "react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  Handshake,
  Search,
  CheckCircle2,
  Undo2,
  XCircle,
  Loader2,
  Monitor,
  MemoryStick,
  HardDrive,
  Network,
  Barcode,
  Trash2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const COMPONENT_TYPES = [
  { value: "ops", label: "OPS Unit", icon: Monitor },
  { value: "ram", label: "RAM", icon: MemoryStick },
  { value: "storage", label: "Storage", icon: HardDrive },
  { value: "network_card", label: "Network Card", icon: Network },
];

export default function Lending() {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("borrowed");

  // Action Confirmation
  const [actionTarget, setActionTarget] = useState(null); // { id, action: 'return' | 'consume' }

  // Lend Modal / Barcode Scanner States
  const [isLendOpen, setIsLendOpen] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [lendNotes, setLendNotes] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [stagedItems, setStagedItems] = useState([]); // { inventory_id, component_type, serial_number, item_details }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scannerInputRef = useRef(null);

  useEffect(() => {
    fetchBorrowings();
    fetchTechnicians();
  }, []);

  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/borrowings`);
      if (res.data.Status) {
        setBorrowings(res.data.data);
      } else {
        toast.error(res.data.Error || "Failed to fetch borrowings");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/users`);
      if (res.data.Status) {
        setTechnicians(res.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
    }
  };

  // -- BARCODE SCANNING LOGIC --

  const handleScan = async (e) => {
    if (e.key !== 'Enter') return;
    if (!scanValue.trim()) return;

    const serial = scanValue.trim();
    
    // Check if already staged
    if (stagedItems.some(i => i.serial_number === serial)) {
      toast.error("Item is already in the list to be lent.");
      setScanValue("");
      return;
    }

    try {
      setIsScanning(true);
      const res = await axios.get(`${API_URL}/borrowings/scan?serial_number=${encodeURIComponent(serial)}`);
      if (res.data.Status) {
        const item = res.data.data;
        if (item.status !== "in_stock") {
          toast.error(`Cannot lend ${serial}. Status is '${item.status}'.`);
        } else {
          setStagedItems(prev => [...prev, item]);
          toast.success(`Added ${serial} to lending list.`);
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error(`Serial ${serial} not found in inventory.`);
      } else {
        toast.error("Error scanning item.");
      }
    } finally {
      setScanValue("");
      setIsScanning(false);
      // Keep focus on scanner
      setTimeout(() => scannerInputRef.current?.focus(), 10);
    }
  };

  const removeStagedItem = (inventory_id) => {
    setStagedItems(prev => prev.filter(i => i.inventory_id !== inventory_id));
  };

  const handleLendBatch = async () => {
    if (!selectedTechnician) {
      toast.error("Please select a technician.");
      return;
    }
    if (stagedItems.length === 0) {
      toast.error("Please scan at least one item to lend.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        technician_id: selectedTechnician,
        notes: lendNotes,
        items: stagedItems.map(i => ({
          component_type: i.component_type,
          inventory_id: i.inventory_id
        }))
      };

      const res = await axios.post(`${API_URL}/borrowings/lend-batch`, payload);
      if (res.data.Status) {
        toast.success(`Successfully lent ${res.data.lentCount} item(s).`);
        setIsLendOpen(false);
        // Reset form
        setSelectedTechnician("");
        setLendNotes("");
        setStagedItems([]);
        fetchBorrowings();
      }
    } catch (error) {
      toast.error(error.response?.data?.Error || "Failed to lend items");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -- EXISTING ACTIONS --

  const handleAction = async () => {
    if (!actionTarget) return;

    try {
      const res = await axios.post(`${API_URL}/borrowings/${actionTarget.id}/${actionTarget.action}`);
      if (res.data.Status) {
        toast.success(`Item successfully marked as ${actionTarget.action}d`);
        fetchBorrowings();
      }
    } catch (error) {
      toast.error(error.response?.data?.Error || `Failed to ${actionTarget.action} item`);
    } finally {
      setActionTarget(null);
    }
  };

  const filteredBorrowings = useMemo(() => {
    return borrowings
      .filter((b) => b.status === activeTab)
      .filter((b) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          b.technician_name?.toLowerCase().includes(search) ||
          b.serial_number?.toLowerCase().includes(search) ||
          b.item_details?.toLowerCase().includes(search) ||
          b.notes?.toLowerCase().includes(search)
        );
      });
  }, [borrowings, activeTab, searchTerm]);

  const getComponentIcon = (type) => {
    const Icon = COMPONENT_TYPES.find((c) => c.value === type)?.icon || Monitor;
    return <Icon className="h-4 w-4" />;
  };

  const activeCount = borrowings.filter((b) => b.status === "borrowed").length;
  const returnedCount = borrowings.filter((b) => b.status === "returned").length;
  const consumedCount = borrowings.filter((b) => b.status === "consumed").length;

  return (
    <main className="overflow-y-auto p-4 sm:p-5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Technician Lending</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage inventory borrowed by technicians for testing and repair
          </p>
        </div>
        <Button onClick={() => {
          setIsLendOpen(true);
          setTimeout(() => scannerInputRef.current?.focus(), 100);
        }} className="bg-primary hover:bg-primary/90">
          <Barcode className="h-4 w-4 mr-2" />
          Lend Items
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Borrowings</CardTitle>
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
              <Handshake className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently checked out</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 dark:from-blue-900/50 dark:via-blue-600/50 dark:to-blue-900/50" />
        </Card>
        
        <Card className="relative overflow-hidden rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Returned</CardTitle>
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2">
              <Undo2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{returnedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully returned items</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 dark:from-emerald-900/50 dark:via-emerald-600/50 dark:to-emerald-900/50" />
        </Card>

        <Card className="relative overflow-hidden rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consumed</CardTitle>
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{consumedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Installed in field / consumed</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 dark:from-amber-900/50 dark:via-amber-600/50 dark:to-amber-900/50" />
        </Card>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Handshake className="w-5 h-5 text-primary" />
                  Borrowings
                </CardTitle>
                <TabsList className="bg-secondary/20">
                  <TabsTrigger value="borrowed">Active</TabsTrigger>
                  <TabsTrigger value="returned">Returned</TabsTrigger>
                  <TabsTrigger value="consumed">Consumed</TabsTrigger>
                </TabsList>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search borrowings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-secondary/20"
                />
              </div>
            </div>
          </CardHeader>
          
          <div className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-secondary/10 hover:bg-secondary/10">
                    <TableHead>Technician</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                    {activeTab === "borrowed" && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24">
                        <div className="flex items-center justify-center text-muted-foreground">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                          Loading borrowings...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredBorrowings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        <Handshake className="h-8 w-8 mb-2 opacity-20 mx-auto" />
                        <p>No borrowings found.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBorrowings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          {b.technician_name}
                        </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                            {getComponentIcon(b.component_type)}
                          </div>
                          <span className="capitalize">{b.component_type.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{b.serial_number}</span>
                          <span className="text-xs text-muted-foreground">{b.item_details}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{format(parseISO(b.borrowed_at), "MMM d, yyyy")}</span>
                          {b.returned_at && (
                            <span className="text-xs text-muted-foreground">
                              {activeTab === 'returned' ? 'Returned: ' : 'Consumed: '} 
                              {format(parseISO(b.returned_at), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {b.notes || "—"}
                      </TableCell>
                      {activeTab === "borrowed" && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => setActionTarget({ id: b.id, action: 'return' })}
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Return
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => setActionTarget({ id: b.id, action: 'consume' })}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Consume
                            </Button>
                          </div>
                        </TableCell>
                      )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Tabs>
      </Card>

      {/* Lend Items Scanner Modal */}
      <Dialog open={isLendOpen} onOpenChange={setIsLendOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Lend Items
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 py-4">
            
            {/* Technician Selection */}
            <div className="space-y-2">
              <Label>Technician *</Label>
              <Select
                value={selectedTechnician}
                onValueChange={setSelectedTechnician}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.full_name || t.name || t.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Barcode Scanner */}
            <div className="space-y-2 bg-muted/30 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <Label>Scan Component Barcode</Label>
                {isScanning && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="relative">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={scannerInputRef}
                  placeholder="Scan or type serial number and press Enter..."
                  value={scanValue}
                  onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={handleScan}
                  disabled={isScanning}
                  className="pl-9 bg-background"
                  autoFocus
                />
              </div>
            </div>

            {/* Staged Items List */}
            <div className="space-y-2">
              <Label>Items to Lend ({stagedItems.length})</Label>
              {stagedItems.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-muted/30 border border-dashed rounded-lg p-6 text-center">
                  No items scanned yet. Use the scanner above to add items.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {stagedItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="w-10">
                            <div className="p-1.5 rounded-md bg-muted text-muted-foreground inline-block">
                              {getComponentIcon(item.component_type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{item.serial_number}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {item.component_type.replace('_', ' ')} &middot; {item.item_details}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeStagedItem(item.inventory_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Reason for lending..."
                value={lendNotes}
                onChange={(e) => setLendNotes(e.target.value)}
              />
            </div>

          </div>

          <DialogFooter className="pt-2 border-t mt-4">
            <Button variant="outline" onClick={() => setIsLendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLendBatch} disabled={isSubmitting || stagedItems.length === 0 || !selectedTechnician}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                `Lend ${stagedItems.length} Item(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Modal */}
      <AlertDialog open={!!actionTarget} onOpenChange={(open) => !open && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget?.action === 'return' ? "Return Item?" : "Mark as Consumed?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === 'return' 
                ? "This will mark the item as returned and place it back in stock." 
                : "This means the item was permanently installed or consumed in a repair. Its inventory status will be set to 'assigned'."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionTarget?.action === 'consume' ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}
              onClick={handleAction}
            >
              Confirm {actionTarget?.action === 'return' ? "Return" : "Consumption"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
