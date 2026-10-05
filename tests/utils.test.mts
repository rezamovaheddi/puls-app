import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { cn } from "../src/lib/utils.ts";

describe("cn", () => {
  it("joins class names", () => {
    assert.equal(cn("a", "b"), "a b");
  });

  it("resolves tailwind conflicts toward the last class", () => {
    assert.equal(cn("px-2", "px-4"), "px-4");
  });

  it("drops falsy inputs", () => {
    assert.equal(cn("a", false && "x", undefined, "b"), "a b");
  });
});
