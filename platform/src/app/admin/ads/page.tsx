"use client";

import { useState } from "react";
import { Plus, DollarSign } from "lucide-react";

interface AdPlacement {
  name: string;
  type: "banner" | "in_article" | "video";
  position: string;
  isActive: boolean;
}

export default function AdsAdminPage() {
  const [placements] = useState<AdPlacement[]>([
    { name: "Header Banner", type: "banner", position: "header", isActive: true },
    { name: "Sidebar Banner", type: "banner", position: "sidebar", isActive: true },
    { name: "In-Article Ad", type: "in_article", position: "in_article", isActive: false },
    { name: "Player Pre-roll", type: "video", position: "player", isActive: true },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Advertisement Management</h1>
          <p className="text-slate-400 mt-1">Manage AdSense, sponsor ads, video ads, and banner placements.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-strong text-background font-semibold rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          Add Placement
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-xl border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground-strong">{placements.filter(p => p.isActive).length}</p>
              <p className="text-xs text-foreground/50">Active Placements</p>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-link/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-link" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground-strong">{placements.length}</p>
              <p className="text-xs text-foreground/50">Total Placements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Placements table */}
      <div className="glass rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900/80 text-slate-400 text-sm border-b border-white/5">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Position</th>
              <th className="p-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {placements.map((ad, i) => (
              <tr key={i} className="hover:bg-white/[0.02]">
                <td className="p-4 text-foreground-strong font-medium">{ad.name}</td>
                <td className="p-4 text-foreground/70 capitalize">{ad.type.replace("_", " ")}</td>
                <td className="p-4 text-foreground/70 capitalize">{ad.position.replace("_", " ")}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    ad.isActive
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  }`}>
                    {ad.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
