"use server";

import { auth } from "@/auth";
import { fetchCompanyFinancials } from "@/lib/secEdgar";

// Runs on the server: sec.gov blocks browser requests, and every request
// has to carry the contact User-Agent the SEC asks for.
export async function getCompanyFinancialsAction(ticker) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };
  if (!/^[A-Za-z.\-]{1,10}$/.test(ticker || "")) return { error: "Enter a valid ticker." };

  const userAgent = process.env.SEC_USER_AGENT;
  if (!userAgent) {
    return {
      error:
        'SEC_USER_AGENT isn\'t set. Add it to .env.local (for example SEC_USER_AGENT="Ledger journal you@example.com") and restart the server. The SEC requires a contact address on every request.',
    };
  }

  try {
    return await fetchCompanyFinancials(ticker, userAgent);
  } catch (e) {
    return { error: e.message || "Couldn't reach SEC EDGAR." };
  }
}
