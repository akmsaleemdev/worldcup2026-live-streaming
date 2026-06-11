import { Plus, Search, Edit, Eye } from "lucide-react";

export default function NewsAdmin() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">News & Articles</h1>
          <p className="text-slate-400 mt-1">Manage tournament news, match reports, and SEO content.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FFD700] hover:bg-[#FFD700]/80 text-slate-900 font-semibold rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Write Article
        </button>
      </div>

      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-white/5 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#FFD700] transition-colors"
            />
          </div>
          <select className="bg-slate-900/50 border border-slate-700 rounded-lg text-white px-4 py-2 focus:outline-none focus:border-[#FFD700]">
            <option>All Categories</option>
            <option>Match Reports</option>
            <option>Breaking News</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 text-sm border-b border-white/5">
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Author</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="font-semibold text-white">Vini Jr. Scores Stunner to Send Brazil to Semis</div>
                  <div className="text-xs text-slate-500 mt-0.5">/news/vini-jr-scores-stunner</div>
                </td>
                <td className="p-4 text-slate-300">Admin User</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    Published
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-sm">Today, 22:45 GMT</td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-[#00D4FF] transition-colors"><Eye className="w-4 h-4" /></button>
                  <button className="p-2 text-slate-400 hover:text-[#00D4FF] transition-colors"><Edit className="w-4 h-4" /></button>
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4">
                  <div className="font-semibold text-white">England vs France: Tactical Preview</div>
                  <div className="text-xs text-slate-500 mt-0.5">/news/england-france-preview</div>
                </td>
                <td className="p-4 text-slate-300">Admin User</td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    Draft
                  </span>
                </td>
                <td className="p-4 text-slate-400 text-sm">-</td>
                <td className="p-4 text-right">
                  <button className="p-2 text-slate-400 hover:text-[#00D4FF] transition-colors"><Edit className="w-4 h-4" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
