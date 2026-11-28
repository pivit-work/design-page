const READABLE_HEAD_STYLE = { color: 'var(--text-secondary)' };

/**
 * 결제 화면 표(FrameTable)의 칸 이름을 설명 글 색으로 — 어드민이 꼭 읽을 칸 이름이다(pivit-work PW-3302 · 흐린 회색 금지).
 * 값은 디자이너 조직도 명단 표 머리(`org_list.css .ol-table th` · `--text-secondary`). 공용 명단 표 머리(`.rt-table th`)는
 * 다른 어드민 화면도 함께 써서 그대로 두고, 결제 화면의 머리 글만 감싼다. 크기 · 굵기 · 한 줄은 표 틀 그대로.
 * @param {Array<{header: import('react').ReactNode}>} columns
 */
export function billingReadableHeads(columns) {
  return columns.map((col) => ({ ...col, header: <span style={READABLE_HEAD_STYLE}>{col.header}</span> }));
}
