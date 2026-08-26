import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Package, Tag, Zap, Ruler } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ system_name: "", system_logo_url: "" });

  useEffect(() => {
    axios.get(`${API_URL}/settings/system`).then((r) => {
      if (r.data.success)
        setForm({
          system_name: r.data.data.system_name || "",
          system_logo_url: r.data.data.system_logo_url || "",
        });
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.put(`${API_URL}/settings/system`, { settings: form });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/settings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start mt-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure system name and branding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <Label>System Name</Label>
                <Input
                  value={form.system_name}
                  onChange={(e) =>
                    setForm({ ...form, system_name: e.target.value })
                  }
                  placeholder="GT Electricals"
                />
              </div>
              <div className="space-y-1">
                <Label>Logo URL</Label>
                <Input
                  value={form.system_logo_url}
                  onChange={(e) =>
                    setForm({ ...form, system_logo_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Product Setup shortcut */}
        <Card
          className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-dashed"
          onClick={() => navigate("/settings/product-setup")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Product Setup</CardTitle>
                <CardDescription>
                  Manage prerequisites before adding products
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: Tag,
                  label: "Categories",
                  color: "text-blue-600 bg-blue-50",
                },
                {
                  icon: Zap,
                  label: "Brands",
                  color: "text-orange-600 bg-orange-50",
                },
                {
                  icon: Ruler,
                  label: "Attributes",
                  color: "text-green-600 bg-green-50",
                },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50"
                >
                  <div className={`p-1.5 rounded-md ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Click to configure →
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
