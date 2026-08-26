import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Accessibility,
  Sun,
  Moon,
  Type,
  Eye,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { usePreferences, fontSizeRange } from "@/contexts/PreferencesContext";

export function AccessibilityWidget() {
  const { preferences, updatePreference, resetPreferences } = usePreferences();
  const [open, setOpen] = useState(false);

  if (!preferences.showAccessibilityWidget) {
    return null;
  }

  const currentFontSize =
    typeof preferences.fontSize === "number" ? preferences.fontSize : 100;

  const increaseFontSize = () => {
    const newSize = Math.min(
      currentFontSize + fontSizeRange.step,
      fontSizeRange.max,
    );
    updatePreference("fontSize", newSize);
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(
      currentFontSize - fontSizeRange.step,
      fontSizeRange.min,
    );
    updatePreference("fontSize", newSize);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Accessibility options"
          >
            <Accessibility className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          className="w-80 p-4"
          sideOffset={12}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2">
                <Accessibility className="h-4 w-4" />
                Accessibility
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetPreferences();
                  updatePreference("showAccessibilityWidget", true);
                }}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>

            <Separator />

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                {preferences.theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                Dark Mode
              </Label>
              <Switch
                checked={preferences.theme === "dark"}
                onCheckedChange={(checked) =>
                  updatePreference("theme", checked ? "dark" : "light")
                }
              />
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Type className="h-4 w-4" />
                Text Size
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={decreaseFontSize}
                  disabled={currentFontSize <= fontSizeRange.min}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Slider
                  value={[currentFontSize]}
                  onValueChange={([value]) =>
                    updatePreference("fontSize", value)
                  }
                  min={fontSizeRange.min}
                  max={fontSizeRange.max}
                  step={fontSizeRange.step}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={increaseFontSize}
                  disabled={currentFontSize >= fontSizeRange.max}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                {currentFontSize}%
              </div>
            </div>

            <Separator />

            {/* Quick Toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">High Contrast</Label>
                <Switch
                  checked={preferences.highContrast}
                  onCheckedChange={(checked) =>
                    updatePreference("highContrast", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Large Text</Label>
                <Switch
                  checked={preferences.largeText}
                  onCheckedChange={(checked) =>
                    updatePreference("largeText", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Reduce Motion</Label>
                <Switch
                  checked={preferences.reduceMotion}
                  onCheckedChange={(checked) =>
                    updatePreference("reduceMotion", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Dyslexia Font</Label>
                <Switch
                  checked={preferences.dyslexiaFont}
                  onCheckedChange={(checked) =>
                    updatePreference("dyslexiaFont", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Bold Text</Label>
                <Switch
                  checked={preferences.fontWeight === "bold"}
                  onCheckedChange={(checked) =>
                    updatePreference("fontWeight", checked ? "bold" : "normal")
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Focus Highlight</Label>
                <Switch
                  checked={preferences.focusHighlight}
                  onCheckedChange={(checked) =>
                    updatePreference("focusHighlight", checked)
                  }
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
