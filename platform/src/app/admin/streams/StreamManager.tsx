"use client";

/**
 * Stream source management UI (Req 2.1, 2.2, 2.4, 2.5, 2.6, 21.3).
 *
 * Client island for the `/admin/streams` console. Receives already-serialized
 * stream-source rows and match options from the server component and provides:
 *
 *   - A create/edit form (modal) wired to the `createStreamSource` /
 *     `updateStreamSource` Server Actions, including the `legallyPermitted`
 *     toggle and `priority` ordering (Req 2.1, 2.2, 2.4, 2.6, 21.3).
 *   - Per-row delete via `deleteStreamSource` (Req 2.1).
 *   - On-demand health probing via `POST /api/streams/health`, scoped to all
 *     sources or a single match, reflecting the persisted health verdict
 *     (`healthy` / `lastStatus` / `lastCheckedAt`) after `router.refresh()`
 *     (Req 2.3, 2.5).
 *
 * All persistence happens server-side; this component only orchestrates the
 * forms, probe triggers, and a `router.refresh()` to re-read fresh data.
 */
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  HelpCircle,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Tv,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createStreamSource,
  deleteStreamSource,
  updateStreamSource,
  type StreamSourceInput,
} from "./actions";

/** Stream type values accepted by the form (mirrors the Prisma `StreamType`). */
const STREAM_TYPES = ["HLS", "DASH"] as const;
type StreamTypeValue = (typeof STREAM_TYPES)[number];

/** A match the admin can attach a source to (id + display label). */
export interface MatchOption {
  id: string;
  label: string;
}

/** A serialized `StreamSource` row rendered in the console. */
export interface StreamSourceRow {
  id: string;
  matchId: string;
  matchLabel: string;
  sourceName: string;
  streamUrl: string;
  quality: string;
  language: string;
  type: StreamTypeValue;
  priority: number;
  active: boolean;
  legallyPermitted: boolean;
  healthy: boolean;
  lastStatus: number | null;
  /** ISO timestamp of the last probe, or null if never probed. */
  lastCheckedAt: string | null;
}

interface StreamManagerProps {
  rows: StreamSourceRow[];
  matchOptions: MatchOption[];
}

/** Editable form state. Mirrors `StreamSourceInput` with non-optional fields. */
interface FormState {
  matchId: string;
  sourceName: string;
  streamUrl: string;
  quality: string;
  language: string;
  type: StreamTypeValue;
  priority: number;
  active: boolean;
  legallyPermitted: boolean;
}

/** A blank form seeded with the first match (if any) and sensible defaults. */
function emptyForm(matchOptions: MatchOption[]): FormState {
  return {
    matchId: matchOptions[0]?.id ?? "",
    sourceName: "",
    streamUrl: "",
    quality: "1080p",
    language: "EN",
    type: "HLS",
    priority: 0,
    active: true,
    legallyPermitted: false,
  };
}

/** Project a row back onto the editable form shape. */
function formFromRow(row: StreamSourceRow): FormState {
  return {
    matchId: row.matchId,
    sourceName: row.sourceName,
    streamUrl: row.streamUrl,
    quality: row.quality,
    language: row.language,
    type: row.type,
    priority: row.priority,
    active: row.active,
    legallyPermitted: row.legallyPermitted,
  };
}

