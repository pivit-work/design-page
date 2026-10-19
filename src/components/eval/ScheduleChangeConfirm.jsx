import { useEffect, useRef, useState } from 'react';
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
/** `YYYY-MM-DDTHH:mm` → `MM/DD HH:mm` (정책 §4.5 축소 경고의 표기). */
const shortStamp = (v) => {
  const m = /^\d{4}-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(v ?? '');
  return m ? `${m[1]}/${m[2]}${m[3] ? ` ${m[3]}` : ''}` : '';
};

/**
 * [PW-2077 · 정책 §4.5 «저장 확인 창»] 진행 중인 단계의 종료를 «당겼을 때만» 그 단계마다
 * `{단계} 미제출 K명 — 마감이 MM/DD HH:mm로 당겨집니다.` 를 적는다. K 는 소비 측이 진행 현황과
 * 같은 서버 집계로 준다(`onLoadPending` → `{ [단계 id]: { count, unit: 'people'|'cases' } }`).
 * 못 받아도 저장은 막지 않는다 — 마감 당김은 경고이지 차단이 아니다(spec §4.1.2-A).
 * `isRunning(id)` 는 «연 순간 시작했고 아직 안 끝난 단계»인가. 안 넘기면 경고 줄이 없다.
 */
export default function ScheduleChangeConfirm({
  rows,
  labels: L,
  saving,
  onConfirm,
  onCancel,
  isRunning,
  onLoadPending,
}) {
  const shortened = rows.filter(
    (r) =>
      typeof isRunning === 'function' &&
      isRunning(r.id) &&
      r.before?.end &&
      r.after?.end &&
      String(r.after.end) < String(r.before.end),
  );
  const wantPending = shortened.length > 0 && typeof onLoadPending === 'function';
  const [pending, setPending] = useState({ status: wantPending ? 'loading' : 'off' });
  const load = useRef(onLoadPending);
  useEffect(() => {
    load.current = onLoadPending;
  });
  useEffect(() => {
    if (!wantPending) return undefined;
    let alive = true;
    Promise.resolve()
      .then(() => load.current())
      .then((data) => alive && setPending({ status: 'ready', data: data ?? {} }))
      .catch(() => alive && setPending({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [wantPending]);
  const shortenedLine = (r) => {
    const end = shortStamp(r.after.end);
    if (pending.status === 'error' || (pending.status === 'ready' && !pending.data[r.id])) {
      return fill(L.scheduleConfirmShortenedFailed ?? '', { name: r.name, end });
    }
    const hit = pending.status === 'ready' ? pending.data[r.id] : null;
    const key = hit?.unit === 'cases' ? 'scheduleConfirmShortenedCases' : 'scheduleConfirmShortened';
    return fill(L[key] ?? '', { name: r.name, count: hit ? hit.count : '…', end });
  };
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
          {shortened.map((r) => (
            <p
              key={r.id}
              className="evx-notice is-warn"
              data-testid={`evc-sched-confirm-shortened-${r.id}`}
            >
              {shortenedLine(r)}
            </p>
          ))}
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
