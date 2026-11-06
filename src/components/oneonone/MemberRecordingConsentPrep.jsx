import Stack from '../shared/Stack.jsx';

/**
 * 팀원 준비 화면의 «녹음 안내» — 이 회차 녹음에 동의할지 고른다 (pivit-work PW-2594 · 1on1 policy §4.2.11-A).
 *
 * 디자이너 원본이 없어 같은 용도의 디자이너 모양을 옮겨 조합했다(design-review):
 * 머리는 준비 화면 섹션 머리(`ono-start-section-title`·`ono-my-section-aux`), 안내는 같은 화면 녹음 고지(`ono-my-notice`),
 * [자세히]는 브리핑 펼치기(`ono-start-briefing-toggle`), 두 선택은 일정 창 「요약 타입」(`tl-event-radio-*`),
 * 보조 줄은 칸 보조 글(`ono-my-field-aux`), 오류는 마이크 오류 줄(`mtg-mic-error`).
 *
 * 🔴 두 선택은 같은 무게로 놓고 미리 고르지 않는다(INV-RC4). 문구는 전부 호스트가 준다.
 *
 * @param {object}   props
 * @param {string}   props.title        「녹음 안내」
 * @param {string}   props.aux          머리 오른쪽 보조 글 「이 회차만」
 * @param {string}   props.noticeTitle  안내 본문
 * @param {string}   props.noticeBody   안내 마지막 줄
 * @param {string}   props.detailsLabel [자세히]
 * @param {boolean}  [props.detailsOpen]
 * @param {Function} props.onToggleDetails
 * @param {string}   [props.detailsTitle]
 * @param {string}   [props.detailsBody] 펼쳤을 때 보이는 목적·항목·보유 기간·거부권
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
  noticeTitle,
  noticeBody,
  detailsLabel,
  detailsOpen = false,
  onToggleDetails,
  detailsTitle,
  detailsBody,
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
        <div className="ono-my-notice" role="status">
          <div>{noticeTitle}</div>
          <div>{noticeBody}</div>
        </div>
        <div>
          <button type="button" className="ono-start-briefing-toggle" onClick={onToggleDetails} data-testid="ono-my-recording-consent-details">
            {detailsLabel}
          </button>
        </div>
        {detailsOpen && (
          <div className="ono-my-notice">
            <div>{detailsTitle}</div>
            <div>{detailsBody}</div>
          </div>
        )}
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
        <p className="ono-my-field-aux ono-rec-consent-line">{hint}</p>
        {error && (
          <p className="mtg-mic-error" role="alert" data-testid="ono-my-recording-consent-error">{error}</p>
        )}
      </Stack>
    </div>
  );
}
