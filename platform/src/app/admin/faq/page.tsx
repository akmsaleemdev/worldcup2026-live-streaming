"use client";

import { useState } from "react";
import { Plus, Trash2, Save, HelpCircle } from "lucide-react";

interface FaqEntry {
  id?: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
}

export default function FaqAdminPage() {
  const [entries, setEntries] = useState<FaqEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ question: "", answer: "" });

  const addEntry = () => {
    if (!newEntry.question.trim() || !newEntry.answer.trim()) return;
    setEntries([
      ...entries,
      { question: newEntry.question, answer: newEntry.answer, order: entries.length, published: true },
    ]);
    setNewEntry({ question: "", answer: "" });
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FAQ & Entity Management</h1>
          <p className="text-slate-400 mt-1">Manage FAQ entries for AEO optimization and AI search snippets.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-strong text-background font-semibold rounded-lg transition-colors">
          <Save className="w-5 h-5" />
          Save All
        </button>
      </div>

      {/* Add new FAQ entry */}
      <div className="glass rounded-xl border border-white/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground-strong flex items-center gap-2">
          <Plus className="w-5 h-5 text-accent" /> Add FAQ Entry
        </h2>
        <input
          type="text"
          placeholder="Question..."
          value={newEntry.question}
          onChange={(e) => setNewEntry({ ...newEntry, question: e.target.value })}
          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
        />
        <textarea
          placeholder="Answer..."
          value={newEntry.answer}
          onChange={(e) => setNewEntry({ ...newEntry, answer: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-accent transition-colors resize-y"
        />
        <button
          onClick={addEntry}
          className="px-4 py-2 bg-accent hover:bg-accent-strong text-background font-semibold rounded-lg transition-colors"
        >
          Add Entry
        </button>
      </div>

      {/* FAQ entries list */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <div className="glass rounded-xl border border-white/5 p-8 text-center">
            <HelpCircle className="w-12 h-12 text-foreground/30 mx-auto mb-3" />
            <p className="text-foreground/50">No FAQ entries yet. Add your first question above.</p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div key={index} className="glass rounded-xl border border-white/5 p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground-strong text-sm">{entry.question}</h3>
                <p className="text-sm text-foreground/60 mt-1">{entry.answer}</p>
              </div>
              <button
                onClick={() => removeEntry(index)}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                aria-label="Remove FAQ entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
