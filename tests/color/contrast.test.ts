import { describe, it, expect } from "vitest";
import { getContrastTextColor } from "@/lib/color/contrast";

describe("getContrastTextColor", () => {
  it("uses dark text on white (the bug this fixes: white accentColor + white text)", () => {
    expect(getContrastTextColor("#ffffff")).toBe("dark");
  });

  it("uses light text on black (brand default fallback)", () => {
    expect(getContrastTextColor("#000000")).toBe("light");
  });

  it("uses light text on brand blue #0D21A1", () => {
    expect(getContrastTextColor("#0D21A1")).toBe("light");
  });

  it("uses dark text on a pale pastel color", () => {
    expect(getContrastTextColor("#FFF7CC")).toBe("dark");
  });

  it("uses light text on a saturated dark red", () => {
    expect(getContrastTextColor("#7A0000")).toBe("light");
  });

  it("is case-insensitive and tolerates a missing leading #", () => {
    expect(getContrastTextColor("FFFFFF")).toBe("dark");
    expect(getContrastTextColor("#FfFfFf")).toBe("dark");
  });

  it("falls back to light text for an invalid hex", () => {
    expect(getContrastTextColor("not-a-color")).toBe("light");
  });
});
