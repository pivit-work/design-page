import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Button from '../shared/Button.jsx';
import AiMark from '../shared/AiMark.jsx';
import MemberAiButton from '../oneonone/MemberAiButton.jsx';
import { AlertIcon, CheckCircleIcon, InfoIcon } from './evalIcons.jsx';

/**
 * [PW-2591 · leader.policy §5.6-A · §8.4 · spec-eval-cycle §4.5.5] 리더 코멘트 «✨ 개선 방향으로 다듬기».
 *
 * 하향 리뷰 작성 화면의 리더 코멘트 칸과 리포트 승인 창의 «최종 코멘트» 칸이 같이 쓴다. 칸(textarea)은 부르는 쪽이
 * 그리고, 이 파일은 칸 둘레의 세 조각을 준다 — 부르는 쪽이 자리에 놓는다:
 *
 * - `LeaderCommentPolishButton` — 이름표 줄 오른쪽의 보라 AI 버튼(원온원 «내 작성» 칸 머리 `.ono-my-field-head`
 *   오른쪽 «AI 생성» 버튼 = `MemberAiButton`, 디자이너 stesslee 1d9b5e5b). 기다리는 동안 AI 마크 자리에서 돈다.
 * - `LeaderCommentPolishUsed` — 이름표 바로 옆 «✓ 다듬은 문구를 썼습니다»(원온원 `.ono-my-field-done`).
 * - `LeaderCommentPolishResult` — 칸 아래 실패 줄·한도 안내·노란 카드.
 *
 * 세 조각이 같은 상태를 보도록 `useLeaderCommentPolish`(./useLeaderCommentPolish.js) 하나를 부르는 쪽이 들고 나눠 준다.
 *
 * - 누를 때만 돈다(절대규칙 5). 고르기 전에는 칸을 바꾸지 않는다(노랑 = 미확인).
 * - 결과는 저장하지 않는다(R-6) — 카드는 이 상태라 부르는 쪽이 다시 그리면(창을 닫으면) 사라진다.
 * - 모양은 11-10 커트가 고른 시안(pivit-work PW-2591 11-10 22:02 댓글 ③⑦⑧⑨⑩)대로
 *   원온원 «내 작성» 칸·읽기 상자·안내 줄(`.ono-filter-notice`)의 디자이너 값을 쓴다. 글과 나오는 조건은 그대로다.
 */

/** 이름표 줄 오른쪽 보라 AI 버튼. 비어 있으면 꺼지고 툴팁이 이유를 말한다. */
export function LeaderCommentPolishButton({ polish, L, testId }) {
  const { empty, loading, disabled, run } = polish;
  return (
    <Tooltip content={empty ? L.polishEmptyHint : L.polishHint}>
      <MemberAiButton
        label={loading ? L.polishBusy : L.polishButton}
        aiWord={false}
        pending={loading}
        disabled={empty || disabled}
        onClick={() => void run()}
        testId={`${testId}-polish`}
      />
    </Tooltip>
  );
}

/** 이름표 바로 옆 «✓ 다듬은 문구를 썼습니다 · 이어서 고칠 수 있습니다». 칸을 다시 고치면 부르는 쪽이 끈다. */
export function LeaderCommentPolishUsed({ L, testId }) {
  // 좁은 칸(승인 창)에서는 «·» 앞뒤에서만 줄을 바꾼다 — 덩이마다 줄바꿈하지 않는다(eval-cycle.css .evl-lc-used-part).
  const [head, ...rest] = L.polishUsed.split(' · ');
  return (
    <span className="ono-my-field-done" data-testid={`${testId}-polish-used`}>
      <CheckCircleIcon size={14} />
      <span className="evl-lc-used-part">{head}</span>
      {rest.length > 0 && (
        <>
          {' '}
          <span className="evl-lc-used-part">· {rest.join(' · ')}</span>
        </>
      )}
    </span>
  );
}

