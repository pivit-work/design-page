import { useState } from 'react';
import DpStatusBadge from '../shared/StatusBadge.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import RosterTable from '../shared/RosterTable.jsx';
import Switch from '../shared/Switch.jsx';
import Chip from '../shared/Chip.jsx';
import FormField from '../shared/FormField.jsx';
import TextInput from '../shared/TextInput.jsx';
import TextArea from '../shared/TextArea.jsx';
import assetUrl from '../shared/assetUrl.js';
import { AlertTriangleGlyph, ArrowRightGlyph, LockGlyph, SettingsGlyph } from '../shared/lineIcons.jsx';


/**
 * 연동 화면의 «툴 카탈로그»·«연동 요청» 조각 (screen-integrations.policy §2-6~§2-10 · W73).
 *
 * - AdminCatalogPanel  — 「어드민 관리」 탭: 카탈로그 표(세 묶음) + 구성원 연동 요청 큐
 * - InactiveToolsArea  — 「앱 연동」 탭 하단: 어드민이 꺼 둔 수집 툴(«어드민 활성화 필요»)
 * - RequestBanner      — 「앱 연동」 탭 하단: «원하는 툴이 없으신가요?» + 요청 창 열기
 * - RequestToolModal   — 요청 창(툴 이름 2자·용도 5자·요청자 이메일 읽기 전용)
 *
 * 데이터·저장은 호스트가 한다. 이 파일이 가진 상태는 «끌 때 확인 창»과 요청 창의 입력뿐이다.
 * 카탈로그 행: `{ id, name, logo?, categoryLabel, group: 'tool'|'send'|'hr', status, allowPersonal,
 *   companyOnly, required, personalLinkCount }`
 * 요청 행: `{ id, toolName, purpose, requesterName, email, dateLabel, status }`
 */


