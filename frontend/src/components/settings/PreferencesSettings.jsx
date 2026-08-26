import { useEffect, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Palette,
  Type,
  Accessibility,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Check,
  Image,
  Save,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  usePreferences,
  fontFamilies,
  fontWeights,
  fontSizeRange,
} from "@/contexts/PreferencesContext";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

export default function PreferencesSettings() {
  const navigate = useNavigate();
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const [branding, setBranding] = useState({
    system_name: "",
    system_logo_url: "",
    primary_color: "#0ea5e9",
  });
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_URL}/settings/system`)
      .then(({ data }) => {
        if (data.success)
          setBranding({
            system_name: data.data.system_name || "",
            system_logo_url: data.data.system_logo_url || "",
            primary_color: data.data.primary_color || "#0ea5e9",
          });
      })
      .catch(() => {});
  }, []);

  const saveBranding = async (event) => {
    event.preventDefault();
    setBrandingSaving(true);
    try {
      await axios.put(`${API_URL}/settings/system`, { settings: branding });
      toast.success("System branding saved");
    } catch {
      toast.error("Failed to save system branding");
    } finally {
      setBrandingSaving(false);
    }
  };

  return (
    <main className="overflow-y-auto p-5">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/settings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetPreferences();
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset All
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* System branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" /> System Branding
            </CardTitle>
            <CardDescription>
              Define the system name, logo, and primary color
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveBranding} className="space-y-4">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input
                  value={branding.system_name}
                  onChange={(event) =>
                    setBranding({
                      ...branding,
                      system_name: event.target.value,
                    })
                  }
                  placeholder="Smartboard OPS Management"
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  type="url"
                  value={branding.system_logo_url}
                  onChange={(event) =>
                    setBranding({
                      ...branding,
                      system_logo_url: event.target.value,
                    })
                  }
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-3 items-center">
                  <Input
                    type="color"
                    value={branding.primary_color}
                    className="w-16 h-10 cursor-pointer p-1"
                    onChange={(event) =>
                      setBranding({
                        ...branding,
                        primary_color: event.target.value,
                      })
                    }
                  />
                  <Input
                    value={branding.primary_color}
                    className="flex-1"
                    onChange={(event) =>
                      setBranding({
                        ...branding,
                        primary_color: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <Button type="submit" disabled={brandingSaving}>
                {brandingSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Branding
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Theme
            </CardTitle>
            <CardDescription>Choose your preferred color mode</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {[
                { value: "system", icon: Monitor, label: "System" },
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
              ].map(({ value, icon: ThemeIcon, label }) => (
                <Button
                  key={value}
                  variant={preferences.theme === value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => updatePreference("theme", value)}
                >
                  <ThemeIcon className="mr-2 h-4 w-4" />
                  {label}
                  {preferences.theme === value && (
                    <Check className="ml-2 h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" /> Typography
            </CardTitle>
            <CardDescription>
              Customize font family, weight, and size
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select
                value={preferences.fontFamily}
                onValueChange={(v) => updatePreference("fontFamily", v)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fontFamilies).map(([key, f]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      style={{ fontFamily: f.value }}
                    >
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Font Weight</Label>
              <Select
                value={preferences.fontWeight || "normal"}
                onValueChange={(v) => updatePreference("fontWeight", v)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fontWeights).map(([key, f]) => (
                    <SelectItem key={key} value={key}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Font Size</Label>
                <span className="text-sm font-medium bg-muted px-2 py-1 rounded">
                  {preferences.fontSize}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-8">80%</span>
                <Slider
                  value={[preferences.fontSize ?? 100]}
                  onValueChange={([v]) => updatePreference("fontSize", v)}
                  min={fontSizeRange.min}
                  max={fontSizeRange.max}
                  step={fontSizeRange.step}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-10">150%</span>
              </div>
              <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3 py-1 bg-muted/50 rounded-r">
                Preview: The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" /> Accessibility
            </CardTitle>
            <CardDescription>
              Enable features for better usability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              {
                key: "highContrast",
                label: "High Contrast",
                desc: "Increase contrast for better visibility",
              },
              {
                key: "reduceMotion",
                label: "Reduce Motion",
                desc: "Minimize animations and transitions",
              },
              {
                key: "largeText",
                label: "Large Text",
                desc: "Use larger text throughout the app",
              },
              {
                key: "dyslexiaFont",
                label: "Dyslexia-Friendly Font",
                desc: "Use OpenDyslexic font",
              },
              {
                key: "focusHighlight",
                label: "Focus Highlight",
                desc: "Show visible focus indicators",
              },
            ].map(({ key, label, desc }, i, arr) => (
              <div key={key}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <Label className="text-sm font-medium">{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={!!preferences[key]}
                    onCheckedChange={(v) => updatePreference(key, v)}
                  />
                </div>
                {i < arr.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
