import { useState } from 'react';
import Card from './Card.jsx';
import Icon from '../shared/Icon.jsx';
import DatePicker from '../shared/DatePicker.jsx';

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
 *    enabled: bool,
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
const ICON_X = '/icons-solid/x-close.svg';

const DEFAULT_LABELS = {
  stats: { total: '전체 규칙', active: '활성', inactive: '비활성', unit: '개' },
  infoBanner:
    '조직 전체 알림 규칙을 관리합니다. "조건 편집 가능" 배지가 있는 규칙은 발동 임계값을 직접 수정할 수 있습니다. 팀원 개인 채널 설정은 "내 설정 → 알림" 탭에서 합니다.',
  filterLabel: '수신 대상 필터',
  filterAll: '전체',
  groupActiveSuffix: '활성', // "N / M 활성"
  editableBadge: '조건 편집 가능',
  editBtn: '수정',
  enableAll: '전체 알림 활성화',
  disableAll: '전체 알림 비활성화',
  roles: { member: '팀원', manager: '매니저', admin: '어드민' },
  channels: { push: '푸시', slack: 'Slack', email: '이메일' },
  modal: {
    enableThis: '이 알림 활성화',
    condition: '발동 조건',
    systemFixed: '시스템 고정',
    preview: '미리보기',
    cooldown: '발송 주기',
    recipients: '수신 대상',
    channels: '발송 채널',
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
function Toggle({ value, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      onClick={() => onChange(!value)}
      className={`admin-notif-toggle${value ? ' is-on' : ''}`}
    >
      <span className="admin-notif-toggle-knob" />
    </button>
  );
}

/* ── 작은 섹션 라벨 (모달 내부) ───────────────────────── */
function SL({ children }) {
  return <div className="admin-notif-sl">{children}</div>;
}

/* ── 세그먼트 버튼 (라디오 대체) ───────────────────────── */
function SegBtn({ options, value, onChange }) {
  return (
    <div className="admin-notif-seg">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`admin-notif-seg-btn${value === o.value ? ' is-active' : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── 파라미터 입력 (select / number) ───────────────────── */
function ParamField({ param, value, onChange }) {
  if (param.type === 'select') {
    return (
      <select
        className="admin-notif-input admin-notif-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={param.label}
      >
        {param.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={param.label}
      />
      {param.unit && <span className="admin-notif-param-unit">{param.unit}</span>}
    </>
  );
}

/* ── 발송 주기 편집 (Google Calendar 스타일) ───────────── */
function CooldownEditor({ cooldown, onChange, hasTimeParam, options, labels, baseUrl }) {
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
          onChange={(e) => onChange({ ...cd, interval: Math.max(1, Number(e.target.value)) })}
          aria-label={labels.every}
        />
        <select
          className="admin-notif-input admin-notif-select"
          value={cd.unit}
          onChange={(e) => onChange({ ...cd, unit: e.target.value, weekDays: [], monthDay: 1 })}
        >
          {options.unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="admin-notif-inline-label">{labels.per}</span>
      </div>

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
          <select
            className="admin-notif-input admin-notif-select"
            value={cd.monthDay}
            onChange={(e) => onChange({ ...cd, monthDay: Number(e.target.value) })}
          >
            {options.monthDayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
          <select
            className="admin-notif-input admin-notif-select"
            value={timeValue}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              onChange({ ...cd, startHour: h, startMin: m });
            }}
          >
            {options.timeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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

/* ── 규칙 수정 모달 ───────────────────────────────────── */
function EditRuleModal({ rule, labels, cooldownOptions, formatCondition, formatCooldown, onClose, onSave, baseUrl }) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const [conditionValues, setConditionValues] = useState(
    rule.conditionValues ? { ...rule.conditionValues } : null,
  );
  const [cooldown, setCooldown] = useState({ ...rule.cooldown });
  const [recipients, setRecipients] = useState([...rule.recipients]);
  const [channels, setChannels] = useState([...rule.channels]);

  const hasTimeParam = rule.conditionSchema?.some((p) => p.isTimeParam) ?? false;
  const conditionPreview = formatCondition(rule.id, conditionValues, rule.conditionFixed);

  const toggleRecipient = (r) =>
    setRecipients((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const toggleChannel = (c) =>
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  return (
    <div className="admin-notif-modal-root">
      <div className="admin-notif-modal-backdrop" onClick={onClose} data-testid="modal-backdrop" />
      <div className="admin-notif-modal" role="dialog" aria-modal="true" aria-label={rule.label} data-testid="edit-modal">
        {/* 헤더 */}
        <div className="admin-notif-modal-header">
          <div>
            <div className="admin-notif-modal-title">{rule.label}</div>
            <div className="admin-notif-modal-desc">{rule.desc}</div>
          </div>
          <button type="button" className="admin-notif-modal-close" aria-label={labels.modal.close} onClick={onClose}>
            <Icon src={ICON_X} size={18} color="var(--text-secondary)" baseUrl={baseUrl} />
          </button>
        </div>

        <div className="admin-notif-modal-body">
          {/* 활성화 */}
          <div className="admin-notif-enable-row">
            <span className="admin-notif-enable-label">{labels.modal.enableThis}</span>
            <Toggle value={enabled} onChange={setEnabled} ariaLabel={labels.modal.enableThis} />
          </div>

          {/* 발동 조건 */}
          <div>
            <SL>{labels.modal.condition}</SL>
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
                  </div>
                ))}
                <div className="admin-notif-preview">
                  <span className="admin-notif-preview-mark">
                    <Icon src={ICON_PREVIEW} size={14} color="var(--text-brand-secondary)" baseUrl={baseUrl} />
                  </span>
                  {labels.modal.preview}:&nbsp;<strong>{conditionPreview}</strong>
                </div>
              </div>
            ) : (
              <div className="admin-notif-fixed">
                <span className="admin-notif-fixed-lock">
                  <Icon src={ICON_LOCK} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                </span>
                <span className="admin-notif-fixed-text">{rule.conditionFixed}</span>
                <span className="admin-notif-fixed-tag">{labels.modal.systemFixed}</span>
              </div>
            )}
          </div>

          {/* 발송 주기 */}
          <div>
            <SL>{labels.modal.cooldown}</SL>
            {cooldown.mode === 'custom' ? (
              <div className="admin-notif-cooldown-box">
                <CooldownEditor
                  cooldown={cooldown}
                  onChange={setCooldown}
                  hasTimeParam={hasTimeParam}
                  options={cooldownOptions}
                  labels={labels.cooldown}
                  baseUrl={baseUrl}
                />
                <div className="admin-notif-preview">
                  <span className="admin-notif-preview-mark">
                    <Icon src={ICON_PREVIEW} size={14} color="var(--text-brand-secondary)" baseUrl={baseUrl} />
                  </span>
                  {labels.modal.preview}:&nbsp;<strong>{formatCooldown(cooldown)}</strong>
                </div>
              </div>
            ) : (
              <div className="admin-notif-fixed">
                <span className="admin-notif-fixed-lock">
                  <Icon src={ICON_LOCK} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                </span>
                <span className="admin-notif-fixed-text">{formatCooldown(cooldown)}</span>
                <span className="admin-notif-fixed-tag">{labels.modal.systemFixed}</span>
              </div>
            )}
          </div>

          {/* 수신 대상 */}
          <div>
            <SL>{labels.modal.recipients}</SL>
            <div className="admin-notif-picker-grid">
              {ROLE_KEYS.map((key) => {
                const active = recipients.includes(key);
                return (
                  <div
                    key={key}
                    role="checkbox"
                    aria-checked={active}
                    aria-label={labels.roles[key]}
                    tabIndex={0}
                    onClick={() => toggleRecipient(key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRecipient(key); } }}
                    className={`admin-notif-role-card is-${key}${active ? ' is-active' : ''}`}
                  >
                    <div className="admin-notif-role-card-label">{labels.roles[key]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 발송 채널 */}
          <div>
            <SL>{labels.modal.channels}</SL>
            <div className="admin-notif-picker-grid">
              {CHANNEL_KEYS.map((key) => {
                const active = channels.includes(key);
                return (
                  <div
                    key={key}
                    role="checkbox"
                    aria-checked={active}
                    aria-label={labels.channels[key]}
                    tabIndex={0}
                    onClick={() => toggleChannel(key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChannel(key); } }}
                    className={`admin-notif-channel-card${active ? ' is-active' : ''}`}
                  >
                    <div className="admin-notif-channel-icon">
                      <Icon
                        src={CHANNEL_ICON_SRC[key]}
                        size={18}
                        color={active ? 'var(--text-brand-secondary)' : 'var(--text-tertiary)'}
                        baseUrl={baseUrl}
                      />
                    </div>
                    <div className="admin-notif-channel-label">{labels.channels[key]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="admin-notif-modal-footer">
          <button type="button" className="admin-notif-btn is-ghost" onClick={onClose}>{labels.modal.cancel}</button>
          <button
            type="button"
            className="admin-notif-btn is-primary"
            onClick={() => { onSave({ ...rule, enabled, conditionValues, cooldown, recipients, channels }); onClose(); }}
          >
            {labels.modal.save}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 규칙 행 ──────────────────────────────────────────── */
function RuleRow({ rule, labels, formatCondition, formatCooldown, onEdit, onToggle, baseUrl }) {
  const conditionText = formatCondition(rule.id, rule.conditionValues, rule.conditionFixed);
  return (
    <div className={`admin-notif-rule${rule.enabled ? '' : ' is-off'}`} data-testid="notif-rule">
      <Toggle value={rule.enabled} onChange={() => onToggle(rule.id)} ariaLabel={rule.label} />
      <div className="admin-notif-rule-main">
        <div className="admin-notif-rule-head">
          <span className="admin-notif-rule-label">{rule.label}</span>
          <span className="admin-notif-rule-condition">— {conditionText}</span>
          {rule.conditionSchema && (
            <span className="admin-notif-editable-badge">{labels.editableBadge}</span>
          )}
        </div>
        <div className="admin-notif-rule-meta">
          {rule.recipients.map((r) => (
            <span key={r} className="admin-notif-role-chip">{labels.roles[r]}</span>
          ))}
          <span className="admin-notif-meta-sep" aria-hidden="true" />
          {rule.channels.map((c) => (
            <span key={c} className="admin-notif-channel-tag">
              <Icon src={CHANNEL_ICON_SRC[c]} size={13} color="var(--text-quaternary)" baseUrl={baseUrl} />
              {labels.channels[c]}
            </span>
          ))}
        </div>
      </div>
      <span className="admin-notif-rule-cooldown">{formatCooldown(rule.cooldown)}</span>
      <button type="button" className="admin-notif-btn is-soft is-sm" onClick={() => onEdit(rule)} data-testid="edit-rule-btn">
        {labels.editBtn}
      </button>
    </div>
  );
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
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);
  const [editTarget, setEditTarget] = useState(null);
  const [filterRole, setFilterRole] = useState(null);

  const allRules = groups.flatMap((g) => g.rules);
  const activeCount = allRules.filter((r) => r.enabled).length;
  const inactiveCount = allRules.filter((r) => !r.enabled).length;

  const filtered = groups
    .map((g) => ({ ...g, rules: g.rules.filter((r) => !filterRole || r.recipients.includes(filterRole)) }))
    .filter((g) => g.rules.length > 0);

  const statTiles = [
    { key: 'total', label: labels.stats.total, value: `${allRules.length}${labels.stats.unit}`, tone: '' },
    { key: 'active', label: labels.stats.active, value: `${activeCount}${labels.stats.unit}`, tone: 'is-good' },
    { key: 'inactive', label: labels.stats.inactive, value: `${inactiveCount}${labels.stats.unit}`, tone: 'is-muted' },
  ];

  return (
    <div className="admin-notif-canvas">
      {/* 요약 카드 */}
      <div className="admin-notif-summary">
        {statTiles.map((s) => (
          <div key={s.key} className="admin-notif-summary-tile">
            <div className="admin-notif-summary-label">{s.label}</div>
            <div className={`admin-notif-summary-value ${s.tone}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 안내 배너 */}
      <div className="admin-notif-banner">
        <span className="admin-notif-banner-icon" aria-hidden="true">
          <Icon src={ICON_INFO} size={16} color="var(--text-brand-secondary)" baseUrl={baseUrl} />
        </span>
        <p className="admin-notif-banner-text">{labels.infoBanner}</p>
      </div>

      {/* 역할별 필터 */}
      <div className="admin-notif-filter">
        <span className="admin-notif-filter-label">{labels.filterLabel}</span>
        {[null, ...ROLE_KEYS].map((r) => {
          const active = filterRole === r;
          const label = r ? labels.roles[r] : labels.filterAll;
          return (
            <button
              type="button"
              key={r || 'all'}
              onClick={() => setFilterRole(r)}
              data-testid={`filter-${r || 'all'}`}
              className={`admin-notif-filter-chip${r ? ` is-${r}` : ''}${active ? ' is-active' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 그룹별 규칙 */}
      {filtered.map((group) => (
        <Card key={group.id} className="admin-notif-group">
          <div className="admin-notif-group-head">
            <span className="admin-notif-group-title">{group.group}</span>
            <span className="admin-notif-group-count">
              {group.rules.filter((r) => r.enabled).length} / {group.rules.length} {labels.groupActiveSuffix}
            </span>
          </div>
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
                baseUrl={baseUrl}
              />
            ))}
          </div>
        </Card>
      ))}

      {/* 전체 on/off */}
      <div className="admin-notif-bulk">
        <button type="button" className="admin-notif-btn is-soft is-block" onClick={() => onBulkSet && onBulkSet(true)} data-testid="enable-all-btn">
          {labels.enableAll}
        </button>
        <button type="button" className="admin-notif-btn is-soft is-block" onClick={() => onBulkSet && onBulkSet(false)} data-testid="disable-all-btn">
          {labels.disableAll}
        </button>
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
        />
      )}
    </div>
  );
}
