import AvatarPhoto from './AvatarPhoto.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { CheckCircleIcon, MailIcon } from './evalIcons.jsx';

/**
 * EvalStageRoster — 진행 현황 «단계 상세»의 「미완료 N / 완료 N」 두 명단과
 * 「미완료 일괄 리마인더」 버튼. 정책 `screen-eval-cycle-hr.policy.md` §6.8 (PW-854).
 *
 * 순수 표현이다. 🔴 **누가 미완료인지·리마인더가 누구에게 가는지를 여기서 정하지 않는다** —
 * 하향 리뷰는 명단(피평가자)과 받는 사람(리더)이 달라서, 그 판정은 서버가 하고 여기는 받은
 * 명단을 그린다. 줄의 부속 정보(`sub`)도 호출부가 사람이 읽는 말로 만들어 넘긴다.
 *
 * 발송 기록(`EvalReminderDispatchLog`)은 이 아래에 놓는다 — 기획서가 정한 자리다(§6.10.1).
 */
function initial(name) {
  const s = (name || '').trim();
  return s ? s.slice(0, 1) : '?';
}

function Group({ testId, title, tone, list, emptyLabel, renderAction }) {
  return (
    <div className={`evmon-roster-group tone-${tone}`} data-testid={testId}>
      <div className="evmon-roster-head">
        <span className="evmon-roster-title">{title}</span>
        <StatusBadge className={`evc-status-badge ${tone === 'pending' ? 'tone-warn' : 'tone-success'}`} data-testid={`${testId}-count`}>
          {list.length}
        </StatusBadge>
      </div>
      {list.length === 0 ? (
        <p className="evc-empty-sub evmon-roster-empty">{emptyLabel}</p>
      ) : (
        list.map((row) => (
          <div className="evmon-roster-row" key={row.id} data-testid={`${testId}-row`}>
            <span className="evmon-roster-person">
              <span className="evmon-roster-avatar" aria-hidden="true">
                {initial(row.name)}
                <AvatarPhoto photo={row.avatar} name={row.name} />
              </span>
              <span className="evmon-roster-name">{row.name}</span>
            </span>
            <span className="evmon-roster-sub">{row.sub}</span>
            <span className="evmon-roster-action">{renderAction(row)}</span>
          </div>
        ))
      )}
    </div>
  );
}

export default function EvalStageRoster({
  /** `[{ id, name, avatar, sub, canRemind }]` — `canRemind=false` 면 그 줄은 보낼 곳이 없다(리더 없는 하향 리뷰 줄). */
  pending = [],
  /** `[{ id, name, avatar, sub }]` */
  done = [],
  pendingTitle = '미완료',
  doneTitle = '완료',
  emptyLabel = '해당 대상이 없습니다.',
  doneLabel = '완료',
  remindLabel = '리마인더',
  /** 「미완료 일괄 리마인더」 버튼 글. 안 주면 버튼을 그리지 않는다. */
  remindAllLabel = '',
  /** 받는 사람이 0명이면 누를 수 없다 — 호출부가 서버가 준 인원으로 판정한다. */
  remindAllDisabled = false,
  busy = false,
  loading = false,
  loadingLabel = '불러오는 중…',
  error = null,
  retryLabel = '다시 시도',
  onRetry,
  onRemindAll,
  onRemindOne,
}) {
  if (error) {
    return (
      <p className="evc-empty-sub" data-testid="evmon-roster-error">
        {error}
        {onRetry && (
          <button type="button" className="evc-btn is-ghost" onClick={() => onRetry()} data-testid="evmon-roster-retry">
            {retryLabel}
          </button>
        )}
      </p>
    );
  }
  if (loading) {
    return <p className="evc-empty-sub" data-testid="evmon-roster-loading">{loadingLabel}</p>;
  }

  return (
    <div className="evmon-roster" data-testid="evmon-roster">
      {remindAllLabel && onRemindAll && (
        <div className="evmon-roster-actions">
          <button
            type="button"
            className="evc-btn is-ghost"
            disabled={remindAllDisabled || busy}
            onClick={() => onRemindAll()}
            data-testid="evmon-roster-remind-all"
          >
            <MailIcon size={14} /> {remindAllLabel}
          </button>
        </div>
      )}
      <Group
        testId="evmon-roster-pending"
        title={pendingTitle}
        tone="pending"
        list={pending}
        emptyLabel={emptyLabel}
        renderAction={(row) =>
          onRemindOne && row.canRemind !== false ? (
            <button
              type="button"
              className="evc-btn is-ghost"
              disabled={busy}
              onClick={() => onRemindOne(row.id)}
              data-testid="evmon-roster-remind-one"
            >
              {remindLabel}
            </button>
          ) : null
        }
      />
      <Group
        testId="evmon-roster-done"
        title={doneTitle}
        tone="done"
        list={done}
        emptyLabel={emptyLabel}
        renderAction={() => (
          <span className="evmon-roster-done">
            <CheckCircleIcon size={14} /> {doneLabel}
          </span>
        )}
      />
    </div>
  );
}
