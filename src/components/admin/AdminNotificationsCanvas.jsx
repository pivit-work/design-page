import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import DatePicker from '../shared/DatePicker.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Switch from '../shared/Switch.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Select from '../shared/Select.jsx';
import Button from '../shared/Button.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import { Panel } from '../frames/Panel.jsx';
import { StatStrip } from '../frames/StatStrip.jsx';
import { NoticeLines } from '../frames/NoticeLines.jsx';
import { FrameTable } from '../frames/FrameTable.jsx';
import { FormModal } from '../frames/FormModal.jsx';

/**
 * AdminNotificationsCanvas — 어드민 "알림 설정" 화면 Pure 컴포넌트.
 * pivit-specs 의 admin-notif-settings.jsx 시안을 design-page 정본으로 포팅.
 *
 * 시안 대비 차이 (정본화):
 *  - 시안의 자체 페이지 헤더·어드민 사이드 레일·paddingLeft 는 제거.
 *    호스트 앱(AdminPanelPage 셸)이 공용 SideNav·top-nav 크롬을 제공한다.
 *  - 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·persist 소유).
 *  - cooldown / 조건 미리보기 문자열은 호스트가 i18n 으로 포매팅한다
 *    (formatCooldown / formatCondition 콜백). Canvas 는 한국어를 하드코딩하지 않는다.
 *  - conditionSchema 의 라벨·옵션, cooldown 편집기의 단위·요일·시각 옵션도
 *    호스트가 t() 로 미리 해소해 넘긴다.
 *
 * 모양(PW-3125 · 커트 11-19 시안): 공용 틀(design-page `components/frames/` · PW-3139)로 짠다 — 요약은 숫자 칸 줄,
 * 안내는 안내 줄, 묶음은 흰 판, 단계별 채널은 표, 수정 창 칸 이름은 입력 창 칸 틀. 페이지 제목은 호스트가 그린다
 * (불러오는 중 · 실패에도 제목이 남아야 해서). 틀은 그 틀이 따른 디자이너 스타일시트를 쓰는 쪽이 불러온다
 * (frames.css · okr.css · modal-shell.css · timeline.css · meetings.css · org_list.css · manager.css).
 *
 * UI 상태(필터·편집 대상·모달 내부 draft)만 내부에서 관리한다.
 * 스타일은 design-page 토큰 기반 src/admin.css (.admin-notif-*) 클래스.
 * 호스트 앱은 `@pivit-work/design-page/styles/admin.css` 를 import 해야 한다.
 *
 * 데이터 형태:
 *  groups: [{ id, group, rules: Rule[] }]
 *  Rule: {
 *    id, label, desc, conditionFixed,
 *    conditionSchema: Param[] | null,   // Param: { key, label, type:'select'|'number', options?, min?, max?, step?, unit?, isTimeParam? }
 *    conditionValues: object | null,
 *    recipients: string[],              // 'member' | 'manager' | 'admin'
 *    channels: string[],                // 'push' | 'slack' | 'email'
 *    targetsFixed?: string,             // 받는 사람·채널을 다른 화면이 정할 때의 안내. 있으면 수정 창의
 *                                       // 두 칸이 체크 대신 잠금 안내로, 목록 행의 역할·채널 표시도 이 안내로 바뀐다
 *    stageChannels?: [{ key, label, channels, to? }], // 단계마다 채널을 고르는 규칙(PW-1986 · admin-spec §6.1 «평가»).
 *                                       // to = 단계 이름 아래 작은 줄(받는 사람 · PW-3125)
 *    stageColumnTitle?: string,         // 표 첫 칸 머리. 없으면 labels.modal.stageColumn
 *                                       // 있으면 받는 사람 칸은 targetsFixed 잠금 안내, 채널 칸은 단계별 표가 되고
 *                                       // 목록 행은 그 안내 + 표의 합집합 채널(rule.channels)을 보인다
 *    stageChannelsNote?: string,        // 단계별 표 밑 안내
 *    stageChannelsTitle?: string,       // 표 제목. 없으면 labels.modal.stageChannels (PW-2089 «리마인더 기본 채널»)
 *    stageChannelKeys?: string[],       // 표의 열(채널). 없으면 push·slack·email 전부 (PW-2089 — 이메일·Slack 만)
 *    stageChannelsRequireOne?: bool,    // 줄마다 채널 하나는 남긴다 — 마지막 하나는 끌 수 없다 (PW-2089)
 *    lockedChannels?: string[],         // 회사가 끌 수 없는 채널(pivit-work PW-2547). 수정 창에서 켠 채 잠기고 말풍선
 *                                       // labels.modal.channelLocked 가 뜬다. 저장값에 없어도 켜진 칸으로 보인다
 *    enabled: bool,
 *    alwaysOn?: bool,                   // 회사도 끌 수 없는 규칙(PW-2597). 줄 스위치 자리와 수정 창 «이 알림 활성화» 자리에
 *                                       // «끌 수 없음»을 둔다(기획서 admin-app.jsx RuleRow · EditRuleModal · PW-3125)
 *    mandatoryControl?: 'open'|'fixed', // 회사가 줄마다 필수로 올리는 칸(pivit-work PW-3258 · admin-spec §6.3-A). 'open' = 수정 창
 *                                       // «필수 알림» 스위치 · 'fixed' = 처음부터 필수(스위치 대신 labels.modal.mandatoryFixed) · 없으면 칸 없음
 *    mandatory?: bool,                  // 지금 필수인가. 참이면 줄 이름 바로 뒤 배지 labels.mandatoryBadge. 'open' 줄은 저장 때 onSave 로 함께 간다
 *    recipientsFixed?: string,          // 받는 사람만 정해진 규칙의 안내(PW-2099 · spec-eval-cycle §14.4 N-2). 있으면
 *                                       // 수정 창의 받는 사람 칸은 잠금 안내, 채널은 그대로 체크로 고르고, 목록 행은
 *                                       // 역할 칩 대신 이 안내 + 채널을 보인다
 *    cooldown: { mode:'custom'|'immediate'|'event', ... },
 *  }
 *  cooldownOptions: { unitOptions, weekdayOptions, timeOptions, monthDayOptions } — [{value,label}]
 */

