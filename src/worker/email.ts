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

async function postEmail(
  env: ResendEnv,
  subject: string,
  html: string,
  logLabel: string,
): Promise<void> {
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
    console.error(`[email ${logLabel}] send failed: ${res.status} ${body}`);
    return;
  }

  console.log(`[email ${logLabel}] sent`);
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

  await postEmail(env, subject, html, `listings:${label}`);
}

export async function sendCleanupReminder(
  env: ResendEnv,
  cutoff: string,
): Promise<void> {
  const subject = `${SUBJECT_PREFIX} Cutoff passed — delete the cron`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:600px;line-height:1.5">
      <h2 style="margin:0 0 12px">StreetEasy Watcher cutoff passed</h2>
      <p><code>POLL_CUTOFF</code> was <b>${cutoff}</b>. The poll body is now a
      no-op, but the cron trigger is still firing on schedule. This reminder
      will send daily until you tear it down.</p>
      <p><b>To fully stop it, either:</b></p>
      <ol>
        <li>Delete the Worker: Cloudflare dashboard → Workers &amp; Pages →
        <code>streeteasy-watcher</code> → Settings → Delete, or</li>
        <li>Remove the <code>crons</code> entries from <code>wrangler.toml</code> and
        run <code>yarn worker:deploy</code>.</li>
      </ol>
    </div>`;

  await postEmail(env, subject, html, "cleanup-reminder");
}
