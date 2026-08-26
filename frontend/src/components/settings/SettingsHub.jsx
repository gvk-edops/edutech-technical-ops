import { useNavigate } from "react-router-dom";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings as SettingsIcon, UserCog, Palette } from "lucide-react";

const categories = [
  {
    id: "account",
    title: "Account Settings",
    description: "Manage your profile, password, and system users",
    icon: UserCog,
    color: "text-blue-600",
    bg: "bg-blue-50",
    path: "/app/settings/account",
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Customize branding, theme, typography, and accessibility",
    icon: Palette,
    color: "text-green-600",
    bg: "bg-green-50",
    path: "/app/settings/preferences",
  },
  {
    id: "system",
    title: "System Configuration",
    description:
      "Manage catalog data: OPS models, RAM specs, storage specs, software, and more",
    icon: SettingsIcon,
    color: "text-purple-600",
    bg: "bg-purple-50",
    path: "/app/settings/system-configuration",
  },
];

export default function SettingsHub() {
  const navigate = useNavigate();
  return (
    <main className="overflow-y-auto p-5">
      <p className="text-sm text-muted-foreground mb-6">
        Manage your account, preferences, and system catalogs
      </p>
      <div className="flex flex-wrap gap-4">
        {categories.map(
          ({ id, title, description, icon: Icon, color, bg, path }) => (
            <Card
              key={id}
              className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex-1 min-w-[280px]"
              onClick={() => navigate(path)}
            >
              <CardHeader className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-lg ${bg} ${color} flex-shrink-0`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base mb-1">{title}</CardTitle>
                    <CardDescription className="text-xs">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ),
        )}
      </div>
    </main>
  );
}
