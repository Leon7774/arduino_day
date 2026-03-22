// utils/name-formatter.test.ts
import { expect, test } from "vitest";
import { formatYearbookName } from "./nameFormatter";

test("capitalizes the first letter of standard lowercase names", () => {
  const result = formatYearbookName("john", "doe");
  expect(result).toBe("John Doe");
});

test("fixes chaotic, alternating capitalization", () => {
  const result = formatYearbookName("jAnE", "sMiTh");
  expect(result).toBe("Jane Smith");
});
