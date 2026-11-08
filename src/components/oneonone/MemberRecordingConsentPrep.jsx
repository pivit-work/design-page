import Stack from '../shared/Stack.jsx';
import Icon from '../shared/Icon.jsx';
import Button from '../shared/Button.jsx';

/**
 * 팀원 준비 화면의 «녹음 안내» — 이 회차 녹음에 동의할지 고른다 (pivit-work PW-2594 · 1on1 policy §4.2.11-A).
 *
 * 디자이너 원본이 없어 같은 용도의 디자이너 모양을 옮겨 조합했다(design-review):
 * 머리는 준비 화면 섹션 머리(`ono-start-section-title`·`ono-my-section-aux`), 질문은 같은 팀원 화면 칸 제목(`ono-my-okr-comment-title`),
 * 항목은 1on1 상세 창의 아이콘 + 회색 글 줄(`ood-calendar-row`), 두 선택은 일정 창 「요약 타입」(`tl-event-radio-*`),
 * 보조 줄은 칸 보조 글(`ono-my-field-aux`), 그 끝 글자 버튼은 공용 `Button` 에 「전체 팀 보기」 글자 버튼 모양(`ono-team-empty-action`),
 * 펼친 표는 준비 화면 역량 줄(`ono-start-cap-row`·`-label`), 오류는 마이크 오류 줄(`mtg-mic-error`).
 *
 * 2026-11-08 B안: 경고 상자 속 긴 두 문단을 질문 한 줄 + 짧은 항목으로 줄였다. 법적 고지 표는 [개인정보 처리 자세히]로 펼친다.
 * 🔴 두 선택은 같은 무게로 놓고 미리 고르지 않는다(INV-RC4). 문구는 전부 호스트가 준다.
 *
 * @param {object}   props
 * @param {string}   props.title        「녹음 안내」
 * @param {string}   props.aux          머리 오른쪽 보조 글 「이 회차만」
 * @param {string}   props.question     질문 한 줄
 * @param {{icon: string, text: string}[]} props.points 동의 전에 알아야 할 짧은 항목(아이콘 SVG 주소 + 글)
 * @param {string}   [props.baseUrl]    아이콘 주소 앞에 붙일 경로
 * @param {string}   props.detailsLabel [개인정보 처리 자세히] / [접기]
 * @param {boolean}  [props.detailsOpen]
 * @param {Function} props.onToggleDetails
 * @param {{label: string, value: string}[]} [props.details] 펼쳤을 때 보이는 목적·항목·보유 기간·거부권
 * @param {string}   props.groupLabel   두 선택 묶음의 접근성 이름
 * @param {{value: string, label: string}[]} props.options
 * @param {string|null} props.value     고른 값. 아무것도 고르지 않았으면 `null`
 * @param {boolean}  [props.busy]       저장 중 — 칸을 잠근다
 * @param {Function} props.onChange
 * @param {string}   [props.calendarNote] 초대를 수락해 동의로 표시했을 때의 한 줄
 * @param {string}   props.hint         회색 안내 한 줄
 * @param {string}   [props.error]      저장 실패 문구
 */
export default function MemberRecordingConsentPrep({
  title,
  aux,
  question,
  points = [],
  baseUrl = '',
  detailsLabel,
  detailsOpen = false,
  onToggleDetails,
  details = [],
  groupLabel,
  options,
  value,
  busy = false,
  onChange,
  calendarNote,
  hint,
  error,
}) {
  return (
    <div className="ono-start-section ono-rec-consent-slot" data-testid="ono-my-recording-consent">
      <Stack gap="xl">
        <div className="ono-my-section-head">
          <span className="ono-start-section-title">{title}</span>
          <span className="ono-my-section-aux">{aux}</span>
        </div>
        <Stack gap="lg">
          <p className="ono-my-okr-comment-title ono-rec-consent-question">{question}</p>
          <ul className="ono-rec-consent-points">
            {points.map((point) => (
              <li key={point.text} className="ood-calendar-row ono-rec-consent-point">
                <Icon src={point.icon} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </Stack>
        <div className="tl-event-radio-group" role="radiogroup" aria-label={groupLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              className={`tl-event-radio-pill ${value === option.value ? 'is-selected' : ''}`}
              disabled={busy}
              onClick={() => onChange?.(option.value)}
              data-testid={`ono-my-recording-consent-${option.value}`}
            >
              <span className="tl-event-radio-dot" aria-hidden="true" />
              {option.label}
            </button>
          ))}
        </div>
        {calendarNote && (
          <p className="ono-my-field-aux ono-rec-consent-line" data-testid="ono-my-recording-consent-calendar">{calendarNote}</p>
        )}
        <p className="ono-my-field-aux ono-rec-consent-line">
          {hint}{' '}
          <Button
            className="ono-team-empty-action"
            aria-expanded={detailsOpen}
            onClick={onToggleDetails}
            data-testid="ono-my-recording-consent-details"
          >
            {detailsLabel}
          </Button>
        </p>
        {detailsOpen && (
          <dl className="ono-rec-consent-facts" data-testid="ono-my-recording-consent-facts">
            {details.map((row) => (
              <div key={row.label} className="ono-start-cap-row ono-rec-consent-fact">
                <dt className="ono-start-cap-label">{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {error && (
          <p className="mtg-mic-error" role="alert" data-testid="ono-my-recording-consent-error">{error}</p>
        )}
      </Stack>
    </div>
  );
}
