/**
 * 이름 뒤 조사를 앞 글자 받침에 맞춰 고른다 — 「평가은(는)」 대신 「평가는」, 「OKR은(는)」 대신 「OKR은」 (PW-1790).
 *
 * 문구 묶음(i18n)은 이름이 무엇일지 모르니 `{{feature}}은(는)` 처럼 두 꼴을 함께 적는다. 이름을 채운
 * **뒤에** `resolveKoreanParticles` 로 문장을 한 번 훑어 괄호 꼴을 한쪽으로 고른다.
 *
 * 읽는 법:
 * - 한글 음절 — 종성으로 판정한다(`(코드 - 0xAC00) % 28`).
 * - 숫자 — 끝 숫자를 한국어로 읽는다(1 일 · 2 이 · 3 삼 … · 0 영/십/백/천). 「1on1은」.
 * - 영문 대문자 약어(4자 이하) — 끝 글자 이름으로 읽는다(L 엘 · M 엠 · N 엔 · R 알). 「OKR은」·「회사B는」.
 * - 그 밖의 영문 낱말 — 흔한 외래어 표기 끝소리로 어림한다(-m·-n·-ng → 받침, -l·-le → ㄹ, 모음 뒤 홑 p·t·k·ck → 받침).
 *   「Zoom은」·「Google은」·「Slack은」·「Figma는」·「Growth는」.
 * - 읽는 법을 모르는 글자(기호 등) — 괄호 꼴을 그대로 둔다. 틀린 쪽을 고르는 것보다 낫다.
 *
 * 이름과 조사 사이의 닫는 따옴표·괄호·`</b>` 는 건너뛴다. 「홍길동(hong@x.com)은(는)」처럼 괄호로 덧붙인
 * 설명은 통째로 건너뛰고 그 앞 이름으로 읽는다.
 *
 * 같은 판정을 백엔드(`backend/src/platform/common/i18n/korean-particle.ts`)와 운영 콘솔
 * (`ops-frontend/src/i18n/koreanParticle.ts`)이 따로 갖는다 — 패키지가 갈려 import 할 수 없다. 읽는 법을 바꾸면 셋을 함께 바꾼다.
 */

const DIGIT_READING = {
  0: 'batchim', // 영 · 십 · 백 · 천 · 만
  1: 'rieul', // 일
  2: 'none', // 이
  3: 'batchim', // 삼
  4: 'none', // 사
  5: 'none', // 오
  6: 'batchim', // 육
  7: 'rieul', // 칠
  8: 'rieul', // 팔
  9: 'none', // 구
};

// 알파벳 이름의 끝소리 — 엘·알은 ㄹ, 엠·엔은 받침, 나머지(에이·비·씨…)는 받침 없음.
const LETTER_READING = { L: 'rieul', R: 'rieul', M: 'batchim', N: 'batchim' };

const CLOSERS = new Set(["'", '"', '’', '”', '»', '」', '』', ']', '>']);

/** 낱말 끝소리 — 'batchim'(ㄹ 아닌 받침) · 'rieul'(ㄹ 받침) · 'none'(받침 없음) · null(모름). */
export function finalSound(word) {
  const s = String(word ?? '');
  const last = s.slice(-1);
  if (!last) return null;
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    if (jong === 0) return 'none';
    return jong === 8 ? 'rieul' : 'batchim';
  }
  if (last >= '0' && last <= '9') return DIGIT_READING[last];
  const latin = /[A-Za-z]+$/.exec(s);
  if (!latin) return null;
  const w = latin[0];
  if (w === w.toUpperCase() && w.length <= 4) return LETTER_READING[w.slice(-1)] ?? 'none';
  const lower = w.toLowerCase();
  if (/(l|le)$/.test(lower)) return 'rieul';
  if (/(m|n|ng|me|ne|ck)$/.test(lower)) return 'batchim';
  if (/[^aeiou][aeiou][ptk]$/.test(lower) || /oo[kpt]$/.test(lower)) return 'batchim';
  return 'none';
}

const PAIRS = {
  '은(는)': ['은', '는'],
  '이(가)': ['이', '가'],
  '을(를)': ['을', '를'],
  '과(와)': ['과', '와'],
};

/** 한 낱말 뒤에 붙일 조사 — `pickParticle('OKR', '은(는)')` → '은'. 모르면 괄호 꼴 그대로. */
export function pickParticle(word, form) {
  const sound = finalSound(word);
  if (sound == null) return form;
  if (form === '(으)로') return sound === 'batchim' ? '으로' : '로';
  const pair = PAIRS[form];
  if (!pair) return form;
  return sound === 'none' ? pair[1] : pair[0];
}

/** 조사 앞의 «읽을 낱말»이 끝나는 자리 — 닫는 따옴표·태그·괄호 덧붙임을 건너뛴다. */
function wordEnd(text, at) {
  let i = at;
  while (i > 0) {
    const ch = text[i - 1];
    if (ch === '>') {
      const open = text.lastIndexOf('<', i - 1);
      if (open < 0) return i;
      i = open;
    } else if (ch === ')') {
      const open = text.lastIndexOf('(', i - 1);
      if (open <= 0) return i;
      i = open;
    } else if (CLOSERS.has(ch)) {
      i -= 1;
    } else {
      return i;
    }
  }
  return i;
}

const FORM_RE = /은\(는\)|이\(가\)|을\(를\)|과\(와\)|\(으\)로/g;

/** 문장 안의 괄호 꼴 조사(은(는)·이(가)·을(를)·과(와)·(으)로)를 바로 앞 낱말에 맞춰 고른다. */
export function resolveKoreanParticles(text) {
  if (typeof text !== 'string' || text.indexOf('(') < 0) return text;
  return text.replace(FORM_RE, (form, offset) => {
    const end = wordEnd(text, offset);
    if (end === 0 || /\s/.test(text[end - 1])) return form;
    return pickParticle(text.slice(0, end), form);
  });
}
