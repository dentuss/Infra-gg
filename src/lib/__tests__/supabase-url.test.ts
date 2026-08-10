import { describe, expect, it } from "vitest";

import { isBareOrigin } from "@/lib/supabase-url";

describe("validating a Supabase project URL", () => {
  it("accepts a bare origin, with or without a trailing slash", () => {
    expect(isBareOrigin("https://abc.supabase.co")).toBe(true);
    expect(isBareOrigin("https://abc.supabase.co/")).toBe(true);
    expect(isBareOrigin("http://localhost:54321")).toBe(true);
  });

  // The one that broke staging: the client appends its own /auth/v1 to this,
  // producing /rest/v1/auth/v1/token and a bare 404.
  it("rejects the REST endpoint", () => {
    expect(isBareOrigin("https://abc.supabase.co/rest/v1")).toBe(false);
    expect(isBareOrigin("https://abc.supabase.co/rest/v1/")).toBe(false);
  });

  it("rejects other paths, queries and fragments", () => {
    expect(isBareOrigin("https://abc.supabase.co/auth/v1")).toBe(false);
    expect(isBareOrigin("https://abc.supabase.co/storage/v1")).toBe(false);
    expect(isBareOrigin("https://abc.supabase.co?apikey=x")).toBe(false);
    expect(isBareOrigin("https://abc.supabase.co#frag")).toBe(false);
  });

  it("rejects anything that is not a URL", () => {
    expect(isBareOrigin("")).toBe(false);
    expect(isBareOrigin("abc.supabase.co")).toBe(false);
    expect(isBareOrigin("not a url")).toBe(false);
  });
});
