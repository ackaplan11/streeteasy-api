import { SearchRentalListing } from "../api/types";
import { PriceDrop } from "./poll";
import { buildSubject, buildHtml } from "./templates";

const RESEND_URL = "https://api.resend.com/emails";
const SUBJECT_PREFIX = "[StreetEasy Watcher]";

export interface ResendEnv {
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  RESEND_TO: string;
}

export async function sendListingEmail(
  env: ResendEnv,
  label: string,
  newListings: SearchRentalListing[],
  priceDrops: PriceDrop[],
): Promise<void> {
  if (newListings.length === 0 && priceDrops.length === 0) return;

  const payload = { newListings, priceDrops };
  const subject = buildSubject(label, payload, SUBJECT_PREFIX);
  const html = buildHtml(label, payload);

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: env.RESEND_TO,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[email ${label}] send failed: ${res.status} ${body}`);
    return;
  }

  console.log(
    `[email ${label}] sent — ${newListings.length} new, ${priceDrops.length} price drop(s)`,
  );
}