/** Human-readable "x ago"-ish label for a probe timestamp. */
function formatChecked(iso: string | null): string {
  if (!iso) return "Never probed";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

/** Health badge reflecting the persisted probe verdict (Req 2.5). */
function HealthBadge({ row }: { row: StreamSourceRow }) {
  if (!row.lastCheckedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/5 px-2 py-1 text-xs font-medium text-foreground/60">
        <HelpCircle className="h-3 w-3" /> Unknown
      </span>
    );
  }
  if (row.healthy) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="h-3 w-3" /> Healthy
        {row.lastStatus != null && (
          <span className="text-success/70">({row.lastStatus})</span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
      <XCircle className="h-3 w-3" /> Offline
      {row.lastStatus != null && (
        <span className="text-danger/70">({row.lastStatus})</span>
      )}
    </span>
  );
}

export function StreamManager({ rows, matchOptions }: StreamManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form modal state: `editingId` null => closed; "" => creating; id => editing.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(matchOptions));

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [probingScope, setProbingScope] = useState<string | null>(null);

  const formOpen = isCreating || editingId !== null;

  // Group rows by match so the console reads per fixture (Req 2.4 ordering).
  const groups = useMemo(() => {
    const byMatch = new Map<
      string,
      { matchId: string; matchLabel: string; sources: StreamSourceRow[] }
    >();
    for (const row of rows) {
      const existing = byMatch.get(row.matchId);
      if (existing) {
        existing.sources.push(row);
      } else {
        byMatch.set(row.matchId, {
          matchId: row.matchId,
          matchLabel: row.matchLabel,
          sources: [row],
        });
      }
    }
    return Array.from(byMatch.values());
  }, [rows]);

  function openCreate() {
    setError(null);
    setNotice(null);
    setForm(emptyForm(matchOptions));
    setIsCreating(true);
    setEditingId(null);
  }

  function openEdit(row: StreamSourceRow) {
    setError(null);
    setNotice(null);
    setForm(formFromRow(row));
    setEditingId(row.id);
    setIsCreating(false);
  }

  function closeForm() {
    setIsCreating(false);
    setEditingId(null);
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.matchId) {
      setError("Select a match for this stream source.");
      return;
    }
    if (form.sourceName.trim().length === 0) {
      setError("Source name is required.");
      return;
    }
    if (form.streamUrl.trim().length === 0) {
      setError("Stream URL is required.");
      return;
    }

    const input: StreamSourceInput = {
      matchId: form.matchId,
      sourceName: form.sourceName.trim(),
      streamUrl: form.streamUrl.trim(),
      quality: form.quality.trim() || "1080p",
      language: form.language.trim() || "EN",
      type: form.type,
      priority: Number.isFinite(form.priority) ? form.priority : 0,
      active: form.active,
      legallyPermitted: form.legallyPermitted,
    };

    const targetId = editingId;

    startTransition(async () => {
      try {
        if (targetId) {
          await updateStreamSource(targetId, input);
          setNotice("Stream source updated.");
        } else {
          await createStreamSource(input);
          setNotice("Stream source created.");
        }
        closeForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save source.");
      }
    });
  }

  function onDelete(row: StreamSourceRow) {
    if (
      !window.confirm(
        `Delete stream source "${row.sourceName}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteStreamSource(row.id);
        setNotice("Stream source deleted.");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete source.",
        );
      }
    });
  }

  async function probe(scope: { matchId?: string; label: string }) {
    setError(null);
    setNotice(null);
    setProbingScope(scope.matchId ?? "all");
    try {
      const response = await fetch("/api/streams/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope.matchId ? { matchId: scope.matchId } : {}),
      });
      if (!response.ok) {
        throw new Error(`Probe failed (HTTP ${response.status}).`);
      }
      const data: { probed: number; healthy: number; unhealthy: number } =
        await response.json();
      setNotice(
        `Probed ${data.probed} source(s) for ${scope.label}: ${data.healthy} healthy, ${data.unhealthy} offline.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health probe failed.");
    } finally {
      setProbingScope(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground-strong">
            Stream Management
          </h1>
          <p className="mt-1 text-foreground/60">
            Manage IPTV sources, monitor health, and assign streams to matches.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => probe({ label: "all matches" })}
            disabled={isPending || probingScope !== null || rows.length === 0}
            className="flex items-center gap-2 rounded-lg border border-accent/30 px-4 py-2 font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-5 w-5 ${probingScope === "all" ? "animate-spin" : ""}`}
            />
            Check all health
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={matchOptions.length === 0}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-background transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Add Stream
          </button>
        </div>
      </div>

      {matchOptions.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-4 text-sm text-foreground/70">
          <AlertTriangle className="h-4 w-4 text-accent" />
          No matches exist yet. Create a match before adding stream sources.
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="text-success/70 hover:text-success"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="text-danger/70 hover:text-danger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass rounded-xl border border-white/5 p-12 text-center text-foreground/60">
          <Tv className="mx-auto mb-3 h-10 w-10 text-foreground/30" />
          No stream sources configured yet.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div
              key={group.matchId}
              className="glass overflow-hidden rounded-xl border border-white/5"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/5 p-4">
                <h2 className="font-semibold text-foreground-strong">
                  {group.matchLabel}
                  <span className="ml-2 text-xs font-normal text-foreground/50">
                    {group.sources.length} source
                    {group.sources.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    probe({
                      matchId: group.matchId,
                      label: group.matchLabel,
                    })
                  }
                  disabled={isPending || probingScope !== null}
                  className="flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${probingScope === group.matchId ? "animate-spin" : ""}`}
                  />
                  Probe now
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-surface/60 text-sm text-foreground/60">
                      <th className="p-4 font-medium">Source</th>
                      <th className="p-4 font-medium">Quality / Lang</th>
                      <th className="p-4 font-medium">Type</th>
                      <th className="p-4 font-medium">Priority</th>
                      <th className="p-4 font-medium">Flags</th>
                      <th className="p-4 font-medium">Health</th>
                      <th className="p-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {group.sources.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-white/5 p-2 text-accent">
                              <Tv className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground-strong">
                                {row.sourceName}
                              </div>
                              <div className="mt-0.5 max-w-[220px] truncate font-mono text-xs text-foreground/40">
                                {row.streamUrl}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="rounded bg-surface px-2 py-1 text-xs text-foreground/80">
                            {row.quality}
                          </span>
                          <span className="ml-2 rounded bg-surface px-2 py-1 text-xs text-foreground/80">
                            {row.language}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-foreground/70">
                          {row.type}
                        </td>
                        <td className="p-4 text-sm text-foreground/70">
                          {row.priority}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.active
                                  ? "border border-success/20 bg-success/10 text-success"
                                  : "border border-foreground/15 bg-foreground/5 text-foreground/50"
                              }`}
                            >
                              {row.active ? "Active" : "Inactive"}
                            </span>
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                row.legallyPermitted
                                  ? "border border-success/20 bg-success/10 text-success"
                                  : "border border-danger/20 bg-danger/10 text-danger"
                              }`}
                            >
                              {row.legallyPermitted ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <ShieldAlert className="h-3 w-3" />
                              )}
                              {row.legallyPermitted
                                ? "Permitted"
                                : "Not permitted"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <HealthBadge row={row} />
                            <span className="flex items-center gap-1 text-xs text-foreground/40">
                              <Clock className="h-3 w-3" />
                              {formatChecked(row.lastCheckedAt)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            disabled={isPending}
                            aria-label={`Edit ${row.sourceName}`}
                            className="p-2 text-foreground/50 transition-colors hover:text-link disabled:opacity-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            disabled={isPending}
                            aria-label={`Delete ${row.sourceName}`}
                            className="p-2 text-foreground/50 transition-colors hover:text-danger disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <StreamSourceForm
          form={form}
          setForm={setForm}
          matchOptions={matchOptions}
          isEditing={editingId !== null}
          isPending={isPending}
          error={error}
          onSubmit={submitForm}
          onClose={closeForm}
        />
      )}
    </div>
  );
}

