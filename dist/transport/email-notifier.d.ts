import { ListingWatcher } from "../watcher/watcher";
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
export declare class EmailNotifier {
    private readonly resend;
    private readonly from;
    private readonly to;
    private readonly subjectPrefix;
    private readonly buffers;
    private readonly detached;
    constructor(opts: EmailNotifierOptions);
    /** Attach to a watcher under a label; flushes an email on every non-empty poll. */
    attach(label: string, watcher: ListingWatcher): void;
    /** Detach from all watchers. Any buffered content is dropped. */
    detach(): void;
    private flush;
}
