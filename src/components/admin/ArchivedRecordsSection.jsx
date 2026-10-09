import { useState } from 'react';
import SectionLabel from './SectionLabel.jsx';
import ToneBadge from '../shared/StatusBadge.jsx';
import Chip from '../shared/Chip.jsx';
import TextArea from '../shared/TextArea.jsx';
import Button from '../shared/Button.jsx';
import { IconLock } from './employeeExport.jsx';
import { ARCHIVED_RECORDS_DEFAULT_LABELS } from './archivedRecordsLabels.js';


const dot = (s) => String(s || '').replace(/-/g, '.');
const fill = (tpl, map) =>
  Object.entries(map).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''), String(tpl));

/**
 * 옮긴 칸 자리에 보이는 한 줄 (PW-1429 · 퇴사 처리 정책서 v1.19 §3-C 「옮긴 칸 자리」).
 * 빈 입력창으로 두면 «입력 안 함»으로 읽혀 HR 이 다시 넣는다 — 고칠 수 없는 칸의 표기로 둔다.
 */
export function ArchivedNote({ text, testId = 'employees-panel-archived-note' }) {
  return (
    <div className="admin-emp-archived-note" data-testid={testId}>
      {text || ARCHIVED_RECORDS_DEFAULT_LABELS.note}
    </div>
  );
}

/**
 * 어드민 › 구성원 설정 › 퇴사자 상세의 «따로 보관한 기록» 칸 (PW-1429 · 정책서 v1.19 §3-C 「누가 어떻게
 * 꺼내 보나」 · E31·E32·E35·E36).
 *
 * 🔴 값을 화면에 펼치지 않는다 — 구간·날짜·내려받은 기록만 보이고, 값은 사유를 적고 CSV 파일로만 받는다.
 * 펼치면 이 화면이 다시 «일반 화면»이 되어 «화면에서 뺀다»가 무너진다.
 *
 * @param {object} props
 * @param {string} props.memberName
 * @param {{ status: 'loading'|'error'|'ready', view?: { pendingTerminationDate: string|null,
 *   segments: Array<{ terminationDate: string, movedAt: string, purgeAt: string,
 *   downloads: Array<{ at: string, byName: string, reason: string }> }> } }} props.state
 *   불러오기 상태. `ready` 인데 구간·«오늘 밤»이 모두 없으면 칸을 그리지 않는다(E31·E34).
 * @param {() => void} [props.onRetry] 불러오기 실패 때 [다시 시도]
 * @param {(retireDate: string, reason: string) => Promise<void>} [props.onDownload]
 *   파일 받기. 실패하면 reject — 칸 안에 오류를 띄우고 적은 사유는 지우지 않는다. 없으면 버튼이 없다.
 * @param {Partial<typeof ARCHIVED_RECORDS_DEFAULT_LABELS>} [props.labels]
 */
export default function ArchivedRecordsSection({ memberName, state, onRetry, onDownload, labels }) {
  const L = { ...ARCHIVED_RECORDS_DEFAULT_LABELS, ...(labels || {}) };
  if (state?.status === 'loading') {
    return <div className="admin-emp-status-date-note" data-testid="archived-records-loading">{L.loading}</div>;
  }
  if (state?.status === 'error') {
    return (
      <>
        <SectionLabel>{L.section}</SectionLabel>
        <div className="admin-emp-archived" data-testid="archived-records-error">
          <span className="admin-emp-status-date-note is-error" role="alert">{L.loadError}</span>
          {onRetry && (
            <div>
              <Button variant="ghost" size="sm" onClick={onRetry}>{L.retry}</Button>
            </div>
          )}
        </div>
      </>
    );
  }
  const view = state?.view;
  const pending = view?.pendingTerminationDate ?? null;
  const segments = view?.segments ?? [];
  if (!pending && segments.length === 0) return null;
  return (
    <>
      <SectionLabel>
        <span className="admin-emp-archived-head">
          {L.section}
          <ToneBadge tone="danger"><IconLock size={11} /> {L.badge}</ToneBadge>
        </span>
      </SectionLabel>
      <div className="admin-emp-archived-list" data-testid="archived-records">
        {pending && (
          <div className="admin-emp-archived" data-testid="archived-records-pending">
            <div className="admin-emp-archived-intro">{L.pending}</div>
            <ItemChips items={L.items} />
            <div className="admin-emp-archived-meta">{fill(L.metaPending, { retire: dot(pending) })}</div>
          </div>
        )}
        {segments.map((seg) => (
          <Segment key={seg.terminationDate} seg={seg} L={L} memberName={memberName} onDownload={onDownload} />
        ))}
      </div>
    </>
  );
}

function ItemChips({ items }) {
  return (
    <div className="admin-emp-tags">
      {items.map((it) => <Chip key={it}>{it}</Chip>)}
    </div>
  );
}

function Segment({ seg, L, memberName, onDownload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const tid = `archived-records-${seg.terminationDate}`;

  const submit = async () => {
    if (!reason.trim() || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await onDownload(seg.terminationDate, reason.trim());
      setOpen(false);
      setReason('');
    } catch {
      // 사유는 지우지 않는다 — 다시 누르기만 하면 된다(정책서 §6)
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-emp-archived" data-testid={tid}>
      <div className="admin-emp-archived-intro">{L.intro}</div>
      <ItemChips items={L.items} />
      <div className="admin-emp-archived-meta">
        {fill(L.meta, { retire: dot(seg.terminationDate), moved: dot(seg.movedAt), purge: dot(seg.purgeAt) })}
      </div>
      {onDownload && !open && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)} data-testid={`${tid}-open`}>
            {L.download}
          </Button>
        </div>
      )}
      {open && (
        <div className="admin-emp-archived-confirm" data-testid={`${tid}-confirm`}>
          <div className="admin-emp-archived-confirm-title">{fill(L.confirmTitle, { name: memberName })}</div>
          <div className="admin-emp-archived-confirm-body">{L.confirmBody}</div>
          <TextArea
            className="admin-emp-input"
            rows={2}
            value={reason}
            placeholder={L.reasonPlaceholder}
            aria-label={L.reasonPlaceholder}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            data-testid={`${tid}-reason`}
          />
          {failed && (
            <span className="admin-emp-status-date-note is-error" role="alert" data-testid={`${tid}-failed`}>
              {L.failed}
            </span>
          )}
          <div className="admin-emp-archived-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => { setOpen(false); setReason(''); setFailed(false); }}
            >
              {L.cancel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!reason.trim() || busy}
              onClick={submit}
              data-testid={`${tid}-submit`}
            >
              {busy ? L.downloading : L.confirm}
            </Button>
          </div>
        </div>
      )}
      <div className="admin-emp-archived-log-title">{L.logTitle}</div>
      {seg.downloads.length === 0 ? (
        <div className="admin-emp-status-date-note">{L.logEmpty}</div>
      ) : (
        <ul className="admin-emp-archived-log" data-testid={`${tid}-log`}>
          {seg.downloads.map((d, i) => (
            <li key={`${d.at}-${i}`}>
              <span className="admin-emp-archived-log-at">{d.at}</span> · {d.byName} · {d.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
