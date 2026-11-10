/**
 * 등급 딱지 색. PW-2684 — 딱지 뜻 표(statusBadgeTones «성공 = 충족»)를 따라 가운데 등급(충족)까지는 초록,
 * 맨 아래 등급은 빨강, 그 사이(가운데보다 아래)는 파랑. 등급이 셋이면 탁월·충족 초록 · 미흡 빨강.
 */
export function gradeTone(gradeKey, orderedGrades) {
  if (!gradeKey || !orderedGrades?.length) return 'muted';
  const idx = orderedGrades.findIndex((g) => g.gradeKey === gradeKey);
  if (idx < 0) return 'muted';
  const last = orderedGrades.length - 1;
  if (idx === last && last > 0) return 'red';
  if (idx <= Math.floor(last / 2)) return 'green';
  return 'accent';
}
