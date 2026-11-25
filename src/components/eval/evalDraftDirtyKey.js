/**
 * PW-3175 · HR §5.1-A-5 · §5.10-E J-10 — 위자드 초안의 «저장 이후 바뀐 것이 있나»를 값으로 견줄 열쇠.
 *
 * 저장본(`collectDraft()` 결과 또는 서버가 돌려준 원문)을 그대로 JSON 으로 견주면 세 가지가 «변경»으로 잡혔다.
 *  ① 서버가 돌려준 초안은 칸 순서가 다르다(jsonb 는 열쇠를 다시 정렬한다) — 이어 열자마자 «저장 안 된 변경».
 *  ② [이 유형 편집]으로 유형만 옮겨도 «지금 보고 있는 유형»(`tplType`·`tplRound`)과 편집 칸·내려 둔 칸의 자리가
 *     바뀐다. 유형 전환은 편집 칸을 그 유형 내용으로 채울 뿐 내용 변경이 아니다(J-10).
 *  ③ 「대상 N명」(`targetCount`)은 입력이 아니라 요약이라 후보가 늦게 와도 바뀐다.
 *
 * 그래서 템플릿 편집 칸을 «칸 열쇠(`self` · `leader` · `leader_2` …) → 내용» 한 표로 모으고,
 * 그 칸의 기본 내용(확정 템플릿 또는 프리셋 — 처음 열면 채워지는 것)과 같은 칸은 뺀다. 열쇠는 정렬해 적는다.
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
const slotContent = (b) => ({
  name: b?.name ?? '',
  version: b?.version ?? 'standard',
  questions: b?.questions ?? [],
  grades: b?.grades ?? null,
  absolute: !!b?.absolute,
  ratioScope: b?.ratioScope || 'div',
});

/**
 * @param {object|null} draft  `collectDraft()` 모양의 초안(서버 원문도 같은 모양)
 * @param {(slotKey: string, version: string) => object|null} defaultSlotOf  그 칸을 처음 열 때 채워지는 내용
 *   (`version` 은 그 초안의 편집 칸 버전 — 프리셋을 만들 때 쓴다). 없으면 null
 * @returns {string|null}
 */
export function draftDirtyKey(draft, defaultSlotOf) {
  if (!draft || typeof draft !== 'object') return null;
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
  // 내려 둔 유형 칸 — 하향이면 1차 공유 칸이다.
  for (const [type, b] of Object.entries(tplTypeBuffers ?? {})) {
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

  const edited = {};
  for (const [key, b] of Object.entries(slots)) {
    const mine = stableStringify(slotContent(b));
    const base = defaultSlotOf ? defaultSlotOf(key, tplVersion ?? 'standard') : null;
    if (base && stableStringify(slotContent(base)) === mine) continue;
    edited[key] = slotContent(b);
  }

  return stableStringify({ ...rest, tplSlots: edited });
}
