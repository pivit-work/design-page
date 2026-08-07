/**
 * 아바타 원 안에 넣을 표시 텍스트.
 *
 * 한글(CJK) 이름은 **이름 전체**를 보인다. 라틴 이니셜 규칙(`slice(0, 2)`)을 그대로
 * 적용하면 '유경민' → '유경' 처럼 성+이름 첫 글자만 잘려 사람 이름으로 읽히지 않는다.
 * 라틴 이름은 기존 규칙 유지 — 'John Doe' → 'JD', 'kurt' → 'KU'.
 */
const CJK_RE = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿]/;

/** 원 밖으로 흘러나오지 않도록 표시 글자 수 상한. */
export const MAX_NAME_CHARS = 4;

export function isCjkName(name) {
  return CJK_RE.test(name || '');
}

export function nameInitials(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  if (isCjkName(trimmed)) return trimmed.replace(/\s+/g, '').slice(0, MAX_NAME_CHARS);
  const words = trimmed.split(/[\s/-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

/** 지름 size 인 원 안에 들어가도록 폰트 크기를 맞춘다(짧은 값은 기본 크기 유지). */
export function nameFontSize(text, size, ratio = 0.32) {
  const base = Math.max(8, Math.round(size * ratio));
  if (!text) return base;
  const widthPerFontPx = [...text].reduce(
    (sum, ch) => sum + (CJK_RE.test(ch) ? 1 : 0.62),
    0,
  );
  const fitted = Math.floor((size * 0.86) / widthPerFontPx);
  return Math.max(8, Math.min(base, fitted));
}