const ROLE_KEYS = ['member', 'manager', 'admin'];
const CHANNEL_KEYS = ['push', 'slack', 'email'];

/* design-page solid 아이콘(monochrome) — 이모지 대신 정본 아이콘 세트를 쓴다.
   Icon 컴포넌트가 fill 을 color 로 치환하므로 currentColor 톤으로 렌더된다. */
const CHANNEL_ICON_SRC = {
  push: '/icons-solid/bell-01.svg',
  slack: '/icons-solid/message-chat-circle.svg',
  email: '/icons-solid/mail-01.svg',
};
const ICON_LOCK = '/icons-solid/lock-keyhole-square.svg';
const ICON_PREVIEW = '/icons-solid/eye.svg';
const ICON_INFO = '/icons-solid/info-circle.svg';
const ICON_EDIT = '/icons-solid/edit-05.svg';

const DEFAULT_LABELS = {
  stats: { total: '전체 규칙', active: '활성', inactive: '비활성', unit: '개' },
  // 안내 — 문장마다 한 줄(첫 줄 진하게 · 둘째 보통 · 셋째부터 작고 옅게). 글 하나로 주면 한 줄로 보인다.
  infoBanner: [
    '조직 전체 알림 규칙을 관리합니다.',
    '"조건 편집 가능" 배지가 있는 규칙은 발동 임계값을 직접 수정할 수 있습니다.',
    '팀원은 평가 알림 중 사본(참조 리마인더·리포트 승인)만 끌 수 있습니다. 일정·할 일 알림은 끌 수 없습니다.',
  ],
  filterLabel: '수신 대상 필터',
  // 필터를 골랐을 때 줄 오른쪽 — 글이면 {n} 자리에 보이는 규칙 수, 함수면 (n) => 글
  filterCount: '규칙 {n}개 보임',
  filterAll: '전체',
  groupActiveSuffix: '활성', // "N / M 활성"
  editableBadge: '조건 편집 가능',
  mandatoryBadge: '필수', // 회사가 올렸거나 처음부터 필수인 줄(pivit-work PW-3258 · admin-spec §6.3-A)
  alwaysOn: '끌 수 없음',
  editBtn: '수정',
  enableAll: '전체 알림 활성화',
  disableAll: '전체 알림 비활성화',
  roles: { member: '팀원', manager: '매니저', admin: '어드민' },
  channels: { push: '푸시', slack: 'Slack', email: '이메일' },
  modal: {
    enableThis: '이 알림 활성화',
    alwaysOn: '끌 수 없음 — 채널만 바꿀 수 있어요',
    mandatory: '필수 알림',
    mandatoryDesc: '켜면 구성원이 내 설정 › 알림에서 끌 수 없습니다. 이메일 알림을 끈 사람과 집중 시간인 사람에게도 보냅니다.',
    mandatoryFixed: '늘 필수 — 바꿀 수 없어요',
    mandatoryOffNote: '지금은 이 알림이 꺼져 있어 아무에게도 가지 않습니다',
    perRuleFixed: '알림마다 고정', // 받는 사람이 알림마다 정해진 칸의 딱지
    stageColumn: '단계',
    channelLockedNote: '자물쇠가 붙은 채널은 이 알림에서 끌 수 없습니다.',
    condition: '발동 조건',
    systemFixed: '시스템 고정',
    preview: '미리보기',
    cooldown: '발송 주기',
    recipients: '수신 대상',
    channels: '발송 채널',
    stageChannels: '단계별 발송 채널',
    channelLocked: '이 알림은 이 채널을 끌 수 없습니다',
    cancel: '취소',
    save: '저장',
    close: '닫기',
  },
  cooldown: {
    every: '매',
    per: '마다',
    weekdayTitle: '요일',
    monthDayTitle: '날짜',
    sendTime: '발송 시각',
    timeFromCondition: '발송 시각은 위 발동 조건의 시각 설정을 따릅니다',
    startDateTitle: '시작일자',
    endDateTitle: '종료일자',
    immediate: '즉시 시작',
    pickDate: '날짜 지정',
    noEnd: '종료 없음',
  },
};

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

