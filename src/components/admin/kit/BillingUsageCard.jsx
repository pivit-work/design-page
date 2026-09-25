/**
 * 녹음 사용량 칸 — 어드민 › 결제·구독 개요 아래 (PW-760).
 *
 * 결제 개요(`BillingOverviewCanvas`)의 현재 플랜 카드와 좌석 사용량 막대 모양을 따른다
 * (흰 카드 · 테두리 · 8px 막대 · 한도에 가까우면 주황, 넘으면 빨강). 어드민 결제 화면에만
 * 뜨므로 디자이너 대기 없이 개발이 만들었다.
 *
 * 숫자를 문장으로 만드는 일(시간 표기·백분율 문구)은 앱이 하고, 여기서는 넘겨받은 글을
 * 자리에 놓기만 한다.
 *
 * Props
 *   title
 *   status        'ok' | 'warning' | 'over'  — 막대 색과 오른쪽 위 표시 색
 *   statusText    오른쪽 위 표시(없으면 안 그린다)
 *   unlimitedText 무제한 플랜 한 줄 — 있으면 막대 대신 이 줄
 *   summary       막대 위 「사용 1.0h / 10.0h (10%)」
 *   percent       막대 채움(0~100)
 *   simulate      { label, onClick } | null — 개발 빌드 전용 사용량 흉내 버튼
 *
 * 크레딧 잔여 칸·크레딧팩 구매 버튼은 없다 — 선불 충전 상품을 두지 않기로 했다
 * (PW-1023 · pricing-policy D6). 녹음 시간은 회사 풀 하나에서만 센다.
 */
const cx = (...xs) => xs.filter(Boolean).join(' ');

export default function BillingUsageCard({
  title,
  status = 'ok',
  statusText,
  unlimitedText,
  summary,
  percent = 0,
  simulate = null,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cx('admin-kit-usage', `is-${status}`)}>
      <div className="admin-kit-usage-head">
        <div className="admin-kit-usage-title">{title}</div>
        {statusText && <span className="admin-kit-usage-status">{statusText}</span>}
      </div>

      {unlimitedText ? (
        <div className="admin-kit-usage-line">{unlimitedText}</div>
      ) : (
        <>
          <div className="admin-kit-usage-summary" data-testid="usage-summary">{summary}</div>
          <div className="admin-kit-usage-bar">
            <div className="admin-kit-usage-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}

      {simulate && (
        <div className="admin-kit-usage-actions">
          <button
            type="button"
            data-testid="simulate-usage"
            className="admin-kit-usage-simulate"
            onClick={simulate.onClick}
          >
            {simulate.label}
          </button>
        </div>
      )}
    </div>
  );
}
