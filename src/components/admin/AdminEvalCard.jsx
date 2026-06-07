import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';
import LinkButton from './LinkButton.jsx';

function pct(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

/**
 * 상시 평가 카드 — 1on1 KPI 그래프 톤 (12px 청크 바 + 블루 % 값).
 *
 * evalCard null 이면 빈 상태 메시지, 그 외엔 셀프/매니저 두 progress 바.
 * labels: { sectionTitle, manageEval, cardHeading, inProgressBadge,
 *           selfReviewDone, managerReviewDone, sendReminder, emptyEval }
 */
export default function AdminEvalCard({ evalCard, labels, onManageEval, onSendReminder }) {
  return (
    <Card>
      <div className="admin-section-header">
        <SectionLabel>{labels.sectionTitle}</SectionLabel>
        <LinkButton onClick={onManageEval}>{labels.manageEval}</LinkButton>
      </div>
      {evalCard ? (
        <>
          <div className="admin-eval-heading-row">
            <span className="admin-eval-name">{labels.cardHeading}</span>
            <span className="admin-eval-inprogress">{labels.inProgressBadge}</span>
          </div>
          {[
            { label: labels.selfReviewDone, done: evalCard.selfDone },
            { label: labels.managerReviewDone, done: evalCard.managerDone },
          ].map((r) => {
            const p = pct(r.done, evalCard.total);
            return (
              <div key={r.label} className="admin-eval-progress-row">
                <div className="admin-eval-progress-label-row">
                  <span className="admin-eval-progress-label">{r.label}</span>
                  <span>
                    <span className="admin-eval-progress-value">{p}%</span>
                    <span className="admin-eval-progress-fraction">{r.done}/{evalCard.total}</span>
                  </span>
                </div>
                <div className="admin-eval-bar">
                  <div className="admin-eval-bar-fill" style={{ width: `${p}%` }} />
                </div>
              </div>
            );
          })}
          <button type="button" className="admin-eval-reminder-button" onClick={onSendReminder}>
            {labels.sendReminder}
          </button>
        </>
      ) : (
        <div className="admin-eval-empty">{labels.emptyEval}</div>
      )}
    </Card>
  );
}
