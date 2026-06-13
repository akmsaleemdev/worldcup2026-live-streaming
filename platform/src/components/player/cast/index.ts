/**
 * Tier-3 advanced-playback controls (Req 15.1–15.4). Each control is
 * capability-gated and renders only when the runtime/device exposes the
 * relevant feature.
 */
export { PictureInPictureControl } from "./PictureInPictureControl";
export { AirPlayControl } from "./AirPlayControl";
export { ChromecastControl } from "./ChromecastControl";
export { AudioTrackControl } from "./AudioTrackControl";
export type { AudioTrackOption, VideoControlProps } from "./types";
export type { AudioTrackControlProps } from "./AudioTrackControl";
