"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailNotifier = void 0;
const resend_1 = require("resend");
const email_templates_1 = require("./email-templates");
/**
 * Buffers new-listing and price-drop events per (watcher-label), flushes on
 * each `poll` event as a single HTML email. Silent polls (no new or dropped
 * listings) do not send email.
 */
class EmailNotifier {
    constructor(opts) {
        this.buffers = new Map();
        this.detached = new Map();
        this.resend = new resend_1.Resend(opts.apiKey);
        this.from = opts.from;
        this.to = opts.to;
        this.subjectPrefix = opts.subjectPrefix ?? "[StreetEasy Watcher]";
    }
    /** Attach to a watcher under a label; flushes an email on every non-empty poll. */
    attach(label, watcher) {
        if (this.detached.has(label)) {
            throw new Error(`EmailNotifier already attached to label: ${label}`);
        }
        this.buffers.set(label, { newListings: [], priceDrops: [] });
        const onNew = (listing) => {
            this.buffers.get(label)?.newListings.push(listing);
        };
        const onDrop = (drop) => {
            this.buffers.get(label)?.priceDrops.push(drop);
        };
        const onPoll = (_summary) => {
            void this.flush(label);
        };
        watcher.on("new-listing", onNew);
        watcher.on("price-drop", onDrop);
        watcher.on("poll", onPoll);
        this.detached.set(label, { watcher, onNew, onDrop, onPoll });
    }
    /** Detach from all watchers. Any buffered content is dropped. */
    detach() {
        for (const { watcher, onNew, onDrop, onPoll } of this.detached.values()) {
            watcher.off("new-listing", onNew);
            watcher.off("price-drop", onDrop);
            watcher.off("poll", onPoll);
        }
        this.detached.clear();
        this.buffers.clear();
    }
    async flush(label) {
        const buf = this.buffers.get(label);
        if (!buf)
            return;
        if (buf.newListings.length === 0 && buf.priceDrops.length === 0)
            return;
        const toSend = {
            newListings: buf.newListings.slice(),
            priceDrops: buf.priceDrops.slice(),
        };
        buf.newListings.length = 0;
        buf.priceDrops.length = 0;
        const subject = (0, email_templates_1.buildSubject)(label, toSend, this.subjectPrefix);
        const html = (0, email_templates_1.buildHtml)(label, toSend);
        try {
            const result = await this.resend.emails.send({
                from: this.from,
                to: this.to,
                subject,
                html,
            });
            if (result.error) {
                console.error(`[notifier ${label}] send failed:`, result.error);
            }
            else {
                console.log(`[notifier ${label}] sent — ${toSend.newListings.length} new, ${toSend.priceDrops.length} price drop(s)`);
            }
        }
        catch (err) {
            console.error(`[notifier ${label}] send threw:`, err);
        }
    }
}
exports.EmailNotifier = EmailNotifier;
