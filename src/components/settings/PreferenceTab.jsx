import { useState } from 'react';
import Chip from '../shared/Chip.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Radio from '../shared/Radio.jsx';
import TextInput from '../shared/TextInput.jsx';
import TimeInput from '../shared/TimeInput.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { InfoIcon } from './settingsIcons.jsx';

/**
 * 내 설정 › 선호 설정 탭 (pivit-work PW-1366 · 기획 my-settings-spec §5-A, 시안 settings-app.jsx `PreferenceTab`).
 *
 * 배너 → 동의 카드 → 피드백 수신 선호 → 커뮤니케이션 선호 → [변경사항 저장].
 * 입력 중인 값은 이 탭이 갖고, 저장·철회 요청은 호스트가 한다.
 *
 * - `preference` — `{ agreed, agreedDate, feedbackProfile, communicationPreference }`. 불러오는 중·실패면 null.
 *   `agreedDate` 는 사용자 시간대의 `YYYY-MM-DD`(호스트가 만든다).
 * - `onSave({ agree, value })` — `agree` 는 이번 저장에서 동의를 새로 기록해야 하는가, `value` 는 입력 전체.
 *   동의도 체크도 없는데 입력이 있으면 부르지 않고 체크박스 아래에 안내만 띄운다(policy §4).
 * - `onWithdraw()` — 확인 창에서 [철회]를 누르면. 끝날 때까지 창을 잠그고, 끝나면 닫는다.
 * - 값으로 남는 선택지(중점 영역·키워드)는 기획서가 정한 낱말 그대로이고, 화면 글자는 `labels.preference.valueLabels`
 *   로 바꿔 보인다. 표에 없는 값(직접 입력한 키워드)은 그대로 보인다.
 */

const PREFERENCE_FOCUS_AREAS = ['성과', '역량', '커리어', '협업', '워크라이프 밸런스'];
const PREFERENCE_STRENGTHS = ['문제 해결', '커뮤니케이션', '실행력', '분석', '창의성', '리더십', '협업', '꼼꼼함'];
const PREFERENCE_IMPROVE_AREAS = ['발표', '시간 관리', '문서화', '우선순위 설정', '데이터 분석', '협상'];
const TONES = ['direct', 'soft'];
const STYLES = ['concise', 'detailed'];
const SPEEDS = ['immediate', 'same_day', 'within_24h', 'async'];
const SLOTS = ['morning', 'afternoon', 'evening'];
const MAX_FOCUS_AREAS = 3;
const CAREER_GOAL_MAX = 100;

const EMPTY = {
  feedbackTone: null,
  feedbackStyle: null,
  focusAreas: [],
  careerGoal: '',
  strengths: [],
  improveAreas: [],
  responseSpeed: null,
  meetingTimeSlots: [],
  focusHoursStart: '',
  focusHoursEnd: '',
};

function draftOf(preference) {
  const f = (preference && preference.feedbackProfile) || {};
  const c = (preference && preference.communicationPreference) || {};
  return {
    feedbackTone: f.feedbackTone ?? null,
    feedbackStyle: f.feedbackStyle ?? null,
    focusAreas: f.focusAreas ?? [],
    careerGoal: f.careerGoal ?? '',
    strengths: f.strengths ?? [],
    improveAreas: f.improveAreas ?? [],
    responseSpeed: c.responseSpeed ?? null,
    meetingTimeSlots: c.meetingTimeSlots ?? [],
    focusHoursStart: c.focusHoursStart ?? '',
    focusHoursEnd: c.focusHoursEnd ?? '',
  };
}

/** 무엇이든 하나라도 입력했나 — 동의 없이 저장하려 할 때 안내할지 가른다. */
function hasPreferenceInput(v) {
  return Object.keys(EMPTY).some((k) => {
    const x = v[k];
    return Array.isArray(x) ? x.length > 0 : x != null && String(x).trim() !== '';
  });
}

