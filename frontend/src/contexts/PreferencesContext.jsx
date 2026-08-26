import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API_URL } from "@/lib/api";

const defaultPreferences = {
  // Theme settings
  theme: "system",
  primaryColor: "default",

  // Logo
  logoUrl: null,

  // Typography
  fontSize: 100, // percentage (80-150)
  fontFamily: "system",
  fontWeight: "normal", // normal, medium, semibold, bold

  // Accessibility
  highContrast: false,
  reduceMotion: false,
  largeText: false,
  dyslexiaFont: false,
  focusHighlight: false,

  // Accessibility widget
  showAccessibilityWidget: false,
};

const PreferencesContext = createContext({
  preferences: defaultPreferences,
  updatePreference: () => null,
  resetPreferences: () => null,
});

// Color themes with comprehensive color variables for light and dark modes
export const colorThemes = {
  default: {
    name: "Default",
    light: {
      primary: "oklch(0.205 0 0)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.708 0 0)",
      accent: "oklch(0.97 0 0)",
      accentForeground: "oklch(0.205 0 0)",
    },
    dark: {
      primary: "oklch(0.922 0 0)",
      primaryForeground: "oklch(0.205 0 0)",
      ring: "oklch(0.556 0 0)",
      accent: "oklch(0.269 0 0)",
      accentForeground: "oklch(0.985 0 0)",
    },
  },
  blue: {
    name: "Blue",
    light: {
      primary: "oklch(0.546 0.245 262.881)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.546 0.245 262.881)",
      accent: "oklch(0.932 0.032 262.881)",
      accentForeground: "oklch(0.35 0.15 262.881)",
    },
    dark: {
      primary: "oklch(0.65 0.22 262.881)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.65 0.22 262.881)",
      accent: "oklch(0.3 0.08 262.881)",
      accentForeground: "oklch(0.85 0.12 262.881)",
    },
  },
  green: {
    name: "Green",
    light: {
      primary: "oklch(0.527 0.154 150.069)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.527 0.154 150.069)",
      accent: "oklch(0.932 0.032 150.069)",
      accentForeground: "oklch(0.35 0.1 150.069)",
    },
    dark: {
      primary: "oklch(0.65 0.14 150.069)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.65 0.14 150.069)",
      accent: "oklch(0.3 0.06 150.069)",
      accentForeground: "oklch(0.85 0.1 150.069)",
    },
  },
  purple: {
    name: "Purple",
    light: {
      primary: "oklch(0.553 0.243 293.756)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.553 0.243 293.756)",
      accent: "oklch(0.932 0.04 293.756)",
      accentForeground: "oklch(0.35 0.15 293.756)",
    },
    dark: {
      primary: "oklch(0.68 0.2 293.756)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.68 0.2 293.756)",
      accent: "oklch(0.3 0.1 293.756)",
      accentForeground: "oklch(0.85 0.12 293.756)",
    },
  },
  orange: {
    name: "Orange",
    light: {
      primary: "oklch(0.646 0.222 41.116)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.646 0.222 41.116)",
      accent: "oklch(0.94 0.04 41.116)",
      accentForeground: "oklch(0.45 0.15 41.116)",
    },
    dark: {
      primary: "oklch(0.72 0.18 41.116)",
      primaryForeground: "oklch(0.15 0 0)",
      ring: "oklch(0.72 0.18 41.116)",
      accent: "oklch(0.32 0.08 41.116)",
      accentForeground: "oklch(0.88 0.12 41.116)",
    },
  },
  red: {
    name: "Red",
    light: {
      primary: "oklch(0.577 0.245 27.325)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.577 0.245 27.325)",
      accent: "oklch(0.94 0.04 27.325)",
      accentForeground: "oklch(0.4 0.15 27.325)",
    },
    dark: {
      primary: "oklch(0.68 0.2 27.325)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.68 0.2 27.325)",
      accent: "oklch(0.3 0.1 27.325)",
      accentForeground: "oklch(0.85 0.12 27.325)",
    },
  },
  teal: {
    name: "Teal",
    light: {
      primary: "oklch(0.6 0.118 184.704)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.6 0.118 184.704)",
      accent: "oklch(0.94 0.025 184.704)",
      accentForeground: "oklch(0.4 0.08 184.704)",
    },
    dark: {
      primary: "oklch(0.7 0.1 184.704)",
      primaryForeground: "oklch(0.15 0 0)",
      ring: "oklch(0.7 0.1 184.704)",
      accent: "oklch(0.3 0.05 184.704)",
      accentForeground: "oklch(0.85 0.08 184.704)",
    },
  },
};

