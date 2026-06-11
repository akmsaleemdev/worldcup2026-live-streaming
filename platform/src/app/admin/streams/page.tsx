import { Plus, Search, Tv, CheckCircle2, XCircle } from "lucide-react";

export default function StreamsAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Stream Management</h1>
          <p className="text-slate-400 mt-1">Manage IPTV sources, monitor health, and assign streams to matches.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#00FFB3] hover:bg-[#00FFB3]/80 text-slate-900 font-semibold rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Add Stream
        </button>
      </div>

      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/5 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search source names or URLs..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#00FFB3] transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-sm border-b border-white/5">
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium">Assigned Match</th>
                <th className="p-4 font-medium">Quality/Lang</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Community Votes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-[#00FFB3]"><Tv className="w-4 h-4" /></div>
                    <div>
                      <div className="font-semibold text-white">Red Bull TV (Global)</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">https://rbmn-live.akamaized.net/...</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-300">Brazil vs Argentina</td>
                <td className="p-4">
                  <span className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded">1080p</span>
                  <span className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded ml-2">EN</span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Healthy
                  </span>
                </td>
                <td className="p-4 text-slate-300">+142 Votes</td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg text-slate-400"><Tv className="w-4 h-4" /></div>
                    <div>
                      <div className="font-semibold text-white">Unknown Scrape</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">http://spam-stream.com/live...</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-slate-300">France vs England</td>
                <td className="p-4">
                  <span className="text-xs text-slate-300 bg-slate-800 px-2 py-1 rounded">720p</span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    <XCircle className="w-3 h-3" /> Broken (Offline)
                  </span>
                </td>
                <td className="p-4 text-red-400">-56 Votes (Reported)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