function OptionGroup({ name, options, value, onChange, grid, labelOf, descOf }) {
  return (
    <div className={`msc-pref-options${grid ? ' is-grid' : ''}`} role="radiogroup">
      {options.map((id) => (
        <Radio
          key={id}
          variant="card"
          name={name}
          value={id}
          checked={value === id}
          onChange={() => onChange(id)}
          data-testid={`pref-${name}-${id}`}
          label={
            <span className="msc-pref-option">
              <span className="msc-pref-option-label">{labelOf(id)}</span>
              {descOf(id) && <span className="msc-pref-option-desc">{descOf(id)}</span>}
            </span>
          }
        />
      ))}
    </div>
  );
}

function PrefLabel({ children, hint }) {
  return (
    <div className="msc-pref-label">
      {children}
      {hint && <span className="msc-pref-label-hint">{hint}</span>}
    </div>
  );
}

export default function PreferenceTab({
  preference,
  loading = false,
  loadError = false,
  onRetry,
  saveState = 'idle',
  consentError = null,
  onSave,
  onWithdraw,
  withdrawing = false,
  labels,
}) {
  const L = labels.preference;
  const show = (v) => (L.valueLabels && L.valueLabels[v]) || v;

  const [draft, setDraft] = useState(() => draftOf(preference));
  const [seed, setSeed] = useState(preference);
  const [checked, setChecked] = useState(false);
  const [needConsent, setNeedConsent] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [customStrength, setCustomStrength] = useState('');
  const [customImprove, setCustomImprove] = useState('');
  if (preference !== seed) {
    // 저장·철회·다시 불러오기가 끝나면 서버 값으로 다시 맞춘다.
    setSeed(preference);
    setDraft(draftOf(preference));
    setChecked(false);
    setNeedConsent(false);
  }

  if (loading && !preference) {
    return (
      <>
        <Banner text={L.banner} />
        <SkeletonList data-testid="preference-loading" />
      </>
    );
  }
  // 못 불러온 채로 «동의 안 함·빈 입력»을 그리면 동의한 사람이 다시 동의하게 된다 — 실패를 말한다.
  if (loadError || !preference) {
    return (
      <>
        <Banner text={L.banner} />
        <div className="admin-card msc-card" data-testid="preference-load-error">
          <div className="msc-empty-state">
            <div>{L.loadError}</div>
            {onRetry && (
              <button type="button" className="admin-notif-btn is-sm is-soft" style={{ marginTop: 10 }}
                onClick={onRetry} data-testid="preference-retry">{L.retry}</button>
            )}
          </div>
        </div>
      </>
    );
  }

  const agreed = Boolean(preference.agreed);
  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));
  const toggle = (key, val) =>
    setDraft((d) => ({ ...d, [key]: d[key].includes(val) ? d[key].filter((x) => x !== val) : [...d[key], val] }));
  const addCustom = (key, raw, clear) => {
    const v = raw.trim();
    if (!v) return;
    // 목록에 이미 있으면 새로 만들지 않고 고른 상태로 둔다(policy §4).
    setDraft((d) => (d[key].includes(v) ? d : { ...d, [key]: [...d[key], v] }));
    clear('');
  };

  const save = () => {
    if (saveState === 'saving') return;
    if (!agreed && !checked && hasPreferenceInput(draft)) {
      setNeedConsent(true);
      return;
    }
    onSave && onSave({ agree: !agreed && checked, value: draft });
  };

  const keywordField = (key, base, custom, setCustom, testId) => {
    const extra = draft[key].filter((v) => !base.includes(v));
    return (
      <div>
        <PrefLabel hint={L.keywordHint}>{key === 'strengths' ? L.strengths : L.improveAreas}</PrefLabel>
        <div className="msc-pref-chips">
          {base.map((k) => (
            <Chip key={k} selected={draft[key].includes(k)} onClick={() => toggle(key, k)}
              data-testid={`${testId}-${k}`}>{show(k)}</Chip>
          ))}
          {extra.map((k) => (
            <Chip key={k} selected onRemove={() => toggle(key, k)} removeLabel={L.removeKeyword(k)}
              data-testid={`${testId}-custom-${k}`}>{k}</Chip>
          ))}
        </div>
        <TextInput
          className="admin-emp-input msc-pref-custom"
          value={custom}
          maxLength={50}
          placeholder={L.customPlaceholder}
          aria-label={key === 'strengths' ? L.strengths : L.improveAreas}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              addCustom(key, custom, setCustom);
            }
          }}
          data-testid={`${testId}-input`}
        />
      </div>
    );
  };

  const saveClass = saveState === 'saved' ? ' is-saved' : '';
  return (
    <>
      <Banner text={L.banner} />

      {/* ── 동의 카드 (D24 · §5-A.10) — 문안은 문안집 §1-9 그대로, 호스트가 회사 이름을 넣어 준다 ── */}
      <div className={`admin-card msc-card${needConsent ? ' is-error' : ''}`} data-testid="preference-consent-card">
        <div className="admin-section-label">{L.consentTitle}</div>
        <p className="msc-pref-consent-body">
          {L.consentPurpose}{' '}
          {L.consentSharedPrefix}<strong>{L.consentShared}</strong>{L.consentSharedSuffix}{' '}
          {L.consentNoPenalty}
        </p>
        <div className="msc-pref-consent-check">
          <Checkbox
            checked={agreed || checked}
            disabled={agreed}
            invalid={needConsent}
            onChange={(e) => {
              setChecked(e.target.checked);
              setNeedConsent(false);
            }}
            label={L.consentCheckbox}
            data-testid="preference-consent-checkbox"
          />
          <button type="button" className="msc-link-btn" onClick={() => setShowDetail((v) => !v)}
            aria-expanded={showDetail} data-testid="preference-consent-view">
            {showDetail ? L.consentHide : L.consentView}
          </button>
        </div>
        {showDetail && (
          <dl className="msc-pref-consent-detail" data-testid="preference-consent-detail">
            {L.consentDetail.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.text}</dd>
              </div>
            ))}
          </dl>
        )}
        {needConsent && (
          <p className="msc-input-error" role="alert" data-testid="preference-consent-required">{L.consentRequired}</p>
        )}
        {consentError && (
          <p className="msc-input-error" role="alert" data-testid="preference-consent-error">{consentError}</p>
        )}
        {agreed && (
          <div className="msc-pref-consent-foot">
            <span className="msc-pref-consent-date" data-testid="preference-consent-date">
              {L.agreedOn(preference.agreedDate || '')}
            </span>
            <button type="button" className="admin-notif-btn is-sm is-danger" onClick={() => setConfirmOpen(true)}
              data-testid="preference-withdraw-btn">{L.withdraw}</button>
          </div>
        )}
      </div>

      {/* ── 피드백 수신 선호 (§5-A.4 Card 1) ── */}
      <div className="admin-card msc-card" data-testid="preference-feedback-card">
        <div className="admin-section-label">{L.feedbackSection}</div>
        <div className="msc-pref-stack">
          <div>
            <PrefLabel>{L.tone}</PrefLabel>
            <OptionGroup name="tone" options={TONES} value={draft.feedbackTone}
              onChange={(v) => set('feedbackTone', v)} labelOf={(id) => L.options[id]} descOf={(id) => L.optionDescs[id]} />
          </div>
          <div>
            <PrefLabel>{L.style}</PrefLabel>
            <OptionGroup name="style" options={STYLES} value={draft.feedbackStyle}
              onChange={(v) => set('feedbackStyle', v)} labelOf={(id) => L.options[id]} descOf={(id) => L.optionDescs[id]} />
          </div>
          <div>
            <PrefLabel hint={L.focusAreasHint}>{L.focusAreas}</PrefLabel>
            <div className="msc-pref-chips">
              {PREFERENCE_FOCUS_AREAS.map((a) => {
                const on = draft.focusAreas.includes(a);
                // 상한은 막는 것으로 충분하다 — 오류 문구를 띄우지 않는다(policy §4).
                return (
                  <Chip key={a} selected={on} disabled={!on && draft.focusAreas.length >= MAX_FOCUS_AREAS}
                    onClick={() => toggle('focusAreas', a)} data-testid={`pref-focus-${a}`}>{show(a)}</Chip>
                );
              })}
            </div>
          </div>
          <div>
            <PrefLabel hint={L.careerGoalHint}>{L.careerGoal}</PrefLabel>
            <TextInput
              className="admin-emp-input"
              value={draft.careerGoal}
              maxLength={CAREER_GOAL_MAX}
              placeholder={L.careerGoalPlaceholder}
              aria-label={L.careerGoal}
              onChange={(e) => set('careerGoal', e.target.value)}
              data-testid="pref-career-goal"
            />
          </div>
          {keywordField('strengths', PREFERENCE_STRENGTHS, customStrength, setCustomStrength, 'pref-strength')}
          {keywordField('improveAreas', PREFERENCE_IMPROVE_AREAS, customImprove, setCustomImprove, 'pref-improve')}
        </div>
      </div>

      {/* ── 커뮤니케이션 선호 (§5-A.4 Card 2) — 선호 채널은 기획서에서 빠졌다(2026-10-03) ── */}
      <div className="admin-card msc-card" data-testid="preference-communication-card">
        <div className="admin-section-label">{L.communicationSection}</div>
        <div className="msc-pref-stack">
          <div>
            <PrefLabel>{L.responseSpeed}</PrefLabel>
            <OptionGroup name="speed" grid options={SPEEDS} value={draft.responseSpeed}
              onChange={(v) => set('responseSpeed', v)} labelOf={(id) => L.options[id]} descOf={(id) => L.optionDescs[id]} />
          </div>
          <div>
            <PrefLabel hint={L.meetingSlotsHint}>{L.meetingSlots}</PrefLabel>
            <div className="msc-pref-chips">
              {SLOTS.map((s) => (
                <Chip key={s} selected={draft.meetingTimeSlots.includes(s)} onClick={() => toggle('meetingTimeSlots', s)}
                  data-testid={`pref-slot-${s}`}>{L.options[s]}</Chip>
              ))}
            </div>
          </div>
          <div>
            {/* 한쪽만 채워도 저장은 막지 않는다 — 양쪽이 다 있어야 음소거가 걸린다(§5-A.7) */}
            <PrefLabel hint={L.focusHoursHint}>{L.focusHours}</PrefLabel>
            <div className="msc-pref-hours">
              <TimeInput className="admin-emp-input" value={draft.focusHoursStart}
                onChange={(v) => set('focusHoursStart', v)} aria-label={L.focusHoursStart} data-testid="pref-focus-start" />
              <span aria-hidden="true">~</span>
              <TimeInput className="admin-emp-input" value={draft.focusHoursEnd}
                onChange={(v) => set('focusHoursEnd', v)} aria-label={L.focusHoursEnd} data-testid="pref-focus-end" />
            </div>
            <p className="msc-pref-note">{L.focusHoursNote}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`msc-save-btn${saveClass}`}
        disabled={saveState === 'saving'}
        onClick={save}
        data-testid="preference-save-btn"
      >
        {saveState === 'saving' ? L.saving : saveState === 'saved' ? L.saved : L.save}
      </button>

      {confirmOpen && (
        <ConfirmModal
          title={L.withdrawTitle}
          body={L.withdrawBody}
          confirmLabel={L.withdrawConfirm}
          cancelLabel={L.cancel}
          danger
          busy={withdrawing}
          onCancel={() => !withdrawing && setConfirmOpen(false)}
          onConfirm={async () => {
            // 실패를 알리는 것은 호스트다(오류 알림). 창은 어느 쪽이든 닫고, 화면은 호스트가 준 상태 그대로다.
            try {
              await (onWithdraw && onWithdraw());
            } catch {
              /* 호스트가 알린다 */
            }
            setConfirmOpen(false);
          }}
          testId="preference-withdraw-dialog"
        />
      )}
    </>
  );
}

function Banner({ text }) {
  return (
    <div className="admin-notif-banner" data-testid="preference-banner">
      <span className="admin-notif-banner-icon" aria-hidden="true">
        <InfoIcon size={16} />
      </span>
      <p className="admin-notif-banner-text msc-pref-banner-text">{text}</p>
    </div>
  );
}