interface StreamSourceFormProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  matchOptions: MatchOption[];
  isEditing: boolean;
  isPending: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

/** Modal create/edit form for a single stream source. */
function StreamSourceForm({
  form,
  setForm,
  matchOptions,
  isEditing,
  isPending,
  error,
  onSubmit,
  onClose,
}: StreamSourceFormProps) {
  const inputClass =
    "w-full rounded-lg border border-foreground/15 bg-background/60 px-3 py-2 text-foreground focus:border-accent focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-foreground/70";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground-strong">
            {isEditing ? "Edit Stream Source" : "Add Stream Source"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="text-foreground/50 transition-colors hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="ss-match" className={labelClass}>
              Match
            </label>
            <select
              id="ss-match"
              value={form.matchId}
              onChange={(e) =>
                setForm((f) => ({ ...f, matchId: e.target.value }))
              }
              className={inputClass}
              required
            >
              <option value="" disabled>
                Select a match
              </option>
              {matchOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ss-name" className={labelClass}>
              Source name
            </label>
            <input
              id="ss-name"
              type="text"
              value={form.sourceName}
              onChange={(e) =>
                setForm((f) => ({ ...f, sourceName: e.target.value }))
              }
              className={inputClass}
              placeholder="e.g. Red Bull TV (Global)"
              required
            />
          </div>

          <div>
            <label htmlFor="ss-url" className={labelClass}>
              Stream URL (M3U8 / DASH)
            </label>
            <input
              id="ss-url"
              type="url"
              value={form.streamUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, streamUrl: e.target.value }))
              }
              className={`${inputClass} font-mono text-sm`}
              placeholder="https://example.com/live/stream.m3u8"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ss-quality" className={labelClass}>
                Quality
              </label>
              <input
                id="ss-quality"
                type="text"
                value={form.quality}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quality: e.target.value }))
                }
                className={inputClass}
                placeholder="1080p"
              />
            </div>
            <div>
              <label htmlFor="ss-language" className={labelClass}>
                Language
              </label>
              <input
                id="ss-language"
                type="text"
                value={form.language}
                onChange={(e) =>
                  setForm((f) => ({ ...f, language: e.target.value }))
                }
                className={inputClass}
                placeholder="EN"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="ss-type" className={labelClass}>
                Type
              </label>
              <select
                id="ss-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as StreamTypeValue,
                  }))
                }
                className={inputClass}
              >
                {STREAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ss-priority" className={labelClass}>
                Priority (lower = earlier failover)
              </label>
              <input
                id="ss-priority"
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    priority: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
                className={inputClass}
                min={0}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 bg-background/40 p-4">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground/80">
                Active
                <span className="block text-xs font-normal text-foreground/50">
                  Inactive sources are excluded from the failover playlist.
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
                className="h-5 w-5 accent-[var(--color-accent)]"
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground/80">
                Legally permitted
                <span className="block text-xs font-normal text-foreground/50">
                  Only permitted sources are ever served to viewers (Req 2.6,
                  21.3).
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.legallyPermitted}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    legallyPermitted: e.target.checked,
                  }))
                }
                className="h-5 w-5 accent-[var(--color-accent)]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-foreground/15 px-4 py-2 font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-semibold text-background transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
              {isEditing ? "Save changes" : "Create source"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
