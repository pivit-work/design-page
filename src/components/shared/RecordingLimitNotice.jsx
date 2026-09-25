import { CloseGlyph } from './lineIcons.jsx';

/**
 * RecordingLimitNotice — 회사 녹음 시간을 다 써서 녹음을 시작할 수 없을 때의 인라인 앰버 안내.
 *
 * 기획서 시안 `E. Meeting-회의록/meeting-app.jsx` 의 `TrialLimitNotice`(회의 목록 헤더 아래)와
 * `D. 1on1-기획/1on1-app.jsx` 의 `RecordingBar` 안내를 옮긴 것이다. 틀의 정본은
 * `L. 결제-구독/screen-tier-gating.policy.md` §6.6(체험)·§6.7(유료·Free, PW-1023).
 *
 * 🔴 오류가 아니라 경고다 — 빨강이 아니라 앰버로 그린다(§6.6 「안내」 행). 녹음 시작 버튼은
 * 숨기지도 잠그지도 않고, 누르면 녹음 대신 이 안내가 뜬다. 그 판정은 화면이 쥔다.
 *
 * 문장은 화면·요금제·역할마다 다르므로 **전부 호스트가 준다** — 이 부품은 상자와 버튼만 그린다.
 * 스타일은 `recording-limit-notice.css`.
 *
 * @param {object}   props
 * @param {string}   props.title          「이번 달 녹음 시간을 모두 썼습니다」
 * @param {string}   props.body           안내 본문(다시 쓸 수 있는 날짜까지 호스트가 채운다)
 * @param {string}   [props.actionLabel]  결제 권한자에게만 주는 버튼 글([결제하고 계속 쓰기]·[영업팀 문의])
 * @param {Function} [props.onAction]
 * @param {string}   [props.fallbackText] 버튼이 없는 사람에게 대신 보이는 한 줄(「관리자에게 문의해 주세요」)
 * @param {Function} [props.onClose]      없으면 닫기 버튼을 그리지 않는다
 * @param {string}   [props.closeLabel]   닫기 버튼의 접근성 이름
 * @param {'block'|'compact'} [props.size='block']  compact 는 1on1 녹음 바 안처럼 좁은 자리용
 * @param {string}   [props.testId]
 */
export default function RecordingLimitNotice({
  title,
  body,
  actionLabel,
  onAction,
  fallbackText,
  onClose,
  closeLabel,
  size = 'block',
  testId,
}) {
  const hasAction = Boolean(actionLabel && onAction);
  return (
    <div
      className={`reclimit${size === 'compact' ? ' is-compact' : ''}`}
      role="status"
      data-testid={testId}
    >
      <div className="reclimit-content">
        <p className="reclimit-title">{title}</p>
        {body && <p className="reclimit-body">{body}</p>}
        {hasAction ? (
          <button type="button" className="reclimit-action" onClick={onAction}>
            {actionLabel}
          </button>
        ) : (
          fallbackText && <p className="reclimit-fallback">{fallbackText}</p>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          className="reclimit-close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <CloseGlyph size={16} />
        </button>
      )}
    </div>
  );
}
