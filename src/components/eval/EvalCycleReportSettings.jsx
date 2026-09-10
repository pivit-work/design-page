import { AlertIcon, InfoIcon } from './evalIcons.jsx';

/**
 * EvalCycleReportSettings — 사이클 관리 › 리포트 탭 (PW-534 ㉰㉱ · 정책 §8.3 · §4.6.5).
 *
 * 시안: `pivit-specs/G. 성과평과 & feedback/eval-app.jsx` 의 `CycleReportSettings`.
 *
 * ## 층이 갈린 자리다
 *
 * 종전에는 섹션 ON/OFF 가 리포트 «검수» 화면의 컨트롤이었다. 검수는 **개인 단위**
 * 화면이라, 한 사람을 검수하다 섹션을 끄면 **전원 리포트가 바뀌었다.** David 확정
 * (2026-09-08)으로 사이클 전체 기본 구성은 이 탭, 한 사람만의 예외는 검수 화면으로
 * 갈랐다.
 *
 * ## 필수 섹션은 여기서도 못 끈다
 *
 * `requiredSections` 는 체크가 잠긴 채로 보인다 — 숨기면 「그 섹션이 리포트에 없다」로
 * 읽힌다.
 *
 * ## 시점 안내는 «새로 정한 것이 아니다»
 *
 * 정본 §8.6 의 워크플로우를 읽기 전용으로 옮긴 것이다. 규칙은 있었는데 HR 이 그것을
 * 볼 자리가 없었다.
 */

const DEFAULT_LABELS = {
  sectionsTitle: '리포트 구성',
  sectionsHint:
    '이 사이클의 모든 리포트에 들어갈 섹션입니다. 한 사람만 빼려면 리포트 검수에서 개별 예외로 두십시오.',
  required: '필수',
  requiredHint: '필수 섹션 — 끌 수 없습니다',
  channelsTitle: '발송 채널 기본값',
  channelsHint:
    '발송은 「리포트 검수」에서 하고, 여기서 정한 값이 그 화면의 기본 선택이 됩니다.',
  timelineTitle: '리포트가 보이는 시점',
  timelineHint: '정해진 순서입니다 — 여기서 바꾸지 않습니다.',
  timelineNow: '지금 여기',
  timelineBefore:
    '아직 리포트 단계 전입니다 — 캘리브레이션이 확정되면 위 순서가 시작됩니다.',
  timelineFootnote:
    '조직장 검수 위에 본부장 승인 단계가 한 번 더 있습니다 (정책 §8.6) — 조직 설정에 따라 생략될 수 있습니다.',
  generatedWarn:
    '이미 생성된 리포트 {{count}}건에는 적용되지 않습니다 — 구성 변경은 다음 생성부터 반영됩니다. 한 사람만 다르게 하려면 「리포트 검수」에서 그 구성원의 예외로 두십시오.',
  openReportReview: '대상자별 리포트 보기',
  save: '변경사항 저장',
  saving: '저장 중…',
  saved: '저장했습니다',
  saveError: '저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  readOnlyNote: '이 사이클에서는 리포트 구성을 바꿀 수 없습니다.',
  sectionLabels: {},
  channelLabels: {},
  timelineRows: {},
};

const fill = (tpl, vars) =>
  String(tpl).replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars?.[k] ?? ''));

/**
 * ㉱ 공개·발송 시점 — 정본 §8.6 의 네 단계. **순서가 곧 규정이라 여기서 바꾸지 않는다.**
 * 지금 어느 행인지는 호출부가 `currentPhaseKey` 로 준다 — 사이클 상태 → 단계 판정은
 * 화면마다 두면 반드시 한쪽이 뒤처지는 자리다.
 */
const REPORT_TIMELINE_KEYS = ['generate', 'leader', 'hr', 'member'];

const DEFAULT_TIMELINE = {
  generate: {
    when: '캘리브레이션 확정 직후',
    who: '시스템',
    what: '리포트가 자동 생성됩니다',
  },
  leader: {
    when: '생성된 그때부터',
    who: '조직장',
    what: '자기 조직 구성원의 리포트를 검수하고 리더 코멘트를 고칩니다',
  },
  hr: {
    when: '조직장 승인 후',
    who: 'HR',
    what: '최종 검수하고 발송합니다 — 「리포트 검수」 화면이 그 자리입니다',
  },
  member: {
    when: 'HR 이 발송한 뒤',
    who: '당사자',
    what: '그때부터 본인 리포트가 보입니다. 그 전에는 「아직 발송되지 않았습니다」',
  },
};

