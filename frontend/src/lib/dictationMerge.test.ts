import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeDictationChunk } from "./dictationMerge";

test("empty prev returns cleaned next", () => {
  assert.equal(mergeDictationChunk("", "  hello world  "), "hello world");
});

test("empty next returns empty", () => {
  assert.equal(mergeDictationChunk("hello", ""), "");
});

test("deduplicates when next is suffix of prev", () => {
  assert.equal(mergeDictationChunk("hello world", "world"), "");
});

test("merges overlapping words", () => {
  assert.equal(
    mergeDictationChunk("the quick brown", "brown fox jumps"),
    "fox jumps",
  );
});

test("returns full next when no overlap", () => {
  assert.equal(mergeDictationChunk("hello there", "goodbye now"), "goodbye now");
});
