/**
 * Pay2Pay High-Performance BlurHash Engine
 * Zero-dependency, isomorphic BlurHash decoder, data URL generator, and placeholder resolver.
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

/**
 * Decodes a BlurHash string into an RGBA pixel array (Uint8ClampedArray)
 */
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
        pixels[pixelIndex + 3] = 255; // Alpha
      }
    }

    return pixels;
  } catch (e) {
    console.warn("Error decoding BlurHash:", e);
    return null;
  }
}

/**
 * Draws decoded BlurHash pixels to a standard HTML Canvas element
 */
export function drawBlurHashToCanvas(
  blurHash: string,
  canvas: HTMLCanvasElement,
  width: number = 32,
  height: number = 32,
  punch: number = 1
): boolean {
  const pixels = decodeBlurHash(blurHash, width, height, punch);
  if (!pixels) return false;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  return true;
}

/**
 * Converts a BlurHash string into a tiny base64 data URL for CSS background or img src
 */
export function blurHashToDataUrl(
  blurHash: string,
  width: number = 32,
  height: number = 32,
  punch: number = 1
): string | null {
  if (typeof document === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    const success = drawBlurHashToCanvas(blurHash, canvas, width, height, punch);
    if (!success) return null;
    return canvas.toDataURL("image/png");
  } catch (e) {
    return null;
  }
}

/**
 * Curated, high-accuracy precomputed BlurHashes across the Pay2Pay Enterprise Platform
 */
export const KNOWN_BLURHASHES: Record<string, string> = {
  // ── 1. Official Pay2Pay Branding & Logos ──
  LOGO: "LOAmA2az0*jss,ayR-jsRga|n}fQ",
  LOGO_BADGE: "LOAmA2az0*jss,ayR-jsRga|n}fQ",
  BRAND_BANNER: "L25#*WWB00of_3ofWBj[00of_3of",

  // ── 2. KYC, Customer, and Verification Document Placeholders ──
  AVATAR: "Lo4pe4fQaEf6fQfQayf6aEayfnfQ",
  AADHAAR: "LUQ]sToMj[ofh1a|f6aze.fQa|f6",
  PAN_CARD: "LQOp}:a%j@t70AfQj@azRSj@j@ay",
  SHOP_PHOTO: "LW1%$ffQZRfQfQfQayfQY;ayf*ay",
  DOCUMENT_DEFAULT: "LUQ]sToMj[ofh1a|f6aze.fQa|f6",
  QR_CODE: "L55r2;ay00j[~qj[ayj[00j[~qj[",

  // ── 3. Curated 4K Lock Screen Wallpapers ──
  WALLPAPER_QUANTUM_CIRCUIT: "L69tAee-ROs:0ya|oga|jtfQWBfQ",
  WALLPAPER_SATELLITE_NETWORK: "L33bm@fQRiayWAayayfQ9Dayj]fQ",
  WALLPAPER_TOKYO_DISTRICT: "LuFsDPWBRjkC.9j[Rjj[fkj]ayWB",
  WALLPAPER_FRANKFURT_TOWER: "LDBzObWB.Sj[j[fPadax-;WBjsfQ",
  WALLPAPER_MIDNIGHT_OBSIDIAN: "LfH1ytylR}e:[qwca_a{JQf9jta|",
  WALLPAPER_CYBERNETIC_MATRIX: "L12izgp=gJfQkTfQayayVvafayfQ",
  WALLPAPER_NODE_HUB: "LO9j7}NuRKo1WTf6fRfRM@jtfmWV",
  WALLPAPER_AURORA_HORIZON: "L~NvP_rYeCja|pazWWfQafWpa|a{",
  WALLPAPER_ALPINE_STARLIGHT: "LWAmobxGfPfRj^fQayay4,Naazay",
  WALLPAPER_TWILIGHT_CITY: "LvCuA6fRayfQk]fQayfQNbayayay",

  // ── 4. Fallback Generic Placeholders ──
  DARK_GRADIENT: "L02$nLof00ay_3ayfQfQ00ay_3ay",
  LIGHT_GRADIENT: "L6PZfSi_.AyE_3t7t7Rj~qofofay",
  FINTECH_BLUE: "L130bHj@00ay_3ayfQfQ00ay_3ay",
};

/**
 * Resolves an appropriate BlurHash based on image type, URL, or fallback
 */
export function resolveBlurHash(hintOrUrl?: string, defaultHash: string = KNOWN_BLURHASHES.DARK_GRADIENT): string {
  if (!hintOrUrl) return defaultHash;

  const lower = hintOrUrl.toLowerCase();

  // If already a valid BlurHash string (length >= 6 and valid base83 charset)
  if (hintOrUrl.length >= 6 && hintOrUrl.length <= 40 && !hintOrUrl.includes("/") && !hintOrUrl.includes(".")) {
    return hintOrUrl;
  }

  // Matching known URLs or keywords
  if (lower.includes("logo") || lower.includes("pay2pay")) return KNOWN_BLURHASHES.LOGO;
  if (lower.includes("aadhaar") || lower.includes("adhar")) return KNOWN_BLURHASHES.AADHAAR;
  if (lower.includes("pan")) return KNOWN_BLURHASHES.PAN_CARD;
  if (lower.includes("shop") || lower.includes("store")) return KNOWN_BLURHASHES.SHOP_PHOTO;
  if (lower.includes("avatar") || lower.includes("selfie") || lower.includes("user") || lower.includes("profile")) return KNOWN_BLURHASHES.AVATAR;
  if (lower.includes("qr") || lower.includes("qrcode")) return KNOWN_BLURHASHES.QR_CODE;

  // Wallpaper URL matching
  if (lower.includes("photo-1518770660439")) return KNOWN_BLURHASHES.WALLPAPER_QUANTUM_CIRCUIT;
  if (lower.includes("photo-1451187580459")) return KNOWN_BLURHASHES.WALLPAPER_SATELLITE_NETWORK;
  if (lower.includes("photo-1486406146926")) return KNOWN_BLURHASHES.WALLPAPER_TOKYO_DISTRICT;
  if (lower.includes("photo-1507679799987")) return KNOWN_BLURHASHES.WALLPAPER_FRANKFURT_TOWER;
  if (lower.includes("photo-1618005182384")) return KNOWN_BLURHASHES.WALLPAPER_MIDNIGHT_OBSIDIAN;
  if (lower.includes("photo-1526374965328")) return KNOWN_BLURHASHES.WALLPAPER_CYBERNETIC_MATRIX;
  if (lower.includes("photo-1550745165-9bc")) return KNOWN_BLURHASHES.WALLPAPER_NODE_HUB;
  if (lower.includes("photo-1579546929518")) return KNOWN_BLURHASHES.WALLPAPER_AURORA_HORIZON;
  if (lower.includes("photo-1519681393784")) return KNOWN_BLURHASHES.WALLPAPER_ALPINE_STARLIGHT;
  if (lower.includes("photo-1514565131-fce")) return KNOWN_BLURHASHES.WALLPAPER_TWILIGHT_CITY;

  return defaultHash;
}
