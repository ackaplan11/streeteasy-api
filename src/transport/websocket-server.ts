import { WebSocketServer, WebSocket } from "ws";
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

export type WatcherMessage =
  | { type: "hello"; timestamp: string; watchers: string[] }
  | { type: "new-listing"; label: string; listing: SearchRentalListing }
  | {
      type: "poll";
      label: string;
      totalCount: number;
      newCount: number;
      timestamp: string;
    }
  | { type: "error"; label: string; message: string };

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
export class WatcherServer {
  private readonly watchers: LabeledWatcher[];
  private readonly port: number;
  private readonly path?: string;
  private wss: WebSocketServer | null = null;
  private handlers: Array<{
    watcher: ListingWatcher;
    onNew: (l: SearchRentalListing) => void;
    onPoll: (info: {
      totalCount: number;
      newCount: number;
      timestamp: string;
    }) => void;
    onErr: (err: Error) => void;
  }> = [];

  constructor(opts: WatcherServerOptions) {
    if (opts.watchers.length === 0) {
      throw new Error("WatcherServer requires at least one watcher");
    }
    const seen = new Set<string>();
    for (const { label } of opts.watchers) {
      if (seen.has(label)) {
        throw new Error(`Duplicate watcher label: ${label}`);
      }
      seen.add(label);
    }
    this.watchers = opts.watchers;
    this.port = opts.port;
    this.path = opts.path;
  }

  /** Start the WS server and begin polling on every watcher. */
  start(): Promise<void> {
    if (this.wss) return Promise.resolve();

    return new Promise((resolve) => {
      this.wss = new WebSocketServer({ port: this.port, path: this.path });
      this.wss.on("listening", () => {
        for (const { label, watcher } of this.watchers) {
          const onNew = (listing: SearchRentalListing) =>
            this.broadcast({ type: "new-listing", label, listing });
          const onPoll = (info: {
            totalCount: number;
            newCount: number;
            timestamp: string;
          }) => this.broadcast({ type: "poll", label, ...info });
          const onErr = (err: Error) =>
            this.broadcast({ type: "error", label, message: err.message });
          watcher.on("new-listing", onNew);
          watcher.on("poll", onPoll);
          watcher.on("error", onErr);
          watcher.start();
          this.handlers.push({ watcher, onNew, onPoll, onErr });
        }
        resolve();
      });
      this.wss.on("connection", (socket) => this.handleConnection(socket));
    });
  }

  /** Stop polling, close all client sockets, and shut down the server. */
  async stop(): Promise<void> {
    if (!this.wss) return;
    for (const { watcher, onNew, onPoll, onErr } of this.handlers) {
      watcher.stop();
      watcher.off("new-listing", onNew);
      watcher.off("poll", onPoll);
      watcher.off("error", onErr);
    }
    this.handlers = [];

    const wss = this.wss;
    this.wss = null;
    for (const client of wss.clients) client.terminate();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  }

  /** Number of currently connected clients. */
  get clientCount(): number {
    return this.wss?.clients.size ?? 0;
  }

  private handleConnection = (socket: WebSocket): void => {
    this.send(socket, {
      type: "hello",
      timestamp: new Date().toISOString(),
      watchers: this.watchers.map((w) => w.label),
    });
  };

  private broadcast(msg: WatcherMessage): void {
    if (!this.wss) return;
    const payload = JSON.stringify(msg);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  private send(socket: WebSocket, msg: WatcherMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    }
  }
}
