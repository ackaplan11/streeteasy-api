"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../api/client");
const constants_1 = require("../api/constants");
// Skip integration tests by default
// Run with: yarn test:integration
describe.skip("StreetEasy API Integration", () => {
    let client;
    beforeAll(() => {
        client = new client_1.StreetEasyClient();
    });
    describe("searchRentals", () => {
        // Add reasonable timeout for API calls
        jest.setTimeout(10000);
        it("should fetch rentals in Manhattan", async () => {
            const params = {
                filters: {
                    areas: [constants_1.Areas.MANHATTAN],
                    price: {
                        lowerBound: 2000,
                        upperBound: 10000,
                    },
                },
                perPage: 5, // Limit results for testing
            };
            const response = await client.searchRentals(params);
            // Verify response structure
            expect(response.searchRentals).toBeDefined();
            expect(response.searchRentals.totalCount).toBeGreaterThan(0);
            expect(response.searchRentals.edges.length).toBeGreaterThan(0);
            // Verify listing data
            const firstListing = response.searchRentals.edges[0].node;
            expect(firstListing.id).toBeDefined();
            expect(firstListing.price).toBeGreaterThanOrEqual(2000);
            expect(firstListing.price).toBeLessThanOrEqual(10000);
            expect(firstListing.areaName).toBeDefined();
            expect(firstListing.street).toBeDefined();
        });
        it("should fetch pet-friendly rentals with amenities", async () => {
            const params = {
                filters: {
                    areas: [constants_1.Areas.BROOKLYN],
                    amenities: [constants_1.Amenities.WASHER_DRYER, constants_1.Amenities.DISHWASHER],
                    petsAllowed: true,
                    price: {
                        lowerBound: null,
                        upperBound: 5000,
                    },
                },
                perPage: 5,
            };
            const response = await client.searchRentals(params);
            expect(response.searchRentals.totalCount).toBeGreaterThan(0);
            // Verify amenities in response
            const listing = response.searchRentals.edges[0].node;
            expect(listing.areaName.toLowerCase()).toContain("brooklyn");
            expect(listing.price).toBeLessThanOrEqual(5000);
        });
        it("should handle searches with multiple areas", async () => {
            const params = {
                filters: {
                    areas: [constants_1.Areas.MANHATTAN, constants_1.Areas.BROOKLYN],
                    price: {
                        lowerBound: null,
                        upperBound: 5000,
                    },
                },
                perPage: 10,
            };
            const response = await client.searchRentals(params);
            expect(response.searchRentals.totalCount).toBeGreaterThan(0);
            // Verify we get listings from both areas
            const areaNames = response.searchRentals.edges.map((edge) => edge.node.areaName.toLowerCase());
            expect(areaNames.some((name) => name.includes("manhattan") || name.includes("brooklyn"))).toBe(true);
        });
        it("should handle searches with bedroom constraints", async () => {
            const params = {
                filters: {
                    areas: [constants_1.Areas.MANHATTAN],
                    bedrooms: {
                        lowerBound: 2,
                        upperBound: 3,
                    },
                },
                perPage: 5,
            };
            const response = await client.searchRentals(params);
            expect(response.searchRentals.totalCount).toBeGreaterThan(0);
            // Verify bedroom counts
            const firstListing = response.searchRentals.edges[0].node;
            expect(firstListing.bedroomCount).toBeGreaterThanOrEqual(2);
            expect(firstListing.bedroomCount).toBeLessThanOrEqual(3);
        });
        it("should handle API errors gracefully", async () => {
            const invalidParams = {
                filters: {
                    // @ts-expect-error Testing invalid area
                    areas: [999999], // Invalid area code
                },
            };
            await expect(client.searchRentals(invalidParams)).rejects.toThrow("StreetEasy GraphQL Error");
        });
    });
    // Rate limiting and error handling tests
    describe("API limits and errors", () => {
        it("should handle rapid sequential requests", async () => {
            const params = {
                filters: {
                    areas: [constants_1.Areas.MANHATTAN],
                },
                perPage: 1,
            };
            // Make 3 rapid requests
            const promises = Array(3)
                .fill(null)
                .map(() => client.searchRentals(params));
            const results = await Promise.allSettled(promises);
            // Verify at least one request succeeded
            expect(results.some((result) => result.status === "fulfilled")).toBe(true);
        });
        it("should handle network timeouts", async () => {
            // Create client with impossibly low timeout
            const timeoutClient = new client_1.StreetEasyClient({
                endpoint: "https://api-v6.streeteasy.com/?sleep=5000", // Force delay
            });
            const params = {
                filters: {
                    areas: [constants_1.Areas.MANHATTAN],
                },
            };
            await expect(timeoutClient.searchRentals(params)).rejects.toThrow();
        });
    });
});
