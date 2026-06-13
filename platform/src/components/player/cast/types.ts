/**
 * Shared types for the Tier-3 casting / advanced-playback controls
 * (Req 15.1–15.4). These controls each render only when the runtime/device
 * exposes the relevant capability; otherwise they are absent from the DOM.
 */

import type { RefObject } from "react";

/** A single selectable audio track exposed by the active stream (Req 15.4). */
export interface AudioTrackOption {
  /** Stable identifier (HLS audio-track id/index or native track id). */
  id: string;
  /** Human-readable label, e.g. "English", "Español", "Commentary". */
  label: string;
  /** Optional BCP-47-ish language tag, e.g. "en", "es". */
  lang?: string;
}

/** Props common to capability-gated controls that operate on the video element. */
export interface VideoControlProps {
  /** Ref to the underlying media element rendered by the player. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Optional extra class names appended to the control button. */
  className?: string;
}
