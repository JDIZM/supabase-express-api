import { describe, expect, it } from "vitest";

import { camelCase, capitalize, pascalCase, titleCase } from "./strings.ts";

describe("camelCase", () => {
  it("should convert a string to camelCase", () => {
    expect(camelCase("this is a string")).toBe("thisIsAString");
  });
});

describe("capitalize", () => {
  it("should capitalize the first letter of a string", () => {
    expect(capitalize("this is a string")).toBe("This is a string");
  });
});

describe("pascalCase", () => {
  it("should convert a string to PascalCase", () => {
    expect(pascalCase("this is a string")).toBe("ThisIsAString");
  });
});

describe("titleCase", () => {
  it("should convert a string to Title Case", () => {
    expect(titleCase("this is a string")).toBe("This Is A String");
  });
});