/* ── 토글 스위치 ───────────────────────────────────────── */

/* ── 세그먼트 버튼 (라디오 대체) — 공용 SegmentedControl(PW-836) ── */
function SegBtn({ options, value, onChange }) {
  return <SegmentedControl items={options} value={value} onChange={onChange} block />;
}

/* ── 파라미터 입력 (select / number) ───────────────────── */
function ParamField({ param, value, onChange }) {
  if (param.type === 'select') {
    return (
      <Select
        className="admin-notif-input admin-notif-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={param.label}
      >
        {param.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    );
  }
  return (
    <>
      <input
        type="number"
        className="admin-notif-input admin-notif-number"
        value={value}
        min={param.min}
        max={param.max}
        step={param.step || 1}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        aria-label={param.label}
      />
      {param.unit && <span className="admin-notif-param-unit">{param.unit}</span>}
    </>
  );
}

/* ── 발송 주기 편집 (Google Calendar 스타일) ───────────── */
function CooldownEditor({ cooldown, onChange, hasTimeParam, options, labels, baseUrl, intervalError }) {
  // 날짜 picker 팝오버 상태: { field:'startDate'|'endDate', rect, el }
  // (Rules of Hooks: 조기 return 전에 선언)
  const [picker, setPicker] = useState(null);
  const openPicker = (field) => (e) =>
    setPicker({ field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });

  if (cooldown.mode !== 'custom') return null;
  const cd = cooldown;
  const timeValue = `${cd.startHour}:${cd.startMin}`;

  const toggleWeekDay = (d) => {
    const cur = cd.weekDays || [];
    onChange({ ...cd, weekDays: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  };

  return (
    <div className="admin-notif-cooldown-edit">
      {/* ① 반복 단위 */}
      <div className="admin-notif-row-inline">
        <span className="admin-notif-inline-label">{labels.every}</span>
        <input
          type="number"
          className="admin-notif-input admin-notif-number is-interval"
          min={1}
          max={99}
          value={cd.interval}
          /* 적은 숫자를 그대로 둔다 — 0·빈 칸을 말없이 1 로 바꾸지 않고 아래 안내(intervalError)로 알린다(pivit-work PW-2569) */
          onChange={(e) => onChange({ ...cd, interval: e.target.value === '' ? '' : Number(e.target.value) })}
          aria-label={labels.every}
        />
        <Select
          className="admin-notif-input admin-notif-select"
          value={cd.unit}
          onChange={(e) => onChange({ ...cd, unit: e.target.value, weekDays: [], monthDay: 1 })}
        >
          {options.unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <span className="admin-notif-inline-label">{labels.per}</span>
      </div>
      {intervalError && (
        <div className="admin-notif-field-error" role="alert" data-testid="notif-interval-error">{intervalError}</div>
      )}

      {/* ② 요일 — week */}
      {cd.unit === 'week' && (
        <div>
          <div className="admin-notif-sub-label">{labels.weekdayTitle}</div>
          <div className="admin-notif-weekdays">
            {options.weekdayOptions.map((d) => {
              const active = (cd.weekDays || []).includes(d.value);
              return (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => toggleWeekDay(d.value)}
                  className={`admin-notif-weekday${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ③ 날짜 — month */}
      {cd.unit === 'month' && (
        <div className="admin-notif-row-inline">
          <span className="admin-notif-inline-label">{labels.monthDayTitle}</span>
          <Select
            className="admin-notif-input admin-notif-select"
            value={cd.monthDay}
            onChange={(e) => onChange({ ...cd, monthDay: Number(e.target.value) })}
          >
            {options.monthDayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      )}

      {/* ④ 발송 시각 — isTimeParam 이면 안내로 대체 */}
      {hasTimeParam ? (
        <div className="admin-notif-time-note">
          <Icon src={ICON_INFO} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
          {labels.timeFromCondition}
        </div>
      ) : (
        <div className="admin-notif-row-inline">
          <span className="admin-notif-inline-label is-fixed">{labels.sendTime}</span>
          <Select
            className="admin-notif-input admin-notif-select"
            value={timeValue}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              onChange({ ...cd, startHour: h, startMin: m });
            }}
          >
            {options.timeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
      )}

      {/* ⑤ 시작일자 */}
      <div>
        <div className="admin-notif-sub-label">{labels.startDateTitle}</div>
        <SegBtn
          options={[{ value: 'immediate', label: labels.immediate }, { value: 'date', label: labels.pickDate }]}
          value={cd.startDate ? 'date' : 'immediate'}
          onChange={(v) => onChange({ ...cd, startDate: v === 'date' ? (cd.startDate || todayIso()) : null })}
        />
        {cd.startDate && (
          <button
            type="button"
            className={`admin-notif-input admin-notif-date${picker?.field === 'startDate' ? ' is-open' : ''}`}
            onClick={openPicker('startDate')}
          >
            {cd.startDate}
          </button>
        )}
      </div>

      {/* ⑥ 종료일자 */}
      <div>
        <div className="admin-notif-sub-label">{labels.endDateTitle}</div>
        <SegBtn
          options={[{ value: 'none', label: labels.noEnd }, { value: 'date', label: labels.pickDate }]}
          value={cd.endDate ? 'date' : 'none'}
          onChange={(v) => onChange({ ...cd, endDate: v === 'date' ? (cd.endDate || todayIso()) : null })}
        />
        {cd.endDate && (
          <button
            type="button"
            className={`admin-notif-input admin-notif-date${picker?.field === 'endDate' ? ' is-open' : ''}`}
            onClick={openPicker('endDate')}
          >
            {cd.endDate}
          </button>
        )}
      </div>

      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={isoToDate(cd[picker.field])}
          onSelect={(d) => { onChange({ ...cd, [picker.field]: dateToIso(d) }); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// 로컬 타임존 기준 'YYYY-MM-DD' (toISOString 의 UTC off-by-one 회피).
function dateToIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isoToDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
}
function todayIso() {
  // 편집 시작 시 기본 날짜. 결정성 영향 없음 (사용자가 즉시 바꿀 수 있는 초기값).
  return dateToIso(new Date());
}

/* ── 고정 칸 — 옅은 회색 읽기 전용 칸 + 자물쇠 + 회색 딱지 ───── */
function FixedValue({ text, tag, baseUrl, testId }) {
  return (
    <div className="admin-notif-fixed" data-testid={testId}>
      <span className="admin-notif-fixed-lock">
        <Icon src={ICON_LOCK} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
      </span>
      <span className="admin-notif-fixed-text">{text}</span>
      <StatusBadge tone="neutral" className="admin-notif-tag">{tag}</StatusBadge>
    </div>
  );
}

/* ── 미리보기 — 바탕 없는 초록 글 ───────────────────────── */
function Preview({ label, text, baseUrl }) {
  return (
    <div className="admin-notif-preview">
      <span className="admin-notif-preview-mark">
        <Icon src={ICON_PREVIEW} size={14} color="var(--text-brand-secondary)" baseUrl={baseUrl} />
      </span>
      <span>{label}:&nbsp;<strong>{text}</strong></span>
    </div>
  );
}

/* ── 규칙 수정 모달 ───────────────────────────────────── */
function EditRuleModal({ rule, labels, cooldownOptions, formatCondition, formatCooldown, onClose, onSave, baseUrl, validateRule, busy = false }) {
  const [enabled, setEnabled] = useState(rule.enabled);
  // 필수 알림(pivit-work PW-3258) — 다른 칸처럼 [저장]할 때만 반영된다
  const [mandatory, setMandatory] = useState(Boolean(rule.mandatory));
  const [conditionValues, setConditionValues] = useState(
    rule.conditionValues ? { ...rule.conditionValues } : null,
  );
  const [cooldown, setCooldown] = useState({ ...rule.cooldown });
  const [recipients, setRecipients] = useState([...rule.recipients]);
  const [channels, setChannels] = useState([...rule.channels]);
  const [stageChannels, setStageChannels] = useState(
    rule.stageChannels ? rule.stageChannels.map((s) => ({ ...s, channels: [...s.channels] })) : null,
  );

  const hasTimeParam = rule.conditionSchema?.some((p) => p.isTimeParam) ?? false;
  const conditionPreview = formatCondition(rule.id, conditionValues, rule.conditionFixed);
  // 칸마다 받을 수 있는 값은 앱이 정해 넘긴다(PW-1058) — `{ [칸 key | 'interval']: 문구 }`.
  // 넘기지 않으면 예전처럼 검사 없이 저장한다.
  const errors = (validateRule && validateRule({ ...rule, enabled, conditionValues, cooldown, recipients, channels })) || {};
  const hasErrors = Object.keys(errors).length > 0;

  const toggleRecipient = (r) =>
    setRecipients((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const lockedChannels = rule.lockedChannels ?? [];
  const toggleChannel = (c) => {
    if (lockedChannels.includes(c)) return;
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  };
  const toggleStageChannel = (key, c) =>
    setStageChannels((p) => p.map((s) => {
      if (s.key !== key) return s;
      const on = s.channels.includes(c);
      if (on && rule.stageChannelsRequireOne && s.channels.length === 1) return s;
      return { ...s, channels: on ? s.channels.filter((x) => x !== c) : [...s.channels, c] };
    }));
  // 단계별 표가 있으면 규칙 채널은 표의 합집합이다 — 목록 행 표시가 이것이다.
  const savedChannels = stageChannels
    ? CHANNEL_KEYS.filter((c) => stageChannels.some((s) => s.channels.includes(c)))
    : channels;
  // 끌 수 없는 규칙은 창에서도 켜짐이다 — 저장 값도 켜짐으로 보낸다(기획서 EditRuleModal · PW-3125).
  const savedEnabled = rule.alwaysOn ? true : enabled;

  const stageKeys = rule.stageChannelKeys ?? CHANNEL_KEYS;
  const recipientsFixedText = stageChannels || rule.targetsFixed ? rule.targetsFixed : rule.recipientsFixed;
  const recipientsFixedTestId = stageChannels || rule.targetsFixed ? 'notif-targets-fixed' : 'notif-recipients-fixed';
  const hasLockedChannel = CHANNEL_KEYS.some((k) => lockedChannels.includes(k));

  return (
    // 껍데기는 공용 창 틀(ModalShell · PW-836) 그대로. 막 이름표(modal-backdrop)·창 이름표(edit-modal)는
    // 종전 그대로 막·카드에 붙는다. 안쪽 칸 이름은 입력 창 칸 틀(FormModal.Field · PW-3139).
    <ModalShell
      title={rule.label}
      description={rule.desc}
      titleId="admin-notif-edit-title"
      closeLabel={labels.modal.close}
      onClose={onClose}
      zIndex={1000}
      // 단계 표가 있는 창만 어드민 넓은 창(640) — 단계 이름 · 받는 사람과 채널 열이 창 폭 안에 든다(PW-3125)
      className={stageChannels ? 'adm-shell is-wide' : 'adm-shell'}
      bodyClassName="adm-shell-body admin-notif-edit-body"
      testId="edit-modal"
      overlayTestId="modal-backdrop"
      footer={
        <>
          <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary" onClick={onClose}>{labels.modal.cancel}</button>
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            disabled={hasErrors || busy}
            data-testid="notif-rule-save"
            onClick={async () => {
              // [PW-2079] 부르는 쪽이 확인 창에서 취소하면 `false` 를 돌려준다 — 그때는 창을 닫지 않아
              // 고친 값이 그대로 남는다(admin-spec §6.1-B «취소하면»). 그 밖의 값이면 종전대로 닫는다.
              const ok = await onSave({ ...rule, enabled: savedEnabled, conditionValues, cooldown, recipients, channels: savedChannels, ...(stageChannels ? { stageChannels } : {}), ...(rule.mandatoryControl === 'open' ? { mandatory } : {}) });
              if (ok !== false) onClose();
            }}
          >
            {labels.modal.save}
          </button>
        </>
      }
    >
        {/* 활성화와 필수 알림은 한 짝 — 본문 칸 사이(24)보다 좁게 12 로 붙인다(pivit-work PW-3258 · 기획 시안 «위 칸과 붙여 둔다») */}
        <div className="admin-notif-enable-group">
        {/* 활성화 — 끌 수 없는 알림이면 스위치 자리에 안내(기획서 EditRuleModal · PW-3125) */}
        <div className="admin-notif-enable-row">
          <span className="admin-notif-enable-label">{labels.modal.enableThis}</span>
          {rule.alwaysOn ? (
            <span className="admin-notif-enable-locked" data-testid="notif-enable-locked">{labels.modal.alwaysOn}</span>
          ) : (
            <Switch checked={enabled} onChange={setEnabled} label={labels.modal.enableThis} />
          )}
        </div>

        {/* 필수 알림(pivit-work PW-3258 · admin-spec §6.3-A) — 바로 위 «이 알림 활성화»와 같은 상자를 붙여 둔다.
            처음부터 필수인 줄은 스위치 자리에 고정 글, 칸을 두지 않는 줄은 그리지 않는다. */}
        {rule.mandatoryControl && (
          <div className="admin-notif-mandatory" data-testid="notif-mandatory">
            <div className="admin-notif-mandatory-head">
              <span className="admin-notif-enable-label">{labels.modal.mandatory}</span>
              {rule.mandatoryControl === 'fixed' ? (
                <span className="admin-notif-enable-locked" data-testid="notif-mandatory-fixed">{labels.modal.mandatoryFixed}</span>
              ) : (
                <Switch checked={mandatory} onChange={setMandatory} label={labels.modal.mandatory} />
              )}
            </div>
            <div className="admin-notif-mandatory-desc">{labels.modal.mandatoryDesc}</div>
            {!savedEnabled && (
              <div className="admin-notif-mandatory-off" data-testid="notif-mandatory-off">{labels.modal.mandatoryOffNote}</div>
            )}
          </div>
        )}
        </div>

        {/* 발동 조건 */}
        <FormModal.Field label={labels.modal.condition} group>
          {rule.conditionSchema ? (
            <div className="admin-notif-param-list">
              {rule.conditionSchema.map((param) => (
                <div key={param.key} className="admin-notif-param-row">
                  <span className="admin-notif-param-label">{param.label}</span>
                  <ParamField
                    param={param}
                    value={conditionValues[param.key]}
                    onChange={(val) => setConditionValues((p) => ({ ...p, [param.key]: val }))}
                  />
                  {errors[param.key] && (
                    <div className="admin-notif-field-error" role="alert" data-testid={`notif-param-error-${param.key}`}>{errors[param.key]}</div>
                  )}
                </div>
              ))}
              <Preview label={labels.modal.preview} text={conditionPreview} baseUrl={baseUrl} />
            </div>
          ) : (
            <FixedValue text={rule.conditionFixed} tag={labels.modal.systemFixed} baseUrl={baseUrl} />
          )}
        </FormModal.Field>

        {/* 발송 주기 */}
        <FormModal.Field label={labels.modal.cooldown} group>
          {cooldown.mode === 'custom' ? (
            <div className="admin-notif-cooldown-box">
              <CooldownEditor
                cooldown={cooldown}
                onChange={setCooldown}
                hasTimeParam={hasTimeParam}
                options={cooldownOptions}
                labels={labels.cooldown}
                baseUrl={baseUrl}
                intervalError={errors.interval}
              />
              <Preview label={labels.modal.preview} text={formatCooldown(cooldown)} baseUrl={baseUrl} />
            </div>
          ) : (
            <FixedValue text={formatCooldown(cooldown)} tag={labels.modal.systemFixed} baseUrl={baseUrl} />
          )}
        </FormModal.Field>

        {/* 수신 대상 — 알림마다 정해진 규칙은 잠금 안내, 아니면 역할 체크 (PW-1897) */}
        <FormModal.Field label={labels.modal.recipients} group>
          {recipientsFixedText ? (
            <FixedValue text={recipientsFixedText} tag={labels.modal.perRuleFixed} baseUrl={baseUrl} testId={recipientsFixedTestId} />
          ) : (
            <div className="admin-notif-check-row">
              {ROLE_KEYS.map((key) => (
                <Checkbox
                  key={key}
                  checked={recipients.includes(key)}
                  onChange={() => toggleRecipient(key)}
                  label={labels.roles[key]}
                  data-testid={`notif-recipient-${key}`}
                />
              ))}
            </div>
          )}
        </FormModal.Field>

        {/* 단계별 발송 채널 — 머리 한 번인 표 하나 (PW-1986 · PW-2089 · admin-spec §6.1 «평가») */}
        {stageChannels ? (
          <FormModal.Field label={rule.stageChannelsTitle ?? labels.modal.stageChannels} hint={rule.stageChannelsNote} group>
            <FrameTable
              testId="notif-stage-channels"
              ariaLabel={rule.stageChannelsTitle ?? labels.modal.stageChannels}
              rowKey={(stage) => stage.key}
              rows={stageChannels}
              empty={null}
              columns={[
                {
                  key: 'stage',
                  header: rule.stageColumnTitle ?? labels.modal.stageColumn,
                  render: (stage) => (
                    <span className="admin-notif-stage-cell" data-testid={`notif-stage-${stage.key}`}>
                      <span className="admin-notif-stage-name" title={stage.label}>{stage.label}</span>
                      {stage.to && <span className="admin-notif-stage-to" title={stage.to}>{stage.to}</span>}
                    </span>
                  ),
                },
                ...stageKeys.map((key) => ({
                  key,
                  header: labels.channels[key],
                  width: STAGE_CHANNEL_COLUMN_WIDTH,
                  align: 'center',
                  render: (stage) => (
                    <Checkbox
                      checked={stage.channels.includes(key)}
                      onChange={() => toggleStageChannel(stage.key, key)}
                      aria-label={`${stage.label} · ${labels.channels[key]}`}
                      data-testid={`notif-stage-${stage.key}-${key}`}
                    />
                  ),
                })),
              ]}
            />
          </FormModal.Field>
        ) : !rule.targetsFixed && (
          <FormModal.Field label={labels.modal.channels} hint={hasLockedChannel ? labels.modal.channelLockedNote : undefined} group>
            <div className="admin-notif-check-row">
              {/* 회사가 끌 수 없는 채널(rule.lockedChannels · pivit-work PW-2547 연차 촉진 안내)은 켠 채 잠그고 자물쇠를 붙인다 */}
              {CHANNEL_KEYS.map((key) => {
                const locked = lockedChannels.includes(key);
                return (
                  <Checkbox
                    key={key}
                    checked={locked || channels.includes(key)}
                    disabled={locked}
                    title={locked ? labels.modal.channelLocked : undefined}
                    onChange={() => toggleChannel(key)}
                    label={locked ? (
                      <span className="admin-notif-locked-channel">
                        {labels.channels[key]}
                        <Icon src={ICON_LOCK} size={12} color="var(--text-tertiary)" baseUrl={baseUrl} />
                      </span>
                    ) : labels.channels[key]}
                    data-testid={`notif-channel-${key}`}
                  />
                );
              })}
            </div>
          </FormModal.Field>
        )}
    </ModalShell>
  );
}

/**
 * 단계별 채널 표의 채널 열 폭 — 체크 하나와 «이메일» 머리 글이 들어가는 폭. 단계 이름 열이 남는 폭을 다 받아
 * 긴 단계 이름(«하향 리뷰 시작 · 하향 k차 작성 가능»)이 두 줄 안에 든다. 디자이너 표에 체크 열 폭이 없어 개발이 정했다(design-review).
 */
const STAGE_CHANNEL_COLUMN_WIDTH = 88;

/* ── 규칙 행 — 이름 / 조건 / 받는 사람·채널 세 줄 ─────────── */
function RuleRow({ rule, labels, formatCondition, formatCooldown, onEdit, onToggle, baseUrl, busy = false }) {
  const conditionText = formatCondition(rule.id, rule.conditionValues, rule.conditionFixed);
  const fixedTargets = rule.stageChannels || rule.targetsFixed ? rule.targetsFixed : rule.recipientsFixed;
  const fixedTestId = rule.stageChannels || rule.targetsFixed ? 'notif-rule-targets-fixed' : 'notif-rule-recipients-fixed';
  const showChannels = !(rule.targetsFixed && !rule.stageChannels);
  return (
    <div className={`admin-notif-rule${rule.enabled ? '' : ' is-off'}`} data-testid="notif-rule">
      {/* 회사도 끌 수 없는 알림(pivit-work PW-2597 · 조직 변경 승인 요청)은 스위치 자리에 «끌 수 없음»(기획서 RuleRow · PW-3125) */}
      {rule.alwaysOn ? (
        <StatusBadge tone="neutral" className="admin-notif-tag" data-testid="notif-rule-always-on">
          <Icon src={ICON_LOCK} size={12} color="var(--text-tertiary)" baseUrl={baseUrl} />
          {labels.alwaysOn}
        </StatusBadge>
      ) : (
        <Switch checked={rule.enabled} onChange={() => onToggle(rule.id)} label={rule.label} disabled={busy} />
      )}
      <div className="admin-notif-rule-main">
        <div className="admin-notif-rule-head">
          <span className="admin-notif-rule-label">{rule.label}</span>
          {/* 필수 — 이름 바로 뒤 · «조건 편집 가능» 앞, 같은 크기(pivit-work PW-3258 · admin-spec §6.3-A). 꺼진 줄에도 남는다 */}
          {rule.mandatory && (
            <StatusBadge tone="neutral" className="admin-notif-tag admin-notif-editable-badge" data-testid="notif-rule-mandatory">
              {labels.mandatoryBadge}
            </StatusBadge>
          )}
          {rule.conditionSchema && (
            <StatusBadge tone="neutral" className="admin-notif-tag admin-notif-editable-badge">
              <Icon src={ICON_EDIT} size={12} color="var(--text-tertiary)" baseUrl={baseUrl} />
              {labels.editableBadge}
            </StatusBadge>
          )}
        </div>
        <div className="admin-notif-rule-condition">{conditionText}</div>
        <div className="admin-notif-rule-meta">
          {fixedTargets ? (
            <span className="admin-notif-meta-text" data-testid={fixedTestId}>{fixedTargets}</span>
          ) : rule.recipients.map((r) => (
            <StatusBadge key={r} tone="neutral" className="admin-notif-tag admin-notif-role-chip">{labels.roles[r]}</StatusBadge>
          ))}
          {showChannels && rule.channels.length > 0 && (<>
            <span className="admin-notif-meta-sep" aria-hidden="true" />
            {rule.channels.map((c) => (
              <span key={c} className="admin-notif-channel-tag">
                <Icon src={CHANNEL_ICON_SRC[c]} size={13} color="var(--text-tertiary)" baseUrl={baseUrl} />
                {labels.channels[c]}
              </span>
            ))}
          </>)}
        </div>
      </div>
      <span className="admin-notif-rule-cooldown">{formatCooldown(rule.cooldown)}</span>
      <Button variant="secondary" size="sm" className="admin-notif-btn" onClick={() => onEdit(rule)} data-testid="edit-rule-btn">
        {labels.editBtn}
      </Button>
    </div>
  );
}

/* ── 불러오는 중 — 숫자 칸 · 판 자리에 옅은 회색 막대 (PW-3125) ── */
function LoadingCanvas() {
  return (
    <div className="admin-notif-canvas" aria-busy="true" data-testid="admin-notif-loading">
      <Skeleton height={100} radius="var(--radius-2xl)" />
      {[0, 1].map((i) => (
        <Panel key={i}>
          <Skeleton width={180} height={24} />
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </Panel>
      ))}
    </div>
  );
}

function hasText(line) {
  return line !== null && line !== undefined && line !== false && !(typeof line === 'string' && line.trim() === '');
}

function asLines(text) {
  if (Array.isArray(text)) return text;
  return text ? [text] : [];
}

/* ── 메인 캔버스 ──────────────────────────────────────── */
export default function AdminNotificationsCanvas({
  groups = [],
  cooldownOptions = { unitOptions: [], weekdayOptions: [], timeOptions: [], monthDayOptions: [] },
  labels: providedLabels,
  formatCondition = (_id, _values, fixed) => fixed ?? '',
  formatCooldown = () => '',
  onToggleRule,
  onSaveRule,
  onBulkSet,
  baseUrl = '/',
  validateRule,
  /**
   * [PW-2079] 부르는 쪽이 끄기 전 확인에 쓸 값을 받는 동안 참 — 규칙 줄 스위치 · 일괄 버튼 ·
   * 수정 창 [저장]을 잠시 잠근다(두 번 눌러 요청이 두 번 나가지 않게 · admin-spec §6.1-B «받는 중»).
   */
  busy = false,
  /** 회사 설정을 받는 중 — 숫자 칸 · 판 자리에 회색 막대만 그린다(PW-3125). */
  loading = false,
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);
  const [editTarget, setEditTarget] = useState(null);
  const [filterRole, setFilterRole] = useState(null);

  if (loading) return <LoadingCanvas />;

  const allRules = groups.flatMap((g) => g.rules);
  const activeCount = allRules.filter((r) => r.enabled).length;
  const inactiveCount = allRules.filter((r) => !r.enabled).length;

  const filtered = groups
    .map((g) => ({ ...g, rules: g.rules.filter((r) => !filterRole || r.recipients.includes(filterRole)) }))
    .filter((g) => g.rules.length > 0);
  const shownCount = filtered.reduce((n, g) => n + g.rules.length, 0);

  // 셀 것이 없는 칸(0개)은 값이 회색 — 세는 숫자만 진하게(PW-3125)
  const statItems = [
    { key: 'total', label: labels.stats.total, value: `${allRules.length}${labels.stats.unit}`, ...(allRules.length === 0 ? { tone: 'muted' } : {}) },
    { key: 'active', label: labels.stats.active, value: `${activeCount}${labels.stats.unit}`, ...(activeCount === 0 ? { tone: 'muted' } : {}) },
    { key: 'inactive', label: labels.stats.inactive, value: `${inactiveCount}${labels.stats.unit}`, ...(inactiveCount === 0 ? { tone: 'muted' } : {}) },
  ];
  // 안내 세 단(PW-3125) — 첫 문장 진하게 · 둘째 보통 · 나머지(«끌 수 있는 것») 작고 옅게
  const [leadLine, bodyLine, ...fineLines] = asLines(labels.infoBanner);

  return (
    <div className="admin-notif-canvas">
      {/* 요약 — 흰 판 한 장 안 숫자 칸 셋(공용 숫자 칸 줄) */}
      <StatStrip items={statItems} testId="admin-notif-summary" />

      {/* 안내 — 바탕 없는 줄, 문장마다 한 줄. 공용 안내 줄 틀은 두 단(기본 · 흐림)뿐이라
          둘째 «보통»(--text-subtle)과 셋째 «작고 옅게»(--text-tertiary)는 따로 그린다 — 둘째를 틀의 흐림 단으로 그리면
          셋째와 색이 같아 «옅게»가 안 보인다(시안 .nt-g2 / .nt-g3). */}
      <div className="admin-notif-guide" data-testid="admin-notif-guide">
        <NoticeLines lines={[leadLine]} />
        {hasText(bodyLine) && (
          <p className="admin-notif-guide-body" data-testid="admin-notif-guide-body">
            {bodyLine}
          </p>
        )}
        {fineLines.filter(hasText).map((line, i) => (
          <p key={i} className="admin-notif-guide-fine" data-testid="admin-notif-guide-fine">
            {line}
          </p>
        ))}
      </div>

      {/* 역할별 필터 — 하나만 고르므로 공용 SegmentedControl (PW-1897). 고르면 보이는 규칙 수 */}
      <div className="admin-notif-filter">
        <span className="admin-notif-filter-label">{labels.filterLabel}</span>
        <SegmentedControl
          ariaLabel={labels.filterLabel}
          value={filterRole || 'all'}
          onChange={(v) => setFilterRole(v === 'all' ? null : v)}
          items={[null, ...ROLE_KEYS].map((r) => ({
            value: r || 'all',
            label: r ? labels.roles[r] : labels.filterAll,
            testId: `filter-${r || 'all'}`,
          }))}
        />
        {filterRole && (
          <span className="admin-notif-filter-count" data-testid="notif-filter-count">
            {typeof labels.filterCount === 'function'
              ? labels.filterCount(shownCount)
              : labels.filterCount.replace('{n}', String(shownCount))}
          </span>
        )}
      </div>

      {/* 묶음별 규칙 — 묶음마다 흰 판(공용 흰 판) · 머리 «N / M 활성» */}
      {filtered.map((group) => (
        <Panel
          key={group.id}
          title={group.group}
          testId="notif-group"
          actions={
            <span className="admin-notif-group-count">
              <strong>{group.rules.filter((r) => r.enabled).length}</strong> / {group.rules.length} {labels.groupActiveSuffix}
            </span>
          }
        >
          <div className="admin-notif-rule-list">
            {group.rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                labels={labels}
                formatCondition={formatCondition}
                formatCooldown={formatCooldown}
                onEdit={setEditTarget}
                onToggle={onToggleRule}
                busy={busy}
                baseUrl={baseUrl}
              />
            ))}
          </div>
        </Panel>
      ))}

      {/* 전체 on/off — 목록 맨 아래(기획서 자리) · 작은 버튼 둘 오른쪽 · 끄기만 위험 모양 */}
      <div className="admin-notif-bulk">
        <Button variant="secondary" size="sm" disabled={busy} onClick={() => onBulkSet && onBulkSet(true)} data-testid="enable-all-btn">
          {labels.enableAll}
        </Button>
        <Button variant="danger-ghost" size="sm" disabled={busy} onClick={() => onBulkSet && onBulkSet(false)} data-testid="disable-all-btn">
          {labels.disableAll}
        </Button>
      </div>

      {editTarget && (
        <EditRuleModal
          rule={editTarget}
          labels={labels}
          cooldownOptions={cooldownOptions}
          formatCondition={formatCondition}
          formatCooldown={formatCooldown}
          onClose={() => setEditTarget(null)}
          onSave={onSaveRule}
          baseUrl={baseUrl}
          validateRule={validateRule}
          busy={busy}
        />
      )}
    </div>
  );
}
