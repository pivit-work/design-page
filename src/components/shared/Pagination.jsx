import Button from './Button.jsx';
import { ChevronLeftGlyph, ChevronRightGlyph } from './lineIcons.jsx';

const GLYPH_PROPS = { size: 14, focusable: false, style: { display: 'block', flexShrink: 0 } };

/**
 * 페이지 넘김 — 「1–20 / 57명」 + [‹ 이전] 1 / 3 [다음 ›] (PW-1010).
 *
 * 어드민 › 대시보드(팀 표)·직원 관리(목록)·조직 이력(구성원 명단)이 같은 줄을 각자 붙여 넣어
 * 세 벌이었다. 한 벌로 모았고 생김새는 그때 값 그대로다(`src/pagination.css`).
 *
 * 언제 보이는지는 화면이 정한다 — 한 쪽뿐일 때도 범위 줄을 보이는 화면(직원 관리)과 안 보이는
 * 화면(대시보드·조직 이력)이 있어서, 이 부품은 불리면 그린다.
 *
 * 누르면 `onPageChange(다음 쪽)` 을 부른다. 쪽 번호는 1 ~ `totalPages` 안으로 잘라서 넘긴다.
 *
 * @param {number} page         지금 쪽(1부터)
 * @param {number} totalPages   전체 쪽 수
 * @param {number} pageSize     한 쪽에 보이는 줄 수
 * @param {number} total        전체 줄 수
 * @param {(page: number) => void} onPageChange
 * @param {{ of: string, prev: string, next: string }} labels
 * @param {string} [countSuffix] 전체 수 뒤에 붙는 말(「명」)
 */
export default function Pagination({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  labels,
  countSuffix = '',
  ...rest
}) {
  const last = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), last);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const go = (next) => onPageChange?.(Math.min(Math.max(1, next), last));
  return (
    <nav className="dp-pager" {...rest}>
      <span className="dp-pager__range">
        {from}–{to} {labels.of} {total}{countSuffix}
      </span>
      <div className="dp-pager__nav">
        <Button variant="ghost" size="sm" disabled={current === 1} onClick={() => go(current - 1)}>
          <ChevronLeftGlyph {...GLYPH_PROPS} />{labels.prev}
        </Button>
        <span className="dp-pager__page" aria-current="page">{current} {labels.of} {last}</span>
        <Button variant="ghost" size="sm" disabled={current === last} onClick={() => go(current + 1)}>
          {labels.next}<ChevronRightGlyph {...GLYPH_PROPS} />
        </Button>
      </div>
    </nav>
  );
}
