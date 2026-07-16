import { Areas, AreaCode } from "../api/constants";

export interface WatcherSpec {
  label: string;
  upperPrice: number;
  bedroomLower: number;
  bedroomUpper: number;
}

export interface WatchersConfig {
  areas: AreaCode[];
  watchers: WatcherSpec[];
}

interface RawConfig {
  areas: string[];
  watchers: WatcherSpec[];
}

export function parseWatchersConfig(raw: string): WatchersConfig {
  let parsed: RawConfig;
  try {
    parsed = JSON.parse(raw) as RawConfig;
  } catch (err) {
    throw new Error(
      `WATCHERS_JSON is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!Array.isArray(parsed.areas) || parsed.areas.length === 0) {
    throw new Error(`"areas" must be a non-empty string array`);
  }
  if (!Array.isArray(parsed.watchers) || parsed.watchers.length === 0) {
    throw new Error(`"watchers" must be a non-empty array`);
  }

  const areaMap = Areas as unknown as Record<string, AreaCode>;
  const areas: AreaCode[] = parsed.areas.map((name) => {
    const code = areaMap[name];
    if (typeof code !== "number") {
      throw new Error(`unknown area "${name}"`);
    }
    return code;
  });

  const seen = new Set<string>();
  for (const spec of parsed.watchers) {
    if (seen.has(spec.label)) {
      throw new Error(`duplicate watcher label "${spec.label}"`);
    }
    seen.add(spec.label);
    if (
      typeof spec.upperPrice !== "number" ||
      typeof spec.bedroomLower !== "number" ||
      typeof spec.bedroomUpper !== "number"
    ) {
      throw new Error(
        `watcher "${spec.label}" is missing numeric fields`,
      );
    }
  }

  return { areas, watchers: parsed.watchers };
}
