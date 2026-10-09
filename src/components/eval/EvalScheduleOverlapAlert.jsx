import AppConfirmModal from '../shared/ConfirmModal.jsx';

/**
 * 단계 겹침 안내 창 [정책 §4.5 「오버랩 얼럿 팝업」] — 마법사 3단계와 일정 수정 창이 함께 쓴다.
 *
 * 편집으로 «전에 없던» 겹침이 생긴 순간 뜬다. 겹치는 단계 쌍을 적고 「병렬 진행됩니다」를
 * 알린다. 🔴 막지 않는다 — 답을 받지 않는 안내라 [확인] 하나뿐이고, 닫으면 고치던 값은 그대로다.
 *
 * 공용 확인 창(`ConfirmModal`)으로 그린다 — `document.body` 직속 포털이라 일정 창·마법사 창
 * (공용 창 틀, 1000) 위에 서고 막이 왼쪽 메뉴까지 덮는다. 부르는 쪽은 이 창을 자기 창 틀의
 * «형제»로 둔다 — 안에 두면 이 창 막을 누른 클릭이 밑 창의 막까지 올라가 밑 창이 닫힌다.
 *
 * Props: `pairs` — `[{ key, a, b }]`(`getOverlapPairs`), `labels` — `overlapAlertTitle` ·
 * `overlapAlertBody` · `overlapAlertConfirm`, `onClose`.
 */
export default function EvalScheduleOverlapAlert({ pairs, labels: L, onClose, testId = 'evc-sched-overlap-alert' }) {
  if (!pairs || pairs.length === 0) return null;
  return (
    <AppConfirmModal
      testId={testId}
      confirmTestId={`${testId}-ok`}
      title={L.overlapAlertTitle}
      body={
        <div className="evc-sched-confirm">
          <ul className="evc-sched-confirm-list">
            {pairs.map((p) => (
              <li
                key={p.key}
                className="evc-sched-confirm-row is-pair"
                data-testid={`${testId}-pair-${p.key}`}
              >
                <span className="evc-sched-confirm-name">{p.a}</span>
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M8 7l-4 5 4 5" />
                  <path d="M16 7l4 5-4 5" />
                  <path d="M4 12h16" />
                </svg>
                <span className="evc-sched-confirm-name">{p.b}</span>
              </li>
            ))}
          </ul>
          <div>{L.overlapAlertBody}</div>
        </div>
      }
      confirmLabel={L.overlapAlertConfirm}
      hideCancel
      onConfirm={onClose}
      onCancel={onClose}
    />
  );
}
