import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';
import Button from '../shared/Button.jsx';

/**
 * 동의 없이 남아 있던 선호·성향 값에 대해 접속 직후 한 번 묻는 창 (pivit-work PW-1365 · 법무 D38 ·
 * 기획 my-settings-spec §5-A.10 ①). 문안은 선호 설정 탭의 동의 카드와 같고, 체크박스 대신 [동의] 버튼으로 받는다.
 *
 * - `labels` — `{ title, optional, purpose, sharedPrefix, shared, sharedSuffix, noPenalty, statement, view, hide,
 *   detail: [{ label, text }], agree, decline, close }`. 회사 이름은 호스트가 문안에 넣어 준다.
 * - `deadline` — 「동의하지 않으시면 … 에 지워집니다」 문장(호스트가 날짜를 넣는다). 없으면 그리지 않는다.
 * - `onAgree()` · `onDecline()` · `onClose()`(무응답) — 요청은 호스트가 한다. `busy` 동안 버튼·닫기를 잠근다.
 * - `error` — 처리 실패 문구. 창 안 버튼 위에 보인다.
 */
export default function PreferenceConsentModal({
  labels: L,
  deadline,
  error,
  busy = false,
  onAgree,
  onDecline,
  onClose,
}) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <ModalShell
      title={L.title}
      titleId="msc-pref-consent-modal-title"
      closeLabel={L.close}
      onClose={onClose}
      busy={busy}
      className="msc-shell"
      bodyClassName="msc-shell-body"
      testId="legacy-pref-consent-modal"
      closeTestId="legacy-pref-consent-close"
      footer={
        <>
          <Button variant="secondary" onClick={onDecline} disabled={busy} data-testid="legacy-pref-consent-decline">
            {L.decline}
          </Button>
          <Button variant="primary" onClick={onAgree} pending={busy} data-testid="legacy-pref-consent-agree">
            {L.agree}
          </Button>
        </>
      }
    >
      <p className="msc-pref-consent-body">
        {L.purpose}{' '}
        {L.sharedPrefix}<strong>{L.shared}</strong>{L.sharedSuffix}{' '}
        {L.noPenalty}
      </p>
      <div className="msc-pref-consent-check">
        <span className="msc-pref-consent-statement">{L.statement}</span>
        <button type="button" className="msc-link-btn" onClick={() => setShowDetail((v) => !v)}
          aria-expanded={showDetail} data-testid="legacy-pref-consent-view">
          {showDetail ? L.hide : L.view}
        </button>
      </div>
      {showDetail && (
        <dl className="msc-pref-consent-detail" data-testid="legacy-pref-consent-detail">
          {L.detail.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {deadline && (
        <p className="msc-pref-consent-legacy" data-testid="legacy-pref-consent-deadline">{deadline}</p>
      )}
      {error && (
        <p className="msc-input-error" role="alert" data-testid="legacy-pref-consent-error">{error}</p>
      )}
    </ModalShell>
  );
}
