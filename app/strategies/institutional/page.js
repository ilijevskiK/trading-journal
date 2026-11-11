"use client";

import { useEffect, useState } from "react";
import StockLetterPage from "@/components/canslim/StockLetterPage";
import LetterSection from "@/components/canslim/LetterSection";
import { LETTER_LINKS } from "@/components/canslim/letterLinks";
import { useStockNote } from "@/hooks/useStockNote";
import { analyzeInstitutional } from "@/lib/canslimI";

export default function InstitutionalPage() {
  return (
    <StockLetterPage
      path="/strategies/institutional"
      title="Institutional Sponsorship"
      intro="The “I” in CAN SLIM: are more, and better, funds buying it? Free data doesn't include fund ownership, so you check it and record it here."
      source="prices"
      related={LETTER_LINKS.filter((l) => l.letter !== "I")}
    >
      {({ ticker }) => <Institutional key={ticker} ticker={ticker} />}
    </StockLetterPage>
  );
}

const TRENDS = [
  { value: "increasing", label: "Increasing", hint: "more funds own it than in recent quarters" },
  { value: "flat", label: "Flat", hint: "about the same number of funds" },
  { value: "decreasing", label: "Decreasing", hint: "funds are selling out" },
];

function Institutional({ ticker }) {
  const { note, saveNote, noteError, savedAt } = useStockNote(ticker);
  const saved = note.institutional || {};
  const [form, setForm] = useState({ ownersTrend: null, qualityBuyers: false, overOwned: false, note: "" });

  useEffect(() => {
    setForm({
      ownersTrend: saved.ownersTrend ?? null,
      qualityBuyers: Boolean(saved.qualityBuyers),
      overOwned: Boolean(saved.overOwned),
      note: saved.note || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  const result = analyzeInstitutional(saved);
  const recentlySaved = savedAt && Date.now() - savedAt < 2000;

  return (
    <LetterSection
      letter="I"
      title="Institutional sponsorship"
      rule="A growing number of funds owning it, including at least one top performer, without it already being over-owned."
      result={result}
    >
      <form
        className="mt-5 rounded-md border border-line p-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          saveNote({ institutional: form });
        }}
      >
        <fieldset>
          <legend className="text-xs text-parchment-dim mb-2">Number of funds owning it over the last few quarters</legend>
          <div className="flex flex-wrap gap-2">
            {TRENDS.map((t) => (
              <label
                key={t.value}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  form.ownersTrend === t.value
                    ? "border-gold-dim bg-surface-alt text-parchment"
                    : "border-line text-parchment-faint hover:text-parchment-dim"
                }`}
                title={t.hint}
              >
                <input
                  type="radio"
                  name="ownersTrend"
                  value={t.value}
                  checked={form.ownersTrend === t.value}
                  onChange={() => setForm((f) => ({ ...f, ownersTrend: t.value }))}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 text-xs text-parchment-dim cursor-pointer">
          <input
            type="checkbox"
            checked={form.qualityBuyers}
            onChange={(e) => setForm((f) => ({ ...f, qualityBuyers: e.target.checked }))}
            className="accent-gold w-3.5 h-3.5 mt-0.5"
          />
          <span>
            At least one top-performing fund bought it in the latest quarter
            <span className="block text-[11px] text-parchment-faint">
              A fund with a strong multi-year record, not just any holder.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-xs text-parchment-dim cursor-pointer">
          <input
            type="checkbox"
            checked={form.overOwned}
            onChange={(e) => setForm((f) => ({ ...f, overOwned: e.target.checked }))}
            className="accent-gold w-3.5 h-3.5 mt-0.5"
          />
          <span>
            It looks over-owned
            <span className="block text-[11px] text-parchment-faint">
              Already a top holding of most big funds, so there are few new buyers left and many potential sellers.
            </span>
          </span>
        </label>

        <div>
          <label className="block text-xs text-parchment-dim mb-1" htmlFor="inst-note">
            Note
          </label>
          <input
            id="inst-note"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="e.g. Funds up from 1,800 to 2,050 over 3 quarters; Fidelity Contrafund added"
            maxLength={500}
            className="w-full bg-ink border border-line rounded-md px-3 py-2 text-sm text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-gold-dim"
          />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="bg-gold text-ink px-4 py-2 rounded-md text-sm font-medium hover:bg-gold-bright">
            Save
          </button>
          {(noteError || recentlySaved) && (
            <span className={`text-xs ${noteError ? "text-loss-bright" : "text-gain-bright"}`}>{noteError || "Saved ✓"}</span>
          )}
        </div>
      </form>

      <div className="mt-5 text-xs text-parchment-faint leading-relaxed">
        <p className="text-parchment-dim mb-1">Where to look</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Your broker&apos;s stock page usually has an &ldquo;ownership&rdquo; or &ldquo;institutional holders&rdquo; tab with the number of funds and the quarterly change.</li>
          <li>Funds file their holdings with the SEC every quarter (Form 13F), and free sites summarize them per stock, showing which funds added or cut.</li>
          <li>O&apos;Neil&apos;s rule of thumb: the count of funds owning it should be rising over the last few quarters.</li>
        </ul>
      </div>
    </LetterSection>
  );
}
