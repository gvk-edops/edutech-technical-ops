import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, Timer, User, Settings, LogOut } from "lucide-react";
import SupportFeedbackDialog from "./SupportFeedbackDialog";
import axios from "@/utils/axios";
import { toast } from "sonner";

const roleBadge = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  technician: "bg-green-100 text-green-800",
  auditor: "bg-slate-100 text-slate-800",
};

const sectionTitle = (path) => {
  if (path.startsWith("/app/dashboard")) return "Dashboard";
  if (path.startsWith("/app/jobs")) return "Jobs";
  if (path.startsWith("/app/assembly")) return "Assembly";
  if (path.startsWith("/app/delivery")) return "Delivery";
  if (path.startsWith("/app/afterservice")) return "After Service";
  if (path.startsWith("/app/inventory")) return "Inventory";
  if (path.startsWith("/app/software-keys")) return "Software Keys";
  if (path.startsWith("/app/clients")) return "Clients";
  if (path.startsWith("/app/repairs")) return "Repairs";
  if (path.startsWith("/app/reports")) return "Reports";
  if (path.startsWith("/app/settings")) return "Settings";
  return "Dashboard";
};

const TRIAL_EXPIRES_ON = "2026-09-29";

const getTrialDaysRemaining = () => {
  const [expiryYear, expiryMonth, expiryDay] =
    TRIAL_EXPIRES_ON.split("-").map(Number);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const expiryUtc = Date.UTC(expiryYear, expiryMonth - 1, expiryDay);
  return Math.max(0, Math.round((expiryUtc - todayUtc) / 86400000));
};

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ full_name: "", role: "" });
  const [supportOpen, setSupportOpen] = useState(false);
  const trialDaysRemaining = getTrialDaysRemaining();

  useEffect(() => {
    axios
      .get(`${API_URL}/auth/me`)
      .then(({ data }) => {
        if (data.Status) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`);
      toast.success("Logged out");
      navigate("/login");
    } catch {
      toast.error("Logout failed");
    }
  };

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "??";

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-background sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold tracking-tight hidden sm:block">
          {sectionTitle(location.pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <ThemeToggle />
        <div className="group relative hidden sm:block">
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-full border border-orange-300/80 bg-orange-50 px-3 text-xs font-bold text-orange-800 shadow-[0_0_16px_rgba(249,115,22,0.25)] transition-all hover:bg-orange-100 hover:shadow-[0_0_22px_rgba(249,115,22,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-orange-400/40 dark:bg-orange-950/40 dark:text-orange-200 dark:hover:bg-orange-900/60"
            aria-label={`Trial plan: ${trialDaysRemaining} days remaining`}
          >
            <Timer className="h-4 w-4" />
            <span>{trialDaysRemaining} days remaining</span>
          </button>
          <div className="pointer-events-none invisible absolute right-0 top-full z-50 mt-3 w-80 translate-y-1 rounded-xl border border-border bg-popover p-4 text-popover-foreground opacity-0 shadow-xl transition-all group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <p className="font-semibold">Limited Trial Plan</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Your trial expires in {trialDaysRemaining} days or when you are
              out of credits. Upgrade to keep your services online.
            </p>
            <a
              href="https://railway.com/pricing"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Upgrade
            </a>
          </div>
        </div>
        <Button
          variant="ghost"
          className="h-9 rounded-full border border-amber-300/80 bg-amber-50 px-3 text-amber-800 shadow-[0_0_18px_rgba(245,158,11,0.35)] transition-all hover:bg-amber-100 hover:text-amber-950 hover:shadow-[0_0_24px_rgba(245,158,11,0.55)] dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60 dark:hover:text-amber-100"
          aria-label="Report a problem or send feedback"
          title="Any problem? Send feedback"
          onClick={() => setSupportOpen(true)}
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
          <span className="ml-2 text-xs font-bold sm:text-sm">
            Any problem?
          </span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none">
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold">
                  {user.full_name || "Loading..."}
                </p>
                {user.role && (
                  <Badge className={`text-xs ${roleBadge[user.role] || ""}`}>
                    {user.role}
                  </Badge>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {user.role === "admin" && (
                <DropdownMenuItem
                  onClick={() => navigate("/app/settings/account")}
                >
                  <User className="mr-2 h-4 w-4" /> Account Settings
                </DropdownMenuItem>
              )}
              {["admin", "manager"].includes(user.role) && (
                <DropdownMenuItem onClick={() => navigate("/app/settings")}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SupportFeedbackDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </header>
  );
}
