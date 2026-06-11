import Link from "next/link";
import { LayoutDashboard, CalendarDays, Tv, Newspaper, Settings, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#050B16] text-white">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-orbitron font-bold text-[#00D4FF]">CMS Admin</h2>
          <p className="text-xs text-slate-400 mt-1">World Cup 2026™</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem href="/admin" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          <NavItem href="/admin/matches" icon={<CalendarDays className="w-5 h-5" />} label="Matches" />
          <NavItem href="/admin/streams" icon={<Tv className="w-5 h-5" />} label="Streams" />
          <NavItem href="/admin/news" icon={<Newspaper className="w-5 h-5" />} label="News" />
          <NavItem href="/admin/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-white/10">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-8">
          <h1 className="text-lg font-medium text-slate-200">Management Console</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#00FFB3]"></div>
            <span className="text-sm font-medium">Admin User</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all">
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  );
}
