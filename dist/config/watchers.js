"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadWatchersConfig = loadWatchersConfig;
const fs_1 = require("fs");
const constants_1 = require("../api/constants");
/**
 * Load a watchers config from JSON. Area names are looked up in Areas; unknown
 * names throw. Duplicate labels throw.
 */
async function loadWatchersConfig(filePath) {
    const raw = await fs_1.promises.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.areas) || parsed.areas.length === 0) {
        throw new Error(`${filePath}: "areas" must be a non-empty string array`);
    }
    if (!Array.isArray(parsed.watchers) || parsed.watchers.length === 0) {
        throw new Error(`${filePath}: "watchers" must be a non-empty array`);
    }
    const areaMap = constants_1.Areas;
    const areas = parsed.areas.map((name) => {
        const code = areaMap[name];
        if (typeof code !== "number") {
            throw new Error(`${filePath}: unknown area "${name}"`);
        }
        return code;
    });
    const seen = new Set();
    for (const spec of parsed.watchers) {
        if (seen.has(spec.label)) {
            throw new Error(`${filePath}: duplicate watcher label "${spec.label}"`);
        }
        seen.add(spec.label);
        if (typeof spec.upperPrice !== "number" ||
            typeof spec.bedroomLower !== "number" ||
            typeof spec.bedroomUpper !== "number") {
            throw new Error(`${filePath}: watcher "${spec.label}" is missing numeric fields`);
        }
    }
    return { areas, watchers: parsed.watchers };
}
