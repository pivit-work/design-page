/**
 * 시간 칸 뜻 범례 한 줄 — «빈 칸 · 예약 있음 · 지난 시각 · 고른 칸» (pivit-work PW-2989 «일시 · 회의실» 팝업).
 * 칸 모양은 `.tl-slot-cell`(modal-shell.css)과 같은 값의 작은 네모로 보이고, 글은 호출부가 준다.
 *
 *   <SlotLegend items={[{ tone: 'free', label: '빈 칸' }, { tone: 'busy', label: '예약 있음' }]} />
 *
 *   items   [{ tone: 'free' | 'busy' | 'past' | 'on', label }]
 *   testId  data-testid (기본 'slot-legend')
 */
export default function SlotLegend({ items = [], testId = 'slot-legend' }) {
  return (
    <div className="tl-slot-legend" data-testid={testId}>
      {items.map((it) => (
        <span key={it.tone} className="tl-slot-legend-item">
          <span className={`tl-slot-legend-swatch${it.tone === 'free' ? '' : ` is-${it.tone}`}`} aria-hidden="true" />
          {it.label}
        </span>
      ))}
    </div>
  );
}
