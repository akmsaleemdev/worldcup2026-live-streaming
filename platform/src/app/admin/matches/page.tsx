import { Plus, Search, Edit, Trash2 } from "lucide-react";

export default function MatchesAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Match Management</h1>
          <p className="text-slate-400 mt-1">Manage fixtures, scores, and match statuses.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-slate-900 font-semibold rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Add Match
        </button>
      </div>

      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/5 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search teams or stadiums..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#00D4FF] transition-colors"
            />
          </div>
          <select className="bg-slate-900/50 border border-slate-700 rounded-lg text-white px-4 py-2 focus:outline-none focus:border-[#00D4FF]">
            <option>All Statuses</option>
            <option>Live</option>
            <option>Upcoming</option>
            <option>Completed</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-sm border-b border-white/5">
                <th className="p-4 font-medium">Match</th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Stage</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {/* Dummy Data Row */}
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">Brazil vs Argentina</span>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">2 - 0</span>
                  </div>
                </td>
                <td className="p-4 text-slate-300">June 15, 2026 • 20:00 GMT</td>
                <td className="p-4 text-slate-400">Quarter Finals</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    LIVE
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-[#00D4FF] transition-colors"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
              {/* Dummy Data Row 2 */}
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">France vs England</span>
                  </div>
                </td>
                <td className="p-4 text-slate-300">June 16, 2026 • 18:00 GMT</td>
                <td className="p-4 text-slate-400">Quarter Finals</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Upcoming
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-[#00D4FF] transition-colors"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
