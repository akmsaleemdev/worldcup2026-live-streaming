"use client";

import { useCallback, useEffect, useState } from "react";
import type { VideoControlProps } from "./types";

/**
 * Remote Playback API surface (used by Chrome for Chromecast). Not fully
 * described by the DOM lib, so declared locally and accessed defensively.
 */
interface RemotePlayback {
  watchAvailability: (
    callback: (available: boolean) => void,
  ) => Promise<number>;
  cancelWatchAvailability: (id?: number) => Promise<void>;
  prompt: () => Promise<void>;
}

type RemotePlaybackVideo = HTMLVideoElement & {
  remote?: RemotePlayback;
};

/**
 * Chromecast control (Req 15.3, 18.2).
 *
 * Renders only when the viewing environment supports casting, detected via the
 * Remote Playback API (`video.remote`) or the Google Cast framework
 * (`window.chrome.cast` / `window.cast`). Detection is SSR-safe: all
 * `window`/element access happens inside a client-only effect.
 *
 * When the Remote Playback API is present we additionally watch device
 * availability so the control only appears while a cast target is reachable.
 */
export function ChromecastControl({ videoRef, className }: VideoControlProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const video = videoRef.current as RemotePlaybackVideo | null;
    const remote = video?.remote;

    // Google Cast framework presence (sender SDK loaded on the page).
    const win = window as Window & {
      chrome?: { cast?: unknown };
      cast?: unknown;
    };
    const hasCastFramework =
      typeof win.chrome?.cast !== "undefined" ||
      typeof win.cast !== "undefined";

    if (!remote) {
      // No Remote Playback API: fall back to Cast-framework presence only.
      setSupported(hasCastFramework);
      return;
    }

    let watchId: number | undefined;
    let cancelled = false;

    remote
      .watchAvailability((available) => {
        if (!cancelled) {
          setSupported(available || hasCastFramework);
        }
      })
      .then((id) => {
        watchId = id;
      })
      .catch(() => {
        // Some engines reject watchAvailability; rely on framework presence.
        if (!cancelled) {
          setSupported(hasCastFramework);
        }
      });

    return () => {
      cancelled = true;
      if (watchId !== undefined) {
        void remote.cancelWatchAvailability(watchId).catch(() => undefined);
      }
    };
  }, [videoRef]);

  const promptCast = useCallback(() => {
    const video = videoRef.current as RemotePlaybackVideo | null;
    if (video?.remote) {
      void video.remote.prompt().catch(() => undefined);
    }
  }, [videoRef]);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={promptCast}
      aria-label="Cast to a device"
      className={`rounded p-1 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        className ?? ""
      }`}
    >
      <span aria-hidden="true">📺</span>
    </button>
  );
}

export default ChromecastControl;
