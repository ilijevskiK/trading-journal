// Shared wrapper for original illustrative SVG diagrams used in indicator
// write-ups. Not screenshots of any third-party tool — schematic recreations
// drawn with the app's own palette.

export default function DiagramFrame({ viewBox, title, children }) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={title}
      className="w-full h-auto rounded-md bg-surface-alt border border-line"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}
