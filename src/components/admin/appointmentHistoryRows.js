/**
 * 발령 이력 줄을 만든다 — 대량 발령 한 번(같은 묶음 id·같은 유형)을 «전체 N명» 한 줄로 접는다
 * (org-snapshot-spec §4). 묶음 id 가 없는 옛 기록과 한 명짜리 묶음은 사람 줄 그대로다.
 * 접은 줄은 맨 앞 기록의 자리에 놓이고 `members` 에 사람 기록을 담는다.
 */
export function groupHistoryRows(records, labels) {
  const byKey = new Map();
  for (const r of records) {
    if (r.mode !== 'bulk' || !r.batchId) continue;
    const key = `${r.batchId}|${r.typeKey ?? ''}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }
  const placed = new Set();
  const out = [];
  for (const r of records) {
    const key = r.mode === 'bulk' && r.batchId ? `${r.batchId}|${r.typeKey ?? ''}` : null;
    const members = key ? byKey.get(key) : null;
    if (!members || members.length < 2) { out.push(r); continue; }
    if (placed.has(key)) continue;
    placed.add(key);
    const reasons = new Set(members.map((m) => m.reason || ''));
    out.push({
      ...r,
      id: `batch:${key}`,
      name: String(labels?.historyBulkAll ?? '').replace('{count}', String(members.length)),
      members,
      // 사유가 사람마다 다르면 묶음 줄에는 싣지 않는다 — 사람 칸에 남는다(CSV).
      reason: reasons.size === 1 ? r.reason : '',
      scheduled: members.some((m) => m.scheduled),
    });
  }
  return out;
}
