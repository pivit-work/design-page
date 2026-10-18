import AppConfirmModal from '../shared/ConfirmModal.jsx';
import { stampScheduleDateTime } from './evalScheduleStamp.js';

const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

/**
 * 「일정을 이렇게 바꿀까요?」 — 단계 일정을 저장하기 전에 바뀐 단계만 «이전 → 변경»으로 보여 주는 확인 창.
 *
 * PW-602 때 사이클 목록의 일정 수정 창 안에 그렸던 것을 값 그대로 꺼냈다(PW-1962). 같은 일정을
 * 고치는 관리 › 단계별 일정 탭도 이 창을 쓴다 — 두 화면이 다른 확인을 하면 한쪽에서만 알림 안내를 본다.
 *
 * `rows` — `[{ id, name, before: { start, end }, after: { start, end } }]`. 값은 `YYYY-MM-DDTHH:mm`.
 */
export default function ScheduleChangeConfirm({ rows, labels: L, saving, onConfirm, onCancel }) {
  /* 한 줄 — `시작 ~ 종료`. 비어 있는 끝은 「미정」(—만 두면 무엇이 빠졌는지 안 읽힌다). */
  const formatRange = (r) => {
    const one = (v) => (v ? stampScheduleDateTime(v, L) : L.scheduleConfirmEmpty);
    return `${one(r?.start)} ~ ${one(r?.end)}`;
  };
  return (
    <AppConfirmModal
      testId="evc-sched-confirm"
      title={L.scheduleConfirmTitle}
      body={
        <div className="evc-sched-confirm">
          <div>{fill(L.scheduleConfirmBody, { count: rows.length })}</div>
          <ul className="evc-sched-confirm-list">
            {rows.map((r) => (
              <li
                key={r.id}
                className="evc-sched-confirm-row"
                data-testid={`evc-sched-confirm-row-${r.id}`}
              >
                <span className="evc-sched-confirm-name">{r.name}</span>
                <span className="evc-sched-confirm-line">
                  <span className="evc-sched-confirm-tag">{L.scheduleConfirmBefore}</span>
                  <span data-testid={`evc-sched-confirm-before-${r.id}`}>
                    {formatRange(r.before)}
                  </span>
                </span>
                <span className="evc-sched-confirm-line is-after">
                  <span className="evc-sched-confirm-tag">{L.scheduleConfirmAfter}</span>
                  <span data-testid={`evc-sched-confirm-after-${r.id}`}>
                    {formatRange(r.after)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
      confirmLabel={saving ? L.submitting : L.scheduleConfirmSave}
      cancelLabel={L.scheduleConfirmBack}
      busy={saving}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
