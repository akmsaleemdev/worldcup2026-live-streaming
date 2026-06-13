import { describe, expect, it } from "vitest";
import { classifyHealth, probeSource } from "./health";

describe("classifyHealth (pure)", () => {
  it("treats 2xx responses as healthy", () => {
    expect(classifyHealth(200, true)).toEqual({
      healthy: true,
      lastStatus: 200,
    });
    // 206 Partial Content from a ranged GET.
    expect(classifyHealth(206, true)).toEqual({
      healthy: true,
      lastStatus: 206,
    });
  });

  it("treats 3xx redirects as healthy", () => {
    expect(classifyHealth(301, false).healthy).toBe(true);
    expect(classifyHealth(302, false).healthy).toBe(true);
    expect(classifyHealth(399, false).healthy).toBe(true);
  });

  it("treats 405 (HEAD unsupported) as healthy", () => {
    expect(classifyHealth(405, false)).toEqual({
      healthy: true,
      lastStatus: 405,
    });
  });

  it("treats other 4xx responses as unhealthy", () => {
    expect(classifyHealth(400, false).healthy).toBe(false);
    expect(classifyHealth(403, false).healthy).toBe(false);
    expect(classifyHealth(404, false).healthy).toBe(false);
  });

  it("treats 5xx responses as unhealthy", () => {
    expect(classifyHealth(500, false).healthy).toBe(false);
    expect(classifyHealth(503, false).healthy).toBe(false);
  });

  it("treats a null status (network error) as unhealthy", () => {
    expect(classifyHealth(null, false)).toEqual({
      healthy: false,
      lastStatus: null,
    });
  });

  it("preserves the observed status code in lastStatus", () => {
    expect(classifyHealth(418, false).lastStatus).toBe(418);
  });
});

describe("probeSource (impure, injected fetch)", () => {
  const fixedNow = new Date("2026-06-11T00:00:00.000Z");

  it("reports healthy for a successful HEAD probe", async () => {
    const fetchImpl = (async () =>
      new Response(null, { status: 200 })) as unknown as typeof fetch;

    const result = await probeSource("https://example.com/stream.m3u8", {
      fetchImpl,
      now: () => fixedNow,
    });

    expect(result).toEqual({
      healthy: true,
      lastStatus: 200,
      lastCheckedAt: fixedNow,
    });
  });

  it("reports unhealthy with null status on a network error", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await probeSource("https://example.com/stream.m3u8", {
      fetchImpl,
      now: () => fixedNow,
    });

    expect(result).toEqual({
      healthy: false,
      lastStatus: null,
      lastCheckedAt: fixedNow,
    });
  });

  it("reports unhealthy with null status on timeout/abort", async () => {
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      })) as unknown as typeof fetch;

    const result = await probeSource("https://example.com/stream.m3u8", {
      fetchImpl,
      now: () => fixedNow,
      timeoutMs: 5,
    });

    expect(result.healthy).toBe(false);
    expect(result.lastStatus).toBeNull();
  });

  it("sends a Range header when probing with a ranged GET", async () => {
    let seenInit: RequestInit | undefined;
    const fetchImpl = ((_url: string, init?: RequestInit) => {
      seenInit = init;
      return Promise.resolve(new Response(null, { status: 206 }));
    }) as unknown as typeof fetch;

    const result = await probeSource("https://example.com/stream.m3u8", {
      fetchImpl,
      now: () => fixedNow,
      method: "GET",
    });

    expect(result.healthy).toBe(true);
    expect(seenInit?.method).toBe("GET");
    expect(seenInit?.headers).toEqual({ Range: "bytes=0-0" });
  });
});
