"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../api/constants");
describe("Areas", () => {
    it("should have correct area codes", () => {
        expect(constants_1.Areas.ALL_NYC_AND_NJ).toBe(1);
        expect(constants_1.Areas.MANHATTAN).toBe(100);
        expect(constants_1.Areas.BRONX).toBe(200);
        expect(constants_1.Areas.BROOKLYN).toBe(300);
        expect(constants_1.Areas.QUEENS).toBe(400);
        expect(constants_1.Areas.STATEN_ISLAND).toBe(500);
    });
    it("should be immutable", () => {
        expect(() => {
            // @ts-expect-error Testing runtime immutability
            constants_1.Areas.MANHATTAN = 999;
        }).toThrow();
    });
});
describe("Amenities", () => {
    describe("Unit Amenities", () => {
        it("should have correct unit amenities", () => {
            expect(constants_1.Amenities.WASHER_DRYER).toBe("WASHER_DRYER");
            expect(constants_1.Amenities.DISHWASHER).toBe("DISHWASHER");
            expect(constants_1.Amenities.CENTRAL_AC).toBe("CENTRAL_AC");
            expect(constants_1.Amenities.FURNISHED).toBe("FURNISHED");
            expect(constants_1.Amenities.FIREPLACE).toBe("FIREPLACE");
            expect(constants_1.Amenities.LOFT).toBe("LOFT");
        });
    });
    describe("Views", () => {
        it("should have correct view types", () => {
            expect(constants_1.Amenities.CITY_VIEW).toBe("CITY_VIEW");
            expect(constants_1.Amenities.GARDEN_VIEW).toBe("GARDEN_VIEW");
            expect(constants_1.Amenities.PARK_VIEW).toBe("PARK_VIEW");
            expect(constants_1.Amenities.SKYLINE_VIEW).toBe("SKYLINE_VIEW");
            expect(constants_1.Amenities.WATER_VIEW).toBe("WATER_VIEW");
        });
    });
    describe("Building Amenities", () => {
        it("should have correct building amenities", () => {
            expect(constants_1.Amenities.DOORMAN).toBe("DOORMAN");
            expect(constants_1.Amenities.LAUNDRY).toBe("LAUNDRY");
            expect(constants_1.Amenities.ELEVATOR).toBe("ELEVATOR");
            expect(constants_1.Amenities.GYM).toBe("GYM");
            expect(constants_1.Amenities.POOL).toBe("POOL");
        });
    });
    it("should be immutable", () => {
        expect(() => {
            // @ts-expect-error Testing runtime immutability
            constants_1.Amenities.DOORMAN = "VIRTUAL_DOORMAN";
        }).toThrow();
    });
});
