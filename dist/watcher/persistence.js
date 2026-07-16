"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadState = loadState;
exports.saveState = saveState;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const EMPTY_STATE = {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    watchers: {},
};
/** Load state from disk. Returns an empty state if the file does not exist. */
async function loadState(filePath) {
    try {
        const raw = await fs_1.promises.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1) {
            throw new Error(`Unsupported state file version ${parsed.version} — expected 1`);
        }
        return parsed;
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return { ...EMPTY_STATE, updatedAt: new Date().toISOString() };
        }
        throw err;
    }
}
/** Atomically write state to disk (writes to a temp file, then renames). */
async function saveState(filePath, state) {
    const dir = path.dirname(filePath);
    await fs_1.promises.mkdir(dir, { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    await fs_1.promises.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
    await fs_1.promises.rename(tmp, filePath);
}
