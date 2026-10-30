// 간트의 빈 상태 판정 (pivit-work PW-2403 · 피드 정책 §9 빈 상태).
// - 날짜 안내 «이 날은 기록이 없습니다»: 고른 날짜에 화면의 사람 누구에게도 그릴 블록(스니핏·회의·일정)이 없다.
// - 팀 안내 «아직 이 팀의 기록이 없습니다»: 그룹 안 사람 모두가 받아 둔 기록(snippets·meetings 전체)에 하나도 없다.
// 두 문구는 같은 화면에 함께 뜨지 않는다 — 날이 비었으면 날짜 안내만(막 가입한 회사의 처음 며칠도 이쪽),
// 날에 기록이 있으면 기록 없는 그룹에만 팀 안내.
// NameColumn·TimelineGrid 가 같은 결과로 줄을 넣어야 좌우 높이가 맞아서, 판정은 이 함수 하나에 둔다.
export function ganttEmptyState({ groups, members, snippets, meetings, targetDate }) {
  const memberIds = new Set((members ?? []).map((m) => m.id));
  const rowIds = new Set();
  (groups ?? []).forEach((g) => g.memberIds.forEach((id) => memberIds.has(id) && rowIds.add(id)));
  const none = { dayEmpty: false, teamEmptyGroupIds: new Set() };
  if (rowIds.size === 0) return none;

  // TimelineGrid 가 그리는 조건과 같다 — 작성 시각이 없는 스니핏은 칸에 안 보인다.
  const drawnOnDay =
    (snippets ?? []).some(
      (s) => s.date === targetDate && typeof s.hour === 'number' && rowIds.has(s.memberId),
    ) ||
    (meetings ?? []).some(
      (mt) => mt.date === targetDate && (mt.participants ?? []).some((pid) => rowIds.has(pid)),
    );

  const withRecord = new Set();
  (snippets ?? []).forEach((s) => withRecord.add(s.memberId));
  (meetings ?? []).forEach((mt) => (mt.participants ?? []).forEach((pid) => withRecord.add(pid)));

  const noRecord = (groups ?? []).filter(
    (g) => g.memberIds.some((id) => memberIds.has(id)) &&
      !g.memberIds.some((id) => memberIds.has(id) && withRecord.has(id)),
  );
  const teamEmptyGroupIds = new Set(noRecord.map((g) => g.id));

  if (!drawnOnDay) return { dayEmpty: true, teamEmptyGroupIds: new Set() };
  return { dayEmpty: false, teamEmptyGroupIds };
}
