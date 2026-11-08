import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Spinner from '../shared/Spinner.jsx';
import Button from '../shared/Button.jsx';
import { SparkleIcon, CheckCircleIcon } from './evalIcons.jsx';

/**
 * [PW-2591 · leader.policy §5.6-A · §8.4 · spec-eval-cycle §4.5.5] 리더 코멘트 «✨ 개선 방향으로 다듬기».
 *
 * 하향 리뷰 작성 화면의 리더 코멘트 칸과 리포트 승인 창의 «최종 코멘트» 칸이 같이 쓴다. 칸(textarea)은 부르는 쪽이
 * 그리고, 이 부품은 칸 바로 아래 버튼 줄과 결과 카드만 그린다.
 *
 * - 누를 때만 돈다(절대규칙 5). 고르기 전에는 칸을 바꾸지 않는다(노랑 = 미확인).
 * - 결과는 저장하지 않는다(R-6) — 카드는 이 부품의 상태라 부르는 쪽이 다시 그리면(창을 닫으면) 사라진다.
 * - 모양은 사이클 위자드 리마인더의 «AI로 문구 다듬기» 버튼·노란 카드(`evc-rm-ai*`)와 같은 틀이다(정책 §5.6-A).
 *
 * @param {string} comment 지금 칸의 글
 * @param {boolean} [disabled] 칸이 잠겼다 — 버튼도 함께 꺼진다
 * @param {(comment: string) => Promise<{changed: boolean, text: string, sources: string[], noEvidence: boolean} | {notice: any} | null>} onPolish
 *   실패는 throw 또는 null. 체험·유료 AI 한도 안내는 `{ notice }` 로 돌려준다(그 자리에 그대로 그린다).
 * @param {(text: string) => void} onUse [다듬은 문구 쓰기]
 * @param {boolean} [used] 「✓ 다듬은 문구를 썼습니다」 — 칸을 다시 고치면 부르는 쪽이 끈다
 * @param {boolean} [stacked] 원문·다듬은 문구 두 칸을 위아래로(승인 창 · 좁은 자리)
 * @param {Record<string,string>} L 문구
 * @param {string} testId 테스트 id 머리
 */
export default function LeaderCommentPolish({
  comment,
  disabled = false,
  onPolish,
  onUse,
  used = false,
  stacked = false,
  L,
  testId,
}) {
  const [state, setState] = useState(null); // null | {status:'loading'|'done'|'error'|'notice', original, ...}
  const empty = !(comment || '').trim();
  const loading = state?.status === 'loading';
  const stale = state?.status === 'done' && state.original !== comment;

  const run = async () => {
    if (empty || loading || disabled) return;
    const original = comment;
    setState({ status: 'loading', original });
    try {
      const out = await onPolish(original);
      if (!out) setState({ status: 'error', original });
      else if (out.notice) setState({ status: 'notice', original, notice: out.notice });
      else setState({ status: 'done', original, ...out });
    } catch {
      // AI 실패가 임시저장·제출·승인을 막지 않는다(R-8) — 칸은 그대로, 인라인 안내만.
      setState({ status: 'error', original });
    }
  };

  return (
    <>
      <div className="evl-lcp-row">
        <Tooltip content={empty ? L.polishEmptyHint : L.polishHint}>
          {/* 이모지 대신 반짝이 아이콘(앱 규칙) — 기다리는 동안은 그 자리에서 돈다(.dp-busy-inline). */}
          <Button
            className="evc-rm-ai"
            disabled={empty || disabled || loading}
            aria-busy={loading || undefined}
            onClick={() => void run()}
            data-testid={`${testId}-polish`}
          >
            <span className="dp-busy-inline">
              {loading ? <Spinner size={12} /> : <SparkleIcon size={12} />}
              {loading ? L.polishBusy : L.polishButton}
            </span>
          </Button>
        </Tooltip>
        <span className="evl-lcp-hint">{L.polishHint}</span>
      </div>
      {used && (
        <p className="evl-lcp-used" data-testid={`${testId}-polish-used`}>
          <CheckCircleIcon size={12} />
          {L.polishUsed}
        </p>
      )}
      {state?.status === 'notice' && (
        <div data-testid={`${testId}-polish-notice`}>{state.notice}</div>
      )}
      {state?.status === 'error' && (
        <p className="evc-rm-ai-error evl-lcp-error" data-testid={`${testId}-polish-error`}>
          {L.polishFailed}
          <Button variant="ghost" size="sm" onClick={() => void run()} data-testid={`${testId}-polish-retry`}>
            {L.polishRetry}
          </Button>
        </p>
      )}
      {state?.status === 'done' && (
        <div className="evc-rm-ai-draft" data-testid={`${testId}-polish-card`}>
          <div className="evc-rm-ai-draft-head">
            <SparkleIcon size={12} />
            {L.polishCardTitle}
            <StatusBadge className="evc-mode-badge is-warn">{L.polishUnconfirmed}</StatusBadge>
            {state.changed && state.noEvidence && (
              <span className="evl-lcp-head-note" data-testid={`${testId}-polish-no-evidence`}>
                · {L.polishNoEvidence}
              </span>
            )}
          </div>
          {stale && state.changed && (
            <p className="evc-rm-ai-warn" data-testid={`${testId}-polish-stale`}>
              {L.polishStale}
            </p>
          )}
          {!state.changed ? (
            <div className="evl-lcp-nochange" data-testid={`${testId}-polish-nochange`}>
              {L.polishNoChange}
              <Button variant="ghost" size="sm" onClick={() => setState(null)} data-testid={`${testId}-polish-close`}>
                {L.polishClose}
              </Button>
            </div>
          ) : (
            <>
              <div className={`evl-lcp-cols${stacked ? ' is-stacked' : ''}`}>
                <div className="evl-lcp-col">
                  <div className="evl-lcp-col-label">{L.polishOriginal}</div>
                  <div className="evl-lcp-box is-original" data-testid={`${testId}-polish-original`}>
                    {state.original}
                  </div>
                </div>
                <div className="evl-lcp-col">
                  <div className="evl-lcp-col-label is-polished">{L.polishPolished}</div>
                  <div className="evl-lcp-box" data-testid={`${testId}-polish-text`}>
                    {state.text}
                  </div>
                  {state.sources?.length > 0 && (
                    <div className="evl-lcp-sources" data-testid={`${testId}-polish-sources`}>
                      {state.sources.map((s) => (
                        <span key={s} className="evl-lcp-source">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="evc-rm-ai-actions">
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
                <Button variant="ghost" size="sm" onClick={() => setState(null)} data-testid={`${testId}-polish-keep`}>
                  {L.polishKeep}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
