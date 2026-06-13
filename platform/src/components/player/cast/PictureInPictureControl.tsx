"use client";

import { useCallback, useEffect, useState } from "react";
import type { VideoControlProps } from "./types";

/**
 * Picture-in-Picture control (Req 15.1, 18.2).
 *
 * Renders only when the runtime exposes the Picture-in-Picture capability,
 * detected via `document.pictureInPictureEnabled`. The check is SSR-safe: the
 * effect runs on the client only, so `document` is never touched on the server
 * and the control is absent until support is confirmed.
 */
export function PictureInPictureControl({
  videoRef,
  className,
}: VideoControlProps) {
  const [supported] = useState(() => {
    if (typeof document === "undefined") return false;
    return Boolean(document.pictureInPictureEnabled);
  });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const onEnter = () => setActive(true);
    const onLeave = () => setActive(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    setActive(document.pictureInPictureElement === video);

    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [videoRef]);

  const toggle = useCallback(async () => {
    const video = videoRef.current;
    if (!video || typeof document === "undefined") {
      return;
    }
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // Picture-in-Picture can reject (e.g. user gesture required); ignore.
    }
  }, [videoRef]);

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-label={
        active ? "Exit Picture-in-Picture" : "Open Picture-in-Picture"
      }
      aria-pressed={active}
      className={`rounded p-1 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        className ?? ""
      }`}
    >
      <span aria-hidden="true">⧉</span>
    </button>
  );
}

export default PictureInPictureControl;
