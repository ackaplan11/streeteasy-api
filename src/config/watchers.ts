import { promises as fs } from "fs";
import { Areas, AreaCode } from "../api/constants";

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

interface RawConfig {
  areas: string[];
  watchers: WatcherSpec[];
}

/**
 * Load a watchers config from JSON. Area names are looked up in Areas; unknown
 * names throw. Duplicate labels throw.
 */
export async function loadWatchersConfig(
  filePath: string,
): Promise<WatchersConfig> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as RawConfig;

  if (!Array.isArray(parsed.areas) || parsed.areas.length === 0) {
    throw new Error(`${filePath}: "areas" must be a non-empty string array`);
  }
  if (!Array.isArray(parsed.watchers) || parsed.watchers.length === 0) {
    throw new Error(`${filePath}: "watchers" must be a non-empty array`);
  }

  const areaMap = Areas as unknown as Record<string, AreaCode>;
  const areas: AreaCode[] = parsed.areas.map((name) => {
    const code = areaMap[name];
    if (typeof code !== "number") {
      throw new Error(`${filePath}: unknown area "${name}"`);
    }
    return code;
  });

  const seen = new Set<string>();
  for (const spec of parsed.watchers) {
    if (seen.has(spec.label)) {
      throw new Error(`${filePath}: duplicate watcher label "${spec.label}"`);
    }
    seen.add(spec.label);
    if (
      typeof spec.upperPrice !== "number" ||
      typeof spec.bedroomLower !== "number" ||
      typeof spec.bedroomUpper !== "number"
    ) {
      throw new Error(
        `${filePath}: watcher "${spec.label}" is missing numeric fields`,
      );
    }
  }

  return { areas, watchers: parsed.watchers };
}