function fmt(tpl, vars) {
  return String(tpl ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

const GROUP_ORDER = ['tool', 'send', 'hr'];

/* 툴 로고 — 앱에 로고가 있는 연동은 로고, 아직 없는 연동은 공용 선 아이콘 */
function ToolLogo({ tool, baseUrl }) {
  return (
    <span className="intg-app-logo intg-catalog-logo">
      {tool.logo
        ? <img src={assetUrl(baseUrl, tool.logo)} alt="" loading="lazy" />
        : <SettingsGlyph size={16} />}
    </span>
  );
}

/* ── 어드민 관리 탭 ─────────────────────────────────────────────────── */

export function AdminCatalogPanel({
  catalog = [],
  catalogState = 'ready',
  requests = [],
  requestsState = 'ready',
  busyToolIds = [],
  busyRequestIds = [],
  labels,
  baseUrl = '',
  onToggleToolStatus = () => {},
  onTogglePersonal = () => {},
  onRequestAction = () => {},
  onRetryCatalog,
  onRetryRequests,
}) {
  const L = labels.catalog;
  const R = labels.requests;
  // 끄는 쪽만 확인을 거친다(§2-9·§11). N = 0 이면 확인 없이 바로 (정본 규칙 «N 이 0건이면 확인 창 없이»).
  const [offConfirm, setOffConfirm] = useState(null); // { kind: 'status'|'personal', tool }

  const askStatus = (tool) => {
    const turningOff = tool.status === 'active';
    if (turningOff && (tool.personalLinkCount || 0) > 0) { setOffConfirm({ kind: 'status', tool }); return; }
    onToggleToolStatus(tool.id, turningOff ? 'inactive' : 'active');
  };
  const askPersonal = (tool, next) => {
    if (!next && (tool.personalLinkCount || 0) > 0) { setOffConfirm({ kind: 'personal', tool }); return; }
    onTogglePersonal(tool.id, next);
  };
  const confirmOff = () => {
    const { kind, tool } = offConfirm;
    setOffConfirm(null);
    if (kind === 'status') onToggleToolStatus(tool.id, 'inactive');
    else onTogglePersonal(tool.id, false);
  };

  const requiredOff = catalog.some((t) => t.required && t.status !== 'active');
  const openCount = requests.filter((r) => r.status === 'pending' || r.status === 'reviewing').length;

  return (
    <div className="intg-admin-tab" data-testid="intg-admin-tab">
      <section className="admin-card" data-testid="intg-catalog">
        <h2 className="intg-section-title">{L.title}</h2>
        <p className="intg-section-desc">{L.description}</p>
        {requiredOff && (
          <div className="intg-note is-warning intg-catalog-warning" data-testid="intg-catalog-required-off">
            <AlertTriangleGlyph size={14} />
            {L.requiredOff}
          </div>
        )}
        {catalogState === 'loading' && <div className="intg-table-empty">{L.loading}</div>}
        {catalogState === 'error' && (
          <div className="intg-table-empty" data-testid="intg-catalog-error">
            {L.loadFailed}
            {onRetryCatalog && (
              <button type="button" className="intg-btn intg-btn-neutral intg-btn-sm" onClick={onRetryCatalog}>
                {L.retry}
              </button>
            )}
          </div>
        )}
        {catalogState === 'ready' && (
          <RosterTable tableClassName="intg-table" testId="intg-catalog-table">
            <RosterTable.Head>
              <RosterTable.HeadCell>{L.columns.tool}</RosterTable.HeadCell>
              <RosterTable.HeadCell>{L.columns.category}</RosterTable.HeadCell>
              <RosterTable.HeadCell>{L.columns.status}</RosterTable.HeadCell>
              <RosterTable.HeadCell>{L.columns.personal}</RosterTable.HeadCell>
              <RosterTable.HeadCell>{L.columns.action}</RosterTable.HeadCell>
            </RosterTable.Head>
            <RosterTable.Body>
              {GROUP_ORDER.flatMap((g) => {
                const rows = catalog.filter((t) => t.group === g);
                // 빈 묶음 헤더는 그리지 않는다(§11 «어떤 묶음에 항목이 0건»)
                if (rows.length === 0) return [];
                return [
                  <RosterTable.GroupRow key={`g-${g}`} colSpan={5} data-testid={`intg-catalog-group-${g}`}>
                    <span className="intg-catalog-group">{L.groups[g].label}</span>
                    <span className="intg-catalog-group-desc">{L.groups[g].desc}</span>
                  </RosterTable.GroupRow>,
                  ...rows.map((t) => {
                    const active = t.status === 'active';
                    const busy = busyToolIds.includes(t.id);
                    return (
                      <RosterTable.Row key={t.id} data-testid={`intg-catalog-row-${t.id}`} className={active ? '' : 'intg-row-off'}>
                        <RosterTable.Cell>
                          <span className="svc">
                            <ToolLogo tool={t} baseUrl={baseUrl} />
                            {t.name}
                          </span>
                        </RosterTable.Cell>
                        <RosterTable.Cell className="time">{t.categoryLabel}</RosterTable.Cell>
                        <RosterTable.Cell>
                          <DpStatusBadge className={`intg-status ${active ? 'is-connected' : 'is-disconnected'}`}>
                            {active ? L.active : L.inactive}
                          </DpStatusBadge>
                        </RosterTable.Cell>
                        <RosterTable.Cell>
                          {/* 개인 연동은 수집 묶음만. 회사 단위(Jira·GitHub)·회사 채널은 토글 대신 라벨 — 꺼진 토글은 «켤 수 있다»로 읽힌다 */}
                          {t.group === 'tool' && !t.companyOnly ? (
                            <Switch
                              checked={active && !!t.allowPersonal}
                              disabled={!active || busy}
                              label={fmt(L.personalToggle, { name: t.name })}
                              data-testid={`intg-catalog-personal-${t.id}`}
                              onChange={(next) => askPersonal(t, next)}
                            />
                          ) : (
                            <span className="intg-catalog-muted">{t.companyOnly ? L.companyOnly : L.companyChannel}</span>
                          )}
                        </RosterTable.Cell>
                        <RosterTable.Cell>
                          <button
                            type="button"
                            className={`intg-btn intg-btn-sm ${active ? 'intg-btn-neutral' : 'intg-btn-primary'}`}
                            disabled={busy}
                            data-testid={`intg-catalog-status-${t.id}`}
                            onClick={() => askStatus(t)}
                          >
                            {active ? L.deactivate : L.activate}
                          </button>
                        </RosterTable.Cell>
                      </RosterTable.Row>
                    );
                  }),
                ];
              })}
            </RosterTable.Body>
          </RosterTable>
        )}
      </section>

      <section className="admin-card" data-testid="intg-requests">
        <h2 className="intg-section-title">
          {R.title}
          {openCount > 0 && <span className="intg-meta-accent"> · {fmt(R.pending, { count: openCount })}</span>}
        </h2>
        <p className="intg-section-desc">{R.description}</p>
        {requestsState === 'loading' && <div className="intg-table-empty">{L.loading}</div>}
        {requestsState === 'error' && (
          <div className="intg-table-empty" data-testid="intg-requests-error">
            {R.loadFailed}
            {onRetryRequests && (
              <button type="button" className="intg-btn intg-btn-neutral intg-btn-sm" onClick={onRetryRequests}>
                {L.retry}
              </button>
            )}
          </div>
        )}
        {requestsState === 'ready' && (requests.length === 0 ? (
          <div className="intg-table-empty" data-testid="intg-requests-empty">{R.empty}</div>
        ) : (
          <div className="intg-request-list">
            {requests.map((r) => {
              const open = r.status === 'pending' || r.status === 'reviewing';
              const busy = busyRequestIds.includes(r.id);
              return (
                <div key={r.id} className="intg-logrow" data-testid={`intg-request-${r.id}`}>
                  <div className="intg-request-info">
                    <span className="intg-app-name">{r.toolName}</span>
                    <span className="intg-logrow-desc">{r.purpose} · {r.requesterName} ({r.email})</span>
                    <span className="intg-logrow-date">{r.dateLabel}</span>
                  </div>
                  <span className="intg-request-actions">
                    <DpStatusBadge
                      tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : r.status === 'reviewing' ? 'warning' : 'accent'}>
                      {R.status[r.status] ?? R.status.pending}
                    </DpStatusBadge>
                    {open && (
                      <>
                        <button type="button" className="intg-btn intg-btn-primary intg-btn-sm" disabled={busy}
                          data-testid={`intg-request-approve-${r.id}`} onClick={() => onRequestAction(r.id, 'approved')}>
                          {R.approve}
                        </button>
                        <button type="button" className="intg-btn intg-btn-neutral intg-btn-sm" disabled={busy}
                          data-testid={`intg-request-reject-${r.id}`} onClick={() => onRequestAction(r.id, 'rejected')}>
                          {R.reject}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {offConfirm && (
        <ConfirmModal
          testId="intg-catalog-off-confirm"
          title={fmt(offConfirm.kind === 'status' ? L.confirmStatusTitle : L.confirmPersonalTitle, { name: offConfirm.tool.name })}
          body={
            <>
              <p className="intg-confirm-p">
                {fmt(offConfirm.kind === 'status' ? L.confirmStatusBody : L.confirmPersonalBody, { n: offConfirm.tool.personalLinkCount })}
              </p>
              <p className="intg-confirm-p">{offConfirm.kind === 'status' ? L.confirmStatusNote : L.confirmPersonalNote}</p>
            </>
          }
          confirmLabel={L.confirm}
          cancelLabel={L.cancel}
          onConfirm={confirmOff}
          onCancel={() => setOffConfirm(null)}
        />
      )}
    </div>
  );
}

/* ── 앱 연동 탭: 비활성 수집 툴 ─────────────────────────────────────── */

export function InactiveToolsArea({ tools = [], labels, baseUrl = '' }) {
  if (tools.length === 0) return null;
  const L = labels.inactiveTools;
  return (
    <section data-testid="intg-inactive-tools">
      <h2 className="intg-section-title">{L.title}</h2>
      <div className="intg-app-grid">
        {tools.map((t) => (
          <section key={t.id} className="admin-card intg-app-card is-inactive" data-testid={`intg-inactive-${t.id}`}>
            <div className="intg-app-head">
              <ToolLogo tool={t} baseUrl={baseUrl} />
              <div className="intg-app-titles">
                <span className="intg-app-name">{t.name}</span>
              </div>
              <DpStatusBadge tone="warning">{L.badge}</DpStatusBadge>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

/* ── 앱 연동 탭: 개인 연동 칩 (§2-6) ─────────────────────────────────── */

export function PersonalChips({ tools = [], labels }) {
  if (tools.length === 0) return null;
  const L = labels.personalChips;
  return (
    <span className="intg-personal-chips" data-testid="intg-personal-chips" aria-label={L.title}>
      {tools.map((t) => {
        const ok = t.status === 'active' && t.allowPersonal;
        return (
          <Chip
            key={t.id}
            tone={ok ? 'success' : 'neutral'}
            icon={ok ? null : <LockGlyph size={12} />}
            data-testid={`intg-personal-chip-${t.id}`}
          >
            {t.name}
            {!ok && ` · ${t.status !== 'active' ? L.inactive : L.blocked}`}
          </Chip>
        );
      })}
    </span>
  );
}

/* ── 앱 연동 탭: 요청 배너 + 요청 창 ─────────────────────────────────── */

export function RequestBanner({ labels, onOpen }) {
  const L = labels.requestBanner;
  return (
    <div className="intg-banner is-warning" data-testid="intg-request-banner">
      <div className="intg-banner-msg">
        <AlertTriangleGlyph size={16} />
        <span>
          <strong>{L.title}</strong>
          <br />
          {L.message}
        </span>
      </div>
      <button type="button" className="intg-btn intg-btn-primary" data-testid="intg-request-open" onClick={onOpen}>
        {L.button}
        <ArrowRightGlyph size={14} />
      </button>
    </div>
  );
}

export function RequestToolModal({ modal, labels, onClose, onSubmit }) {
  const L = labels.requestModal;
  const [toolName, setToolName] = useState('');
  const [purpose, setPurpose] = useState('');
  const valid = toolName.trim().length >= 2 && purpose.trim().length >= 5;
  const submitting = !!modal.submitting;
  return (
    <ModalShell
      title={L.title}
      description={L.description}
      titleId="intg-request-title"
      closeLabel={L.close}
      cancelLabel={L.cancel}
      submitLabel={submitting ? L.submitting : L.submit}
      canSubmit={valid && !submitting}
      busy={submitting}
      onClose={onClose}
      onSubmit={() => valid && onSubmit({ toolName: toolName.trim(), purpose: purpose.trim() })}
      testId="intg-request-modal"
      className="adm-shell"
      bodyClassName="adm-shell-body"
    >
      <FormField label={L.toolName} required hint={L.toolNameHint} id="intg-request-tool">
        <TextInput
          id="intg-request-tool"
          value={toolName}
          placeholder={L.toolNamePlaceholder}
          data-testid="intg-request-tool"
          onChange={(e) => setToolName(e.target.value)}
        />
      </FormField>
      <FormField label={L.purpose} required hint={L.purposeHint} id="intg-request-purpose">
        <TextArea
          id="intg-request-purpose"
          rows={3}
          value={purpose}
          placeholder={L.purposePlaceholder}
          data-testid="intg-request-purpose"
          onChange={(e) => setPurpose(e.target.value)}
        />
      </FormField>
      <FormField label={L.email} id="intg-request-email">
        <TextInput id="intg-request-email" value={modal.email ?? ''} readOnly data-testid="intg-request-email" />
      </FormField>
      {modal.error && <div className="intg-note is-error" data-testid="intg-request-error">{modal.error}</div>}
    </ModalShell>
  );
}
