import { AreaCode } from "../api/constants";
export interface WatcherSpec {
    label: string;
    upperPrice: number;
    bedroomLower: number;
    bedroomUpper: number;
}
export interface WatchersConfig {
    /** Area codes to search over. Resolved from Areas.<NAME>. */
    areas: AreaCode[];
    /** One entry per watcher; label must be unique. */
    watchers: WatcherSpec[];
}
/**
 * Load a watchers config from JSON. Area names are looked up in Areas; unknown
 * names throw. Duplicate labels throw.
 */
export declare function loadWatchersConfig(filePath: string): Promise<WatchersConfig>;
