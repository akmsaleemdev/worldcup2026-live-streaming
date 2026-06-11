import { Activity, Users, Video, Eye } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-400 mt-1">Real-time metrics and platform analytics.</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Views" value="2.4M" change="+14%" icon={<Eye className="text-[#00D4FF]" />} />
        <StatCard title="Active Streams" value="84" change="+2" icon={<Video className="text-[#00FFB3]" />} />
        <StatCard title="Registered Users" value="142K" change="+12%" icon={<Users className="text-[#FFD700]" />} />
        <StatCard title="System Load" value="24%" change="-5%" icon={<Activity className="text-[#22C55E]" />} />
      </div>

      {/* Placeholder for Charts / Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Viewership Trends</h3>
          <div className="h-64 flex items-center justify-center border border-dashed border-white/10 rounded-lg">
            <span className="text-slate-500">Analytics Chart Placeholder (GA4 Integration)</span>
          </div>
        </div>
        <div className="glass rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Recent Stream Reports</h3>
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm font-medium text-red-400">Broken Stream Reported</p>
              <p className="text-xs text-slate-400 mt-1">Match #42 - Red Bull TV</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm font-medium text-slate-300">New User Registered</p>
              <p className="text-xs text-slate-500 mt-1">2 minutes ago</p>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
              <p className="text-sm font-medium text-slate-300">Stream Added</p>
              <p className="text-xs text-slate-500 mt-1">FIFA+ (FAST UK) assigned to Match #12</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, change, icon }: { title: string; value: string; change: string; icon: React.ReactNode }) {
  const isPositive = change.startsWith("+");
  return (
    <div className="glass p-6 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
        <div className="w-24 h-24">{icon}</div>
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      </div>
      <div className="relative z-10">
        <span className="text-3xl font-bold text-white">{value}</span>
        <div className="mt-2 text-sm">
          <span className={isPositive ? "text-green-400" : "text-red-400"}>{change}</span>
          <span className="text-slate-500 ml-2">from last month</span>
        </div>
      </div>
    </div>
  );
}
