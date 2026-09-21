/**
 * 명단 표 — 머리 행이 있고 한 줄에 한 사람(또는 한 건)이 오는 표 (PW-839).
 *
 * 어드민·평가 화면이 같은 「머리 행 + 줄」 표를 화면마다 `<table>` 부터 새로 그려서, 줄 높이·
 * 머리 행 색·구분선·열이 넘칠 때의 처리가 화면마다 조금씩 달랐다(2026-09 에 세어 보니 11개
 * 화면에 17벌). 한 곳을 고쳐도 나머지는 그대로였다. 이제 표의 **생김새(칸 여백·머리 행·구분선·
 * 가로 스크롤)는 이 부품 한 곳**이 정하고, 부르는 쪽은 칸 안에 무엇을 넣을지만 정한다.
 * 생김새의 기준은 그중 가장 손이 많이 간 「구성원 설정」 명단이다 — 새로 디자인하지 않았다.
 *
 * 항상 이 컴포넌트를 사용한다. `<table>` 을 새로 그리지 말 것 — `npm run check:roster-tables`
 * (푸시 전 검사·릴리스 워크플로)가 어드민·평가 폴더에서 막는다.
 *
 * ## 두 가지로 쓴다
 *
 * **열 목록을 넘긴다** — 열 개수가 설정에 따라 늘었다 줄었다 해도 `columns` 만 바꾸면 된다.
 *
 * ```jsx
 * <RosterTable
 *   columns={[{ key: 'name', header: '이름' }, { key: 'amount', header: '금액', align: 'right' }]}
 *   rows={rows}
 *   rowKey={(r) => r.id}
 *   renderCell={(row, col) => row[col.key]}
 *   empty="결과가 없습니다"
 * />
 * ```
 *
 * **칸을 직접 늘어놓는다** — 칸 합치기(`colSpan`), 묶음 머리 줄, 펼침 줄처럼 줄마다 모양이
 * 다른 표. 머리 칸·줄·칸도 이 부품의 조각으로 쓴다.
 *
 * ```jsx
 * <RosterTable>
 *   <RosterTable.Head>
 *     <RosterTable.HeadCell>이름</RosterTable.HeadCell>
 *   </RosterTable.Head>
 *   <RosterTable.Body>
 *     <RosterTable.Row tone="warn" onClick={…}>
 *       <RosterTable.Cell>커트</RosterTable.Cell>
 *     </RosterTable.Row>
 *   </RosterTable.Body>
 * </RosterTable>
 * ```
 *
 * ## 스크롤
 *
 * 표는 자기 틀 안에서만 가로로 흐른다(`scroll="x"`, 기본) — 페이지가 통째로 옆으로 밀리면
 * 스크롤 막대가 화면 밖으로 나가 손이 닿지 않는다(PW-400). 머리 행은 표와 **같은 스크롤 안**에
 * 있어 가로로 밀어도 열과 어긋나지 않는다. `scroll="both"` 는 틀 높이를 `maxHeight`(또는
 * 부르는 쪽 클래스)로 자르고 세로로 내릴 때 머리 행을 틀 위에 붙인다. 칸 안에서 드롭다운이
 * 틀 밖으로 열려야 하는 표는 `scroll="none"` 으로 틀을 두지 않는다.
 *
 * @param {object}  props
 * @param {Array<{ key: string|number, header?: React.ReactNode, width?: number|string,
 *   align?: 'left'|'center'|'right', render?: (row, i: number) => React.ReactNode,
 *   headerProps?: object, cellProps?: object|((row, i: number) => object) }>} [props.columns]
 * @param {Array}   [props.rows]
 * @param {(row, i: number) => string|number} [props.rowKey]  기본 `row.id ?? i`
 * @param {(row, col, i: number) => React.ReactNode} [props.renderCell] 열에 `render` 가 없을 때
 * @param {(row, i: number) => object} [props.rowProps]  줄(`RosterTable.Row`)에 얹을 속성
 * @param {React.ReactNode} [props.empty]  줄이 없을 때 한 줄로 보일 글
 * @param {React.ReactNode} [props.children] 열 목록 대신 직접 늘어놓은 조각
 * @param {'x'|'both'|'none'} [props.scroll]
 * @param {number|string} [props.maxHeight] `scroll="both"` 일 때 틀 높이
 * @param {number|string} [props.minWidth]  이보다 좁아지면 가로 스크롤
 * @param {boolean} [props.fixed]   열 폭을 머리 칸 `width` 대로 고정한다(`table-layout: fixed`)
 * @param {boolean} [props.nowrap]  칸 글을 한 줄로 두고 넘치면 말줄임
 * @param {boolean} [props.dense]   칸마다 입력칸이 들어가는 편집 표 — 칸 여백을 줄인다
 * @param {boolean} [props.framed]  테두리·둥근 모서리 틀을 두른다
 * @param {React.ReactNode} [props.caption] 틀 맨 위 작은 제목 줄
 * @param {string}  [props.className]       바깥 틀 클래스
 * @param {string}  [props.tableClassName]  `<table>` 클래스 (칸 안 내용을 꾸밀 때 쓰는 이름)
 * @param {string}  [props.scrollClassName] 스크롤 틀 클래스 (틀 높이를 화면에 맞출 때)
 * @param {string}  [props.testId]          바깥 틀 `data-testid`
 * @param {string}  [props.scrollTestId]    스크롤 틀 `data-testid`
 * @param {string}  [props.ariaLabel]
 */
