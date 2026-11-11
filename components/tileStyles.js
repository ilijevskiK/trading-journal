// Shared look and hover animation for the home screen's tiles and the
// "Home" back button, so the two always feel like the same control. Kept
// as full literal class strings so Tailwind's content scan picks them up.

export const TILE_CLASS =
  "group rounded-lg border border-line bg-surface transition duration-200 ease-out hover:border-gold-dim hover:bg-surface-alt hover:shadow-[0_10px_28px_-14px_rgba(201,162,75,0.55)] motion-safe:hover:-translate-y-1 active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:border-gold focus-visible:shadow-[0_10px_28px_-14px_rgba(201,162,75,0.55)] motion-safe:focus-visible:-translate-y-1";

export const TILE_LABEL_CLASS =
  "relative text-parchment-dim transition-colors duration-200 group-hover:text-parchment group-focus-visible:text-parchment";

export const TILE_UNDERLINE_CLASS =
  "absolute left-0 -bottom-1 h-px w-full origin-center scale-x-0 bg-gold transition-transform duration-200 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100";
