/**
 * Admin shell (server component) — Req 6.2, 6.4.
 *
 * Defense-in-depth access control: even though middleware guards `/admin`,
 * this layout independently re-checks the session on the server. A request
 * without an authenticated session is sent to sign-in; an authenticated user
 * lacking `admin:access` is sent back to the public site.
 *
 * The sidebar renders exactly the modules returned by `permittedModules(role)`
 * so a role never sees navigation for a module it cannot use (Req 6.4). The
 * module ids are the single source of truth in `@/lib/rbac` — this file only
 * maps each id to its label, route, and icon.
 */
import {
  LayoutDashboard,
  FileText,
  Tv,
  CalendarDays,
  Trophy,
  Megaphone,
  HelpCircle,
  Users,
  Settings,
  BarChart3,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";

import { authOptions } from "@/lib/auth/options";
import { can, permittedModules, type ModuleId } from "@/lib/rbac";

/**
 * Presentation metadata for each CMS module. Keyed by the `ModuleId` union from
 * `@/lib/rbac` so the navigation stays consistent with the permission table.
 */
const MODULE_NAV: Readonly<
  Record<ModuleId, { label: string; href: string; icon: ReactNode }>
> = {
  dashboard: {
    label: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  content: {
    label: "Content",
    href: "/admin/news",
    icon: <FileText className="h-5 w-5" />,
  },
  streams: {
    label: "Streaming",
    href: "/admin/streams",
    icon: <Tv className="h-5 w-5" />,
  },
  matches: {
    label: "Match",
    href: "/admin/matches",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  tournament: {
    label: "Tournament",
    href: "/admin/tournament",
    icon: <Trophy className="h-5 w-5" />,
  },
  ads: {
    label: "Ads",
    href: "/admin/ads",
    icon: <Megaphone className="h-5 w-5" />,
  },
  faq: {
    label: "FAQ & Entities",
    href: "/admin/faq",
    icon: <HelpCircle className="h-5 w-5" />,
  },
  users: {
    label: "Users",
    href: "/admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  settings: {
    label: "Settings",
    href: "/admin/settings",
    icon: <Settings className="h-5 w-5" />,
  },
  analytics: {
    label: "Analytics",
    href: "/admin/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // No authenticated session → bounce to sign-in, returning to /admin after.
  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/admin");
  }

  const role = session.user.role;

  // Authenticated but unauthorized for the CMS → back to the public site.
  if (!can(role, "admin:access")) {
    redirect("/");
  }

  const modules = permittedModules(role);
  const userLabel = session.user.name ?? session.user.email ?? "Admin User";

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-accent/15 bg-surface/60">
        <div className="border-b border-accent/15 p-6">
          <h2 className="text-xl font-bold text-accent">KOORAKIT Admin</h2>
          <p className="mt-1 text-xs text-foreground/60">World Cup 2026 Platform</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {modules.map((moduleId) => {
            const item = MODULE_NAV[moduleId];
            return (
              <Link
                key={moduleId}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-4 py-3 font-medium text-foreground/75 transition-colors hover:bg-accent/10 hover:text-accent"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-accent/15 p-4">
          <Link
            href="/api/auth/signout?callbackUrl=/"
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-foreground/60 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign Out</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-accent/15 bg-surface/60 px-8">
          <h1 className="text-lg font-medium text-foreground/90">
            Management Console
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground/90">
              {userLabel}
            </span>
            <span className="rounded-full border border-accent/30 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-accent">
              {role}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
