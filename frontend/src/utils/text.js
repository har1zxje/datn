const BROKEN_UTF8_PATTERN =
  /(?:Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]|Ä[\u0080-\u00BF]|Ð[\u0080-\u00BF]|ðŸ|�|áº|á»|á¼|á½|á¾|á¿|â€|â€™|â€œ|â€)/;
const BROKEN_UTF8_PATTERN_GLOBAL = new RegExp(BROKEN_UTF8_PATTERN.source, 'g');
const UTF8_DECODER = new TextDecoder('utf-8');

const decodeMojibake = (value) => {
  const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
  return UTF8_DECODER.decode(bytes);
};

const textQualityScore = (value = '') => {
  const brokenCount = (value.match(BROKEN_UTF8_PATTERN_GLOBAL) || []).length;
  const replacementCount = (value.match(/�/g) || []).length;
  const vietnameseCount = (value.match(/[À-ỹ]/g) || []).length;
  return vietnameseCount - brokenCount * 3 - replacementCount * 4;
};

export const repairVietnameseText = (value) => {
  if (typeof value !== 'string' || !value) return value;

  let current = value;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!BROKEN_UTF8_PATTERN.test(current)) break;

    try {
      const decoded = decodeMojibake(current);
      if (!decoded || decoded === current) break;
      if (textQualityScore(decoded) < textQualityScore(current)) break;
      current = decoded;
    } catch {
      break;
    }
  }

  return current;
};

export const safeText = (value, fallback = '') => {
  const normalized = repairVietnameseText(String(value ?? '').trim());
  return normalized || fallback;
};
