"use client";

import { useId } from "react";
import type { AudioTrackOption } from "./types";

export interface AudioTrackControlProps {
  /** Audio tracks exposed by the active stream (HLS.js / native audioTracks). */
  tracks: AudioTrackOption[];
  /** Currently selected track id. */
  activeTrackId: string | null;
  /** Invoked with the chosen track id when the user switches audio. */
  onSelect: (trackId: string) => void;
  /** Optional extra class names appended to the select element. */
  className?: string;
}

/**
 * Audio-track selector (Req 15.4, 18.2).
 *
 * Renders only when the stream exposes more than one audio track. The list of
 * tracks is supplied by the player (resolved from HLS.js `audioTracks` or the
 * element's native `audioTracks`), so a single-track or trackless stream omits
 * the control entirely.
 */
export function AudioTrackControl({
  tracks,
  activeTrackId,
  onSelect,
  className,
}: AudioTrackControlProps) {
  const selectId = useId();

  if (tracks.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      <label htmlFor={selectId} className="text-xs text-white/70">
        Audio
      </label>
      <select
        id={selectId}
        value={activeTrackId ?? tracks[0]?.id ?? ""}
        onChange={(event) => onSelect(event.target.value)}
        aria-label="Audio track"
        className={`rounded border border-white/20 bg-black/60 px-1 py-0.5 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
          className ?? ""
        }`}
      >
        {tracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default AudioTrackControl;
