import { useState } from 'react';
import SectionLabel from './SectionLabel.jsx';
import Button from '../shared/Button.jsx';
import Stack from '../shared/Stack.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { IconChevronRight } from './employeesIcons.jsx';

const fill = (tpl, map) =>
  Object.entries(map).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''), String(tpl ?? ''));

/** 읽기 칸 한 개 — 같은 페이지 읽기 칸(«성과» 묶음 `ReadField`)과 같은 모양: 라벨 위 · 값 아래. */
function ReadField({ label, value, testId }) {
  return (
    <div className="admin-emp-field" data-testid={testId}>
      <span className="admin-emp-field-label">{label}</span>
      <span className="msc-pair-value">{value}</span>
    </div>
  );
}

/**
 * 휴가 이력 창 — 그 사람의 휴가 신청(조회 전용 · 추가 · 삭제 없음 · admin-spec §3.2.10 표 «휴가 이력»).
 * 틀은 같은 페이지 «보상 이력» 창(`adm-shell` + `RosterTable framed`)과 같다. 아래 줄에 안내 + [휴가 현황 열기].
 */
function LeaveHistoryModal({ requests, labels, onClose, onOpenOverview }) {
  const L = labels || {};
  return (
    <ModalShell
      title={L.modalTitle}
      titleId="member-leave-history-title"
      closeLabel={L.close}
      onClose={onClose}
      zIndex={1000}
      className="adm-shell admin-emp-sal-shell"
      bodyClassName="adm-shell-body admin-emp-sal-body"
      testId="member-leave-history-modal"
      footer={
        <div className="admin-emp-section-head" data-testid="member-leave-history-footer">
          <span className="admin-emp-manager-note">{L.modalNote}</span>
          {onOpenOverview && (
            <Button variant="secondary" size="sm" onClick={onOpenOverview} data-testid="member-leave-history-open-overview">
              {L.openOverview}
              <IconChevronRight size={14} />
            </Button>
          )}
        </div>
      }
    >
      {requests.length === 0 ? (
        <div className="admin-emp-sal-status is-empty" data-testid="member-leave-history-empty">{L.empty}</div>
      ) : (
        <RosterTable
          framed
          rows={requests}
          rowKey={(r) => r.id}
          testId="member-leave-history-table"
          columns={[
            { key: 'type', header: L.colType, render: (r) => r.typeName },
            { key: 'period', header: L.colPeriod, render: (r) => r.period },
            { key: 'amount', header: L.colAmount, align: 'right', render: (r) => r.amount },
            {
              key: 'status',
              header: L.colStatus,
              render: (r) => <StatusBadge tone={r.statusTone || 'neutral'}>{r.statusLabel}</StatusBadge>,
            },
            { key: 'approver', header: L.colApprover, render: (r) => r.approver || '—' },
          ]}
        />
      )}
    </ModalShell>
  );
}

/**
 * 구성원 상세 «근무·고용» 탭 «근태·휴가» 묶음 (pivit-work PW-2817 · admin-spec §3.2.10 «PW-2817» ·
 * screen-admin-employees-detail.policy.md v1.1). 휴가 애드온이 켜진 회사에서만 호스트가 그린다. 읽기 전용 —
 * [수정] 중에도 같은 모습이다.
 *
 * 세 칸(휴가 사용일수 · 남은 연차 · 사용 가능 휴가)은 셋 다 연차이고 글자는 호스트가 «N일 N시간»으로 만들어 준다.
 * 병가 · 근무 시간 두 줄 · [근태 기록 →]은 두지 않는다(값의 출처가 없어 늘 빈 칸이다).
 * 불러오는 중은 세 칸 자리 회색 블록 · 실패는 세 칸 «—» + 안내 + [다시 시도](이 묶음만).
 *
 * 모양 — «HR 기록» 탭 «성과» 묶음(MemberPerformanceSection)과 같은 머리 · 읽기 칸 · 실패 줄 · 회색 줄.
 *
 * @param {{ status: 'idle'|'loading'|'ready'|'error', view: { used: string, remaining: string, available: string,
 *   requests: Array<{ id: string, typeName: string, period: string, amount: string, statusLabel: string,
 *   statusTone?: 'warning'|'success'|'neutral', approver: string|null }> } | null }} props.state
 * @param {(go: () => void) => void} [props.guardMove] 수정 중 바꾼 값이 있으면 확인 창을 거쳐 이동한다
 */
export default function MemberLeaveSection({ state, labels, onRetry, onOpenOverview, guardMove }) {
  const L = labels || {};
  const [historyOpen, setHistoryOpen] = useState(false);
  const view = state?.status === 'ready' ? state.view : null;
  const failed = state?.status === 'error';
  const dash = '—';
  let body;
  if (!view && !failed) {
    body = <SkeletonList count={2} height={44} aria-label={L.loading} data-testid="employees-detail-leave-loading" />;
  } else {
    const requests = view?.requests || [];
    body = (
      <Stack gap="lg">
        <div className="admin-emp-detail-read-grid">
          <ReadField label={L.used} value={view ? view.used : dash} testId="employees-detail-leave-used" />
          <ReadField label={L.remaining} value={view ? view.remaining : dash} testId="employees-detail-leave-remaining" />
          <ReadField label={L.available} value={view ? view.available : dash} testId="employees-detail-leave-available" />
        </div>
        {failed ? (
          <Stack gap="sm" testId="employees-detail-leave-error">
            <span className="admin-emp-status-date-note is-error" role="alert">{L.loadError}</span>
            {onRetry && (
              <div>
                <Button variant="ghost" size="sm" onClick={onRetry} data-testid="employees-detail-leave-retry">{L.retry}</Button>
              </div>
            )}
          </Stack>
        ) : (
          <div>
            <Button variant="secondary" size="sm" onClick={() => setHistoryOpen(true)} data-testid="employees-detail-leave-history">
              {fill(L.history, { count: requests.length })}
              <IconChevronRight size={14} />
            </Button>
          </div>
        )}
        <span className="admin-emp-manager-note" data-testid="employees-detail-leave-note">{L.note}</span>
      </Stack>
    );
  }
  return (
    <div data-testid="employees-detail-leave">
      <div className="admin-emp-section-head">
        <SectionLabel>{L.section}</SectionLabel>
        <StatusBadge tone="neutral" data-testid="employees-detail-leave-tag">{L.readOnlyTag}</StatusBadge>
      </div>
      {body}
      {historyOpen && view && (
        <LeaveHistoryModal
          requests={view.requests || []}
          labels={L}
          onClose={() => setHistoryOpen(false)}
          onOpenOverview={
            onOpenOverview
              ? () => {
                  const go = () => {
                    setHistoryOpen(false);
                    onOpenOverview();
                  };
                  if (guardMove) guardMove(go);
                  else go();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