export default function EvalCycleReportSettings({
  /** 섹션 전량의 켜짐/꺼짐. 필수 섹션도 들어 있다(항상 켜짐). */
  sections = {},
  /** 끌 수 없는 섹션 키. */
  requiredSections = [],
  /** 화면에 그릴 섹션 순서 — 서버가 아는 키 순서를 그대로 받는다. */
  sectionOrder = [],
  channels = [],
  channelOptions = [],
  /** 이미 생성된 리포트 건수. 0 이면 소급 안내를 띄우지 않는다. */
  generatedCount = 0,
  /** 지금 사이클이 서 있는 시점 행. 판정할 수 없으면 `null`. */
  currentPhaseKey = null,
  readOnly = false,
  dirty = false,
  saving = false,
  savedAt = null,
  error = false,
  onToggleSection,
  onToggleChannel,
  onSave,
  onOpenReportReview,
  labels: providedLabels,
}) {
  const L = { ...DEFAULT_LABELS, ...(providedLabels || {}) };
  const requiredSet = new Set(requiredSections);
  const timeline = { ...DEFAULT_TIMELINE, ...(L.timelineRows || {}) };
  const beforeReportPhase = !currentPhaseKey;

  return (
    <>
      {generatedCount > 0 && (
        /* M4 — 이미 생성된 리포트에 소급하지 않는다 (정책 §4.6.7 · §8.3). */
        <p className="evx-notice evc-manage-lock" data-testid="evrs-generated">
          <AlertIcon size={14} />
          <span>{fill(L.generatedWarn, { count: generatedCount })}</span>
        </p>
      )}

      {readOnly && (
        <p className="evx-notice" data-testid="evrs-readonly">
          {L.readOnlyNote}
        </p>
      )}

      <section className="evc-card">
        <h3 className="evc-card-name">{L.sectionsTitle}</h3>
        <p className="evc-wiz-hint">{L.sectionsHint}</p>
        <div className="evrs-chips" data-testid="evrs-sections">
          {sectionOrder.map((key) => {
            const on = sections[key] !== false;
            const isRequired = requiredSet.has(key);
            const locked = isRequired || readOnly;
            return (
              <label
                key={key}
                className={`evrs-chip ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
                title={isRequired ? L.requiredHint : undefined}
                data-testid={`evrs-section-${key}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={locked}
                  onChange={() => onToggleSection?.(key)}
                />
                <span>{L.sectionLabels?.[key] ?? key}</span>
                {isRequired && <span className="evrs-chip-req">{L.required}</span>}
              </label>
            );
          })}
        </div>
      </section>

      <section className="evc-card">
        <h3 className="evc-card-name">{L.channelsTitle}</h3>
        <p className="evc-wiz-hint">{L.channelsHint}</p>
        <div className="evrs-chips" data-testid="evrs-channels">
          {channelOptions.map((key) => {
            const on = channels.includes(key);
            return (
              <label
                key={key}
                className={`evrs-chip ${on ? 'is-on' : ''} ${readOnly ? 'is-locked' : ''}`}
                data-testid={`evrs-channel-${key}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={readOnly}
                  onChange={() => onToggleChannel?.(key)}
                />
                <span>{L.channelLabels?.[key] ?? key}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ㉱ 읽기 전용 — 정본 §8.6 을 화면으로 옮긴 것이지 새 규칙이 아니다. */}
      <section className="evc-card">
        <h3 className="evc-card-name">{L.timelineTitle}</h3>
        <p className="evc-wiz-hint">{L.timelineHint}</p>
        <ol className="evrs-timeline" data-testid="evrs-timeline">
          {REPORT_TIMELINE_KEYS.map((key) => {
            const row = timeline[key] ?? {};
            const now = currentPhaseKey === key;
            return (
              <li
                key={key}
                className={`evrs-timeline-row ${now ? 'is-now' : ''}`}
                data-testid={`evrs-timeline-${key}`}
                data-now={now ? 'true' : 'false'}
              >
                <span className="evrs-timeline-when">{row.when}</span>
                <span className="evrs-timeline-who">{row.who}</span>
                <span className="evrs-timeline-what">{row.what}</span>
                {now && <span className="evrs-timeline-now">{L.timelineNow}</span>}
              </li>
            );
          })}
        </ol>
        {/* 강조할 행이 없다는 사실을 적는다 — 안 적으면 「지금 여기」가 없는 것이
            결함으로 읽힌다 (정책 §4.6.5). */}
        {beforeReportPhase && (
          <p className="evc-wiz-hint" data-testid="evrs-timeline-before">
            {L.timelineBefore}
          </p>
        )}
        <p className="evc-wiz-hint evc-manage-lock" data-testid="evrs-timeline-note">
          <InfoIcon size={14} />
          <span>{L.timelineFootnote}</span>
        </p>
        {onOpenReportReview && (
          <button
            type="button"
            className="evc-btn is-ghost"
            onClick={() => onOpenReportReview()}
            data-testid="evrs-open-review"
          >
            {L.openReportReview}
          </button>
        )}
      </section>

      {!readOnly && (
        <div className="evrs-footer">
          {error && (
            <span className="evrs-save-error" data-testid="evrs-error">
              {L.saveError}
            </span>
          )}
          {!error && savedAt && !dirty && (
            <span className="evc-wiz-hint" data-testid="evrs-saved">
              {L.saved}
            </span>
          )}
          <button
            type="button"
            className="evc-btn is-primary"
            disabled={saving || !dirty}
            onClick={() => onSave?.()}
            data-testid="evrs-save"
          >
            {saving ? L.saving : L.save}
          </button>
        </div>
      )}
    </>
  );
}
