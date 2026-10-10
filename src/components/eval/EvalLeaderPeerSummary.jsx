import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import Button from '../shared/Button.jsx';

/**
 * EvalLeaderPeerSummary — 하향 리뷰 근거 칸의 «동료 피드백 요약» (PW-1613 · 리더 정책 §5.1.1).
 *
 * 위: 업적·역량 묶음별 AI 요약과 묶음마다 원본 수. **버튼을 눌러야 만든다**(기획 절대 규칙 5 —
 * 화면을 열었다고 AI 를 부르지 않는다). 아래: 동료마다 «원본 보기» 버튼, 누르면 그 동료가 낸 원문 창.
 *
 * 작성자 이름은 서버가 정한다 — 질문의 «작성자 표기»가 실명인 동료만 `named` 로 이름·직무가 오고,
 * 나머지는 `label`(«동료 1» 같은)만 온다. 화면이 이름을 감추는 것이 아니라 애초에 안 온다.
 *
 * 요약 상태(`summary.status`):
 *   'none'    아직 안 만들었다 — 안내 + [요약 만들기]
 *   'loading' 만드는 중
 *   'ready'   `chunks: [{ chunk: 'work_achievement'|'competency', text, sourceCount }]`, `generatedAt`
 *   'failed'  못 만들었다(또는 저장된 요약을 못 읽었다) — `summary.message`(없으면 기본 문구) + [다시 시도].
 *             원본 보기는 그대로 된다. [다시 시도]가 무엇을 다시 하는지는 호출부가 정한다.
 *             `summary.previous`({ chunks })가 있으면 전에 만든 요약을 그 위에 그대로 둔다(새로고침 실패)
 *   'blocked' AI 를 쓸 수 없다(체험 횟수 소진 등) — `summary.message` 를 그대로 보인다
 *
 * @param {{ reviewers: object[], hiddenBelowMin?: number, canSummarize?: boolean, summary?: object }|null} peer
 *   reviewers: [{ key, label, named, role, submittedAt, answers: [{ id, itemCategory, growthType, itemLabel, score, textAnswer }] }]
 *   hiddenBelowMin: 응답 인원이 공개 기준 미만이라 뺀 질문 수
 *   canSummarize: 요약에 넣을 답이 있는가(«AI 요약으로만 공개» 질문만 있는 경우 원본 버튼 없이도 참)
 * @param {() => void} [onGenerate]
 * @param {(answer) => string} labelOf 답 → 항목 이름(캔버스의 근거 라벨)
 * @param {object} L 문구(`{count}`·`{at}` 자리를 채운다)
 */

const fill = (tpl, vars) =>
  String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));

const pad = (n) => String(n).padStart(2, '0');
const mmddhhmm = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const CHUNK_LABEL_KEY = {
  work_achievement: 'peerChunkWork',
  competency: 'peerChunkCompetency',
};

function Chunks({ chunks, L }) {
  return (chunks || []).map((c) => (
    <div className="evl-evi-item" key={c.chunk} data-testid={`evl-peer-chunk-${c.chunk}`}>
      <span className="evc-field-label">
        {L[CHUNK_LABEL_KEY[c.chunk]] ?? c.chunk}
        {` · ${fill(L.peerChunkSources, { count: c.sourceCount ?? 0 })}`}
      </span>
      <p className="evl-evi-text">{c.text || L.peerChunkEmpty}</p>
    </div>
  ));
}

