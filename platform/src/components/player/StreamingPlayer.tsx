"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type HlsInstance from "hls.js";
import {
  currentSource,
  initFailover,
  nextSource,
  type FailoverState,
} from "@/lib/player/failover";
import type { ResolvedSource } from "@/lib/player/playlist";
import {
  AirPlayControl,
  AudioTrackControl,
  ChromecastControl,
  PictureInPictureControl,
  type AudioTrackOption,
} from "./cast";

/**
 * StreamingPlayer (Req 1.1–1.8, 18.2).
 *
 * Client island. Fetches the resolved, permitted, ordered failover playlist
 * from `GET /api/streams/[matchId]`, then mounts HLS.js (or native HLS on
 * Safari) into a `<video>` element wired to fully custom, accessible controls.
 * There is no iframe/embed (Req 1.1).
 *
 * Playback is adaptive-bitrate by default; the quality selector maps to HLS
 * level switching (Req 1.2, 1.3). Controls cover play/pause, volume,
 * fullscreen, and seek (Req 1.4), a live badge while live (Req 1.5), and DVR
 * seeking within the buffered/seekable window (Req 1.6).
 *
 * Failover (Req 1.7): a 10-second per-source load watchdog advances the pure
 * `FailoverState` via `nextSource` on timeout or fatal error and reloads the
 * next source. When `hasNext` is false (or the playlist is empty) an explicit,
 * accessible "No stream available" state is rendered (Req 1.8).
 */

/** Per-source load watchdog window in milliseconds (Req 1.7). */
const LOAD_WATCHDOG_MS = 10_000;

/** Selectable quality level derived from the active HLS manifest. */
interface QualityLevel {
  /** HLS level index, or -1 for adaptive ("Auto"). */
  index: number;
  label: string;
}

type PlayerStatus = "loading" | "ready" | "nostream";

export interface StreamingPlayerProps {
  /** Match id used to resolve the playlist via the stream API. */
  matchId: string;
  /** Whether the match is currently live (drives the live badge, Req 1.5). */
  isLive?: boolean;
  /** Optional poster image shown before playback starts. */
  poster?: string;
}

/** Detect Safari-style native HLS support so we can skip MediaSource. */
function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return (
    video.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    video.canPlayType("application/x-mpegURL") !== ""
  );
}

