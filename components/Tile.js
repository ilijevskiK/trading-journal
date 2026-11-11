import Link from "next/link";
import { TILE_CLASS, TILE_LABEL_CLASS, TILE_UNDERLINE_CLASS } from "@/components/tileStyles";

// A clickable icon-over-name tile, used by the home screen and section hubs.
export default function Tile({ href, label, Icon, description }) {
  return (
    <Link href={href} className={`${TILE_CLASS} flex flex-col items-center justify-center gap-3 px-4 py-8 text-center`}>
      <Icon className="w-9 h-9 text-parchment-faint transition duration-200 ease-out group-hover:text-gold group-focus-visible:text-gold motion-safe:group-hover:scale-110 motion-safe:group-focus-visible:scale-110" />
      <span className={`${TILE_LABEL_CLASS} text-sm`}>
        {label}
        <span aria-hidden="true" className={TILE_UNDERLINE_CLASS} />
      </span>
      {description && <span className="text-[11px] leading-snug text-parchment-faint">{description}</span>}
    </Link>
  );
}
