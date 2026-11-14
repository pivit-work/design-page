import { useEffect, useState } from 'react';
import Switch from '../shared/Switch.jsx';
import Button from '../shared/Button.jsx';
import Select from '../shared/Select.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';

/**
 * 어드민 «연동 설정» 앱 연동 탭의 «휴가 캘린더 기록» 칸 (pivit-work PW-2791 · 연동 정책 screen-integrations §4-C-2).
 * 시안: pivit-specs `J. Admin_관리자/admin-app.jsx` `LeaveCalendarBlock`.
 *
 * - 머리 한 줄은 모든 역할에게 보인다. 켜기는 Admin 만 바꾸고, 그 밖의 역할은 켜짐/꺼짐만 본다(비활성 스위치).
 * - 켜면 아래 줄이 열린다 — 회사 연결이 없으면 [Google 계정 연결], 있으면 연결 계정 · [연결 바꾸기] · [연결 해제] ·
 *   «기록할 캘린더». 켜기는 캘린더를 고른 뒤 [저장]으로 저장한다. 끄기는 확인 창 없이 바로 저장(호스트가 한다).
 * - 꺼져 있어도 회사 연결이 남아 있으면 계정 줄과 [연결 해제]만 보인다(끈 뒤에도 취소된 휴가의 공용 일정을 지운다).
 * - 회사 연결이 거절되면 빨간 줄 — 글은 모두에게, [다시 연결]은 Admin 만.
 *
 * 값은 호스트가 준다: `state = { isAdmin, enabled, account, calendarId, calendarName, status, calendars, busy }`
 *   calendars = `{ state: 'idle'|'loading'|'error'|'ready', items: [{ id, name, primary }] }`
 *   busy = 'connect' | 'change' | 'reconnect' | 'save' | null — 구글 창이 떠 있거나 저장 중
 */
export default function AdminIntegrationsLeaveCalendar({
  state,
  labels,
  onTurnOff = () => {},
  onConnect = () => {},
  onSave = () => {},
  onDisconnect = () => {},
  onLoadCalendars = () => {},
}) {
  const L = labels;
  const { isAdmin, enabled, account, status, calendars, busy } = state;
  // 켜기 칸은 저장값에서 시작한다 — 켜기는 [저장] 전까지 이 화면에만 있다. 저장값 · 계정이 바뀌면 호스트(캔버스)가
  // key 로 다시 그려 처음 값으로 돌아온다.
  const [on, setOn] = useState(enabled);
  const [picked, setPicked] = useState(state.calendarId ?? '');
  const [confirmOff, setConfirmOff] = useState(false);

  const showPicker = isAdmin && on && !!account;
  useEffect(() => {
    if (showPicker && calendars.state === 'idle') onLoadCalendars();
  }, [showPicker, calendars.state, onLoadCalendars]);

  const toggle = (next) => {
    if (!isAdmin) return;
    setOn(next);
    if (!next && enabled) onTurnOff();
  };

  const calendarLabel = (c) => (c.primary ? `${c.name} ${L.primarySuffix}` : c.name);
  const savedName = state.calendarName;

  return (
    <section className="admin-card" data-testid="intg-leave-calendar">
      <h2 className="intg-section-title">{L.title}</h2>
      <p className="intg-section-desc">{L.description}</p>

      <div className="intg-setting-row">
        <span className="intg-setting-label">{L.sharedToggle}</span>
        <Switch
          checked={on}
          disabled={!isAdmin}
          label={L.sharedToggle}
          title={isAdmin ? undefined : L.adminOnly}
          onChange={toggle}
          data-testid="intg-leave-calendar-toggle"
        />
      </div>

      {isAdmin && on && !account && (
        <div className="intg-setting-row">
          <span className="intg-setting-label">{L.accountToUse}</span>
          <Button
            variant="secondary"
            size="sm"
            className="intg-btn"
            pending={busy === 'connect'}
            disabled={!!busy}
            onClick={() => onConnect('connect')}
          >
            {L.connect}
          </Button>
        </div>
      )}

      {isAdmin && account && (
        <div className="intg-setting-row">
          <span className="intg-setting-label">{L.account}</span>
          <div className="intg-actions">
            <span className="intg-setting-label" data-testid="intg-leave-calendar-account">{account}</span>
            {on && (
              <Button
                variant="secondary"
                size="sm"
                className="intg-btn"
                pending={busy === 'change'}
                disabled={!!busy}
                onClick={() => onConnect('change')}
              >
                {L.change}
              </Button>
            )}
            <Button variant="danger-ghost" size="sm" className="intg-btn" onClick={() => setConfirmOff(true)}>
              {L.disconnect}
            </Button>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="intg-setting-row">
          <span className="intg-setting-label">{L.calendar}</span>
          {calendars.state === 'error' ? (
            <div className="intg-note is-error has-action" data-testid="intg-leave-calendar-list-error">
              <span>{L.listFailed}</span>
              <Button variant="secondary" size="sm" className="intg-btn" onClick={onLoadCalendars}>
                {L.retry}
              </Button>
            </div>
          ) : (
            <Select
              className="intg-select"
              value={picked}
              aria-label={L.calendar}
              disabled={calendars.state !== 'ready'}
              onChange={(e) => setPicked(e.target.value)}
              data-testid="intg-leave-calendar-select"
            >
              <option value="">{calendars.state === 'ready' ? L.pickCalendar : L.loading}</option>
              {(calendars.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>{calendarLabel(c)}</option>
              ))}
            </Select>
          )}
        </div>
      )}

      {account && status === 'error' && (
        <div className="intg-note is-error has-action intg-leave-cal-error" data-testid="intg-leave-calendar-error">
          <span>{savedName ? `${L.error} · ${savedName}` : L.error}</span>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              className="intg-btn"
              pending={busy === 'reconnect'}
              disabled={!!busy}
              onClick={() => onConnect('reconnect')}
            >
              {L.reconnect}
            </Button>
          )}
        </div>
      )}

      {showPicker && (
        <div className="intg-actions intg-leave-cal-foot">
          <Button
            variant="primary"
            size="sm"
            className="intg-btn"
            pending={busy === 'save'}
            disabled={!picked || !!busy}
            onClick={() => onSave(picked)}
            data-testid="intg-leave-calendar-save"
          >
            {L.save}
          </Button>
        </div>
      )}

      {confirmOff && (
        <ConfirmModal
          title={L.disconnectTitle}
          body={L.disconnectBody.split('\n').map((line) => <div key={line}>{line}</div>)}
          confirmLabel={L.disconnect}
          cancelLabel={L.cancel}
          danger
          onCancel={() => setConfirmOff(false)}
          onConfirm={async () => {
            await onDisconnect();
            setConfirmOff(false);
            setOn(false);
          }}
          testId="intg-leave-calendar-disconnect"
        />
      )}
    </section>
  );
}
