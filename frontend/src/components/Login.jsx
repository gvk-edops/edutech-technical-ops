import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import GhostFibers from "./GhostFibers";

const Login = () => {
  const [values, setValues] = useState({ username: "", password: "" });
  const [branding, setBranding] = useState({
    system_name: "Smartboard OPS Management",
    system_logo_url: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API_URL}/settings/branding`)
      .then(({ data }) => {
        if (data.success) setBranding(data.data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, values);
      if (data.loginStatus) {
        toast.success(`Welcome, ${data.full_name}!`);
        navigate(data.role === "auditor" ? "/audit" : "/app/dashboard");
      } else {
        toast.error(data.Error);
      }
    } catch {
      toast.error("Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 px-4 py-8">
      <GhostFibers />
      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="absolute right-4 top-4 z-10 rounded-full border border-border/70 bg-background/80 p-1 shadow-sm backdrop-blur-sm sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <Card className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl border-border/70 bg-card/95 shadow-2xl backdrop-blur-sm lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden overflow-hidden bg-slate-950 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute right-[-3rem] top-[-3rem] h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="relative">
            <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-300">
              <Zap className="h-6 w-6" />
            </div>
            <div className="mb-6 flex items-center gap-3">
              {branding.system_logo_url ? (
                <img
                  src={branding.system_logo_url}
                  alt={`${branding.system_name} logo`}
                  className="h-10 w-10 rounded-lg object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Zap className="h-6 w-6 text-cyan-300" />
              )}
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                {branding.system_name}
              </p>
            </div>
            <h1 className="mt-4 max-w-xs text-4xl font-bold leading-tight tracking-tight">
              Keep every job moving.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Coordinate clients, inventory, assembly, delivery, and service
              from one dependable workspace.
            </p>
          </div>
          <div className="relative space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-300" /> Role-aware
              access
            </div>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-4 w-4 text-cyan-300" /> Secure
              operational records
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <CardHeader className="p-0">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              {branding.system_logo_url ? (
                <img
                  src={branding.system_logo_url}
                  alt={`${branding.system_name} logo`}
                  className="h-10 w-10 rounded-lg object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-5 w-5" />
                </div>
              )}
              <span className="text-sm font-bold">{branding.system_name}</span>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Welcome back
            </CardTitle>
            <CardDescription className="mt-2">
              Sign in to {branding.system_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 pt-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                  value={values.username}
                  onChange={(e) =>
                    setValues({ ...values, username: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="pr-10"
                    value={values.password}
                    onChange={(e) =>
                      setValues({ ...values, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="mt-2 h-11 w-full font-semibold"
              >
                {submitting ? "Signing in..." : "Sign in"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
            <p className="mt-8 text-center text-xs text-muted-foreground">
              Authorized operations personnel only
            </p>
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default Login;