export default function RosterTable({
  columns,
  rows = [],
  rowKey = (row, i) => row?.id ?? i,
  renderCell,
  rowProps,
  empty = null,
  children,
  scroll = 'x',
  maxHeight,
  minWidth,
  fixed = false,
  nowrap = false,
  dense = false,
  framed = false,
  caption,
  className = '',
  tableClassName = '',
  scrollClassName = '',
  testId,
  scrollTestId,
  ariaLabel,
}) {
  const rootClass = ['rt', framed ? 'rt-framed' : '', className].filter(Boolean).join(' ');
  const scrollClass = ['rt-scroll', `is-scroll-${scroll}`, scrollClassName].filter(Boolean).join(' ');
  const tableClass = [
    'rt-table',
    fixed ? 'is-fixed' : '',
    nowrap ? 'is-nowrap' : '',
    dense ? 'is-dense' : '',
    tableClassName,
  ].filter(Boolean).join(' ');

  const body = columns ? (
    <>
      <RosterHead>
        {columns.map((col) => (
          <RosterHeadCell key={col.key} width={col.width} align={col.align} {...(col.headerProps || {})}>
            {col.header}
          </RosterHeadCell>
        ))}
      </RosterHead>
      <RosterBody>
        {rows.length === 0 && empty != null ? (
          <RosterEmpty colSpan={columns.length}>{empty}</RosterEmpty>
        ) : rows.map((row, i) => (
          <RosterRow key={rowKey(row, i)} {...(rowProps ? rowProps(row, i) : {})}>
            {columns.map((col) => {
              const extra = typeof col.cellProps === 'function' ? col.cellProps(row, i) : col.cellProps;
              return (
                <RosterCell key={col.key} align={col.align} {...(extra || {})}>
                  {col.render ? col.render(row, i) : renderCell ? renderCell(row, col, i) : row?.[col.key]}
                </RosterCell>
              );
            })}
          </RosterRow>
        ))}
      </RosterBody>
    </>
  ) : children;

  return (
    <div className={rootClass} data-testid={testId}>
      {caption != null && <p className="rt-caption">{caption}</p>}
      <div
        className={scrollClass}
        data-testid={scrollTestId}
        style={scroll === 'both' && maxHeight != null ? { maxHeight } : undefined}
      >
        <table className={tableClass} style={minWidth != null ? { minWidth } : undefined} aria-label={ariaLabel}>
          {body}
        </table>
      </div>
    </div>
  );
}

const alignClass = (align) => (align && align !== 'left' ? `is-${align}` : '');
const join = (...names) => names.filter(Boolean).join(' ') || undefined;

/** 머리 행. 머리 칸(`RosterTable.HeadCell`)을 늘어놓는다. */
function RosterHead({ children }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

/**
 * 머리 칸. `width` 는 `fixed` 표에서 열 폭이 된다.
 * 누르면 정렬되는 머리 칸처럼 속을 부르는 쪽이 채워도 된다 — 칸 자체는 여기서 그린다.
 */
function RosterHeadCell({ children, align, width, className, style, ...rest }) {
  return (
    <th
      scope="col"
      className={join(alignClass(align), className)}
      style={width != null ? { width, ...style } : style}
      {...rest}
    >
      {children}
    </th>
  );
}

/** 줄 묶음. 묶음 머리 줄(`GroupRow`)로 나뉜 표는 묶음마다 하나씩 둔다. */
function RosterBody({ children }) {
  return <tbody>{children}</tbody>;
}

/**
 * 한 줄. `tone` 으로 줄 전체의 바탕을 바꾼다 — 경고(warn)·오류(error)·지금 값(current)·
 * 고른 줄(selected)·경보(flagged)·흐리게(muted). `onClick` 을 주면 누를 수 있는 줄로 보인다.
 */
function RosterRow({ children, tone, onClick, className, ...rest }) {
  return (
    <tr
      className={join('rt-row', tone ? `is-${tone}` : '', onClick ? 'is-clickable' : '', className)}
      data-tone={tone || undefined}
      onClick={onClick}
      {...rest}
    >
      {children}
    </tr>
  );
}

/** 칸 하나. */
function RosterCell({ children, align, className, ...rest }) {
  return (
    <td className={join(alignClass(align), className)} {...rest}>
      {children}
    </td>
  );
}

/** 묶음 머리 줄 — 표를 갈래별로 나눌 때 갈래 이름을 한 줄 전체에 쓴다. */
function RosterGroupRow({ colSpan, children, ...rest }) {
  return (
    <tr className="rt-group" {...rest}>
      <td colSpan={colSpan}>{children}</td>
    </tr>
  );
}

/** 줄이 하나도 없을 때 한 줄 전체에 쓰는 글. */
function RosterEmpty({ colSpan, children, ...rest }) {
  return (
    <tr className="rt-empty-row">
      <td colSpan={colSpan} className="rt-empty" {...rest}>{children}</td>
    </tr>
  );
}

RosterTable.Head = RosterHead;
RosterTable.HeadCell = RosterHeadCell;
RosterTable.Body = RosterBody;
RosterTable.Row = RosterRow;
RosterTable.Cell = RosterCell;
RosterTable.GroupRow = RosterGroupRow;
RosterTable.Empty = RosterEmpty;
