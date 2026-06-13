/**
 * Example/unit tests for the StreamingPlayer component (Task 4.8).
 *
 * Requirements under test:
 *   - 1.1  Player renders video (no iframe/embed).
 *   - 1.3  Quality selector is present and maps to HLS levels (Auto + variants).
 *   - 1.4  Core transport controls: play/pause, volume, seek, fullscreen.
 *   - 1.5  Live indicator is shown while the stream is live.
 *   - 1.8  Accessible "No stream available" error state when the resolved
 *          playlist is empty / failover is exhausted.
 *   - 18.2 All interactive controls expose accessible names.
 *
 * Environment notes:
 *   - hls.js is mocked because it does not run under jsdom; the mock exposes a
 *     handler registry + `emit` so tests can drive MANIFEST_PARSED (the event
 *     that reveals the quality selector and marks the player ready).
 *   - HTMLMediaElement.play/pause/load and the Fullscreen API are not
 *     implemented by jsdom and are stubbed.
 *   - `fetch` is stubbed to serve the resolved playlist from
 *     `GET /api/streams/[matchId]`.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

import { StreamingPlayer } from "./StreamingPlayer";

// --- hls.js mock (hoisted so the vi.mock factory can reference the class) ----
const { MockHls, getLatestHls, resetHlsInstances } = vi.hoisted(() => {
  type Handler = (...args: unknown[]) => void;

  class MockHls {
    static isSupported = () => true;
    static Events = {
      MANIFEST_PARSED: "hlsManifestParsed",
      ERROR: "hlsError",
      LEVEL_SWITCHED: "hlsLevelSwitched",
    };

    levels = [{ height: 1080 }, { height: 720 }, { height: 480 }];
    currentLevel = -1;
    autoLevelEnabled = true;
    handlers: Record<string, Handler[]> = {};

    on(event: string, cb: Handler) {
      (this.handlers[event] ??= []).push(cb);
    }
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();

    /** Test helper: fire every handler registered for an event. */
    emit(event: string, ...args: unknown[]) {
      (this.handlers[event] ?? []).forEach((handler) => handler(...args));
    }
  }

  const instances: MockHls[] = [];
  const OriginalCtor = MockHls;
  // Wrap construction so we can track the instance the component creates.
  const Tracked = new Proxy(OriginalCtor, {
    construct(target, args) {
      const instance = Reflect.construct(target, args) as MockHls;
      instances.push(instance);
      return instance;
    },
  });

  return {
    MockHls: Tracked,
    getLatestHls: (): MockHls | undefined => instances[instances.length - 1],
    resetHlsInstances: () => {
      instances.length = 0;
    },
  };
});

vi.mock("hls.js", () => ({ default: MockHls }));

// ---------------------------------------------------------------------------
// Fixtures and environment stubs.
// ---------------------------------------------------------------------------
type ResolvedSourceFixture = {
  id: string;
  url: string;
  quality: string;
  language: string;
  type: "hls" | "dash";
  priority: number;
  legallyPermitted: boolean;
  active: boolean;
};

const SAMPLE_PLAYLIST: ResolvedSourceFixture[] = [
  {
    id: "src-1080",
    url: "https://cdn.example.com/live/match-1/1080.m3u8",
    quality: "1080p",
    language: "EN",
    type: "hls",
    priority: 0,
    legallyPermitted: true,
    active: true,
  },
  {
    id: "src-720",
    url: "https://cdn.example.com/live/match-1/720.m3u8",
    quality: "720p",
    language: "EN",
    type: "hls",
    priority: 1,
    legallyPermitted: true,
    active: true,
  },
];

function stubFetchPlaylist(sources: ResolvedSourceFixture[], status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ sources }),
    } as Response),
  );
}

/** Render the player and wait until the mocked HLS manifest has been parsed. */
async function renderReadyPlayer(isLive = true) {
  render(<StreamingPlayer matchId="match-1" isLive={isLive} />);

  await waitFor(() => {
    const hls = getLatestHls();
    expect(hls?.handlers["hlsManifestParsed"]?.length).toBeGreaterThan(0);
  });

  await act(async () => {
    getLatestHls()?.emit("hlsManifestParsed");
  });
}

beforeAll(() => {
  const media = window.HTMLMediaElement.prototype;
  Object.defineProperty(media, "play", {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(media, "pause", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(media, "load", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window.HTMLElement.prototype, "requestFullscreen", {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});

beforeEach(() => {
  resetHlsInstances();
  stubFetchPlaylist(SAMPLE_PLAYLIST);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe("StreamingPlayer — controls and live indicator", () => {
  it("requests the resolved playlist for the match (Req 1.1, 1.7)", async () => {
    render(<StreamingPlayer matchId="match-1" isLive />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/streams/match-1",
        expect.objectContaining({ cache: "no-store" }),
      );
    });
  });

  it("renders a <video> element and never an iframe/embed (Req 1.1)", async () => {
    const { container } = render(<StreamingPlayer matchId="match-1" isLive />);

    await waitFor(() => {
      expect(container.querySelector("video")).not.toBeNull();
    });
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("embed")).toBeNull();
  });

  it("exposes accessible names for play, volume, seek, and fullscreen controls (Req 1.4, 18.2)", async () => {
    await renderReadyPlayer();

    expect(
      screen.getByRole("button", { name: /play|pause/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /mute|unmute/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /volume/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /seek/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /full ?screen/i }),
    ).toBeInTheDocument();
  });

  it("shows the live indicator while the stream is live (Req 1.5)", async () => {
    await renderReadyPlayer(true);

    expect(screen.getByText(/^live$/i)).toBeInTheDocument();
  });

  it("does not show the live indicator when the stream is not live (Req 1.5)", async () => {
    await renderReadyPlayer(false);

    expect(screen.queryByText(/^live$/i)).not.toBeInTheDocument();
  });
});

describe("StreamingPlayer — quality selector (Req 1.3)", () => {
  it("renders a quality selector with Auto plus the parsed HLS levels", async () => {
    await renderReadyPlayer();

    const quality = await screen.findByRole("combobox", {
      name: /quality/i,
    });
    expect(quality).toBeInTheDocument();

    const optionLabels = Array.from(
      quality.querySelectorAll("option"),
    ).map((opt) => opt.textContent);
    expect(optionLabels).toEqual(
      expect.arrayContaining(["Auto", "1080p", "720p", "480p"]),
    );
  });
});

describe("StreamingPlayer — error state (Req 1.8)", () => {
  it("shows an accessible 'No stream available' alert when the playlist is empty", async () => {
    stubFetchPlaylist([], 404);

    render(<StreamingPlayer matchId="match-1" isLive />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/no stream available/i);
  });

  it("shows the 'No stream available' alert when the streaming service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    render(<StreamingPlayer matchId="match-1" isLive />);

    expect(await screen.findByText(/no stream available/i)).toBeInTheDocument();
  });
});
