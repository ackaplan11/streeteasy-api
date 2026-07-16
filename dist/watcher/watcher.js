"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingWatcher = void 0;
const events_1 = require("events");
const client_1 = require("../api/client");
const MIN_POLL_MS = 60000;
const DEFAULT_POLL_MS = 10 * 60000;
const DEFAULT_MAX_TRACKED = 5000;
/**
 * Polls searchRentals() on an interval, diffs results against a tracked map
 * of listing ID → price, and emits:
 *   - `new-listing` for previously-unseen organic/featured listings
 *   - `price-drop` when a tracked listing's price decreases
 *   - `poll` at the end of each cycle with summary counts
 *   - `error` when a poll fails
 *
 * Sponsored edges are skipped — StreetEasy injects them regardless of the
 * price filter.
 */
class ListingWatcher extends events_1.EventEmitter {
    constructor(opts) {
        super();
        this.tracked = new Map();
        this.trackedOrder = [];
        this.timer = null;
        this.polling = false;
        this.client = opts.client ?? new client_1.StreetEasyClient();
        this.search = opts.search;
        this.pollIntervalMs = Math.max(MIN_POLL_MS, opts.pollIntervalMs ?? DEFAULT_POLL_MS);
        this.maxTracked = opts.maxTrackedListings ?? DEFAULT_MAX_TRACKED;
        this.suppressNext = opts.suppressInitialResults ?? true;
        if (opts.initialState) {
            this.loadState(opts.initialState);
            // If we have prior state, don't suppress — treat everything as tracked already.
            this.suppressNext = false;
        }
    }
    /** Start polling. Fires an immediate poll, then schedules the interval. */
    start() {
        if (this.timer)
            return;
        void this.poll();
        this.timer = setInterval(() => void this.poll(), this.pollIntervalMs);
    }
    /** Stop polling. */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /** True while a poll is in flight. */
    get isPolling() {
        return this.polling;
    }
    /** Snapshot the current tracked-listing state for persistence. */
    getState() {
        return {
            listings: Object.fromEntries(this.tracked.entries()),
        };
    }
    /** Load previously-persisted state. Called from the constructor when initialState is provided. */
    loadState(state) {
        this.tracked.clear();
        this.trackedOrder.length = 0;
        for (const [id, entry] of Object.entries(state.listings)) {
            this.tracked.set(id, entry);
            this.trackedOrder.push(id);
        }
    }
    async poll() {
        if (this.polling)
            return;
        this.polling = true;
        try {
            const response = await this.client.searchRentals(this.search);
            const listings = this.extractOrganic(response.searchRentals.edges);
            const now = new Date().toISOString();
            const fresh = [];
            const drops = [];
            for (const listing of listings) {
                const existing = this.tracked.get(listing.id);
                if (!existing) {
                    this.track(listing.id, { price: listing.price, firstSeenAt: now, lastSeenAt: now });
                    if (!this.suppressNext)
                        fresh.push(listing);
                }
                else {
                    if (listing.price < existing.price) {
                        drops.push({
                            listing,
                            previousPrice: existing.price,
                            newPrice: listing.price,
                        });
                    }
                    this.tracked.set(listing.id, {
                        price: listing.price,
                        firstSeenAt: existing.firstSeenAt,
                        lastSeenAt: now,
                    });
                }
            }
            const suppressed = this.suppressNext;
            this.suppressNext = false;
            for (const listing of fresh)
                this.emit("new-listing", listing);
            for (const drop of drops)
                this.emit("price-drop", drop);
            this.emit("poll", {
                totalCount: response.searchRentals.totalCount,
                newCount: suppressed ? 0 : fresh.length,
                priceDropCount: drops.length,
                timestamp: now,
            });
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.emit("error", error);
        }
        finally {
            this.polling = false;
        }
    }
    extractOrganic(edges) {
        return edges
            .filter((e) => e.__typename === "OrganicRentalEdge" ||
            e.__typename === "FeaturedRentalEdge")
            .map((e) => e.node);
    }
    track(id, entry) {
        this.tracked.set(id, entry);
        this.trackedOrder.push(id);
        while (this.trackedOrder.length > this.maxTracked) {
            const evict = this.trackedOrder.shift();
            if (evict !== undefined)
                this.tracked.delete(evict);
        }
    }
}
exports.ListingWatcher = ListingWatcher;
