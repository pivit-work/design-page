import { useState } from 'react';

/**
 * [PW-2591] 리더 코멘트 «개선 방향으로 다듬기»의 상태 — `LeaderCommentPolish.jsx` 의 세 조각(버튼·썼음 표시·결과)이 함께 본다.
 *
 * @param {string} comment 지금 칸의 글
 * @param {boolean} [disabled] 칸이 잠겼다 — 버튼도 함께 꺼진다
 * @param {(comment: string) => Promise<{changed: boolean, text: string, sources: string[], noEvidence: boolean} | {notice: any} | null>} onPolish
 *   실패는 throw 또는 null. 체험·유료 AI 한도 안내는 `{ notice }` 로 돌려준다(그 자리에 그대로 그린다).
 */
export default function useLeaderCommentPolish({ comment, disabled = false, onPolish }) {
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

  return { state, setState, run, empty, loading, stale, disabled };
}

