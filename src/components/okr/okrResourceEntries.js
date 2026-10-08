/** 원장이 있는 프로젝트 행이면 그 프로젝트 id — 저장된 행(`project`)·칩·추정 제안으로 담은 행 (PW-1436). */
export function entryProjectId(entry) {
  if (!entry || !entry.ref) return null;
  return entry.source === 'project' || entry.source === 'suggestion' ? entry.ref : null;
}
