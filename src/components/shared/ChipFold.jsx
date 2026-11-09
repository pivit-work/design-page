import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Button from './Button.jsx';
import { fitChips } from './chipFoldLayout.js';

/**
 * 접히는 칩 줄 (pivit-work PW-2570) — 칩을 몇 줄까지만 보이고 나머지는 줄 끝 「더 보기 +N」으로 연다.
 *
 * 대상 조건 값·참석자·고른 회사처럼 끝없이 늘어나는 칩이 아래 버튼과 내용을 밀어냈다(직책 100개면 15줄).
 * 조직 구조 편집 화면의 사람 칩 접기(PW-1878)와 시점별 조직 기록 시점 줄(`AsOfPresetRows`)의 규칙을 꺼냈다.
 *
 *   <ChipFold className="sq-chip-row" items={members} getKey={(m) => m.id}
 *     renderItem={(m) => <span key={m.id} className="sq-chip">…</span>}
 *     keep={(m) => m.id === justAdded} moreLabel={(n) => `더 보기 +${n}`} lessLabel="접기"
 *     trailing={<button className="sq-add-member-btn">팀원 추가</button>} />
 *
 * - 몇 개가 보이나는 개수가 아니라 줄 수(`maxRows`, 기본 2)다 — 칸 폭과 칩 폭을 재어 버튼까지 들어가는 만큼.
 * - 펼치면 같은 버튼이 맨 끝에서 「접기」가 된다. 접은 뒤 버튼이 화면 밖이면 보이게 스크롤한다.
 * - `keep` 이 참인 칩(고른 값·방금 더한 사람)은 접어도 남는다. 「+N」은 실제로 숨는 수다.
 * - `onMore` 를 주면 버튼이 펼치지 않고 그 일을 한다(아래에 전부 있는 줄로 옮겨 가기 등).
 * - 이 부품이 줄 자체를 그린다 — 칸의 줄 모양(간격·줄바꿈)은 `className` 이 맡고, 줄바꿈(wrap)은 여기서 켠다.
 * - `renderItem` 은 칩 하나에 요소 하나를 돌려준다(폭을 그 요소로 잰다).
 * - 폭을 잴 수 없을 때(숨은 칸·시험 환경)는 앞 `fallbackCount` 개로 자른다.
 *
 * 생김새 값은 `src/status-badge.css` 「칩 줄 접기」 절.
 */
export default function ChipFold({
  items,
  getKey,
  renderItem,
  keep,
  maxRows = 2,
  moreLabel = (n) => `더 보기 +${n}`,
  lessLabel = '접기',
  onMore,
  trailing,
  fallbackCount = 8,
  className = '',
  buttonClassName = '',
  testId,
  ...rest
}) {
  const rowRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [layout, setLayout] = useState(null);
  const scrollAfterCollapse = useRef(false);

  const keys = items.map(getKey);
  const kept = items.map((it) => !!keep?.(it));
  const sig = `${keys.join('\u0001')}|${kept.map((k) => (k ? 1 : 0)).join('')}|${maxRows}`;
  const measuring = !layout || layout.sig !== sig;
  // 재는 함수는 sig 가 바뀔 때만 다시 돈다 — 그때의 값은 ref 로 읽는다.
  const latest = useRef(null);
  useLayoutEffect(() => {
    latest.current = { items, keys, kept, sig, maxRows, fallbackCount };
  });

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const { items, keys, kept, sig, maxRows, fallbackCount } = latest.current;
    // 회의 미니 창(문서 PiP)처럼 다른 창의 문서에 그려질 수 있다 — 그 창의 함수로 잰다.
    const win = row.ownerDocument?.defaultView || window;
    const style = win.getComputedStyle(row);
    const available =
      row.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
    const kids = Array.from(row.children);
    const width = (el) => (el ? el.getBoundingClientRect().width : 0);
    const widths = kids.slice(0, items.length).map(width);
    const buttonWidth = width(kids[items.length]);
    const trailingWidths = kids.slice(items.length + 1).map(width);
    let fit;
    if (available > 0 && widths.some((w) => w > 0)) {
      fit = fitChips({ widths, keep: kept, available, gap, buttonWidth, trailingWidths, maxRows });
    } else {
      let shownFree = 0;
      const visible = items.map((_, i) => {
        if (kept[i]) return true;
        shownFree += 1;
        return shownFree <= fallbackCount;
      });
      const hiddenCount = visible.filter((v) => !v).length;
      fit = { visible, hiddenCount, folds: hiddenCount > 0 };
    }
    setLayout({
      sig,
      width: Math.round(row.clientWidth),
      ...fit,
      visibleKeys: new Set(keys.filter((_, i) => fit.visible[i])),
    });
  }, []);

  useLayoutEffect(() => {
    if (measuring) measure();
  }, [measuring, sig, measure]);

  // 칸 폭이 바뀌면 다시 잰다(창 크기·옆 칸이 열림).
  useEffect(() => {
    const row = rowRef.current;
    const RO = row?.ownerDocument?.defaultView?.ResizeObserver || globalThis.ResizeObserver;
    if (!row || typeof RO === 'undefined') return undefined;
    const ro = new RO(() => {
      setLayout((prev) => (prev && prev.width !== Math.round(row.clientWidth) ? null : prev));
    });
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (expanded || !scrollAfterCollapse.current) return;
    scrollAfterCollapse.current = false;
    rowRef.current?.querySelector('.dp-chip-fold-more')?.scrollIntoView?.({ block: 'nearest' });
  }, [expanded]);

  const folds = measuring ? true : layout.folds;
  const shown = measuring || expanded || !folds ? items : items.filter((it) => layout.visibleKeys.has(getKey(it)));
  let label = null;
  if (measuring) label = moreLabel(items.length);
  else if (folds) label = expanded ? lessLabel : moreLabel(layout.hiddenCount);

  const onToggle = () => {
    if (onMore && !expanded) {
      onMore();
      return;
    }
    if (expanded) scrollAfterCollapse.current = true;
    setExpanded((v) => !v);
  };

  return (
    <div
      ref={rowRef}
      className={['dp-chip-fold', className].filter(Boolean).join(' ')}
      data-testid={testId}
      {...rest}
    >
      {shown.map(renderItem)}
      {label != null && (
        <Button
          className={['dp-chip-fold-more', buttonClassName].filter(Boolean).join(' ')}
          aria-expanded={onMore ? undefined : expanded}
          data-testid={testId ? `${testId}-more` : undefined}
          style={measuring ? { visibility: 'hidden' } : undefined}
          onClick={onToggle}
        >
          {label}
        </Button>
      )}
      {trailing}
    </div>
  );
}