function SummaryBody({ summary, onGenerate, L }) {
  const status = summary?.status ?? 'none';
  if (status === 'loading') return <Skeleton height={92} data-testid="evl-peer-summary-loading" />;
  if (status === 'blocked') {
    return (
      <p className="evc-empty-sub" data-testid="evl-peer-summary-blocked">
        {summary.message}
      </p>
    );
  }
  const generate = onGenerate && (
    <Button variant="secondary" size="sm" onClick={onGenerate} data-testid="evl-peer-summary-generate">
      {status === 'ready' ? L.peerSummaryRefresh : status === 'failed' ? L.peerSummaryRetry : L.peerSummaryGenerate}
    </Button>
  );
  if (status === 'ready') {
    return (
      <div data-testid="evl-peer-summary-ready">
        <Chunks chunks={summary.chunks} L={L} />
        <p className="evc-empty-sub" data-testid="evl-peer-summary-at">
          {fill(L.peerSummaryGeneratedAt, { at: mmddhhmm(summary.generatedAt) })}
        </p>
        {generate}
      </div>
    );
  }
  return (
    <div data-testid={status === 'failed' ? 'evl-peer-summary-failed' : 'evl-peer-summary-none'}>
      {/* 새로고침이 실패해도 전에 만든 요약은 그대로 둔다 */}
      {status === 'failed' && summary?.previous ? <Chunks chunks={summary.previous.chunks} L={L} /> : null}
      <p className="evc-empty-sub">
        {status === 'failed' ? summary?.message || L.peerSummaryFailed : L.peerSummaryNone}
      </p>
      {generate}
    </div>
  );
}

export default function EvalLeaderPeerSummary({ peer, onGenerate, labelOf, L }) {
  const [open, setOpen] = useState(null);
  if (!peer) return null;
  const reviewers = peer.reviewers || [];
  const withOriginal = reviewers.filter((r) => (r.answers || []).length > 0);
  const hidden = peer.hiddenBelowMin ?? 0;
  const canSummarize = peer.canSummarize ?? withOriginal.length > 0;

  return (
    <section className="evl-peer" data-testid="evl-peer">
      <h3 className="evc-card-name" style={{ marginTop: 'var(--spacing-xl)' }}>
        {L.peerEvidenceTitle}
        {reviewers.length > 0 ? (
          <span className="evl-sig-sub" data-testid="evl-peer-count">
            {' '}
            {fill(L.peerReviewerCount, { count: reviewers.length })}
          </span>
        ) : null}
      </h3>

      {!canSummarize ? (
        // 기준 미달로 다 가려졌으면 «없습니다»가 아니다 — 아래 미달 안내만 둔다.
        hidden > 0 ? null : (
          <p className="evc-empty-sub" data-testid="evl-peer-empty">
            {L.peerEvidenceEmpty}
          </p>
        )
      ) : (
        <SummaryBody summary={peer.summary} onGenerate={onGenerate} L={L} />
      )}

      {withOriginal.length > 0 && (
        <ul className="evl-sig-krs" data-testid="evl-peer-reviewers">
          {withOriginal.map((r) => (
            <li key={r.key}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(r)}
                data-testid="evl-peer-reviewer"
              >
                {r.label}
                {r.named && r.role ? ` · ${r.role}` : ''}
                {` · ${L.peerOriginalOpen}`}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <p className="evc-empty-sub" data-testid="evl-peer-below-min">
          {fill(L.peerBelowMin, { count: hidden })}
        </p>
      )}

      {open && (
        <ModalShell
          title={open.label}
          description={[open.named && open.role, fill(L.peerOriginalSubmittedAt, { at: mmddhhmm(open.submittedAt) })]
            .filter(Boolean)
            .join(' · ')}
          titleId="evl-peer-original-title"
          closeLabel={L.peerOriginalClose}
          onClose={() => setOpen(null)}
          onSubmit={(e) => e?.preventDefault?.()}
          footer={null}
          testId="evl-peer-original"
          overlayTestId="evl-peer-original-overlay"
          closeTestId="evl-peer-original-close"
        >
          <p className="evc-empty-sub">{L.peerOriginalNote}</p>
          {(open.answers || []).map((a) => (
            <div className="evl-evi-item" key={a.id} data-testid="evl-peer-original-answer">
              <span className="evc-field-label">
                {labelOf(a)}
                {a.score != null ? ` · ${a.score}` : ''}
              </span>
              {a.textAnswer ? <p className="evl-evi-text">{a.textAnswer}</p> : null}
            </div>
          ))}
        </ModalShell>
      )}
    </section>
  );
}
