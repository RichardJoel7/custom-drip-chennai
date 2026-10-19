// The home page's 360° tee story ("Why Custom Drip Chennai"): every setting in one place.
// The frames themselves are prepared by scripts/build-tee-frames.mjs, which also writes
// frames.json (frame count, size, where the tee sits, cache version) — re-run it when they change.
import frames from "./frames.json";

export const TEE_FRAMES = frames;

/** Where the prepared frames are served from (public/images/tee-360/<width>/frame-0001.webp …). */
export const TEE_FRAME_BASE = "/images/tee-360";

/** The URL of frame `index` (0-based) at one of the prepared widths. Frames have soft, see-through edges. */
export function teeFrameUrl(index: number, width: number) {
  return `${TEE_FRAME_BASE}/${width}/frame-${String(index + 1).padStart(4, "0")}.webp?v=${frames.version}`;
}

/** A tiny, smooth copy of the studio background, stretched to fill the screen behind the tee. */
export const TEE_BACKDROP_URL = `${TEE_FRAME_BASE}/backdrop.png?v=${frames.version}`;

export interface TeeLayout {
  /** The tee's height as a share of the screen height (at most). */
  teeHeight: number;
  /** …and its width as a share of the screen width (at most) — whichever is smaller wins. */
  teeWidth: number;
  /** Where the middle of the tee sits, from the top (0) to the bottom (1) of the screen. */
  centerY: number;
}

export const TEE_360 = {
  /**
   * How far the page scrolls while the tee makes its full turn, in screen heights. More = a
   * slower, more deliberate turn; less = quicker.
   */
  scrollScreens: { phone: 3.4, desktop: 4.6 },
  /**
   * How quickly the tee catches up with the scroll (share of the gap closed per 60 fps frame).
   * Lower = silkier and more "floaty", higher = snappier. 0.1–0.2 feels right.
   */
  smoothing: 0.12,
  /** Below this width the text sits under the tee instead of beside it. */
  desktopFrom: 1024,
  layout: {
    phone: { teeHeight: 0.44, teeWidth: 0.86, centerY: 0.37 } satisfies TeeLayout,
    desktop: { teeHeight: 0.78, teeWidth: 0.34, centerY: 0.53 } satisfies TeeLayout,
  },
  /**
   * Moving the mouse over the tee, or touching it: gusts sweep through the cloth like a breeze,
   * in the direction you move (a tap sends a ring), and the cloth under the pointer is pushed
   * along and sways back. Distances are shares of the picture's height (the tee is about 90% of it).
   */
  waves: {
    /** How far the cloth sways. */
    size: 0.013,
    /** How much light catches the folds (0 = none). */
    sheen: 0.035,
    /** How fast the gusts travel, in picture heights per second… */
    speed: 0.5,
    /** …and how far apart their crests are. */
    wavelength: 0.24,
    /** Seconds for a gust to die down (it's gone after about four times this). */
    fade: 0.9,
    /** How far the crests trail behind each gust's leading edge. */
    trail: 0.3,
    /** A new gust every time the pointer travels this far. */
    spacing: 0.1,
    /** How strongly the cloth under the pointer is dragged along as it moves (0 = not at all)… */
    push: 0.012,
    /** …and how springy it is coming back: higher = quicker, lower damping = more sway. */
    spring: 140,
    damping: 9,
  },
  /** Frames load in this many at a time; the first frame is shown straight away. */
  parallelLoads: 6,
  /**
   * Start loading the frames once the page itself has loaded and the story is this many screen
   * heights away, so they never hold up the banner or the product photos.
   */
  preloadScreens: 1,
} as const;