// Font families
export const fontFamilies = {
  system: {
    name: "System Default",
    value:
      'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  },
  inter: {
    name: "Inter",
    value: '"Inter", sans-serif',
  },
  roboto: {
    name: "Roboto",
    value: '"Roboto", sans-serif',
  },
  opensans: {
    name: "Open Sans",
    value: '"Open Sans", sans-serif',
  },
  poppins: {
    name: "Poppins",
    value: '"Poppins", sans-serif',
  },
  lato: {
    name: "Lato",
    value: '"Lato", sans-serif',
  },
  opendyslexic: {
    name: "OpenDyslexic",
    value: '"OpenDyslexic", sans-serif',
  },
  notoSansSinhala: {
    name: "Noto Sans Sinhala",
    value: '"Noto Sans Sinhala", sans-serif',
    supportsWeight: true,
  },
  notoSerifSinhala: {
    name: "Noto Serif Sinhala",
    value: '"Noto Serif Sinhala", serif',
    supportsWeight: true,
  },
  yaldevi: {
    name: "Yaldevi",
    value: '"Yaldevi", sans-serif',
    supportsWeight: true,
  },
};

// Font weight options
export const fontWeights = {
  normal: { name: "Normal", value: "400" },
  medium: { name: "Medium", value: "500" },
  semibold: { name: "Semi Bold", value: "600" },
  bold: { name: "Bold", value: "700" },
};

// Font size range (percentage based, 80-150)
export const fontSizeRange = {
  min: 80,
  max: 150,
  step: 5,
  default: 100,
};

// Legacy font sizes for compatibility
export const fontSizes = {
  small: { name: "Small", scale: 0.875 },
  medium: { name: "Medium", scale: 1 },
  large: { name: "Large", scale: 1.125 },
  xlarge: { name: "Extra Large", scale: 1.25 },
};

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem("app-preferences");
    return stored
      ? { ...defaultPreferences, ...JSON.parse(stored) }
      : defaultPreferences;
  });

  const [systemColor, setSystemColor] = useState(null);

  // Fetch system colors from database
  useEffect(() => {
    const fetchSystemColors = async () => {
      try {
        const response = await axios.get(`${API_URL}/settings/system`, {
          withCredentials: true,
        });
        if (response.data.success) {
          if (response.data.data.primary_color) {
            setSystemColor(response.data.data.primary_color);
          }
        }
      } catch (error) {
        console.error("Error fetching system colors:", error);
      }
    };

    fetchSystemColors();

    // No polling needed — color changes on save
  }, []);

  // Apply preferences to document
  useEffect(() => {
    const root = document.documentElement;

    // Determine effective theme (resolve 'system' to actual theme)
    let effectiveTheme = preferences.theme;
    if (preferences.theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    // Apply theme
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);

    // Use system color if available, otherwise use preference
    let primaryColorToUse = systemColor;
    let themeColors;

    if (systemColor) {
      // System color is a hex value, convert to OKLCH for consistency
      // For now, use it directly for primary and derive others
      themeColors = {
        primary: systemColor,
        primaryForeground:
          effectiveTheme === "dark" ? "oklch(0.985 0 0)" : "oklch(0.985 0 0)",
        ring: systemColor,
        accent:
          effectiveTheme === "dark" ? "oklch(0.269 0 0)" : "oklch(0.97 0 0)",
        accentForeground:
          effectiveTheme === "dark" ? "oklch(0.985 0 0)" : "oklch(0.205 0 0)",
      };
    } else {
      // Get the correct color variant based on current theme (light/dark)
      const colorTheme =
        colorThemes[preferences.primaryColor] || colorThemes.default;
      themeColors = colorTheme[effectiveTheme] || colorTheme.light;
    }

    // Apply primary color and related colors with !important via inline styles
    root.style.setProperty("--primary", themeColors.primary);
    root.style.setProperty(
      "--primary-foreground",
      themeColors.primaryForeground,
    );
    root.style.setProperty("--ring", themeColors.ring);
    root.style.setProperty("--accent", themeColors.accent);
    root.style.setProperty("--accent-foreground", themeColors.accentForeground);

    // Sidebar colors
    root.style.setProperty("--sidebar-primary", themeColors.primary);
    root.style.setProperty(
      "--sidebar-primary-foreground",
      themeColors.primaryForeground,
    );
    root.style.setProperty("--sidebar-accent", themeColors.accent);
    root.style.setProperty(
      "--sidebar-accent-foreground",
      themeColors.accentForeground,
    );
    root.style.setProperty("--sidebar-ring", themeColors.ring);

    // Helper function to convert hex to HSL
    const hexToHSL = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { h: 262, s: 70, l: 55 };

      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h,
        s,
        l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }

      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
      };
    };

    // Generate chart colors based on primary color
    if (systemColor) {
      // System color is hex, convert to HSL and create color palette
      const { h, s, l } = hexToHSL(systemColor);
      const isDark = effectiveTheme === "dark";

      // Create harmonious color palette using complementary and analogous colors
      root.style.setProperty("--chart-1", systemColor); // Primary color
      root.style.setProperty(
        "--chart-2",
        `hsl(${(h + 30) % 360}, ${s}%, ${isDark ? l + 10 : l - 10}%)`,
      ); // Analogous
      root.style.setProperty(
        "--chart-3",
        `hsl(${(h + 60) % 360}, ${Math.max(s - 10, 40)}%, ${l}%)`,
      ); // Analogous
      root.style.setProperty(
        "--chart-4",
        `hsl(${(h + 180) % 360}, ${s}%, ${isDark ? l + 5 : l - 5}%)`,
      ); // Complementary
      root.style.setProperty(
        "--chart-5",
        `hsl(${(h + 240) % 360}, ${Math.max(s - 15, 35)}%, ${l}%)`,
      ); // Triadic
    } else if (preferences.primaryColor === "default" || !systemColor) {
      // Use default colorful chart palette
      root.style.setProperty(
        "--chart-1",
        effectiveTheme === "dark"
          ? "oklch(0.488 0.243 264.376)"
          : "oklch(0.646 0.222 41.116)",
      );
      root.style.setProperty(
        "--chart-2",
        effectiveTheme === "dark"
          ? "oklch(0.696 0.17 162.48)"
          : "oklch(0.6 0.118 184.704)",
      );
      root.style.setProperty(
        "--chart-3",
        effectiveTheme === "dark"
          ? "oklch(0.769 0.188 70.08)"
          : "oklch(0.398 0.07 227.392)",
      );
      root.style.setProperty(
        "--chart-4",
        effectiveTheme === "dark"
          ? "oklch(0.627 0.265 303.9)"
          : "oklch(0.828 0.189 84.429)",
      );
      root.style.setProperty(
        "--chart-5",
        effectiveTheme === "dark"
          ? "oklch(0.645 0.246 16.439)"
          : "oklch(0.769 0.188 70.08)",
      );
    } else {
      // For colored themes, derive chart colors from the primary hue
      const hueMatch = themeColors.primary.match(/oklch\([^)]+\s+([\d.]+)\)/);
      const baseHue = hueMatch ? parseFloat(hueMatch[1]) : 262;

      root.style.setProperty("--chart-1", themeColors.primary);
      root.style.setProperty(
        "--chart-2",
        `oklch(0.65 0.15 ${(baseHue + 60) % 360})`,
      );
      root.style.setProperty(
        "--chart-3",
        `oklch(0.55 0.18 ${(baseHue + 120) % 360})`,
      );
      root.style.setProperty(
        "--chart-4",
        `oklch(0.7 0.12 ${(baseHue + 180) % 360})`,
      );
      root.style.setProperty(
        "--chart-5",
        `oklch(0.6 0.2 ${(baseHue + 240) % 360})`,
      );
    }

    // Apply font family
    const fontFamily =
      fontFamilies[preferences.fontFamily] || fontFamilies.system;
    root.style.setProperty("--font-family", fontFamily.value);
    document.body.style.fontFamily = fontFamily.value;

    // Apply font weight
    const fontWeight =
      fontWeights[preferences.fontWeight] || fontWeights.normal;
    root.style.setProperty("--font-weight", fontWeight.value);
    document.body.style.fontWeight = fontWeight.value;

    // Apply font size (percentage-based)
    const fontSizePercent =
      typeof preferences.fontSize === "number" ? preferences.fontSize : 100;
    root.style.fontSize = `${(fontSizePercent / 100) * 16}px`;

    // Apply accessibility settings
    root.classList.toggle("high-contrast", preferences.highContrast);
    root.classList.toggle("reduce-motion", preferences.reduceMotion);
    root.classList.toggle("large-text", preferences.largeText);
    root.classList.toggle("focus-highlight", preferences.focusHighlight);

    // Apply dyslexia font override
    if (preferences.dyslexiaFont) {
      root.style.fontFamily = fontFamilies.opendyslexic.value;
      document.body.style.fontFamily = fontFamilies.opendyslexic.value;
    }

    // Save to localStorage
    localStorage.setItem("app-preferences", JSON.stringify(preferences));
  }, [preferences, systemColor]);

  const updatePreference = (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem("app-preferences");
  };

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreference, resetPreferences }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
};
