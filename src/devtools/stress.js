/**
 * 라벨 스트레스 — 고정 크기 컨테이너에 들어오는 문자열 길이를 흔든다.
 *
 * 배지·칩·아바타처럼 칸 크기가 고정된 자리는, 시드 데이터로만 보면 늘 짧은 값이
 * 들어와 멀쩡해 보인다. 실제로 길이를 흔드는 원인은 셋이다:
 *   1) 관리자·사용자가 정의하는 값 (등급 라벨, 팀 이름, 직급)
 *   2) 로케일 전환          — `탁월`(2자) ↔ `Exceeds Expectations`(19자)
 *   3) 라벨 해석 실패 폴백  — 원본 enum 키가 그대로 노출 (`exceeds`)
 *
 * 이 모듈은 그 셋을 각각 'long' / 'latin' / 'raw' 모드로 재현한다.
 * 데모 하네스 전용이며 배포 패키지(exports)에는 실리지 않는다.
 */

/** 라벨 스트레스 모드. 'default' 는 원본 값 그대로. */
export const LABEL_MODES = ['default', 'long', 'latin', 'raw'];

const CJK_FILLER = '가나다라마바사아자차카타파하거너더러머버서어저처';
const LATIN_FILLER = 'Alexandrina Featherstonehaugh Worthington';

// 미해석 키가 새어 나온 실제 사고에서 관측된 형태들. 입력값 해시로 하나를 고른다
// — 같은 입력은 늘 같은 코드값이 되어, 화면을 다시 열어도 비교가 가능하다.
const RAW_CODES = [
  'exceeds',
  'in_progress',
  'org_admin',
  'needs_improvement',
  'pending_review',
  'not_started',
  'on_leave',
  'meets_expectations',
];

function hash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * filler 를 seed 만큼 회전시켜 length 글자를 뽑는다.
 *
 * 회전이 필요한 이유: 회전 없이 앞에서부터 자르면 길이가 같은 입력이 전부 **같은
 * 문자열**이 된다. design-page 컴포넌트 중에는 리스트 key 를 표시 문자열로 잡는
 * 것들이 있어서(OkrGroupNode 의 `key={member.name}` 등), 그러면 스위처가 없던
 * 중복 key 를 만들어 낸다 — 도구가 자기가 만든 오류를 보고하게 된다.
 */
function fillFrom(filler, seed, length) {
  const at = seed % filler.length;
  const rotated = filler.slice(at) + filler.slice(0, at);
  let out = rotated;
  while (out.length < length) out += rotated;
  return out.slice(0, length);
}

/**
 * 한 문자열을 스트레스 모드에 맞춰 바꾼다.
 *
 * @param {*} value 원본 값 (문자열이 아니면 그대로 통과)
 * @param {string} mode LABEL_MODES 중 하나
 * @param {{long?: string, latin?: string, raw?: string}} [alt]
 *   그 자리에 실제로 들어올 법한 값이 있으면 여기에 명시한다. 명시된 모드는
 *   일반 변환보다 우선한다 (예: 등급 'S' → long: '기대 이상 달성').
 */
export function stress(value, mode, alt = {}) {
  if (!mode || mode === 'default') return value;
  if (typeof value !== 'string' || value.length === 0) return value;
  if (alt[mode] !== undefined) return alt[mode];

  const seed = hash(value);
  if (mode === 'long') {
    const target = Math.max(12, value.length + 8);
    return (value + fillFrom(CJK_FILLER, seed, target)).slice(0, target);
  }
  if (mode === 'latin') {
    const target = Math.max(10, value.length * 3);
    return fillFrom(LATIN_FILLER, seed, target).trim();
  }
  if (mode === 'raw') {
    return RAW_CODES[seed % RAW_CODES.length];
  }
  return value;
}

/**
 * 자유 입력 문자열용 — 'raw'(미해석 코드값)만 건너뛴다.
 *
 * 사람 이름·조직 이름은 enum 에서 해석되는 값이 아니라 사용자가 직접 적은 값이다.
 * 여기에 `exceeds` 같은 코드값을 꽂으면 재현하는 화면이 실제로는 일어날 수 없는
 * 상황이 된다. 길이만 흔들고 코드값 폴백은 적용하지 않는다.
 */
export function stressText(value, mode, alt = {}) {
  if (mode === 'raw') return value;
  return stress(value, mode, alt);
}

/** 객체의 지정한 키들만 스트레스한다. 나머지 필드는 그대로 둔다. */
export function stressFields(obj, mode, keys, altByKey = {}) {
  if (!mode || mode === 'default' || !obj) return obj;
  const next = { ...obj };
  for (const key of keys) {
    if (next[key] != null) next[key] = stress(next[key], mode, altByKey[key]);
  }
  return next;
}

/** 배열의 각 항목에 stressFields 를 적용한다. */
export function stressList(list, mode, keys, altByKey = {}) {
  if (!mode || mode === 'default' || !Array.isArray(list)) return list;
  return list.map((item) => stressFields(item, mode, keys, altByKey));
}

/**
 * stressList 와 같되, textKeys 에 든 키는 stressText 로 처리한다
 * (자유 입력 문자열 — 'raw' 를 건너뛴다).
 */
export function stressListMixed(list, mode, { codeKeys = [], textKeys = [] }, altByKey = {}) {
  if (!mode || mode === 'default' || !Array.isArray(list)) return list;
  return list.map((item) => {
    const next = stressFields(item, mode, codeKeys, altByKey);
    const out = next === item ? { ...item } : next;
    for (const key of textKeys) {
      if (out[key] != null) out[key] = stressText(out[key], mode, altByKey[key]);
    }
    return out;
  });
}
