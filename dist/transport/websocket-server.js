"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatcherServer = void 0;
const ws_1 = require("ws");
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
class WatcherServer {
    constructor(opts) {
        this.wss = null;
        this.handlers = [];
        this.handleConnection = (socket) => {
            this.send(socket, {
                type: "hello",
                timestamp: new Date().toISOString(),
                watchers: this.watchers.map((w) => w.label),
            });
        };
        if (opts.watchers.length === 0) {
            throw new Error("WatcherServer requires at least one watcher");
        }
        const seen = new Set();
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
    start() {
        if (this.wss)
            return Promise.resolve();
        return new Promise((resolve) => {
            this.wss = new ws_1.WebSocketServer({ port: this.port, path: this.path });
            this.wss.on("listening", () => {
                for (const { label, watcher } of this.watchers) {
                    const onNew = (listing) => this.broadcast({ type: "new-listing", label, listing });
                    const onPoll = (info) => this.broadcast({ type: "poll", label, ...info });
                    const onErr = (err) => this.broadcast({ type: "error", label, message: err.message });
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
    async stop() {
        if (!this.wss)
            return;
        for (const { watcher, onNew, onPoll, onErr } of this.handlers) {
            watcher.stop();
            watcher.off("new-listing", onNew);
            watcher.off("poll", onPoll);
            watcher.off("error", onErr);
        }
        this.handlers = [];
        const wss = this.wss;
        this.wss = null;
        for (const client of wss.clients)
            client.terminate();
        await new Promise((resolve) => wss.close(() => resolve()));
    }
    /** Number of currently connected clients. */
    get clientCount() {
        return this.wss?.clients.size ?? 0;
    }
    broadcast(msg) {
        if (!this.wss)
            return;
        const payload = JSON.stringify(msg);
        for (const client of this.wss.clients) {
            if (client.readyState === ws_1.WebSocket.OPEN)
                client.send(payload);
        }
    }
    send(socket, msg) {
        if (socket.readyState === ws_1.WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
        }
    }
}
exports.WatcherServer = WatcherServer;
