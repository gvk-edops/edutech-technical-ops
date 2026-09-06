import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Mail } from "lucide-react";

const techStack = [
  [
    "React",
    "https://cdn.simpleicons.org/react/61DAFB",
    "Frontend",
    "https://react.dev",
  ],
  [
    "Shadcn/ui",
    "https://cdn.simpleicons.org/shadcnui/000000",
    "Components",
    "https://ui.shadcn.com",
  ],
  [
    "Vite",
    "https://cdn.simpleicons.org/vite/646CFF",
    "Build tool",
    "https://vite.dev",
  ],
  [
    "Express.js",
    "https://cdn.simpleicons.org/express/000000",
    "Web server",
    "https://expressjs.com",
  ],
  [
    "Node.js",
    "https://cdn.simpleicons.org/nodedotjs/5FA04E",
    "API runtime",
    "https://nodejs.org",
  ],
  [
    "MySQL",
    "https://cdn.simpleicons.org/mysql/4479A1",
    "Data layer",
    "https://www.mysql.com",
  ],
  [
    "Tailwind CSS",
    "https://cdn.simpleicons.org/tailwindcss/06B6D4",
    "Interface",
    "https://tailwindcss.com",
  ],
  [
    "Vercel",
    "https://cdn.simpleicons.org/vercel/000000",
    "Web hosting",
    "https://vercel.com",
  ],
  [
    "Railway",
    "https://cdn.simpleicons.org/railway/8B5CF6",
    "Cloud backend",
    "https://railway.com",
  ],
];

const profileLogos = {
  hackerrank: "https://cdn.simpleicons.org/hackerrank/00EA64",
  github: "https://cdn.simpleicons.org/github/181717",
};

export default function SupportFeedbackDialog({ open, onOpenChange }) {
  const [feedback, setFeedback] = useState({
    name: "",
    email: "",
    comment: "",
  });

  const updateFeedback = (key, value) => {
    setFeedback((current) => ({ ...current, [key]: value }));
  };

  const sendFeedback = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent("Smartboard OPS feedback");
    const body = encodeURIComponent(
      `Name: ${feedback.name}\nEmail: ${feedback.email}\n\nComment:\n${feedback.comment}`,
    );
    window.location.href = `mailto:gavindukariyawasam@gmail.com?subject=${subject}&body=${body}`;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] !w-[calc(100%-1rem)] !max-w-[1400px] overflow-y-auto border-border/80 bg-background p-0 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:!w-[calc(100%-2rem)]">
        <div className="flex min-w-0 flex-col lg:flex-row">
          <div className="min-w-0 flex-1 border-b border-border/70 bg-muted/30 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Any problem?
              </DialogTitle>
              <DialogDescription>
                Send feedback or report an issue to me. I read every message and
                use it to improve the system.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={sendFeedback} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="feedback-name">Name</Label>
                  <Input
                    id="feedback-name"
                    required
                    value={feedback.name}
                    onChange={(event) =>
                      updateFeedback("name", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback-email">Email</Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    required
                    value={feedback.email}
                    onChange={(event) =>
                      updateFeedback("email", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback-comment">Comment</Label>
                <Textarea
                  id="feedback-comment"
                  required
                  rows={6}
                  value={feedback.comment}
                  onChange={(event) =>
                    updateFeedback("comment", event.target.value)
                  }
                  placeholder="Tell me what happened..."
                />
              </div>
              <Button type="submit" className="w-full">
                <Mail className="mr-2 h-4 w-4" /> Send feedback to GVK
              </Button>
            </form>
            <div className="group relative mt-8 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 pr-24 text-slate-100 shadow-[0_0_28px_rgba(14,165,233,0.18)] dark:border-slate-700 sm:pr-32">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/20 blur-2xl motion-safe:animate-pulse" />
              <img
                src="https://cdn.simpleicons.org/react/61DAFB"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-safe:group-hover:animate-spin sm:right-8 sm:h-20 sm:w-20"
              />
              <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
                <div
                  className="flex items-center gap-1.5"
                  aria-label="Developer workspace status"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                  gvk.dev
                </span>
              </div>
              <div className="relative mt-4 space-y-2 font-mono text-xs leading-5">
                <p className="text-slate-500">
                  <span className="text-cyan-300">$</span> build --with-purpose
                </p>
                <p className="text-emerald-300 motion-safe:animate-pulse">
                  {">"} solving interesting problems...
                </p>
                <p className="text-slate-300">
                  <span className="text-cyan-300">const</span> ideas ={" "}
                  <span className="text-amber-300">"make it better"</span>;
                </p>
                <p className="text-cyan-200">
                  {"while (true) { iterate(); }"}
                  <span className="ml-1 text-cyan-400 motion-safe:animate-pulse">
                    _
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-6 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                  Built with care
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  Developed by GVK
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full-Stack Software Engineer | Problem Solver
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://www.hackerrank.com/profile/gvk423"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="HackerRank"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <img
                    src={profileLogos.hackerrank}
                    alt=""
                    className="h-4 w-4 object-contain"
                  />{" "}
                  HackerRank
                </a>
                <a
                  href="https://github.com/gavindu725"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="GitHub"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <img
                    src={profileLogos.github}
                    alt=""
                    className="h-4 w-4 object-contain dark:invert"
                  />{" "}
                  GitHub
                </a>
                <a
                  href="mailto:gavindukariyawasam@gmail.com"
                  aria-label="Email GVK"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" /> Email
                </a>
              </div>
            </div>

            <Separator />
            <div>
              <p className="text-sm font-bold">Technology stack</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The tools behind this operations platform.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {techStack.map(([name, logo, purpose, officialUrl]) => (
                <a
                  key={name}
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${name} official website`}
                  className="group flex min-h-24 flex-col justify-between rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-muted/60 hover:shadow-[0_0_22px_rgba(14,165,233,0.35)] dark:hover:shadow-[0_0_24px_rgba(56,189,248,0.25)]"
                >
                  <img
                    src={logo}
                    alt=""
                    className={`h-8 w-8 object-contain transition-transform group-hover:scale-110 ${["Vercel", "Shadcn/ui", "Express.js"].includes(name) ? "dark:invert" : ""}`}
                  />
                  <span>
                    <span className="block text-sm font-semibold">{name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {purpose}
                    </span>
                  </span>
                </a>
              ))}
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10">
              <p className="text-sm font-semibold">
                Designed for dependable daily operations
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Inventory, assembly, delivery, servicing, and reporting in one
                focused workspace.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
