import { SearchRentalListing } from "../api/types";
import { PriceDrop } from "../watcher/watcher";

export interface EmailPayload {
  newListings: SearchRentalListing[];
  priceDrops: PriceDrop[];
}

export function buildSubject(
  label: string,
  payload: EmailPayload,
  prefix: string,
): string {
  const parts: string[] = [];
  if (payload.newListings.length > 0) {
    parts.push(
      `${payload.newListings.length} new listing${payload.newListings.length === 1 ? "" : "s"}`,
    );
  }
  if (payload.priceDrops.length > 0) {
    parts.push(
      `${payload.priceDrops.length} price drop${payload.priceDrops.length === 1 ? "" : "s"}`,
    );
  }
  return `${prefix} ${label}: ${parts.join(", ")}`;
}

export function buildHtml(label: string, payload: EmailPayload): string {
  const sections: string[] = [];
  sections.push(
    `<h2 style="font-family:system-ui,sans-serif;margin:0 0 12px">${escapeHtml(label)}</h2>`,
  );

  if (payload.newListings.length > 0) {
    sections.push(`<h3 style="font-family:system-ui,sans-serif">New listings</h3>`);
    sections.push(payload.newListings.map((l) => renderListing(l)).join(""));
  }

  if (payload.priceDrops.length > 0) {
    sections.push(
      `<h3 style="font-family:system-ui,sans-serif">Price drops</h3>`,
    );
    sections.push(payload.priceDrops.map((d) => renderPriceDrop(d)).join(""));
  }

  return `<div style="font-family:system-ui,sans-serif;max-width:600px">${sections.join("")}</div>`;
}

function renderListing(l: SearchRentalListing): string {
  const address = `${l.street}${l.unit ? ` ${l.unit}` : ""}`;
  const beds = l.bedroomCount === 0 ? "Studio" : `${l.bedroomCount}BR`;
  const url = `https://streeteasy.com${l.urlPath}`;
  return `
    <div style="border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin:8px 0;font-family:system-ui,sans-serif">
      <div style="font-size:18px;font-weight:600">$${l.price.toLocaleString()}/mo — ${beds}${l.fullBathroomCount ? ` / ${l.fullBathroomCount}BA` : ""}</div>
      <div style="color:#555">${escapeHtml(address)} — ${escapeHtml(l.areaName)}</div>
      <div style="color:#777;font-size:13px;margin-top:4px">
        ${l.noFee ? "NO FEE" : "FEE"}${l.availableAt ? ` · Available ${escapeHtml(l.availableAt)}` : ""}${l.livingAreaSize ? ` · ${l.livingAreaSize} sqft` : ""}
      </div>
      <div style="margin-top:6px"><a href="${url}">${url}</a></div>
    </div>`;
}

function renderPriceDrop(d: PriceDrop): string {
  const l = d.listing;
  const address = `${l.street}${l.unit ? ` ${l.unit}` : ""}`;
  const beds = l.bedroomCount === 0 ? "Studio" : `${l.bedroomCount}BR`;
  const url = `https://streeteasy.com${l.urlPath}`;
  const delta = d.previousPrice - d.newPrice;
  const pct = Math.round((delta / d.previousPrice) * 100);
  return `
    <div style="border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin:8px 0;font-family:system-ui,sans-serif">
      <div style="font-size:18px;font-weight:600">
        <span style="text-decoration:line-through;color:#999">$${d.previousPrice.toLocaleString()}</span>
        &rarr; $${d.newPrice.toLocaleString()}/mo
        <span style="color:#0a7f2e;font-size:14px">(-$${delta.toLocaleString()}, -${pct}%)</span>
      </div>
      <div style="color:#555">${beds} — ${escapeHtml(address)} — ${escapeHtml(l.areaName)}</div>
      <div style="margin-top:6px"><a href="${url}">${url}</a></div>
    </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
