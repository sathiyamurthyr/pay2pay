/**
 * Pay2Pay High-Performance BlurHash Engine for Sales Portal
 */

const DIGITS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

export const decodeBase83 = (str: string): number => {
  let value = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str[i];
    const digit = DIGITS.indexOf(code);
    if (digit === -1) return 0;
    value = value * 83 + digit;
  }
  return value;
};

export const encodeBase83 = (n: number, length: number): string => {
  let result = "";
  for (let i = 1; i <= length; i++) {
    const digit = Math.floor(n / Math.pow(83, length - i)) % 83;
    result += DIGITS[digit];
  }
  return result;
};

const srgbToLinear = (value: number): number => {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const linearToSrgb = (value: number): number => {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308
    ? Math.round(v * 12.92 * 255)
    : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
};

const signPow = (val: number, exp: number): number => {
  return Math.sign(val) * Math.pow(Math.abs(val), exp);
};

export function decodeBlurHash(
  blurHash: string,
  width: number,
  height: number,
  punch: number = 1
): Uint8ClampedArray | null {
  if (!blurHash || blurHash.length < 6) return null;

  try {
    const sizeFlag = decodeBase83(blurHash[0]);
    const numY = Math.floor(sizeFlag / 9) + 1;
    const numX = (sizeFlag % 9) + 1;

    const quantisedMaxAc = decodeBase83(blurHash[1]);
    const maxValue = (quantisedMaxAc + 1) / 166;

    const colors: Array<[number, number, number]> = new Array(numX * numY);

    for (let i = 0; i < colors.length; i++) {
      if (i === 0) {
        const value = decodeBase83(blurHash.substring(2, 6));
        colors[i] = [
          srgbToLinear((value >> 16) & 255),
          srgbToLinear((value >> 8) & 255),
          srgbToLinear(value & 255),
        ];
      } else {
        const value = decodeBase83(
          blurHash.substring(4 + i * 2, 4 + i * 2 + 2)
        );
        const r = Math.floor(value / (19 * 19));
        const g = Math.floor(value / 19) % 19;
        const b = value % 19;

        colors[i] = [
          signPow((r - 9) / 9, 2.0) * maxValue * punch,
          signPow((g - 9) / 9, 2.0) * maxValue * punch,
          signPow((b - 9) / 9, 2.0) * maxValue * punch,
        ];
      }
    }

    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;

        for (let j = 0; j < numY; j++) {
          for (let i = 0; i < numX; i++) {
            const basis =
              Math.cos((Math.PI * x * i) / width) *
              Math.cos((Math.PI * y * j) / height);
            const color = colors[i + j * numX];
            r += color[0] * basis;
            g += color[1] * basis;
            b += color[2] * basis;
          }
        }

        const pixelIndex = (y * width + x) * 4;
        pixels[pixelIndex] = linearToSrgb(r);
        pixels[pixelIndex + 1] = linearToSrgb(g);
        pixels[pixelIndex + 2] = linearToSrgb(b);
        pixels[pixelIndex + 3] = 255;
      }
    }

    return pixels;
  } catch (e) {
    return null;
  }
}

export const KNOWN_BLURHASHES: Record<string, string> = {
  LOGO: "LOAmA2az0*jss,ayR-jsRga|n}fQ",
  AVATAR: "Lo4pe4fQaEf6fQfQayf6aEayfnfQ",
  AADHAAR: "LUQ]sToMj[ofh1a|f6aze.fQa|f6",
  AADHAAR_PLACEHOLDER: "LUQ]sToMj[ofh1a|f6aze.fQa|f6",
  PAN_CARD: "LQOp}:a%j@t70AfQj@azRSj@j@ay",
  SHOP_PHOTO: "LW1%$ffQZRfQfQfQayfQY;ayf*ay",
  DOCUMENT_DEFAULT: "LUQ]sToMj[ofh1a|f6aze.fQa|f6",
  DARK_GRADIENT: "L02$nLof00ay_3ayfQfQ00ay_3ay",
};

export function resolveBlurHash(hintOrUrl?: string, defaultHash: string = KNOWN_BLURHASHES.DARK_GRADIENT): string {
  if (!hintOrUrl) return defaultHash;
  const lower = hintOrUrl.toLowerCase();
  if (hintOrUrl.length >= 6 && hintOrUrl.length <= 40 && !hintOrUrl.includes("/") && !hintOrUrl.includes(".")) {
    return hintOrUrl;
  }
  if (lower.includes("logo") || lower.includes("pay2pay")) return KNOWN_BLURHASHES.LOGO;
  if (lower.includes("aadhaar") || lower.includes("adhar")) return KNOWN_BLURHASHES.AADHAAR;
  if (lower.includes("pan")) return KNOWN_BLURHASHES.PAN_CARD;
  if (lower.includes("shop") || lower.includes("store")) return KNOWN_BLURHASHES.SHOP_PHOTO;
  if (lower.includes("avatar") || lower.includes("selfie") || lower.includes("user")) return KNOWN_BLURHASHES.AVATAR;
  return defaultHash;
}
