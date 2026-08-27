"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BOOKS } from "@/content/books";

export default function BooksPage() {
  const [activeCategory, setActiveCategory] = useState(null);

  const categories = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const book of BOOKS) {
      if (!seen.has(book.category)) {
        seen.add(book.category);
        list.push(book.category);
      }
    }
    return list;
  }, []);

  const visibleBooks = activeCategory
    ? BOOKS.filter((book) => book.category === activeCategory)
    : BOOKS;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-3xl text-parchment">Books</h1>
        <span className="font-mono text-xs text-parchment-faint">
          {visibleBooks.length} of {BOOKS.length} book{BOOKS.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-xs text-parchment-faint mt-2 max-w-lg">
        Trading and investing books worth actually reading, with a summary
        pointed at what matters most. Curated, not user-editable.
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
            activeCategory === null
              ? "border-gold-dim text-gold-bright bg-surface-alt"
              : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-full border transition-colors ${
              activeCategory === category
                ? "border-gold-dim text-gold-bright bg-surface-alt"
                : "border-line text-parchment-faint hover:text-parchment hover:border-gold-dim/60"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="rule-divider mt-4 mb-6" />

      {visibleBooks.length === 0 ? (
        <div className="border border-line rounded-lg bg-surface px-6 py-10 text-center text-sm text-parchment-faint">
          No books in this category.
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleBooks.map((book) => (
            <Link
              key={book.slug}
              href={`/books/${book.slug}`}
              className="block border border-line rounded-lg bg-surface px-4 py-3 hover:bg-surface-alt/50 hover:border-gold-dim transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-mono text-sm text-parchment shrink-0">
                  {book.title}
                </span>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-gold-dim text-gold-bright shrink-0">
                  {book.category}
                </span>
                <span className="text-xs text-parchment-faint truncate hidden sm:inline">
                  {book.summary}
                </span>
              </div>
              <p className="text-xs text-parchment-faint mt-1.5 sm:hidden">
                {book.summary}
              </p>
              <p className="text-[11px] text-parchment-faint mt-1">
                by {book.author}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
