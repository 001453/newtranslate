import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildMeetingDeepLink,
  extractKeetRoomLabel,
  isKeetInvite,
  normalizeKeetInvite,
  parseMeetingDeepLink,
} from "./keet";

test("normalizeKeetInvite adds keet:// prefix to raw key", () => {
  const key = "abcdefghijklmnopqrstuvwxyz123456";
  assert.equal(normalizeKeetInvite(key), `keet://${key}`);
});

test("normalizeKeetInvite preserves keet:// links", () => {
  assert.equal(normalizeKeetInvite("keet://room-abc"), "keet://room-abc");
});

test("normalizeKeetInvite preserves pear:// links", () => {
  assert.equal(normalizeKeetInvite("pear://keet/room-abc"), "pear://keet/room-abc");
});

test("isKeetInvite accepts keet and pear schemes", () => {
  assert.equal(isKeetInvite("keet://x"), true);
  assert.equal(isKeetInvite("pear://keet/x"), true);
  assert.equal(isKeetInvite("https://youtube.com/watch?v=1"), false);
});

test("extractKeetRoomLabel shortens long keys", () => {
  const label = extractKeetRoomLabel("keet://abcdefghijklmnopqrstuvwxyz1234567890");
  assert.match(label, /^abcdefgh…/);
});

test("parseMeetingDeepLink reads invite and languages", () => {
  const p = parseMeetingDeepLink("invite=keet%3A%2F%2Froom1&from=tr&to=en-US");
  assert.equal(p.invite, "keet://room1");
  assert.equal(p.myLang, "tr");
  assert.equal(p.otherLang, "en");
});

test("buildMeetingDeepLink encodes params", () => {
  const url = buildMeetingDeepLink({
    invite: "keet://room1",
    myLang: "tr",
    otherLang: "en",
    origin: "https://example.com",
  });
  assert.equal(url, "https://example.com/meeting?invite=keet%3A%2F%2Froom1&from=tr&to=en");
});
