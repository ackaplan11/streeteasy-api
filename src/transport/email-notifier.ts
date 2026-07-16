import { Resend } from "resend";
import { ListingWatcher, PriceDrop, PollSummary } from "../watcher/watcher";
import { SearchRentalListing } from "../api/types";
import { buildSubject, buildHtml, EmailPayload } from "./email-templates";

export interface EmailNotifierOptions {
  /** Resend API key. */
  apiKey: string;
  /** Sender address, e.g. "watcher@your-verified-domain.com". */
  from: string;
  /** Recipient address(es). */
  to: string | string[];
  /** Optional subject prefix. Defaults to "[StreetEasy Watcher]". */
  subjectPrefix?: string;
}

/**
 * Buffers new-listing and price-drop events per (watcher-label), flushes on
 * each `poll` event as a single HTML email. Silent polls (no new or dropped
 * listings) do not send email.
 */
export class EmailNotifier {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly to: string | string[];
  private readonly subjectPrefix: string;
  private readonly buffers = new Map<string, EmailPayload>();
  private readonly detached = new Map<
    string,
    {
      watcher: ListingWatcher;
      onNew: (l: SearchRentalListing) => void;
      onDrop: (d: PriceDrop) => void;
      onPoll: (s: PollSummary) => void;
    }
  >();

  constructor(opts: EmailNotifierOptions) {
    this.resend = new Resend(opts.apiKey);
    this.from = opts.from;
    this.to = opts.to;
    this.subjectPrefix = opts.subjectPrefix ?? "[StreetEasy Watcher]";
  }

  /** Attach to a watcher under a label; flushes an email on every non-empty poll. */
  attach(label: string, watcher: ListingWatcher): void {
    if (this.detached.has(label)) {
      throw new Error(`EmailNotifier already attached to label: ${label}`);
    }
    this.buffers.set(label, { newListings: [], priceDrops: [] });

    const onNew = (listing: SearchRentalListing) => {
      this.buffers.get(label)?.newListings.push(listing);
    };
    const onDrop = (drop: PriceDrop) => {
      this.buffers.get(label)?.priceDrops.push(drop);
    };
    const onPoll = (_summary: PollSummary) => {
      void this.flush(label);
    };

    watcher.on("new-listing", onNew);
    watcher.on("price-drop", onDrop);
    watcher.on("poll", onPoll);
    this.detached.set(label, { watcher, onNew, onDrop, onPoll });
  }

  /** Detach from all watchers. Any buffered content is dropped. */
  detach(): void {
    for (const { watcher, onNew, onDrop, onPoll } of this.detached.values()) {
      watcher.off("new-listing", onNew);
      watcher.off("price-drop", onDrop);
      watcher.off("poll", onPoll);
    }
    this.detached.clear();
    this.buffers.clear();
  }

  private async flush(label: string): Promise<void> {
    const buf = this.buffers.get(label);
    if (!buf) return;
    if (buf.newListings.length === 0 && buf.priceDrops.length === 0) return;

    const toSend: EmailPayload = {
      newListings: buf.newListings.slice(),
      priceDrops: buf.priceDrops.slice(),
    };
    buf.newListings.length = 0;
    buf.priceDrops.length = 0;

    const subject = buildSubject(label, toSend, this.subjectPrefix);
    const html = buildHtml(label, toSend);

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: this.to,
        subject,
        html,
      });
      if (result.error) {
        console.error(`[notifier ${label}] send failed:`, result.error);
      } else {
        console.log(
          `[notifier ${label}] sent — ${toSend.newListings.length} new, ${toSend.priceDrops.length} price drop(s)`,
        );
      }
    } catch (err) {
      console.error(`[notifier ${label}] send threw:`, err);
    }
  }
}