/** Format seconds as m:ss (or h:mm:ss), tolerant of non-finite input. */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, "0");
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${ss}`;
  }
  return `${m}:${ss}`;
}

export function StreamingPlayer({
  matchId,
  isLive = false,
  poster,
}: StreamingPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const reactId = useId();

  const [failover, setFailover] = useState<FailoverState | null>(null);
  const [playlistResolved, setPlaylistResolved] = useState(false);
  const [loadReady, setLoadReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI state mirrored from the underlying <video> element.
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekableStart, setSeekableStart] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [audioTracks, setAudioTracks] = useState<AudioTrackOption[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<string | null>(null);

  // Status is derived (never set synchronously inside an effect): the playlist
  // is exhausted when the failover index runs past the last source, which is
  // exactly when there is no further source to fail over to (Req 1.8).
  const exhausted = failover !== null && currentSource(failover) === undefined;
  const noStream =
    errorMessage !== null || (playlistResolved && failover === null) || exhausted;
  const status: PlayerStatus = noStream
    ? "nostream"
    : loadReady
      ? "ready"
      : "loading";

  // Advance to the next failover source (Req 1.7). When the last source fails
  // the index moves past the end, `source` becomes undefined and the derived
  // status resolves to "No stream available" (Req 1.8).
  const advance = useCallback(() => {
    setLoadReady(false);
    setLevels([]);
    setActiveLevel(-1);
    setAudioTracks([]);
    setActiveAudioTrack(null);
    setFailover((prev) => (prev ? nextSource(prev) : prev));
  }, []);

  // 1) Resolve the playlist from the stream API once per match.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPlaylistResolved(false);
      setLoadReady(false);
      setErrorMessage(null);
      setFailover(null);
      try {
        const res = await fetch(`/api/streams/${matchId}`, {
          cache: "no-store",
        });
        const data: { sources?: ResolvedSource[]; error?: string } = await res
          .json()
          .catch(() => ({}));
        if (cancelled) {
          return;
        }
        const sources = Array.isArray(data.sources) ? data.sources : [];
        if (sources.length > 0) {
          setFailover(initFailover(sources));
        }
        setPlaylistResolved(true);
      } catch {
        if (!cancelled) {
          setErrorMessage("We couldn't reach the streaming service.");
          setPlaylistResolved(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  // 2) Load the current source into the <video>, arming the watchdog (Req 1.7).
  useEffect(() => {
    if (!failover) {
      return;
    }
    const video = videoRef.current;
    const src = currentSource(failover);

    // Playlist exhausted (handled by derived status) or no element yet.
    if (!src || !video) {
      return;
    }

    let cancelled = false;
    let settled = false;

    // 10-second per-source watchdog: a stalled load fails over (Req 1.7).
    const watchdog = window.setTimeout(() => {
      if (!cancelled && !settled) {
        settled = true;
        advance();
      }
    }, LOAD_WATCHDOG_MS);

    const markReady = () => {
      if (cancelled || settled) {
        return;
      }
      settled = true;
      window.clearTimeout(watchdog);
      setLoadReady(true);
    };

    const fail = () => {
      if (cancelled || settled) {
        return;
      }
      settled = true;
      window.clearTimeout(watchdog);
      advance();
    };

    const useNative = src.type === "hls" && canPlayNativeHls(video);

    if (useNative) {
      // Safari / native HLS: hand the manifest URL straight to the element.
      video.src = src.url;
      video.addEventListener("loadedmetadata", markReady, { once: true });
      video.addEventListener("error", fail, { once: true });
      video.load();

      return () => {
        cancelled = true;
        window.clearTimeout(watchdog);
        video.removeEventListener("loadedmetadata", markReady);
        video.removeEventListener("error", fail);
        video.removeAttribute("src");
        video.load();
      };
    }

    // MediaSource path via HLS.js, dynamically imported on the client only.
    (async () => {
      try {
        const mod = await import("hls.js");
        const Hls = mod.default;
        if (cancelled) {
          return;
        }
        if (!Hls.isSupported()) {
          // Last resort: try a direct assignment (covers DASH-less fallbacks).
          video.src = src.url;
          video.addEventListener("loadedmetadata", markReady, { once: true });
          video.addEventListener("error", fail, { once: true });
          video.load();
          return;
        }

        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.attachMedia(video);
        hls.loadSource(src.url);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const parsed: QualityLevel[] = hls.levels.map((level, index) => ({
            index,
            label: level.height
              ? `${level.height}p`
              : `${Math.round((level.bitrate ?? 0) / 1000)} kbps`,
          }));
          setLevels(parsed);
          setActiveLevel(hls.currentLevel);
          markReady();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setActiveLevel(hls.autoLevelEnabled ? -1 : data.level);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            fail();
          }
        });
      } catch {
        fail();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("error", fail);
    };
  }, [failover, advance]);

  // 3) Mirror <video> element state into React for the custom controls.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const syncPlayState = () => setPlaying(!video.paused);
    const syncVolume = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };
    const syncTime = () => {
      setCurrentTime(video.currentTime);
      const seekable = video.seekable;
      if (seekable.length > 0) {
        setSeekableStart(seekable.start(0));
        const end = seekable.end(seekable.length - 1);
        setDuration(Number.isFinite(video.duration) ? video.duration : end);
      } else {
        setSeekableStart(0);
        setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      }
    };

    video.addEventListener("play", syncPlayState);
    video.addEventListener("pause", syncPlayState);
    video.addEventListener("volumechange", syncVolume);
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("durationchange", syncTime);
    video.addEventListener("loadedmetadata", syncTime);
    syncVolume();

    return () => {
      video.removeEventListener("play", syncPlayState);
      video.removeEventListener("pause", syncPlayState);
      video.removeEventListener("volumechange", syncVolume);
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("durationchange", syncTime);
      video.removeEventListener("loadedmetadata", syncTime);
    };
  }, [status]);

  // 4) Track fullscreen changes on the player container.
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
    }
  }, []);

  const onVolumeInput = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.volume = value;
    video.muted = value === 0;
  }, []);

  const onSeek = useCallback((value: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = value;
    }
  }, []);

  const onSelectQuality = useCallback((value: number) => {
    setActiveLevel(value);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = value;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (document.fullscreenElement === container) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void container.requestFullscreen().catch(() => undefined);
    }
  }, []);

  // Explicit, accessible "No stream available" state (Req 1.8).
  if (status === "nostream") {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface/40 p-6 text-center text-foreground/60"
      >
        <p className="font-orbitron text-lg font-bold text-foreground-strong">
          No stream available
        </p>
        <p className="text-sm">
          {errorMessage ??
            "We couldn't find a working stream for this match. Please check back closer to kick-off."}
        </p>
      </div>
    );
  }

  const seekMax = duration > seekableStart ? duration : seekableStart + 1;
  const progressPercent =
    seekMax > seekableStart
      ? ((currentTime - seekableStart) / (seekMax - seekableStart)) * 100
      : 0;
  const volumePercent = (muted ? 0 : volume) * 100;
  const qualitySelectId = `${reactId}-quality`;

  return (
    <div
      ref={containerRef}
      className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-black"
      aria-label="Match stream player"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onClick={togglePlay}
        className="aspect-video w-full bg-black"
      />

      {status === "loading" ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40"
          aria-live="polite"
        >
          <span className="font-orbitron text-sm text-foreground/80">
            Loading stream…
          </span>
        </div>
      ) : null}

      {isLive ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-danger/90 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          Live
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent p-3">
        {/* Seek / DVR bar (Req 1.4, 1.6). */}
        <div className="flex items-center gap-2">
          <span className="min-w-12 text-xs tabular-nums text-white/80">
            {formatTime(currentTime - seekableStart)}
          </span>
          <input
            type="range"
            min={seekableStart}
            max={seekMax}
            step={0.1}
            value={currentTime}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-label="Seek"
            aria-valuetext={formatTime(currentTime - seekableStart)}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-accent"
            style={
              {
                background: `linear-gradient(to right, var(--color-accent, #d4af37) ${progressPercent}%, rgba(255,255,255,0.25) ${progressPercent}%)`,
              } as CSSProperties
            }
          />
          <span className="min-w-12 text-right text-xs tabular-nums text-white/80">
            {formatTime(seekMax - seekableStart)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded p-1 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {playing ? "❚❚" : "►"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
              className="rounded p-1 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {muted || volume === 0 ? "🔇" : "🔊"}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => onVolumeInput(Number(event.target.value))}
              aria-label="Volume"
              aria-valuetext={`${Math.round(volumePercent)}%`}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-accent"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {levels.length > 0 ? (
              <div className="flex items-center gap-1">
                <label
                  htmlFor={qualitySelectId}
                  className="text-xs text-white/70"
                >
                  Quality
                </label>
                <select
                  id={qualitySelectId}
                  value={activeLevel}
                  onChange={(event) =>
                    onSelectQuality(Number(event.target.value))
                  }
                  aria-label="Stream quality"
                  className="rounded border border-white/20 bg-black/60 px-1 py-0.5 text-xs text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <option value={-1}>Auto</option>
                  {levels.map((level) => (
                    <option key={level.index} value={level.index}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="rounded p-1 text-white hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StreamingPlayer;
