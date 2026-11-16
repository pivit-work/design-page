/**
 * [pivit-work PW-2784 · spec-calibration §20.1 «겸직한 대상자» 행] 캘리브레이션 표 「하향 등급」 칸 아래의 작은 줄
 * «겸직 {겸직 조직} · {겸직 쪽 조직장}: {등급}» — 겸직 단위마다 한 줄. 열은 늘리지 않는다(David 직접 답 2026-11-16 답 7).
 *
 * `grades` = 서버 행의 `concurrentLeaderGrades` (`{ unitId, unitName, leaderName, gradeKey, gradeLabel, submitted }[]`).
 * 아직 안 낸 칸은 등급 자리에 «미제출»(하향 등급 칸의 «미제출»과 같은 낱말 · pivit-work PW-2737).
 * 등급은 서버가 준 이름(`gradeLabel`)만 쓴다 — 등급 키를 보이지 않는다.
 *
 * 돌려주는 줄: `{ key, head, grade, gradeKey, pending, text }`.
 */
const DEFAULTS = {
  cwLeaderGradePending: '미제출',
  cwConcurrentLeaderHead: '겸직 {unit} · {leader}',
  cwConcurrentLeaderHeadNoUnit: '겸직 · {leader}',
  cwConcurrentLeaderLine: '{head}: {grade}',
};

function fill(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function concurrentLeaderLines(grades, labels) {
  if (!Array.isArray(grades) || grades.length === 0) return [];
  const L = { ...DEFAULTS, ...(labels || {}) };
  return grades.map((g, i) => {
    const head = g.unitName
      ? fill(L.cwConcurrentLeaderHead, { unit: g.unitName, leader: g.leaderName ?? '' })
      : fill(L.cwConcurrentLeaderHeadNoUnit, { leader: g.leaderName ?? '' });
    const pending = !g.gradeLabel;
    const grade = pending ? L.cwLeaderGradePending : g.gradeLabel;
    return {
      key: g.unitId ?? String(i),
      head,
      grade,
      gradeKey: pending ? null : (g.gradeKey ?? null),
      pending,
      text: fill(L.cwConcurrentLeaderLine, { head, grade }),
    };
  });
}
