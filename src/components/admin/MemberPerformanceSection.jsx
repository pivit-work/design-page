import SectionLabel from './SectionLabel.jsx';
import Button from '../shared/Button.jsx';
import Stack from '../shared/Stack.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import GradeBadge from '../shared/GradeBadge.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { ArchivedNote } from './ArchivedRecordsSection.jsx';

const fill = (tpl, map) =>
  Object.entries(map).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''), String(tpl ?? ''));

/** 읽기 칸 한 개 — 같은 페이지 읽기 칸(`DetailReadField`)과 같은 모양: 라벨 위 · 값 아래. */
function ReadField({ label, value, testId }) {
  return (
    <div className="admin-emp-field" data-testid={testId}>
      <span className="admin-emp-field-label">{label}</span>
      <span className="msc-pair-value">{value}</span>
    </div>
  );
}

/**
 * 구성원 상세 «HR 기록» 탭 맨 위 «성과» 묶음 (pivit-work PW-2818 · admin-spec §3.2-D «PW-2818» ·
 * screen-admin-employees-detail.policy.md v1.1). 읽기 전용 — 값은 평가 · 발령 · OKR 이 갖고 [수정] 중에도 같은 모습이다.
 *
 * ① 평가 이력 — 확정 사이클마다 한 줄(최근이 위): «{기간}» + 등급 딱지 / «평가자 {이름} · 확정 {날짜}» / 오른쪽 «공개 {날짜}» 또는 «공개 전»
 *    · 줄이 있으면 [성과평가 대시보드 열기 →] · 없으면 «확정된 평가 결과가 없어요» · 퇴직 보관 중이면 옮긴 칸 한 줄(`archivedNote`)
 * ② 승진 이력 «N회»(0 이면 «—») ③ 개인 OKR «달성률 N% · 목표 M개» / «이번 분기 개인 OKR 이 없어요» — `individualOkr` 가 null 이면 칸이 없다
 * 불러오는 중은 회색 자리 · 실패는 묶음 자리에 안내 + [다시 시도](이 묶음만).
 *
 * 모양 — 줄은 같은 페이지의 고칠 수 없는 회색 칸(`.admin-emp-manager-readonly`)에 «지급된 자산» 줄의 두 줄 글(`.admin-emp-ceo-text`),
 * 등급은 내 설정 «성과 정보»와 같은 `GradeBadge`, 실패 줄은 «지급된 자산» 묶음과 같다.
 *
 * @param {{ status: 'idle'|'loading'|'ready'|'error', view: { evalHistory?: Array<{ cycleId: string, period: string,
 *   grade: string, evaluator: string|null, confirmedAt: string|null, releasedAt: string|null }>, promotionCount?: number,
 *   individualOkr?: { period: string, progress: number|null, objectives: number } | null } | null }} props.state
 * @param {string|null} props.archivedNote 퇴직 처리가 끝나 평가 이력을 옮겼으면 그 자리 한 줄(파기됐으면 파기 문구) — 아니면 null
 */
export default function MemberPerformanceSection({ state, labels, archivedNote = null, onRetry, onOpenDashboard }) {
  const L = labels || {};
  const view = state?.view || null;
  let body;
  if (state?.status === 'error') {
    body = (
      <Stack gap="sm" testId="employees-detail-performance-error">
        <span className="admin-emp-status-date-note is-error" role="alert">{L.loadError}</span>
        {onRetry && (
          <div>
            <Button variant="ghost" size="sm" onClick={onRetry} data-testid="employees-detail-performance-retry">{L.retry}</Button>
          </div>
        )}
      </Stack>
    );
  } else if (state?.status !== 'ready' || !view) {
    body = <SkeletonList count={2} height={52} aria-label={L.loading} data-testid="employees-detail-performance-loading" />;
  } else {
    const rows = view.evalHistory || [];
    const okr = view.individualOkr;
    let history;
    if (archivedNote) {
      history = <ArchivedNote text={archivedNote} testId="employees-detail-performance-archived" />;
    } else if (rows.length === 0) {
      history = (
        <div className="admin-emp-manager-readonly" data-testid="employees-detail-performance-empty">
          <span className="admin-emp-manager-note">{L.empty}</span>
        </div>
      );
    } else {
      history = (
        <Stack gap="sm" testId="employees-detail-performance-history">
          {rows.map((r) => (
            <div key={r.cycleId} className="admin-emp-manager-readonly" data-testid={`employees-detail-performance-row-${r.cycleId}`}>
              <span className="admin-emp-ceo-text admin-emp-perf-text">
                <span className="admin-emp-leader-of-row">
                  <span className="admin-emp-manager-name">{r.period}</span>
                  <GradeBadge grade={r.grade} />
                </span>
                <span className="admin-emp-manager-note">
                  {fill(L.rowMeta, { evaluator: r.evaluator || '—', date: r.confirmedAt || '—' })}
                </span>
              </span>
              {r.releasedAt ? (
                <span className="admin-emp-manager-note admin-emp-perf-side" data-testid="employees-detail-performance-released">
                  {fill(L.released, { date: r.releasedAt })}
                </span>
              ) : (
                <StatusBadge tone="warning" className="admin-emp-perf-side" data-testid="employees-detail-performance-unreleased">
                  {L.unreleased}
                </StatusBadge>
              )}
            </div>
          ))}
          {onOpenDashboard && (
            <div>
              <Button variant="secondary" size="sm" onClick={onOpenDashboard} data-testid="employees-detail-performance-dashboard">
                {L.openDashboard}
              </Button>
            </div>
          )}
        </Stack>
      );
    }
    const promo = view.promotionCount ? fill(L.promotionCount, { count: view.promotionCount }) : '—';
    body = (
      <Stack gap="lg">
        <Stack gap="sm">
          <span className="admin-emp-field-label">{L.evalHistory}</span>
          {history}
        </Stack>
        <div className="admin-emp-detail-read-grid">
          <ReadField label={L.promotion} value={promo} testId="employees-detail-performance-promotion" />
          {okr && (
            <ReadField
              label={fill(L.okrLabel, { period: okr.period })}
              value={okr.objectives > 0
                ? fill(L.okrValue, { progress: okr.progress ?? 0, count: okr.objectives })
                : L.okrEmpty}
              testId="employees-detail-performance-okr"
            />
          )}
        </div>
        <span className="admin-emp-manager-note" data-testid="employees-detail-performance-note">{L.note}</span>
      </Stack>
    );
  }
  return (
    <div data-testid="employees-detail-performance">
      <div className="admin-emp-section-head">
        <SectionLabel>{L.section}</SectionLabel>
        <StatusBadge tone="neutral" data-testid="employees-detail-performance-tag">{L.sourceTag}</StatusBadge>
      </div>
      {body}
    </div>
  );
}
