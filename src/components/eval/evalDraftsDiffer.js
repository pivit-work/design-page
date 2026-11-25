/**
 * PW-3175 · HR §5.1-A-5 · §5.10-E J-10 — 위자드 초안 둘이 «내용으로» 다른가.
 *
 * 저장본(`collectDraft()` 결과 또는 서버가 돌려준 원문)을 그대로 JSON 으로 견주면 세 가지가 «변경»으로 잡혔다.
 *  ① 서버가 돌려준 초안은 칸 순서가 다르다(jsonb 는 열쇠를 다시 정렬한다) — 이어 열자마자 «저장 안 된 변경».
 *  ② [이 유형 편집]으로 유형만 옮겨도 «지금 보고 있는 유형»(`tplType`·`tplRound`)과 편집 칸·내려 둔 칸의 자리가
 *     바뀐다. 유형 전환은 편집 칸을 그 유형 내용으로 채울 뿐 내용 변경이 아니다(J-10).
 *  ③ 「대상 N명」(`targetCount`)은 입력이 아니라 요약이라 후보가 늦게 와도 바뀐다.
 *
 * 그래서 템플릿 편집 칸을 «칸 열쇠(`self` · `leader` · `leader_2` …) → 내용» 한 표로 모아 짝으로 견준다.
 * 칸이 한쪽에만 있으면(그쪽에서 아직 열지 않은 칸) 그쪽이 그 칸을 열 때 받을 내용 — 확정 템플릿, 없으면
 * **그쪽 편집 칸 버전**의 프리셋 — 과 견준다. 한쪽씩 «기본과 같으면 뺀다»로 하면 버전이 섞인 초안에서
 * 버전만 바꾼 것을 놓치거나 유형만 옮긴 것을 변경으로 센다(2회차 리뷰).
 */
import { leaderPhaseId } from './evalLeaderRounds.js';

/** 열쇠를 정렬해 적는 JSON — 칸 순서가 달라도 같은 값이면 같은 글이 된다. `undefined` 칸은 빠진다. */
export function stableStringify(value) {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.keys(v)
        .sort()
        .reduce((acc, k) => {
          acc[k] = v[k];
          return acc;
        }, {});
    }
    return v;
  });
}

/** 편집 칸에서 «내용»만 — 출처(`loadedFrom`)·확정 id 같은 꼬리표는 내용이 아니다. */
const slotContent = (b) =>
  stableStringify({
    name: b?.name ?? '',
    version: b?.version ?? 'standard',
    questions: b?.questions ?? [],
    grades: b?.grades ?? null,
    absolute: !!b?.absolute,
    ratioScope: b?.ratioScope || 'div',
  });

/** 초안을 «템플릿 칸 표 + 나머지»로 나눈다. */
function splitDraft(draft) {
  const {
    tplType,
    tplRound,
    tplName,
    tplVersion,
    tplQuestions,
    tplGrades,
    tplAbsolute,
    tplRatioScope,
    tplTypeBuffers,
    tplRoundBuffers,
    targetCount: _targetCount,
    ...rest
  } = draft;
  const slots = {};
  const templateMap = rest.templateMap ?? {};
  // 내려 둔 유형 칸 — 하향이면 1차 공유 칸이다.
  // 내려 둔 뒤 그 유형의 확정이 바뀌었으면 [이 유형 편집]이 그 칸을 버리고 새 확정본을 연다
  // (`EvalCycleWizard.jsx` `parkedTypeBuffer` · J-10) — 비교에서도 «아직 안 연 칸»으로 본다.
  // 안 그러면 하향을 편집하다 셀프 템플릿을 고르고 저장한 초안이 셀프를 열자마자 «바뀜»이 된다(11-25 dev 되돌림).
  for (const [type, b] of Object.entries(tplTypeBuffers ?? {})) {
    if ((b?.confirmedId || '') !== (templateMap[type] || '')) continue;
    slots[type === 'leader' ? leaderPhaseId(1) : type] = b;
  }
  // 내려 둔 하향 차수 칸.
  for (const [k, b] of Object.entries(tplRoundBuffers ?? {})) {
    slots[leaderPhaseId(Number(k))] = b;
  }
  // 지금 편집 칸.
  if (tplType) {
    const liveKey = tplType === 'leader' ? leaderPhaseId(Number(tplRound) || 1) : tplType;
    slots[liveKey] = {
      name: tplName,
      version: tplVersion,
      questions: tplQuestions,
      grades: tplGrades,
      absolute: tplAbsolute,
      ratioScope: tplRatioScope,
    };
  }
  return { rest: stableStringify(rest), slots, version: tplVersion ?? 'standard' };
}

/**
 * @param {object|null} a
 * @param {object|null} b  둘 다 `collectDraft()` 모양(서버 원문도 같은 모양)
 * @param {(slotKey: string, version: string) => object|null} defaultSlotOf  그 칸을 처음 열 때 채워지는 내용
 *   (`version` 은 그 초안의 편집 칸 버전 — 프리셋을 만들 때 쓴다). 없으면 null
 * @returns {boolean} 내용이 다르면 true. 한쪽만 없으면 true, 둘 다 없으면 false.
 */
export function draftsDiffer(a, b, defaultSlotOf) {
  const okA = !!a && typeof a === 'object';
  const okB = !!b && typeof b === 'object';
  if (!okA || !okB) return okA !== okB;
  const A = splitDraft(a);
  const B = splitDraft(b);
  if (A.rest !== B.rest) return true;
  const keys = new Set([...Object.keys(A.slots), ...Object.keys(B.slots)]);
  const contentOf = (side, key) => {
    const own = side.slots[key];
    if (own) return slotContent(own);
    const base = defaultSlotOf ? defaultSlotOf(key, side.version) : null;
    return base ? slotContent(base) : null;
  };
  for (const key of keys) {
    const ca = contentOf(A, key);
    const cb = contentOf(B, key);
    if (ca === null || ca !== cb) return true;
  }
  return false;
}
