import { describe, expect, it } from "vitest";

import { buildLabel, shortSha } from "@/lib/version";

describe("build label", () => {
  it("abbreviates a commit to seven characters", () => {
    expect(shortSha("d4db6fe217d3203b8066591b133b360e86ad7c99")).toBe(
      "d4db6fe",
    );
  });

  it("includes the commit once there is one", () => {
    expect(
      buildLabel("0.5.0", "d4db6fe217d3203b8066591b133b360e86ad7c99"),
    ).toBe("v0.5.0 · d4db6fe");
  });

  // A local dev server has no commit; the label must not trail a separator.
  it("shows the version alone when there is no commit", () => {
    expect(buildLabel("0.5.0", "")).toBe("v0.5.0");
    expect(shortSha("")).toBe("");
  });
});
