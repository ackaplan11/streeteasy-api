import { StreetEasyClient } from "../api/client";
import { AreaCode } from "../api/constants";
import { SearchRentalListing, RentalEdge } from "../api/types";
import { WatcherSpec } from "./config";
import { WatcherState, TrackedListing } from "./state";

export interface PollInput {
  areas: AreaCode[];
  spec: WatcherSpec;
  state: WatcherState | undefined;
  client?: StreetEasyClient;
}

export interface PriceDrop {
  listing: SearchRentalListing;
  previousPrice: number;
  newPrice: number;
}

export interface PollResult {
  newState: WatcherState;
  newListings: SearchRentalListing[];
  priceDrops: PriceDrop[];
  totalCount: number;
}

const MAX_TRACKED = 5000;

export async function runPoll(input: PollInput): Promise<PollResult> {
  const client = input.client ?? new StreetEasyClient();
  const isFirstRun = !input.state;
  const tracked = new Map<string, TrackedListing>(
    input.state ? Object.entries(input.state.listings) : [],
  );

  const response = await client.searchRentals({
    sorting: { attribute: "LISTED_AT", direction: "DESCENDING" },
    filters: {
      areas: input.areas,
      rentalStatus: "ACTIVE",
      price: { lowerBound: null, upperBound: input.spec.upperPrice },
      bedrooms: {
        lowerBound: input.spec.bedroomLower,
        upperBound: input.spec.bedroomUpper,
      },
    },
    perPage: 100,
  });

  const listings = extractOrganic(response.searchRentals.edges);
  const now = new Date().toISOString();
  const newListings: SearchRentalListing[] = [];
  const priceDrops: PriceDrop[] = [];

  for (const listing of listings) {
    const existing = tracked.get(listing.id);
    if (!existing) {
      tracked.set(listing.id, {
        price: listing.price,
        firstSeenAt: now,
        lastSeenAt: now,
      });
      if (!isFirstRun) newListings.push(listing);
    } else {
      if (listing.price < existing.price) {
        priceDrops.push({
          listing,
          previousPrice: existing.price,
          newPrice: listing.price,
        });
      }
      tracked.set(listing.id, {
        price: listing.price,
        firstSeenAt: existing.firstSeenAt,
        lastSeenAt: now,
      });
    }
  }

  if (tracked.size > MAX_TRACKED) {
    const entries = Array.from(tracked.entries()).sort((a, b) =>
      a[1].lastSeenAt.localeCompare(b[1].lastSeenAt),
    );
    for (const [id] of entries.slice(0, tracked.size - MAX_TRACKED)) {
      tracked.delete(id);
    }
  }

  return {
    newState: { listings: Object.fromEntries(tracked) },
    newListings,
    priceDrops,
    totalCount: response.searchRentals.totalCount,
  };
}

function extractOrganic(edges: RentalEdge[]): SearchRentalListing[] {
  return edges
    .filter(
      (e) =>
        e.__typename === "OrganicRentalEdge" ||
        e.__typename === "FeaturedRentalEdge",
    )
    .map((e) => e.node);
}
