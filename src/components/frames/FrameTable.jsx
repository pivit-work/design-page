import RosterTable from '../shared/RosterTable.jsx';
import { FRAME_TEXT_CLAMP_TWO, FRAME_TABLE } from './frameValues.js';

/**
 * 표 틀 (PW-2994 ④ · PW-3139 에서 design-page 로 옮김) — 머리 줄 · 줄 높이 고정 · 긴 글은 «…» 또는 두 줄까지 ·
 * 줄이 많으면 표 안에서 넘기고 머리 고정 · 빈 안내. 스타일시트: org_list.css(쓰는 쪽이 불러온다).
 *
 * 모양은 디자이너 조직도 명단 표(`org_list.css .ol-table` · stesslee)가 정한다 — 머리 40 · 줄 48 · 머리 글 12/600 ·
 * 칸 글 14/500. 뼈대(구분선 · 가로 스크롤 · 붙는 머리)는 공용 명단 표 `RosterTable` 이다.
 * 두 클래스가 같은 칸에 걸면(여백 · 머리 글 색 · 아래 선) CSS 가 실린 순서로 갈려 어드민 화면에서 `.rt-table` 이 이겼다 —
 * `dp-frame-table`(frames.css)이 디자이너 값을 순서와 상관없이 세운다(pivit-work PW-3345).
 *
 * 부르는 쪽은 열과 칸 안 내용만 정한다. 모양을 덮어쓰는 길(className · style)은 두지 않는다 — 다음 화면에서 숫자를
 * 다시 적을 자리가 생기지 않게. 고르기는 정해 둔 것만:
 *   - 열 `lines` — 1(기본, 한 줄 «…») · 2(낱말 단위로 두 줄까지 보이고 넘치면 «…»)
 *   - 열 `width` — 디자이너 값이 있는 칸(날짜 칸 등)만 숫자로. 없으면 표가 나눈다
 *   - `maxRows` — 이만큼 넘으면 표 안에서 세로로 넘기고 머리 줄은 붙어 있다
 *
 * 짧은 글(머리 칸)은 한 줄이고 줄어들지 않는다 — 넘치면 표가 자기 틀 안에서 가로로 흐른다(페이지는 안 밀림).
 * 표의 바깥 폭은 놓인 자리(창 · 판 · 서랍)를 따른다.
 *
 * @param {object} props
 * @param {Array<{key: string, header: import('react').ReactNode, render: Function, width?: number,
 *   align?: 'left'|'right'|'center', lines?: 1|2}>} props.columns
 * @param {Array} props.rows
 * @param {Function} props.rowKey
 * @param {import('react').ReactNode} props.empty 줄이 0개일 때 표 안에 보일 안내 한 줄
 * @param {number} [props.maxRows] 이 줄 수를 넘으면 표 안에서 세로로 넘긴다(머리 고정). 없으면 다 보인다
 * @param {string} [props.ariaLabel]
 * @param {string} [props.testId]
 */
export function FrameTable({ columns, rows, rowKey, empty, maxRows, ariaLabel, testId }) {
  const scroll = maxRows ? 'both' : 'x';
  const maxHeight = maxRows ? FRAME_TABLE.headHeight + FRAME_TABLE.rowHeight * maxRows : undefined;
  return (
    <RosterTable
      columns={columns.map((col) => ({
        key: col.key,
        // 열의 가장 좁은 폭은 머리 글이 받친다. 폭을 준 열(날짜 칸 180)은 «준 폭 − 칸 여백 양쪽»을 걸어 열이 정확히 그 폭이 된다
        // — 그냥 180 을 걸면 칸 여백 20×2 가 더해져 220 이 되고, 안 걸면 표가 좁을 때 61 까지 눌린다(시험 화면).
        header: <span style={{ ...HEAD_TEXT_STYLE, minWidth: headMinWidth(col) }}>{col.header}</span>,
        width: col.width,
        align: col.align,
        headerProps: { style: HEAD_STYLE },
        cellProps: { style: col.lines === 2 ? CELL_TWO_LINES_STYLE : CELL_ONE_LINE_STYLE },
        render: (row, i) =>
          col.lines === 2 ? <span style={FRAME_TEXT_CLAMP_TWO}>{col.render(row, i)}</span> : col.render(row, i),
      }))}
      rows={rows}
      rowKey={rowKey}
      empty={empty}
      scroll={scroll}
      maxHeight={maxHeight}
      tableClassName="ol-table dp-frame-table"
      ariaLabel={ariaLabel}
      testId={testId}
    />
  );
}

/**
 * 열의 가장 좁은 폭 — 놓인 자리(서랍 420 · 확인 창 400)가 좁아도 열이 이보다 눌리지 않고, 모자라면 표가 자기 틀 안에서
 * 가로로 흐른다(페이지는 안 밀림). 이것이 없으면 긴 글 칸이 한두 글자 폭까지 눌려 «이 / 설»처럼 세로로 꺾였다(11-19 시험 화면).
 * 디자이너 표에 정한 최소 폭이 없어 개발이 정했다(design-review) — 한 줄 칸 120(14px 글 여덟 자 남짓 + 칸 여백) · 두 줄 칸 200.
 */
const MIN_ONE_LINE = 120;
const MIN_TWO_LINES = 200;

function headMinWidth(col) {
  if (col.width != null) return `calc(${col.width}px - 2 * var(--spacing-2xl))`;
  return `${col.lines === 2 ? MIN_TWO_LINES : MIN_ONE_LINE}px`;
}

/** 머리 칸 — 한 줄 · 줄어들지 않음(낱말 사이에서도 안 꺾임). 글 모양은 `.ol-table th` 그대로. */
const HEAD_STYLE = { whiteSpace: 'nowrap' };
/** 머리 글 — 열의 가장 좁은 폭을 여기서 잡는다(표는 칸 글 폭대로 열을 나누므로 머리 글이 열을 받친다). */
const HEAD_TEXT_STYLE = { display: 'inline-block' };

/** 한 줄 칸 — 넘치면 «…». 칸 글은 열 폭을 넓히지 않는다(max-width 0 — 열 폭은 머리가 받친다). 줄 높이는 `.ol-table td` 의 48 그대로. */
const CELL_ONE_LINE_STYLE = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 0,
};

/** 두 줄 칸 — 안의 글이 두 줄에서 잘린다. 칸은 줄어들 수 있게 최소 폭을 0 으로. */
const CELL_TWO_LINES_STYLE = { maxWidth: 0 };
