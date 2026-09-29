import { useState } from 'react';
import DpStatusBadge from '../shared/StatusBadge.jsx';
import Avatar from '../shared/Avatar.jsx';
import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import DateInput from '../shared/DateInput.jsx';
import FormField from '../shared/FormField.jsx';
import TextArea from '../shared/TextArea.jsx';
import TextInput from '../shared/TextInput.jsx';
import { ArrowLeftGlyph, CalendarGlyph } from '../shared/lineIcons.jsx';
import Card from './Card.jsx';
import { IconAlert } from './employeesIcons.jsx';
import {
  ADMIN_OFFBOARDING_DEFAULT_LABELS,
  OFFBOARDING_AREAS,
  OFFBOARDING_CHOICE_AREAS as CHOICE_AREAS,
  OFFBOARDING_TYPE_IDS,
  offboardingCanRun,
} from './offboardingRules.js';

/**
 * AdminOffboardingCanvas — 퇴사 처리(오프보딩) 전체 화면 Pure 컴포넌트 (PW-1081).
 *
 * 기획서 `J. Admin_관리자/admin-app.jsx` 의 `OffboardingScreen` 을 옮겼다. 규칙 정본은
 * `screen-admin-offboarding.policy.md` (v1.8) §3·§4·§5·§5-A·§5-B · 엣지케이스 표.
 *
 * - 목록 행 `⋯ > 비활성화` 가 이 화면으로 **캔버스를 통째로 대체**한다(모달·패널이 아니다 —
 *   되돌릴 수 없는 일을 다른 화면 위에서 처리하면 뒤 화면이 여전히 유효해 보인다).
 * - 이 화면은 처분을 «정하지» 않는다. 여덟 영역 중 고를 수 있는 것은 둘뿐(§4)이고, 나머지에는
 *   컨트롤 자체를 만들지 않는다.
 * - 날짜는 캔버스가 시계를 읽지 않는다 — 조직 시간대의 «오늘»은 앱이 `today` 로 준다.
 *   퇴사일이 오늘이거나 지났으면 즉시 실행, 내일 이후면 «예약»이다(§5-B · 「오늘 ≥ 퇴사일」).
 * - 입력 상태(유형·날짜·선택값·사유·이름)만 안에서 들고, 실행은 `onRun(payload)` 로 넘긴다.
 *   실패는 `error` 로 받아 버튼 위에 그린다 — 입력은 그대로 둔다(§6-A).
 *
 * 스타일은 `admin.css`(카드) + `admin-kit.css`(안내 띠 · `.admin-offb-*`).
 */

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

/* 라벨 안의 `{key}` 를 값으로 바꾼다 — 이름·날짜·인원수를 아는 쪽이 여기다. */
function fill(template, vars) {
  return Object.keys(vars).reduce(
    (acc, k) => acc.split(`{${k}}`).join(String(vars[k])),
    String(template ?? ''),
  );
}

function Section({ n, title, desc, children, testId }) {
  return (
    <Card className="admin-offb-section">
      <div className="admin-offb-section-head" data-testid={testId}>
        <div className="admin-offb-section-titlebar">
          <span className="admin-offb-section-num" aria-hidden="true">{n}</span>
          <h2 className="admin-offb-section-title">{title}</h2>
        </div>
        {desc && <p className="admin-offb-section-desc">{desc}</p>}
      </div>
      {children}
    </Card>
  );
}

function Notice({ tone, title, children, testId, role }) {
  return (
    <div className={`admin-kit-notice is-${tone}${title ? ' has-title' : ''}`} data-testid={testId} role={role}>
      {tone !== 'neutral' && (
        <span className="admin-kit-notice-icon"><IconAlert size={14} /></span>
      )}
      <div className="admin-kit-notice-text">
        {title && <p className="admin-kit-notice-title">{title}</p>}
        {title ? <p className="admin-kit-notice-desc">{children}</p> : children}
      </div>
    </div>
  );
}

