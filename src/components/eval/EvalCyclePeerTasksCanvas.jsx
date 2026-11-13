import { useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import { PencilGlyph } from '../shared/lineIcons.jsx';
import { CheckCircleIcon } from './evalIcons.jsx';

/**
 * EvalCyclePeerTasksCanvas — 내가 작성해야 할 동료 리뷰 대상 목록.
 * tasks[{evaluateeId, evaluateeName, submitted}] + onSelect(evaluateeId).
 * waitsForSelf — 셀프 리뷰를 아직 안 냈다(member §3.2 「셀프 완료 후 오픈」). 목록 대신 빈 상태 칸에 안내만 둔다.
 * closed — [PW-2761 · member §3.3.1 v1.57] 동료 리뷰가 닫혔다. 낸 행은 [수정] 대신 [보기](읽기 전용으로 연다),
 *   안 낸 행은 버튼 없이 회색 «기간 종료» — 누를 것이 없다. 쓸 수 없는 것을 할 수 있는 일처럼 보이지 않는다.
 *
 * [PW-2685] 커트가 고른 모양 시안(eval-look-2026-11-08 member_peer) — 동료를 한 흰 카드 안 줄로
 * (이름 · 제출 완료 초록 딱지 + [수정] / 미작성 + [작성]) 세우고, 위에 «N명 중 M명 제출 완료» 막대를 둔다.
 * 숫자는 받은 목록(tasks)에서 센다. 많으면(자발적 리뷰로 수십 명) 카드 안 목록만 스크롤한다.
 */

const DEFAULT_LABELS = {
  title: '동료 리뷰',
  subtitle: '배정된 동료를 평가하세요.',
  empty: '배정된 동료 리뷰가 없습니다.',
  waitsForSelf: '셀프 리뷰를 제출하면 동료 리뷰가 열립니다.',
  write: '작성',
  edit: '수정',
  view: '보기',
  closed: '기간 종료',
  done: '제출 완료',
  pending: '미작성',
  // [PW-2685] 목록 위 진행 줄. {{total}}·{{done}} 자리는 굵게 그린다.
  progress: '{{total}}명 중 {{done}}명 제출 완료',
};

/** «{{total}}명 중 {{done}}명 …» — 숫자 자리만 굵게. */
function ProgressText({ template, total, done }) {
  const parts = String(template ?? '').split(/(\{\{\w+\}\})/);
  return parts.map((part, i) => {
    const m = part.match(/^\{\{(\w+)\}\}$/);
    if (!m) return part;
    const v = m[1] === 'total' ? total : m[1] === 'done' ? done : '';
    return <b key={i}>{v}</b>;
  });
}

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}

export default function EvalCyclePeerTasksCanvas({
  cycle,
  tasks = [],
  labels: providedLabels,
  onSelect,
  waitsForSelf = false,
  closed = false,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const doneCount = tasks.filter((t) => t.submitted).length;

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{cycle?.name ? cycle.name : L.subtitle}</p>
        </div>
      </header>

      <div className="evc-list">
        {waitsForSelf ? (
          <div className="evc-empty" data-testid="evpt-waits-self">
            <p className="evc-empty-sub">{L.waitsForSelf}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="evc-empty" data-testid="evpt-empty">
            <p className="evc-empty-sub">{L.empty}</p>
          </div>
        ) : (
          <section className="evpt-card" data-testid="evpt-list">
            <div className="evpt-head">
              <span className="evpt-count" data-testid="evpt-progress">
                <ProgressText template={L.progress} total={tasks.length} done={doneCount} />
              </span>
              <span className="evpt-bar" aria-hidden>
                <span
                  className="evpt-bar-fill"
                  style={{ width: `${Math.round((doneCount / tasks.length) * 100)}%` }}
                />
              </span>
            </div>
            <div className="evpt-rows">
              {tasks.map((t) => (
                <div className="evpt-row" key={t.evaluateeId} data-testid="evpt-row">
                  <span className="evpt-avatar" aria-hidden>
                    {String(t.evaluateeName || t.evaluateeId || '?').slice(0, 1)}
                  </span>
                  <span className="evpt-name">{t.evaluateeName || t.evaluateeId}</span>
                  <StatusBadge className={`evc-status-badge evpt-badge tone-${t.submitted ? 'success' : 'neutral'}`}>
                    {t.submitted && <CheckCircleIcon size={12} />}
                    {t.submitted ? L.done : L.pending}
                  </StatusBadge>
                  {closed && !t.submitted ? (
                    <span className="evpt-closed" data-testid="evpt-closed">
                      {L.closed}
                    </span>
                  ) : (
                    <Button
                      variant={t.submitted ? 'secondary' : 'primary'}
                      size="sm"
                      className="evpt-action"
                      onClick={() => onSelect && onSelect(t.evaluateeId)}
                      data-testid="evpt-write"
                    >
                      {!closed && <PencilGlyph size={14} />}
                      {t.submitted ? (closed ? L.view : L.edit) : L.write}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