/**
 * 칸 아래 결과 — 실패 줄 · 한도 안내 · 노란 카드.
 *
 * @param {(text: string) => void} onUse [다듬은 문구 쓰기]
 * @param {boolean} [stacked] 원문·다듬은 문구 두 칸을 위아래로(승인 창 · 좁은 자리)
 */
export function LeaderCommentPolishResult({ polish, onUse, stacked = false, L, testId }) {
  const { state, setState, run, stale } = polish;
  if (!state || state.status === 'loading') return null;

  if (state.status === 'notice') {
    return <div data-testid={`${testId}-polish-notice`}>{state.notice}</div>;
  }

  if (state.status === 'error') {
    // 안내 줄 모양(원온원 .ono-filter-notice — 아이콘 16 + 12 Medium, 바탕 없음)에 오류 색 · [다시 시도]는 줄 오른쪽.
    return (
      <div className="evl-lcp-line is-error" role="alert" data-testid={`${testId}-polish-error`}>
        <AlertIcon size={16} />
        <span className="evl-lcp-line-text">{L.polishFailed}</span>
        <Button variant="secondary" size="sm" onClick={() => void run()} data-testid={`${testId}-polish-retry`}>
          {L.polishRetry}
        </Button>
      </div>
    );
  }

  // done
  return (
    <div className="evc-rm-ai-draft evl-lcp-card" data-testid={`${testId}-polish-card`}>
      <div className="evl-lcp-card-head">
        <StatusBadge className="ons-ai-tag evr-my-ai-tag" data-testid={`${testId}-polish-ai-tag`}>
          <AiMark size={12} />
          <span>{L.polishCardTitle}</span>
        </StatusBadge>
        <StatusBadge tone="warning" className="evc-status-badge">{L.polishUnconfirmed}</StatusBadge>
        {state.changed && state.noEvidence && (
          <span className="evl-lcp-head-note" data-testid={`${testId}-polish-no-evidence`}>
            · {L.polishNoEvidence}
          </span>
        )}
      </div>
      {stale && state.changed && (
        <p className="evl-lcp-line is-error" data-testid={`${testId}-polish-stale`}>
          <InfoIcon size={16} />
          <span className="evl-lcp-line-text">{L.polishStale}</span>
        </p>
      )}
      {!state.changed ? (
        <div className="evl-lcp-foot" data-testid={`${testId}-polish-nochange`}>
          <span className="evl-lcp-line-text">{L.polishNoChange}</span>
          <Button variant="secondary" size="sm" onClick={() => setState(null)} data-testid={`${testId}-polish-close`}>
            {L.polishClose}
          </Button>
        </div>
      ) : (
        <>
          <div className={`evl-lcp-cols${stacked ? ' is-stacked' : ''}`}>
            <div className="evl-lcp-col">
              <div className="evl-lcp-col-label">{L.polishOriginal}</div>
              <p className="ono-my-readbox evl-lcp-readbox is-original" data-testid={`${testId}-polish-original`}>
                {state.original}
              </p>
            </div>
            <div className="evl-lcp-col">
              <div className="evl-lcp-col-label">{L.polishPolished}</div>
              <p className="ono-my-readbox evl-lcp-readbox" data-testid={`${testId}-polish-text`}>
                {state.text}
              </p>
            </div>
          </div>
          {/* 근거 칩은 왼쪽, 버튼은 오른쪽 — 흰 보조 → 초록 주 순서(시안 ⑧). */}
          <div className="evl-lcp-foot">
            {state.sources?.length > 0 && (
              <div className="evl-lcp-sources" data-testid={`${testId}-polish-sources`}>
                {state.sources.map((s) => (
                  <StatusBadge key={s} tone="neutral" className="evc-status-badge">
                    {s}
                  </StatusBadge>
                ))}
              </div>
            )}
            <div className="evl-lcp-actions">
              <Button variant="secondary" size="sm" onClick={() => setState(null)} data-testid={`${testId}-polish-keep`}>
                {L.polishKeep}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={stale}
                onClick={() => {
                  onUse(state.text);
                  setState(null);
                }}
                data-testid={`${testId}-polish-use`}
              >
                {L.polishUse}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
