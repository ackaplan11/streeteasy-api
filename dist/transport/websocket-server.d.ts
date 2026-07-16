import { ListingWatcher } from "../watcher/watcher";
import { SearchRentalListing } from "../api/types";
export interface LabeledWatcher {
    /** Short identifier included in every broadcast (e.g. "studios-1br", "2br"). */
    label: string;
    watcher: ListingWatcher;
}
export interface WatcherServerOptions {
    /** One or more watchers to host. Each must have a unique label. */
    watchers: LabeledWatcher[];
    /** Port to bind the WebSocket server on. */
    port: number;
    /** Optional path (e.g. "/watch"). Defaults to any path. */
    path?: string;
}
export type WatcherMessage = {
    type: "hello";
    timestamp: string;
    watchers: string[];
} | {
    type: "new-listing";
    label: string;
    listing: SearchRentalListing;
} | {
    type: "poll";
    label: string;
    totalCount: number;
    newCount: number;
    timestamp: string;
} | {
    type: "error";
    label: string;
    message: string;
};
/**
 * Binds one or more labeled ListingWatchers to a WebSocket server. Every
 * connected client receives:
 *   - one {type: "hello"} message on connect, listing the watcher labels
 *   - {type: "new-listing", label} for each newly-seen listing
 *   - {type: "poll", label} after each poll cycle (heartbeat-ish)
 *   - {type: "error", label} if a poll fails
 *
 * All watchers are started when the server starts and stopped when it stops.
 */
export declare class WatcherServer {
    private readonly watchers;
    private readonly port;
    private readonly path?;
    private wss;
    private handlers;
    constructor(opts: WatcherServerOptions);
    /** Start the WS server and begin polling on every watcher. */
    start(): Promise<void>;
    /** Stop polling, close all client sockets, and shut down the server. */
    stop(): Promise<void>;
    /** Number of currently connected clients. */
    get clientCount(): number;
    private handleConnection;
    private broadcast;
    private send;
}
