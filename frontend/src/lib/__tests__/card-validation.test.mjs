import test from "node:test";
import assert from "node:assert/strict";
import {
  formatCardInputDisplay,
  isValidIndianMobile,
  luhnCheck,
  maskCardPreview,
  normalizeIndianMobile,
  ordinalDay,
} from "../card-validation.ts";

test("isValidIndianMobile validates 10-digit Indian mobile numbers", () => {
  assert.equal(isValidIndianMobile("9876543210"), true);
  assert.equal(isValidIndianMobile("+91 9876543210"), true);
  assert.equal(isValidIndianMobile("09876543210"), true);
  assert.equal(isValidIndianMobile("1234567890"), false);
  assert.equal(isValidIndianMobile("98765"), false);
  assert.equal(normalizeIndianMobile("+91 98765-43210"), "9876543210");
});

test("luhnCheck validates credit card checksums", () => {
  assert.equal(luhnCheck("4111 1111 1111 1111"), true);
  assert.equal(luhnCheck("4242424242424242"), true);
  assert.equal(luhnCheck("4111111111111112"), false);
  assert.equal(luhnCheck("12345"), false);
});

test("maskCardPreview and formatCardInputDisplay format securely", () => {
  assert.equal(maskCardPreview("4111111111111234"), "XXXX-XXXX-XXXX-1234");
  assert.equal(maskCardPreview("378282246310005"), "XXXX-XXXXXX-X0005");
  assert.equal(formatCardInputDisplay("4111111111111111"), "4111 1111 1111 1111");
  assert.equal(ordinalDay(1), "1st");
  assert.equal(ordinalDay(2), "2nd");
  assert.equal(ordinalDay(3), "3rd");
  assert.equal(ordinalDay(28), "28th");
});
