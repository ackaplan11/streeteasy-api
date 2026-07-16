import { EventEmitter } from "events";
import { StreetEasyClient } from "../api/client";
import {
  SearchRentalsInput,
  SearchRentalListing,
  RentalEdge,
} from "../api/types";

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

const MIN_POLL_MS = 60_000;
const DEFAULT_POLL_MS = 10 * 60_000;
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
export class ListingWatcher extends EventEmitter {
  private readonly client: StreetEasyClient;
  private readonly search: SearchRentalsInput;
  private readonly pollIntervalMs: number;
  private readonly maxTracked: number;
  private readonly tracked = new Map<string, TrackedListing>();
  private readonly trackedOrder: string[] = [];
  private suppressNext: boolean;
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  constructor(opts: ListingWatcherOptions) {
    super();
    this.client = opts.client ?? new StreetEasyClient();
    this.search = opts.search;
    this.pollIntervalMs = Math.max(
      MIN_POLL_MS,
      opts.pollIntervalMs ?? DEFAULT_POLL_MS,
    );
    this.maxTracked = opts.maxTrackedListings ?? DEFAULT_MAX_TRACKED;
    this.suppressNext = opts.suppressInitialResults ?? true;

    if (opts.initialState) {
      this.loadState(opts.initialState);
      // If we have prior state, don't suppress — treat everything as tracked already.
      this.suppressNext = false;
    }
  }

  /** Start polling. Fires an immediate poll, then schedules the interval. */
  start(): void {
    if (this.timer) return;
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.pollIntervalMs);
  }

  /** Stop polling. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** True while a poll is in flight. */
  get isPolling(): boolean {
    return this.polling;
  }

  /** Snapshot the current tracked-listing state for persistence. */
  getState(): WatcherState {
    return {
      listings: Object.fromEntries(this.tracked.entries()),
    };
  }

  /** Load previously-persisted state. Called from the constructor when initialState is provided. */
  loadState(state: WatcherState): void {
    this.tracked.clear();
    this.trackedOrder.length = 0;
    for (const [id, entry] of Object.entries(state.listings)) {
      this.tracked.set(id, entry);
      this.trackedOrder.push(id);
    }
  }

  private async poll(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      const response = await this.client.searchRentals(this.search);
      const listings = this.extractOrganic(response.searchRentals.edges);
      const now = new Date().toISOString();
      const fresh: SearchRentalListing[] = [];
      const drops: PriceDrop[] = [];

      for (const listing of listings) {
        const existing = this.tracked.get(listing.id);
        if (!existing) {
          this.track(listing.id, { price: listing.price, firstSeenAt: now, lastSeenAt: now });
          if (!this.suppressNext) fresh.push(listing);
        } else {
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

      for (const listing of fresh) this.emit("new-listing", listing);
      for (const drop of drops) this.emit("price-drop", drop);

      this.emit("poll", {
        totalCount: response.searchRentals.totalCount,
        newCount: suppressed ? 0 : fresh.length,
        priceDropCount: drops.length,
        timestamp: now,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit("error", error);
    } finally {
      this.polling = false;
    }
  }

  private extractOrganic(edges: RentalEdge[]): SearchRentalListing[] {
    return edges
      .filter(
        (e) =>
          e.__typename === "OrganicRentalEdge" ||
          e.__typename === "FeaturedRentalEdge",
      )
      .map((e) => e.node);
  }

  private track(id: string, entry: TrackedListing): void {
    this.tracked.set(id, entry);
    this.trackedOrder.push(id);
    while (this.trackedOrder.length > this.maxTracked) {
      const evict = this.trackedOrder.shift();
      if (evict !== undefined) this.tracked.delete(evict);
    }
  }
}

export declare interface ListingWatcher {
  on<E extends keyof ListingWatcherEvents>(
    event: E,
    listener: ListingWatcherEvents[E],
  ): this;
  emit<E extends keyof ListingWatcherEvents>(
    event: E,
    ...args: Parameters<ListingWatcherEvents[E]>
  ): boolean;
}
