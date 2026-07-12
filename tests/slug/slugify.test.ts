import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug/slugify";

describe("slugify", () => {
  it("folds diacritics, spaces to hyphens, lowercase", () => {
    expect(slugify("Sapatênis São Paulo")).toBe("sapatenis-sao-paulo");
  });

  it("folds diacritics without dropping letters (D-01 'sem acento')", () => {
    expect(slugify("café")).toBe("cafe");
  });

  it("trims leading/trailing hyphens and collapses runs of non-alnum", () => {
    expect(slugify("  --Nike__Air!!  ")).toBe("nike-air");
  });

  it("folds multiple accented vowels/consonants in the same string", () => {
    expect(slugify("Ção Ótimo")).toBe("cao-otimo");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });
});
