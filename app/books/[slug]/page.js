import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKS, getBook } from "@/content/books";

export function generateStaticParams() {
  return BOOKS.map((b) => ({ slug: b.slug }));
}

export default function BookDetailPage({ params }) {
  const book = getBook(params.slug);
  if (!book) notFound();

  const { title, author, edition, category, amazonUrl, Content } = book;

  return (
    <div className="max-w-2xl">
      <Link href="/books" className="text-xs text-parchment-faint hover:text-parchment">
        ← Books
      </Link>

      <div className="flex items-baseline justify-between flex-wrap gap-2 mt-3">
        <h1 className="font-display text-3xl text-parchment">{title}</h1>
        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright shrink-0">
          {category}
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-1">
        by {author}
        {edition && <> · {edition}</>}
        {amazonUrl && (
          <>
            {" · "}
            <a
              href={amazonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-bright hover:underline"
            >
              View on Amazon
            </a>
          </>
        )}
      </p>
      <div className="rule-divider mt-4 mb-8" />

      <Content />
    </div>
  );
}
