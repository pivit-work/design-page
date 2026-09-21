import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 바둑판 배정 표 — 왼쪽에 사람이 세로로, 위에 열(프로젝트·스쿼드)이 가로로 서고, 맨
 * 오른쪽에 합계 한 칸이 선다. 조직도 「프로젝트」 탭과 「스쿼드」 탭이 이 부품 하나를 쓴다
 * (PW-838).
 *
 * 🔴 **표 하나 · 가로 스크롤 하나**다. 종전 프로젝트 표는 머리 행·이름 칸·합계 칸을
 * 표 바깥에 따로 붙이고(고정 칸 7군데) 두 스크롤을 JS 로 서로 맞췄다. 그러면 트랙패드로
 * 밀 때 한쪽이 한 프레임 늦게 따라오고, 줄 높이도 양쪽이 같은 숫자를 각자 적어야 맞는다.
 * 여기서는 이름 칸과 합계 칸을 `position: sticky` 로 좌우에 붙인다 — 브라우저가 한
 * 스크롤 안에서 같이 움직이므로 맞출 것이 없다.
 *
 * 생김새(칸 여백·구분선·색 네모)는 부르는 쪽이 넘기는 클래스가 정한다 — 이 부품은
 * **뼈대와 움직임**만 가진다. 그래서 두 화면의 모양은 종전 그대로 남는다.
 *
 * @param {object}   props
 * @param {Array}    props.columns            열 목록 (프로젝트·스쿼드)
 * @param {Array}    props.rows               행 목록 (사람)
 * @param {(row, i: number) => string|number} props.rowKey
 * @param {React.ReactNode} props.nameHeader  왼쪽 머리 칸
 * @param {React.ReactNode} props.totalHeader 오른쪽 머리 칸
 * @param {(col) => React.ReactNode} props.renderColumnHeader
 * @param {(row) => React.ReactNode} props.renderName
 * @param {(row, col) => React.ReactNode} props.renderCell
 * @param {(row) => React.ReactNode} props.renderTotal
 * @param {(col) => string|number} [props.columnKey] 기본 `col.id`
 * @param {React.ReactNode} [props.empty]     행이 없을 때 한 줄
 * @param {(row) => void} [props.onNameClick] 이름 칸 전체(여백 포함)를 누르면 부른다
 * @param {(row) => object} [props.rowProps]  `<tr>` 에 얹을 속성 (data-testid 등)
 * @param {{ nameTh?, colTh?, totalTh?, nameTd?, colTd?, totalTd?, emptyTd? }} [props.classes]
 * @param {boolean}  [props.dragScroll]       마우스로 끌어 가로로 민다 (스크롤바를 감춘다)
 * @param {string}   [props.className]
 * @param {string}   [props.tableClassName]
 */
export default function AssignmentGrid({
  columns,
  rows,
  rowKey,
  nameHeader,
  totalHeader,
  renderColumnHeader,
  renderName,
  renderCell,
  renderTotal,
  columnKey = (col) => col.id,
  empty = null,
  onNameClick,
  rowProps,
  classes = {},
  dragScroll = false,
  className = '',
  tableClassName = '',
}) {
  const scrollRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const drag = useRef({ active: false, moved: false, startX: 0, startLeft: 0 });

  // 이름 칸·합계 칸의 그림자 — 그 칸 뒤로 넘어간 열이 있을 때만 선다.
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrolled(el.scrollLeft > 0);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, columns.length, rows.length]);

  const onMouseDown = (e) => {
    if (!dragScroll || e.button !== 0) return;
    const el = scrollRef.current;
    drag.current = { active: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft };
  };
  const onMouseMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    // 손떨림 몇 px 은 누르기로 본다 — 끌기로 치면 칸 누르기가 안 먹는다.
    if (!d.moved && Math.abs(dx) < 4) return;
    const el = scrollRef.current;
    if (!d.moved) {
      d.moved = true;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    }
    el.scrollLeft = d.startLeft - dx;
  };
  const endDrag = () => {
    drag.current.active = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = '';
      el.style.userSelect = '';
    }
  };
  // 끌고 나서 손을 뗀 자리가 이름 칸이면 그 사람 창이 열려 버린다 — 끌었으면 누르기를 삼킨다.
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.stopPropagation();
      e.preventDefault();
      drag.current.moved = false;
    }
  };

  const rootClass = [
    'ag',
    scrolled ? 'is-scrolled' : '',
    atEnd ? '' : 'has-more',
    dragScroll ? 'ag-drag' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClass}
      ref={scrollRef}
      onScroll={updateEdges}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClickCapture={onClickCapture}
      data-testid="assignment-grid"
    >
      <table className={`pj-table ag-table ${tableClassName}`.trim()}>
        <thead>
          <tr>
            <th className={`pj-th ag-name ${classes.nameTh || ''}`.trim()}>{nameHeader}</th>
            {columns.map((col) => (
              <th key={columnKey(col)} className={`pj-th ${classes.colTh || ''}`.trim()}>
                {renderColumnHeader(col)}
              </th>
            ))}
            <th className={`pj-th ag-total ${classes.totalTh || ''}`.trim()}>{totalHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} {...(rowProps ? rowProps(row) : {})}>
              <td
                className={`pj-td ag-name ${classes.nameTd || ''}`.trim()}
                onClick={onNameClick ? () => onNameClick(row) : undefined}
                style={onNameClick ? { cursor: 'pointer' } : undefined}
              >
                {renderName(row)}
              </td>
              {columns.map((col) => (
                <td key={columnKey(col)} className={`pj-td ${classes.colTd || ''}`.trim()}>
                  {renderCell(row, col)}
                </td>
              ))}
              <td className={`pj-td ag-total ${classes.totalTd || ''}`.trim()}>{renderTotal(row)}</td>
            </tr>
          ))}
          {rows.length === 0 && empty && (
            <tr>
              <td colSpan={columns.length + 2} className={classes.emptyTd || ''}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
