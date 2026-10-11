/**
 * PW-1610 §3.3② 「상위 조직장 자동 지정」 — 대상자마다 조직도 위로 올라간 조직장(`leadersAbove`,
 * 서버가 가까운 순으로 준다)을 합친다. 대상자 본인·이미 고른 위원·후보 밖 사람은 뺀다.
 * 위쪽 조직장부터 — 먼저 들어간 사람이 위원장이 되므로 맨 위가 앞에 선다.
 *
 * PW-1686 — 위원회 만들기 창과 사이클 만들기 위자드가 이 함수 하나를 쓴다. 같은 높이끼리는
 * 위원 후보 목록 순서(조직장 먼저·이름순)를 따른다 — 두 화면의 대상자 명단 순서가 달라서,
 * 대상자 순서를 쓰면 같은 대상을 골라도 순서가 갈린다.
 *
 * @param {{ id: string, leadersAbove?: string[] }[]} targets 대상자
 * @param {string[]} candidateIds 위원 후보 id — 목록 순서 그대로
 * @param {Set<string>} pickedIds 이미 고른 위원
 * @returns {string[]} 더할 사람 id, 더할 순서대로
 */
export function autoCommitteeIdsOf(targets, candidateIds, pickedIds) {
  const targetIds = new Set(targets.map((m) => m.id));
  const height = new Map(); // 맨 위에서 몇 칸 아래인가 — 작을수록 위
  for (const m of targets) {
    const chain = m.leadersAbove ?? [];
    chain.forEach((id, i) => {
      const h = chain.length - 1 - i;
      if (!height.has(id) || h < height.get(id)) height.set(id, h);
    });
  }
  return candidateIds
    .map((id, order) => ({ id, order, h: height.get(id) }))
    .filter((c) => c.h !== undefined && !targetIds.has(c.id) && !pickedIds.has(c.id))
    .sort((a, b) => a.h - b.h || a.order - b.order)
    .map((c) => c.id);
}
