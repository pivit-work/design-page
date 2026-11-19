/**
 * 공용 틀(pivit-work PW-2994 → PW-3139 에서 design-page 로 옮김)이 쓰는 줄 모양 — 틀 파일들만 쓴다.
 * 화면 파일은 이 값을 가져다 쓰지 않는다(틀을 쓴다).
 *
 * 글자 크기 · 간격 · 색은 여기 없다 — 디자이너 클래스(.tl-group-modal-* · .ol-table)와 디자인 토큰이 정한다.
 * 여기에는 «좁아졌을 때 어떻게 줄어드나»만 둔다(PW-2872 딱지 «고 / 칠 / 곳» · PW-2933 탭 이름 한 글자씩 꺾임).
 */

/**
 * 짧은 글 — 한 줄 · 넘치면 «…». 놓인 자리보다 넓어도 옆으로 밀어내지 않는다.
 * 줄 하나를 통째로 차지하지 않는다(inline-block) — 칸 이름 뒤에 붙는 필수 «*»가 다음 줄로 떨어지지 않게.
 */
export const FRAME_ONE_LINE = {
  display: 'inline-block',
  maxWidth: '100%',
  verticalAlign: 'bottom',
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

/** 짧은 글 — 한 줄 · 줄어들지 않음(버튼 · 딱지 자리). 줄 안에서 옆 칸에 밀려 눌리지 않는다. */
export const FRAME_NO_SHRINK = {
  flex: 'none',
  whiteSpace: 'nowrap',
};

/** 긴 글 — 낱말 단위로 두 줄까지, 넘치면 «…». 한 글자씩 꺾지 않는다(keep-all). */
export const FRAME_TEXT_CLAMP_TWO = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
  wordBreak: 'keep-all',
  minWidth: 0,
};

/**
 * 긴 글 — 낱말 단위로 줄을 바꾼다(줄 수 제한 없음). 한 글자씩 꺾지 않는다.
 * `break-word` 는 한 낱말이 줄보다 길 때만 그 낱말을 자른다 — `anywhere` 와 달리 칸의 최소 폭을 한 글자로 줄이지 않아
 * 옆 칸에 밀려 세로로 꺾이지 않는다.
 */
export const FRAME_TEXT_WRAP = {
  display: 'block',
  minWidth: 0,
  wordBreak: 'keep-all',
  overflowWrap: 'break-word',
};

/**
 * 표 틀의 높이 — 디자이너 조직도 명단 표(`org_list.css .ol-table`) 머리 40 · 줄 48 + 아래 선 1(브라우저에서 잰 줄 간격 49).
 * maxRows 로 틀 높이를 낼 때 쓴다 — 선을 빼고 48 로 세면 줄마다 1px 씩 모자라 마지막 줄 아래가 잘린다.
 */
export const FRAME_TABLE = Object.freeze({ headHeight: 40, rowHeight: 49 });