/* 영역 카드 하나 — 정본이 정한 규칙을 «보여주고», 고를 수 있는 자리에만 선택지를 준다. */
function AreaCard({
  area, labels, value, overridden, reason, onPick, onReason, onReset, disabled,
}) {
  const [open, setOpen] = useState(false);
  const text = labels.areas[area.id] || {};
  const choice = area.choice;
  const choiceText = choice ? labels.choices[choice.key] || {} : null;
  const whyId = `offboarding-why-body-${area.id}`;
  return (
    <div
      className={`admin-offb-area${overridden ? ' is-overridden' : ''}`}
      data-testid={`offboarding-area-${area.id}`}
    >
      <div className="admin-offb-area-head">
        <span className="admin-offb-area-name">{text.label}</span>
        <DpStatusBadge tone={area.state === 'choice' ? 'accent' : 'neutral'}>
          {labels.states[area.state]}
        </DpStatusBadge>
        {overridden && <DpStatusBadge tone="warning">{labels.states.overridden}</DpStatusBadge>}
        {/* 정본은 있으나 재확인 전(§3-A) — 「정해짐」과 같게 그리면 재확인이 필요하다는 사실이 사라진다 */}
        {area.recheck && <DpStatusBadge tone="warning">{labels.states.recheck}</DpStatusBadge>}
        <button
          type="button"
          className="admin-offb-textbtn admin-offb-area-why"
          aria-expanded={open}
          aria-controls={whyId}
          data-testid={`offboarding-why-${area.id}`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? labels.whyClose : labels.whyOpen}
        </button>
      </div>
      <p className="admin-offb-area-rule">{text.rule}</p>
      {/* 근거는 닫힌 상태가 기본 — 여덟 개를 다 펼치면 결정이 아니라 문서가 된다(§5) */}
      {open && (
        <div className="admin-offb-area-detail" id={whyId}>
          <p className="admin-offb-area-detail-text">{text.detail}</p>
        </div>
      )}
      {/* 고를 수 있는 자리 — 없는 영역에는 컨트롤 자체를 만들지 않는다(§1-A 2) */}
      {choice && (
        <div className="admin-offb-choice">
          <p className="admin-offb-choice-label">{choiceText.label}</p>
          <p className="admin-offb-choice-why">{choiceText.why}</p>
          <div className="admin-offb-options">
            {choice.options.map((opt) => (
              <Chip
                key={opt}
                selected={value === opt}
                disabled={disabled}
                onClick={() => onPick(opt)}
                data-testid={`offboarding-pick-${choice.key}-${opt}`}
              >
                {choiceText.options?.[opt] ?? opt}
              </Chip>
            ))}
          </div>
          {/* 덮어쓰면 사유를 남긴다(Q2) — 사유 없는 예외는 감사에 답할 수 없다 */}
          {overridden && (
            <FormField
              className="admin-offb-reason"
              label={labels.reasonLabel}
              required
              labelExtra={(
                <button
                  type="button"
                  className="admin-offb-textbtn is-underline"
                  data-testid={`offboarding-reset-${choice.key}`}
                  disabled={disabled}
                  onClick={onReset}
                >
                  {labels.resetToDefault}
                </button>
              )}
            >
              <TextArea
                rows={2}
                value={reason}
                placeholder={labels.reasonPlaceholder}
                invalid={!reason.trim()}
                disabled={disabled}
                data-testid={`offboarding-reason-${choice.key}`}
                onChange={(e) => onReason(e.target.value)}
              />
            </FormField>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {{ id: string, name: string, email?: string, avatarUrl?: string, department?: string,
 *   position?: string, resignedAt?: string|null, lastWorkingDate?: string|null, leaderOf?: string[] }} props.member
 * @param {string} props.today 'YYYY-MM-DD' — 조직 시간대의 오늘. 캔버스는 시계를 읽지 않는다
 * @param {{ okrPersonal: string, evalDrafts: string }} props.defaults 워크스페이스 퇴사 처리 기본값
 * @param {{ active: number, minimum?: number|null }} props.seats
 * @param {boolean} [props.running]
 * @param {string|null} [props.error] 실행 실패 문구 — 버튼 위에 그린다
 * @param {() => void} props.onBack
 * @param {() => void} props.onCancel
 * @param {(payload: object) => void} props.onRun
 * @param {object} [props.labels] 기본 라벨 위에 깊게 덮는다
 * @param {(iso: string) => string} [props.formatDate] 섹션 3 제목의 날짜 표기
 */
export default function AdminOffboardingCanvas({
  member,
  today,
  defaults,
  seats,
  running = false,
  error = null,
  onBack,
  onCancel,
  onRun,
  labels: providedLabels,
  formatDate,
}) {
  const labels = merge(ADMIN_OFFBOARDING_DEFAULT_LABELS, providedLabels);
  const sep = labels.listSeparator;

  const [type, setType] = useState(OFFBOARDING_TYPE_IDS[0]);
  const [resignationDate, setResignationDate] = useState(member.resignedAt || today);
  const [lastDay, setLastDay] = useState(member.lastWorkingDate || member.resignedAt || today);
  // 마지막 출근일의 기본은 «퇴사일과 같은 값»이다(정책 §5 표). 그래서 퇴사일을 바꾸면 따라간다 —
  // 오늘로 미리 채운 채 앞날 퇴사를 예약하면 목록이 「퇴직 예정 D-0」→「출근 종료」로 보였다(PW-1169).
  // 어드민이 마지막 출근일을 직접 고쳤거나, 구성원에게 이미 넣어 둔 값이 있으면 따라가지 않는다.
  const [lastDayTouched, setLastDayTouched] = useState(Boolean(member.lastWorkingDate));
  const [picks, setPicks] = useState(() => {
    const out = {};
    for (const a of CHOICE_AREAS) out[a.choice.key] = defaults?.[a.choice.key];
    return out;
  });
  const [reasons, setReasons] = useState({});
  const [typedName, setTypedName] = useState('');

  const isOverridden = (key) => picks[key] !== defaults?.[key];
  const overriddenAreas = CHOICE_AREAS.filter((a) => isOverridden(a.choice.key));
  const missingReason = overriddenAreas.filter((a) => !(reasons[a.choice.key] || '').trim());
  const recheckAreas = OFFBOARDING_AREAS.filter((a) => a.recheck);

  const nameOk = typedName.trim() === member.name;
  const lastDayAfter = Boolean(lastDay && resignationDate && lastDay > resignationDate);
  const due = today >= resignationDate;
  const canRun = offboardingCanRun({
    memberName: member.name, typedName, resignationDate, lastDay, picks, defaults, reasons,
  });

  const activeSeats = Number(seats?.active) || 0;
  const afterSeats = Math.max(0, activeSeats - 1);
  const minimum = seats?.minimum;
  const underMinimum = typeof minimum === 'number' && afterSeats < minimum;
  const leaderOf = member.leaderOf || [];
  const dateText = formatDate && resignationDate ? formatDate(resignationDate) : resignationDate;

  const areaLabel = (a) => labels.areas[a.id]?.label ?? a.id;

  const run = () => {
    if (!canRun || running) return;
    const outReasons = {};
    for (const a of overriddenAreas) outReasons[a.choice.key] = (reasons[a.choice.key] || '').trim();
    onRun?.({
      type,
      resignationDate,
      lastDay,
      picks: { ...picks },
      reasons: outReasons,
    });
  };

  return (
    <div className="admin-canvas admin-offb" data-testid="offboarding-canvas">
      <div className="admin-offb-header">
        <button
          type="button"
          className="admin-offb-textbtn admin-offb-back"
          data-testid="offboarding-back"
          disabled={running}
          onClick={onBack}
        >
          <ArrowLeftGlyph size={14} aria-hidden />
          {labels.back}
        </button>
        <h1 className="admin-offb-title">{labels.title}</h1>
        <p className="admin-page-subtitle">{labels.subtitle}</p>
      </div>

      {/* 1 — 대상자 */}
      <Section n="1" title={labels.sections.target}>
        <div className="admin-offb-person">
          <Avatar name={member.name} photo={member.avatarUrl || null} size={40} />
          <div className="admin-offb-person-text">
            <p className="admin-offb-person-name">
              {member.name}
              {member.position && <span className="admin-offb-person-position">{member.position}</span>}
            </p>
            <p className="admin-offb-person-meta">
              {[member.department, member.email].filter(Boolean).join(sep)}
            </p>
          </div>
        </div>

        <div className="admin-offb-fields">
          <FormField group label={labels.typeLabel} className="admin-offb-field">
            <div className="admin-offb-options">
              {OFFBOARDING_TYPE_IDS.map((id) => (
                <Chip
                  key={id}
                  selected={type === id}
                  disabled={running}
                  onClick={() => setType(id)}
                  data-testid={`offboarding-type-${id}`}
                >
                  {labels.types[id] ?? id}
                </Chip>
              ))}
            </div>
          </FormField>
          <FormField
            className="dp-field admin-offb-field"
            label={labels.resignationDate}
            required
            error={resignationDate ? undefined : labels.resignationDateRequired}
          >
            <span className="admin-offb-date">
              <CalendarGlyph size={20} className="admin-offb-date-icon" />
              <DateInput
                className="admin-offb-date-input"
                value={resignationDate}
                today={today}
                disabled={running}
                data-testid="offboarding-resignation-date"
                onChange={(v) => {
                  setResignationDate(v);
                  if (!lastDayTouched && v) setLastDay(v);
                }}
              />
            </span>
          </FormField>
          <FormField
            className="dp-field admin-offb-field"
            label={labels.lastDay}
            error={lastDayAfter ? labels.lastDayAfterResignation : undefined}
            hint={labels.lastDayHint}
          >
            <span className="admin-offb-date">
              <CalendarGlyph size={20} className="admin-offb-date-icon" />
              <DateInput
                className="admin-offb-date-input"
                value={lastDay}
                today={today}
                disabled={running}
                data-testid="offboarding-last-day"
                onChange={(v) => {
                  setLastDayTouched(true);
                  setLastDay(v);
                }}
              />
            </span>
          </FormField>
        </div>
      </Section>

      {/* 2 — 데이터 처리 */}
      <Section n="2" title={labels.sections.data} desc={labels.sections.dataDesc}>
        {recheckAreas.length > 0 && (
          <Notice tone="warn" testId="offboarding-recheck-notice">
            {fill(labels.recheckNotice, { areas: recheckAreas.map(areaLabel).join(sep) })}
          </Notice>
        )}
        <div className="admin-offb-areas">
          {OFFBOARDING_AREAS.map((area) => {
            const key = area.choice?.key;
            return (
              <AreaCard
                key={area.id}
                area={area}
                labels={labels}
                disabled={running}
                value={key ? picks[key] : undefined}
                overridden={Boolean(key) && isOverridden(key)}
                reason={key ? reasons[key] || '' : ''}
                onPick={(v) => setPicks((p) => ({ ...p, [key]: v }))}
                onReason={(v) => setReasons((r) => ({ ...r, [key]: v }))}
                /* 선택값과 사유를 «동시에» 지운다 — 사유만 남으면 다음 사람이 이유를 묻는다(§4-A · E5) */
                onReset={() => {
                  setPicks((p) => ({ ...p, [key]: defaults?.[key] }));
                  setReasons((r) => {
                    const next = { ...r };
                    delete next[key];
                    return next;
                  });
                }}
              />
            );
          })}
        </div>
      </Section>

      {/* 3 — 일어나는 일 */}
      <Section
        n="3"
        testId="offboarding-effects-title"
        title={due ? labels.sections.effectsDue : fill(labels.sections.effectsScheduled, { date: dateText })}
      >
        <div className="admin-offb-stack">
          {/* E3 — 조직장·스쿼드 리드면 자리가 빈다는 것을 먼저 말한다. 실행은 막지 않고 자동 승계도 없다 */}
          {leaderOf.length > 0 && (
            <Notice tone="warn" title={labels.effects.leaderWarning} testId="offboarding-leader-warning">
              {fill(labels.effects.leaderOf, { names: leaderOf.join(sep) })}
            </Notice>
          )}
          {!due && resignationDate && (
            <Notice tone="neutral" testId="offboarding-schedule-notice">
              {labels.effects.scheduleNotice}
            </Notice>
          )}
          <ul className="admin-offb-effects">
            <li>{labels.effects.status}</li>
            <li data-testid="offboarding-seats">
              {fill(labels.effects.seats, { from: activeSeats, to: afterSeats })}{' '}
              {underMinimum
                ? <span data-testid="offboarding-seats-minimum">{fill(labels.effects.seatsMinimum, { minimum })}</span>
                : labels.effects.seatsBilling}
            </li>
            <li>{labels.effects.candidates}</li>
            <li>{labels.effects.oneOnOne}</li>
          </ul>
          <Notice tone="neutral">{labels.effects.retention}</Notice>
        </div>
      </Section>

      {/* 4 — 확인 */}
      <Section n="4" title={labels.sections.confirm} desc={labels.sections.confirmDesc}>
        <div className="admin-offb-stack">
          {missingReason.length > 0 && (
            <Notice tone="warn" testId="offboarding-missing-reason">
              {fill(labels.missingReason, { areas: missingReason.map(areaLabel).join(sep) })}
            </Notice>
          )}
          {error && (
            <Notice tone="error" role="alert" testId="offboarding-error">{error}</Notice>
          )}
          <div className="admin-offb-confirm">
            <FormField
              className="admin-offb-name"
              label={labels.nameLabel}
              error={typedName && !nameOk ? labels.nameMismatch : undefined}
            >
              <TextInput
                value={typedName}
                placeholder={member.name}
                autoComplete="off"
                disabled={running}
                data-testid="offboarding-name-input"
                onChange={(e) => setTypedName(e.target.value)}
              />
            </FormField>
            <div className="admin-offb-actions">
              <Button
                variant="ghost"
                disabled={running}
                data-testid="offboarding-cancel"
                onClick={onCancel}
              >
                {labels.cancel}
              </Button>
              <Button
                variant="danger"
                disabled={!canRun || running}
                data-testid="offboarding-run"
                onClick={run}
              >
                {running ? labels.running : due ? labels.run : labels.reserve}
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
