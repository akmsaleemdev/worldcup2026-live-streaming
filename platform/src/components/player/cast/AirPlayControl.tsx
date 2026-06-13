"use client";

import { useCallback, useEffect, useState } from "react";
import type { VideoControlProps } from "./types";

/**
 * AirPlay element extensions exposed by WebKit (Safari) only. These are not
 * part of the standard DOM lib, so they are declared locally and accessed
 * defensively.
 */
interface WebKitAirPlayVideo extends HTMLVideoElement {
  webkitShowPlaybackTargetPicker?: () => void;
}

/** WebKit availability event carries an `availability` discriminator. */
interface PlaybackTargetAvailabilityEvent extends Event {
  availability?: "available" | "not-available";
}

/**
 * AirPlay control (Req 15.2, 18.2).
 *
 * Renders only when the viewing environment supports AirPlay, detected via the
 * presence of `WebKitPlaybackTargetAvailabilityEvent` on `window` or the
 * `webkitShowPlaybackTargetPicker` method on the media element. The detection
 * is SSR-safe (client-only effect, guarded `window`/element access).
 */
export function AirPlayControl({ videoRef, className }: VideoControlProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const video = videoRef.current as WebKitAirPlayVideo | null;
    const hasPicker =
      typeof video?.webkitShowPlaybackTargetPicker === "function";
    const hasEvent = "WebKitPlaybackTargetAvailabilityEvent" in window;
    if (!hasPicker && !hasEvent) {
      return;
    }
    setSupported(true);

    // When the availability event is supported, keep the control visible only
    // while at least one AirPlay target is reachable.
    if (!hasEvent || !video) {
      return;
    }
    const onAvailability = (event: Event) => {
      const detail = event as PlaybackTargetAvailabilityEvent;
      setSupported(detail.availability !== "not-available");
    };
    video.addEventListener(
      "webkitplaybacktargetavailabilitychanged",
      onAvailability as EventListener,
    );
    return () => {
      video.removeEventListener(
        "webkitplaybacktargetavailabilitychanged",
        onAvailability as EventListener,
      );
    };
  }, [videoRef]);

  const showPicker = useCallback(() => {
    const video = videoRef.current as WebKitAirPlayVideo | null;
    if (typeof video?.webkitShowPlaybackTargetPicker === "function") {
      video.webkitShowPlaybackTargetPicker();
    }
  }, [videoRef]);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={showPicker}
      aria-label="Stream to AirPlay"
      className={`rounded p-1 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        className ?? ""
      }`}
    >
      <span aria-hidden="true">AirPlay</span>
    </button>
  );
}

export default AirPlayControl;
