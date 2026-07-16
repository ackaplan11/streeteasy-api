import { Areas, Amenities } from "../api/constants";

describe("Areas", () => {
  it("should have correct area codes", () => {
    expect(Areas.ALL_NYC_AND_NJ).toBe(1);
    expect(Areas.MANHATTAN).toBe(100);
    expect(Areas.BRONX).toBe(200);
    expect(Areas.BROOKLYN).toBe(300);
    expect(Areas.QUEENS).toBe(400);
    expect(Areas.STATEN_ISLAND).toBe(500);
  });

  it("should be immutable", () => {
    expect(() => {
      // @ts-expect-error Testing runtime immutability
      Areas.MANHATTAN = 999;
    }).toThrow();
  });
});

describe("Amenities", () => {
  describe("Unit Amenities", () => {
    it("should have correct unit amenities", () => {
      expect(Amenities.WASHER_DRYER).toBe("WASHER_DRYER");
      expect(Amenities.DISHWASHER).toBe("DISHWASHER");
      expect(Amenities.CENTRAL_AC).toBe("CENTRAL_AC");
      expect(Amenities.FURNISHED).toBe("FURNISHED");
      expect(Amenities.FIREPLACE).toBe("FIREPLACE");
      expect(Amenities.LOFT).toBe("LOFT");
    });
  });

  describe("Views", () => {
    it("should have correct view types", () => {
      expect(Amenities.CITY_VIEW).toBe("CITY_VIEW");
      expect(Amenities.GARDEN_VIEW).toBe("GARDEN_VIEW");
      expect(Amenities.PARK_VIEW).toBe("PARK_VIEW");
      expect(Amenities.SKYLINE_VIEW).toBe("SKYLINE_VIEW");
      expect(Amenities.WATER_VIEW).toBe("WATER_VIEW");
    });
  });

  describe("Building Amenities", () => {
    it("should have correct building amenities", () => {
      expect(Amenities.DOORMAN).toBe("DOORMAN");
      expect(Amenities.LAUNDRY).toBe("LAUNDRY");
      expect(Amenities.ELEVATOR).toBe("ELEVATOR");
      expect(Amenities.GYM).toBe("GYM");
      expect(Amenities.POOL).toBe("POOL");
    });
  });

  it("should be immutable", () => {
    expect(() => {
      // @ts-expect-error Testing runtime immutability
      Amenities.DOORMAN = "VIRTUAL_DOORMAN";
    }).toThrow();
  });
});
