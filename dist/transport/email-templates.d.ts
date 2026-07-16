import { SearchRentalListing } from "../api/types";
import { PriceDrop } from "../watcher/watcher";
export interface EmailPayload {
    newListings: SearchRentalListing[];
    priceDrops: PriceDrop[];
}
export declare function buildSubject(label: string, payload: EmailPayload, prefix: string): string;
export declare function buildHtml(label: string, payload: EmailPayload): string;
