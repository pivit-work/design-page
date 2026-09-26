import { AlertTriangleGlyph } from './lineIcons.jsx';
import Tooltip from './Tooltip.jsx';

/**
 * AiFailBox — AI 생성이 실패했을 때의 안내 상자.
 *
 * 담는 것은 기획서 시안(`1on1-app.jsx` 의 `AIFailBox`)이 정한다:
 * 「○○ 생성에 실패했습니다」 제목 · 사유별 안내 문장 · 「직접 입력해도 됩니다」 안내 ·
 * [다시 시도] 버튼(남은 횟수 · 한도를 넘었으면 누를 수 없고 이유를 툴팁으로 말한다).
 *
 * 문장은 화면마다 다르므로 **전부 호스트가 준다** — 이 부품은 상자와 버튼만 그린다.
 * 스타일은 `ai-fail-box.css`.
 *
 * @param {object}   props
 * @param {string}   props.title            「AI 회의록 생성에 실패했습니다」
 * @param {string}   props.message          사유별 안내 + 「직접 입력해도 됩니다」까지 합친 문장.
 * @param {string}   [props.retryLabel]     없으면 버튼 자체를 그리지 않는다.
 * @param {Function} [props.onRetry]
 * @param {boolean}  [props.retryDisabled]  한도 초과·재시도 소진·재시도 중.
 * @param {string}   [props.retryTitle]     못 누를 때 이유(마우스를 올리면 보인다).
 * @param {string}   [props.testId]
 */
export default function AiFailBox({
  title,
  message,
  retryLabel,
  onRetry,
  retryDisabled = false,
  retryTitle,
  testId,
}) {
  return (
    <div className="aifail" role="alert" data-testid={testId}>
      <span className="aifail-title">
        <AlertTriangleGlyph size={14} />
        {title}
      </span>
      {message && <p className="aifail-msg">{message}</p>}
      {retryLabel && (
        <span className="aifail-actions">
          <Tooltip content={retryTitle}>
            <button
              type="button"
              className="aifail-retry"
              onClick={onRetry}
              disabled={retryDisabled}
            >
              {retryLabel}
            </button>
          </Tooltip>
        </span>
      )}
    </div>
  );
}
