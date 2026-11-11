"use client";

import { useEffect, useState } from "react";
import { getStockNoteAction, saveStockNoteAction } from "@/contexts/stockNotesActions";

// Your saved per-ticker CAN SLIM notes (pivot, "something new", the I
// checklist). saveNote merges a patch into what's stored.
export function useStockNote(ticker) {
  const [note, setNote] = useState({});
  const [noteError, setNoteError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getStockNoteAction(ticker).then((res) => {
      if (cancelled) return;
      setNote(res.note || {});
      setNoteError(res.error || null);
    });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  async function saveNote(patch) {
    const res = await saveStockNoteAction(ticker, patch);
    if (res.error) {
      setNoteError(res.error);
      return false;
    }
    setNote(res.note);
    setNoteError(null);
    setSavedAt(Date.now());
    return true;
  }

  return { note, saveNote, noteError, savedAt };
}
