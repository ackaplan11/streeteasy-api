import { EventEmitter } from "events";
import { StreetEasyClient } from "../api/client";
import { SearchRentalsInput, SearchRentalListing } from "../api/types";
export interface ListingWatcherOptions {
    /** Search parameters passed to searchRentals(). */
    search: SearchRentalsInput;
    /** Poll interval in milliseconds. Defaults to 10 minutes. Values below 60_000 are clamped up. */
    pollIntervalMs?: number;
    /** Optional client. If omitted, a default StreetEasyClient is created. */
    client?: StreetEasyClient;
    /** If true, the first poll's listings are considered "seen" and no events fire for them. Defaults to true. */
    suppressInitialResults?: boolean;
    /** Cap on the number of tracked listings. Oldest are evicted first. Defaults to 5000. */
    maxTrackedListings?: number;
    /** Optional pre-loaded state (from state.json). Skips initial suppression if provided. */
    initialState?: WatcherState;
}
export interface PriceDrop {
    listing: SearchRentalListing;
    previousPrice: number;
    newPrice: number;
}
export interface PollSummary {
    totalCount: number;
    newCount: number;
    priceDropCount: number;
    timestamp: string;
}
export interface ListingWatcherEvents {
    "new-listing": (listing: SearchRentalListing) => void;
    "price-drop": (drop: PriceDrop) => void;
    poll: (info: PollSummary) => void;
    error: (err: Error) => void;
}
export interface TrackedListing {
    price: number;
    firstSeenAt: string;
    lastSeenAt: string;
}
export interface WatcherState {
    listings: Record<string, TrackedListing>;
}
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
export declare class ListingWatcher extends EventEmitter {
    private readonly client;
    private readonly search;
    private readonly pollIntervalMs;
    private readonly maxTracked;
    private readonly tracked;
    private readonly trackedOrder;
    private suppressNext;
    private timer;
    private polling;
    constructor(opts: ListingWatcherOptions);
    /** Start polling. Fires an immediate poll, then schedules the interval. */
    start(): void;
    /** Stop polling. */
    stop(): void;
    /** True while a poll is in flight. */
    get isPolling(): boolean;
    /** Snapshot the current tracked-listing state for persistence. */
    getState(): WatcherState;
    /** Load previously-persisted state. Called from the constructor when initialState is provided. */
    loadState(state: WatcherState): void;
    private poll;
    private extractOrganic;
    private track;
}
export declare interface ListingWatcher {
    on<E extends keyof ListingWatcherEvents>(event: E, listener: ListingWatcherEvents[E]): this;
    emit<E extends keyof ListingWatcherEvents>(event: E, ...args: Parameters<ListingWatcherEvents[E]>): boolean;
}
