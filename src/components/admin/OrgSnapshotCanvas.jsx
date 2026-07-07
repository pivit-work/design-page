import { useState, useMemo, useRef, useCallback } from 'react';

/**
 * OrgSnapshotCanvas — 어드민 "조직 스냅샷" 화면 Pure 컴포넌트.
 * pivit-specs 의 org-snapshot-views.jsx 시안을 design-page 정본으로 포팅.
 *
 * 4 서브뷰 (상단 탭으로 전환):
 *   - snapshot : 조직 현황 스냅샷 (요약 카드 + 조직트리/고용/직군/연령 탭 + CSV 내보내기)
 *   - single   : 인사발령 단건 (대상자 검색 + 변경 항목 + 변경 전/후)
 *   - bulk     : 인사발령 대량 (3-step: 항목선택 → 파일업로드 → 검증/확정)
 *   - history  : 발령 이력 (테이블 + 우측 상세 패널)
 *
 * 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·persist·CSV 소유).
 * UI 상태(현재 탭/검색/선택 항목/스텝/파일 파싱/선택 행)만 내부에서 관리한다.
 * 스타일은 design-page 토큰 기반 src/admin.css (.admin-snap-*) 클래스.
 * 호스트 앱은 `@pivit-work/design-page/styles/admin.css` 를 import 해야 한다.
 */

const DEFAULT_LABELS = {
  views: { snapshot: '조직 스냅샷', single: '발령 단건', bulk: '발령 대량', history: '발령 이력' },
  loading: '불러오는 중…',
  // 현황 스냅샷
  statusTitle: '조직 현황',
  statusSubtitle: '인사 정보 기준 스냅샷',
  queryDate: '조회일',
  export: '내보내기 (CSV)',
  tabs: { summary: '조직 현황', employment: '고용 유형', jobgroup: '직군/직무', age: '연령 구성' },
  orgTreeHeading: '조직 구성',
  noOrgStructure: '조직 구조 데이터가 없습니다',
  countSuffix: '명',
  employmentHeading: '고용 유형별 인원',
  govFormatTitle: '관공서 제출 양식',
  govFormatDesc: '고용 유형별 인원 수 및 인건비 추이 데이터는 내보내기 → 관공서 양식에서 서식 포맷으로 다운로드 가능합니다.',
  jobGroupHeading: '직군별 인원 (투자사 제출용)',
  noJobGroups: '직군 데이터가 없습니다',
  leaderPrefix: '리더',
  ageHeading: '연령대별 인원',
  ageNotAvailable: '연령 데이터가 없습니다',
  govAgeTitle: '관공서 기준 집계',
  // 발령 공통
  target: '대상자',
  searchMember: '이름 또는 사번 검색',
  selectFields: '변경 항목 선택',
  appointmentType: '발령 유형',
  appointmentDate: '발령 일자',
  reason: '사유',
  reasonPlaceholder: '발령 사유 입력',
  selectPlaceholder: '선택...',
  fieldBefore: '변경 전',
  fieldAfter: '변경 후',
  noFieldsSelected: '변경 항목을 선택해주세요',
  cancel: '취소',
  confirmAppointment: '발령 확정',
  appointmentDone: '발령 완료',
  // 대량
  stepSelectFields: '항목 선택',
  stepFileUpload: '파일 업로드',
  stepValidate: '검증 & 확정',
  selectColumns: '변경할 항목을 선택하세요',
  selectedColumnsPrefix: '선택된 항목',
  next: '다음',
  prev: '이전',
  downloadTemplate: '템플릿 다운로드 (CSV)',
  templateColumnsPrefix: '이름, 사번,',
  templateColumnsSuffix: '컬럼 포함',
  dragOrClick: '파일을 드래그하거나 클릭하여 업로드',
  supportedFormats: 'xlsx, csv 지원',
  statusOk: '정상',
  statusWarn: '미매칭',
  okCount: '정상',
  warnCount: '경고',
  countUnit: '건',
  bulkReasonPlaceholder: '일괄 발령 사유',
  bulkPreviewPending: '파일 검증 대기 중',
  confirmBulkPrefix: '발령 확정',
  // 이력
  historyEmpty: '발령 이력이 없습니다',
  historyDate: '발령일',
  historyTarget: '대상자',
  historyType: '발령 유형',
  historyMode: '처리 유형',
  historyHandler: '처리자',
  historyDetail: '상세',
  historyModeSingle: '단건',
  historyModeBulk: '대량',
  historyField: '항목',
  historyReason: '사유',
  searchEmployee: '이름 또는 사번 검색',
  fieldLabels: {},
  typeLabels: {},
};

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

// 발령 유형 key → 배지 톤 (admin.css .admin-snap-type-badge.is-*)
const TYPE_TONE = {
  typeTitleChange: 'blue',
  typeDeptMove: 'amber',
  typePromotion: 'green',
  typeDemotion: 'red',
  typeEmploymentChange: 'amber',
  typeLocationChange: 'blue',
  typeSalaryChange: 'amber',
  typeHire: 'green',
  typeTermination: 'gray',
};

/* ── CSV 헬퍼 (대량 발령 템플릿/파싱) ─────────────────────── */
function triggerCSVDownload(csvContent, filename) {
  const BOM = '﻿';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else if (ch === '"') { inQuotes = true; }
    else if (ch === ',') { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

/* ════════════════════════════════════════════════════════════
 * 1. 조직 현황 스냅샷
 * ════════════════════════════════════════════════════════════ */
function OrgTreeRow({ node, depth, total, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = node.children && node.children.length > 0;
  const pct = total > 0 ? Math.round((node.count / total) * 100) : 0;
  return (
    <>
      <div
        className={`admin-snap-tree-row${depth === 0 ? ' is-root' : ''}${hasChildren ? ' has-children' : ''}${hasChildren && open ? ' is-open' : ''}`}
        style={{ padding: `9px 12px 9px ${12 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen((o) => !o)}
      >
        <span className="admin-snap-tree-toggle">{hasChildren ? (open ? '▾' : '▸') : ''}</span>
        <span className="admin-snap-tree-name">{node.name}</span>
        <span className="admin-snap-tree-count">{node.count}</span>
        <div className="admin-snap-tree-bar-wrap">
          <div className="admin-snap-tree-bar">
            <div
              className="admin-snap-tree-bar-fill"
              style={{ width: `${pct}%`, opacity: depth === 0 ? 1 : 0.5 }}
            />
          </div>
          <span className="admin-snap-tree-pct">{pct}%</span>
        </div>
      </div>
      {hasChildren && open && node.children.map((child) => (
        <OrgTreeRow key={child.name} node={child} depth={depth + 1} total={total} defaultOpen={false} />
      ))}
    </>
  );
}

function OrgSnapshotStatusView({ data, labels, queryDate, onQueryDateChange, onExport, activeTab, onTabChange }) {
  const tabKeys = ['summary', 'employment', 'jobgroup', 'age'];
  const {
    summaryCards = [], orgTree = [], totalCount = 0,
    employment = [], jobGroups = [], ageDist = [], ageSummary = [],
  } = data;
  const empMax = Math.max(1, ...employment.map((e) => e.count));
  const ageMax = Math.max(1, ...ageDist.map((a) => a.count));

  return (
    <div className="admin-snap-canvas">
      <header className="admin-snap-header">
        <div>
          <div className="admin-snap-header-title">{labels.statusTitle}</div>
          <div className="admin-snap-header-sub">{labels.statusSubtitle}</div>
        </div>
        <div className="admin-snap-header-actions">
          <div className="admin-snap-datepicker">
            <span className="admin-snap-datepicker-label">{labels.queryDate}</span>
            <input type="date" value={queryDate} onChange={(e) => onQueryDateChange?.(e.target.value)} />
          </div>
          <button type="button" className="admin-snap-export-btn" onClick={() => onExport?.(activeTab)}>
            ↓ {labels.export}
          </button>
        </div>
      </header>

      <div
        className="admin-snap-summary-grid"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, summaryCards.length)}, minmax(0, 1fr))` }}
      >
        {summaryCards.map((c) => (
          <div key={c.key ?? c.label} className={`admin-snap-summary-card is-${c.tone || 'accent'}`}>
            <p className="admin-snap-summary-label">{c.label}</p>
            <p className="admin-snap-summary-value">{c.value}</p>
            {c.sub && <p className="admin-snap-summary-sub">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="admin-snap-subtabs">
        {tabKeys.map((k) => (
          <button
            key={k}
            type="button"
            className={`admin-snap-subtab${activeTab === k ? ' is-active' : ''}`}
            onClick={() => onTabChange(k)}
          >
            {labels.tabs[k]}
          </button>
        ))}
      </div>

      <div className="admin-snap-content">
        {activeTab === 'summary' && (
          orgTree.length === 0
            ? <div className="admin-snap-empty">{labels.noOrgStructure}</div>
            : orgTree.map((node) => (
              <OrgTreeRow key={node.name} node={node} depth={0} total={totalCount} defaultOpen />
            ))
        )}

        {activeTab === 'employment' && (
          <div>
            <p className="admin-snap-subheading">{labels.employmentHeading}</p>
            {employment.map((e) => (
              <div key={e.type} className="admin-snap-emp-row">
                <span className="admin-snap-emp-type">{e.type}</span>
                <div className="admin-snap-emp-bar">
                  <div className="admin-snap-emp-bar-fill" style={{ width: `${(e.count / empMax) * 100}%` }} />
                </div>
                <span className="admin-snap-emp-count">{e.count}{labels.countSuffix}</span>
                <span className="admin-snap-emp-pct">{e.pct}%</span>
              </div>
            ))}
            <p className="admin-snap-footnote">{labels.govFormatDesc}</p>
          </div>
        )}

        {activeTab === 'jobgroup' && (
          jobGroups.length === 0
            ? <div className="admin-snap-empty">{labels.noJobGroups}</div>
            : (
              <>
                <p className="admin-snap-subheading">{labels.jobGroupHeading}</p>
                {jobGroups.map((jg) => (
                  <div key={jg.group} className="admin-snap-jg-row">
                    <span className="admin-snap-jg-name">{jg.group}</span>
                    <div className="admin-snap-jg-pills">
                      {jg.roles.map((r) => <span key={r} className="admin-snap-jg-pill">{r}</span>)}
                    </div>
                    <span className="admin-snap-jg-count">{jg.count}{labels.countSuffix}</span>
                    {jg.lead != null && <span className="admin-snap-jg-lead">{labels.leaderPrefix}: {jg.lead || '—'}</span>}
                  </div>
                ))}
              </>
            )
        )}

        {activeTab === 'age' && (
          ageDist.length === 0
            ? <div className="admin-snap-empty">{labels.ageNotAvailable}</div>
            : (
              <div>
                <p className="admin-snap-subheading">{labels.ageHeading}</p>
                {ageDist.map((a) => (
                  <div key={a.range} className="admin-snap-age-row">
                    <span className="admin-snap-age-label">{a.range}</span>
                    <div className="admin-snap-age-bar">
                      <div
                        className="admin-snap-age-bar-fill"
                        style={{ width: `${(a.count / ageMax) * 100}%` }}
                      />
                    </div>
                    <span className="admin-snap-age-count">{a.count}{labels.countSuffix}</span>
                  </div>
                ))}
                {ageSummary.length > 0 && (
                  <div className="admin-snap-agesummary">
                    {ageSummary.map((s) => (
                      <span key={s.label} className="admin-snap-agesummary-item">
                        {s.label} <strong>{s.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 2. 인사발령 단건
 * ════════════════════════════════════════════════════════════ */
function AppointmentSingleView({
  members, fieldOptions, changeableFields, selectFieldKeys, appointmentTypes,
  labels, onSubmit,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedFields, setSelectedFields] = useState(() => new Set());
  const [appointmentType, setAppointmentType] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [reason, setReason] = useState('');
  const [changes, setChanges] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) =>
      m.name.toLowerCase().includes(q) || (m.employeeCode && m.employeeCode.toLowerCase().includes(q)));
  }, [members, searchQuery]);

  const toggleField = (f) => setSelectedFields((prev) => {
    const next = new Set(prev);
    if (next.has(f)) next.delete(f); else next.add(f);
    return next;
  });

  const reset = () => {
    setSelectedMember(null); setSelectedFields(new Set());
    setAppointmentType(''); setAppointmentDate(''); setReason('');
    setChanges({}); setDone(false);
  };

  const handleConfirm = async () => {
    if (!selectedMember) return;
    setSubmitting(true);
    try {
      const changeList = Array.from(selectedFields).map((f) => ({
        field: f,
        before: selectedMember.fieldValues?.[f] ?? '',
        after: changes[f] ?? '',
      }));
      await onSubmit?.({
        userId: selectedMember.id,
        type: appointmentType,
        date: appointmentDate,
        reason,
        changes: changeList,
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="admin-snap-done">
        <div className="admin-snap-done-icon">✓</div>
        <div className="admin-snap-done-title">{labels.appointmentDone}</div>
        <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
      </div>
    );
  }

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-appt-grid">
        <div className="admin-snap-panel">
          <p className="admin-snap-panel-head">{labels.target}</p>
          <input
            className="admin-snap-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={labels.searchMember}
          />
          <div className="admin-snap-target-list">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`admin-snap-target-item${selectedMember?.id === m.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedMember(m)}
              >
                <div>
                  <div className="admin-snap-target-name">{m.name}</div>
                  <div className="admin-snap-target-meta">
                    {m.employeeCode && <span className="admin-snap-mono">{m.employeeCode}</span>}
                    {m.title && <span> · {m.title}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="admin-snap-panel">
          <p className="admin-snap-panel-head">{labels.selectFields}</p>
          <div className="admin-snap-fieldchips">
            {changeableFields.map((f) => (
              <button
                key={f}
                type="button"
                className={`admin-snap-chip${selectedFields.has(f) ? ' is-on' : ''}`}
                onClick={() => toggleField(f)}
              >
                {selectedFields.has(f) ? '✓ ' : ''}{labels.fieldLabels[f] ?? f}
              </button>
            ))}
          </div>

          <div className="admin-snap-appt-info" style={{ marginTop: 16 }}>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.appointmentType}</label>
              <select className="admin-snap-select" value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                <option value="">{labels.selectPlaceholder}</option>
                {appointmentTypes.map((at) => <option key={at} value={at}>{labels.typeLabels[at] ?? at}</option>)}
              </select>
            </div>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.appointmentDate}</label>
              <input type="date" className="admin-snap-input" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} />
            </div>
            <div className="admin-snap-field">
              <label className="admin-snap-field-label">{labels.reason}</label>
              <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.reasonPlaceholder} />
            </div>
          </div>

          {selectedFields.size > 0 && selectedMember ? (
            <div className="admin-snap-card-section">
              <table className="admin-snap-ba-table">
                <thead>
                  <tr>
                    <th>{labels.selectFields}</th>
                    <th>{labels.fieldBefore}</th>
                    <th aria-hidden="true" />
                    <th>{labels.fieldAfter}</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(selectedFields).map((f) => {
                    const opts = fieldOptions[f] ?? [];
                    const useSelect = selectFieldKeys.includes(f) && opts.length > 0;
                    return (
                      <tr key={f}>
                        <td className="admin-snap-ba-field">{labels.fieldLabels[f] ?? f}</td>
                        <td className="admin-snap-ba-before">{selectedMember.fieldValues?.[f] || '—'}</td>
                        <td className="admin-snap-ba-arrow">→</td>
                        <td>
                          {useSelect ? (
                            <select
                              className="admin-snap-select"
                              value={changes[f] ?? ''}
                              onChange={(e) => setChanges((p) => ({ ...p, [f]: e.target.value }))}
                            >
                              <option value="">{labels.selectPlaceholder}</option>
                              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              className="admin-snap-input is-mono"
                              value={changes[f] ?? ''}
                              onChange={(e) => setChanges((p) => ({ ...p, [f]: e.target.value }))}
                              placeholder={labels.selectPlaceholder}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-snap-empty-fields">{labels.noFieldsSelected}</div>
          )}

          <div className="admin-snap-actions">
            <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
            <button
              type="button"
              className="admin-emp-btn is-primary"
              onClick={handleConfirm}
              disabled={!selectedMember || selectedFields.size === 0 || submitting}
            >
              {labels.confirmAppointment}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 3. 인사발령 대량
 * ════════════════════════════════════════════════════════════ */
function AppointmentBulkView({ members, bulkFields, labels, onSubmit }) {
  const [step, setStep] = useState(1);
  const [selectedColumns, setSelectedColumns] = useState(() => new Set());
  const [file, setFile] = useState(null);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [previewRows, setPreviewRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  const fields = Array.from(selectedColumns);
  const okRows = previewRows.filter((r) => r.status === 'ok');
  const warnRows = previewRows.filter((r) => r.status === 'warn');

  const toggleColumn = (f) => setSelectedColumns((prev) => {
    const next = new Set(prev);
    if (next.has(f)) next.delete(f); else next.add(f);
    return next;
  });

  const downloadTemplate = useCallback(() => {
    const fieldLabels = fields.map((f) => labels.fieldLabels[f] ?? f);
    const headers = [labels.target, '사번', ...fieldLabels];
    const sample = ['홍길동', 'EMP001', ...fieldLabels.map(() => '')];
    triggerCSVDownload([headers.join(','), sample.join(',')].join('\n'), 'pivit_appointment_template.csv');
  }, [fields, labels]);

  const parseUploaded = useCallback(async (f) => {
    const text = await f.text();
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;
    const header = parseCSVLine(lines[0]);
    const codeIdx = header.findIndex((h) => h === '사번');
    const colMap = new Map();
    for (let i = 0; i < header.length; i++) {
      if (i === 0 || i === codeIdx) continue;
      const matched = bulkFields.find((fk) => (labels.fieldLabels[fk] ?? fk) === header[i]);
      if (matched) colMap.set(i, matched);
    }
    const rows = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = parseCSVLine(lines[r]);
      const name = cols[0]?.trim() ?? '';
      if (!name) continue;
      const code = codeIdx >= 0 ? (cols[codeIdx]?.trim() ?? '') : '';
      let matched = code ? members.find((m) => m.employeeCode === code) : null;
      if (!matched) matched = members.find((m) => m.name === name) ?? null;
      const changes = {};
      colMap.forEach((fk, idx) => {
        const after = cols[idx]?.trim() ?? '';
        if (after) changes[fk] = { before: matched ? (matched.fieldValues?.[fk] ?? '-') : '-', after };
      });
      rows.push({ name, employeeCode: code || undefined, matchedMember: matched, changes, status: matched ? 'ok' : 'warn' });
    }
    setPreviewRows(rows);
  }, [members, bulkFields, labels]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); parseUploaded(f); }
  };
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); parseUploaded(f); }
  };

  const handleConfirm = async () => {
    if (okRows.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit?.({
        rows: okRows.map((r) => ({ memberId: r.matchedMember.id, changes: r.changes })),
        date,
        reason,
        fields,
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1); setSelectedColumns(new Set()); setFile(null);
    setReason(''); setDate(''); setPreviewRows([]); setDone(false);
  };

  if (done) {
    return (
      <div className="admin-snap-done">
        <div className="admin-snap-done-icon">✓</div>
        <div className="admin-snap-done-title">{labels.appointmentDone}</div>
        <div className="admin-snap-done-sub">{labels.okCount} {okRows.length}{labels.countUnit}</div>
        <button type="button" className="admin-emp-btn is-soft" onClick={reset}>{labels.cancel}</button>
      </div>
    );
  }

  const steps = [
    { num: 1, label: labels.stepSelectFields },
    { num: 2, label: labels.stepFileUpload },
    { num: 3, label: labels.stepValidate },
  ];

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-steps">
        {steps.map((s, idx) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className={`admin-snap-step${step > s.num ? ' admin-snap-step-clickable' : ''}`}
              onClick={() => { if (step > s.num) setStep(s.num); }}
            >
              <div className={`admin-snap-step-badge${step >= s.num ? ' is-active' : ''}`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className={`admin-snap-step-label${step === s.num ? ' is-active' : ''}`}>{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`admin-snap-step-connector${step > s.num ? ' is-done' : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className="admin-snap-content">
        {step === 1 && (
          <div>
            <p className="admin-snap-subheading">{labels.selectColumns}</p>
            <div className="admin-snap-fieldchips" style={{ marginBottom: 16 }}>
              {bulkFields.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`admin-snap-chip${selectedColumns.has(f) ? ' is-on' : ''}`}
                  onClick={() => toggleColumn(f)}
                >
                  {selectedColumns.has(f) ? '✓ ' : ''}{labels.fieldLabels[f] ?? f}
                </button>
              ))}
            </div>
            {selectedColumns.size > 0 && (
              <div className="admin-snap-hint">
                {labels.selectedColumnsPrefix}: <strong>{fields.map((f) => labels.fieldLabels[f] ?? f).join(', ')}</strong>
              </div>
            )}
            <div className="admin-snap-actions">
              <button type="button" className="admin-emp-btn is-primary" disabled={selectedColumns.size === 0} onClick={() => setStep(2)}>
                {labels.next} →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <button type="button" className="admin-emp-btn is-soft" onClick={downloadTemplate}>↓ {labels.downloadTemplate}</button>
              <span className="admin-snap-dropzone-sub" style={{ marginTop: 0 }}>
                {labels.templateColumnsPrefix} {fields.map((f) => labels.fieldLabels[f] ?? f).join(', ')} {labels.templateColumnsSuffix}
              </span>
            </div>
            <div className="admin-snap-field" style={{ marginBottom: 16 }}>
              <label className="admin-snap-field-label">{labels.reason}</label>
              <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.bulkReasonPlaceholder} />
            </div>
            <div
              className={`admin-snap-dropzone${file ? ' is-loaded' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={onFileChange} style={{ display: 'none' }} />
              <div className="admin-snap-dropzone-icon">📄</div>
              {file ? (
                <div className="admin-snap-dropzone-title">{file.name}</div>
              ) : (
                <>
                  <div className="admin-snap-dropzone-title">{labels.dragOrClick}</div>
                  <div className="admin-snap-dropzone-sub">{labels.supportedFormats}</div>
                </>
              )}
            </div>
            <div className="admin-snap-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="admin-emp-btn is-soft" onClick={() => setStep(1)}>← {labels.prev}</button>
              <button type="button" className="admin-emp-btn is-primary" disabled={!file} onClick={() => setStep(3)}>{labels.next} →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="admin-snap-status-badges">
              <span className="admin-snap-status-badge is-ok">✅ {labels.okCount} {okRows.length}{labels.countUnit}</span>
              {warnRows.length > 0 && (
                <span className="admin-snap-status-badge is-warn">⚠️ {labels.warnCount} {warnRows.length}{labels.countUnit}</span>
              )}
            </div>
            {previewRows.length > 0 ? (
              <div className="admin-snap-preview-scroll">
                <table className="admin-snap-preview-table">
                  <thead>
                    <tr>
                      <th>{labels.target}</th>
                      {fields.map((f) => <th key={`b-${f}`}>{labels.fieldBefore} {labels.fieldLabels[f] ?? f}</th>)}
                      <th aria-hidden="true" />
                      {fields.map((f) => <th key={`a-${f}`}>{labels.fieldAfter} {labels.fieldLabels[f] ?? f}</th>)}
                      <th>{labels.historyDetail}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className={row.status === 'warn' ? 'is-warn' : undefined}>
                        <td className="admin-snap-pv-name">{row.name}</td>
                        {fields.map((f) => <td key={`b-${f}`} className="admin-snap-pv-before">{row.changes[f]?.before ?? '-'}</td>)}
                        <td className="admin-snap-ba-arrow">→</td>
                        {fields.map((f) => <td key={`a-${f}`} className="admin-snap-pv-after">{row.changes[f]?.after ?? '-'}</td>)}
                        <td>
                          {row.status === 'ok'
                            ? <span className="admin-snap-pv-status-ok">✓ {labels.statusOk}</span>
                            : <span className="admin-snap-pv-status-warn">⚠ {labels.statusWarn}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-snap-empty">{labels.bulkPreviewPending}</div>
            )}
            <div className="admin-snap-appt-info" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 0 }}>
              <div className="admin-snap-field">
                <label className="admin-snap-field-label">{labels.appointmentDate}</label>
                <input type="date" className="admin-snap-input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="admin-snap-field">
                <label className="admin-snap-field-label">{labels.reason}</label>
                <input className="admin-snap-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={labels.bulkReasonPlaceholder} />
              </div>
            </div>
            <div className="admin-snap-actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="admin-emp-btn is-soft" onClick={() => setStep(2)}>← {labels.prev}</button>
              <button type="button" className="admin-emp-btn is-primary" disabled={okRows.length === 0 || submitting} onClick={handleConfirm}>
                {labels.confirmBulkPrefix} ({okRows.length}{labels.countUnit})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * 4. 발령 이력
 * ════════════════════════════════════════════════════════════ */
function AppointmentHistoryView({ records, labels, onExport }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => (r.name ?? '').toLowerCase().includes(q));
  }, [records, searchQuery]);

  if (records.length === 0) {
    return <div className="admin-snap-empty">{labels.historyEmpty}</div>;
  }

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-hist-layout">
        <div className="admin-snap-hist-main">
          <div className="admin-snap-hist-toolbar">
            <input
              className="admin-snap-search admin-snap-hist-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={labels.searchEmployee}
            />
            <button type="button" className="admin-snap-export-btn" onClick={() => onExport?.()}>↓ {labels.export}</button>
          </div>
          <div className="admin-snap-hist-tablewrap">
            <table className="admin-snap-hist-table">
              <thead>
                <tr>
                  <th>{labels.historyDate}</th>
                  <th>{labels.historyTarget}</th>
                  <th>{labels.historyType}</th>
                  <th>{labels.historyMode}</th>
                  <th>{labels.historyHandler}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`admin-snap-hist-row${selected?.id === rec.id ? ' is-selected' : ''}`}
                    onClick={() => setSelected(rec)}
                  >
                    <td className="admin-snap-hist-date">{rec.date ?? '-'}</td>
                    <td className="admin-snap-hist-name">{rec.name ?? '-'}</td>
                    <td>
                      <span className={`admin-snap-type-badge is-${TYPE_TONE[rec.typeKey] ?? 'gray'}`}>
                        {rec.typeKey ? (labels.typeLabels[rec.typeKey] ?? rec.typeKey) : '-'}
                      </span>
                    </td>
                    <td className={`admin-snap-hist-mode${rec.mode === 'bulk' ? ' is-bulk' : ''}`}>
                      {rec.mode === 'bulk' ? labels.historyModeBulk : labels.historyModeSingle}
                    </td>
                    <td className="admin-snap-hist-mode">{rec.by ?? '-'}</td>
                    <td><span className="admin-snap-hist-detaillink">{labels.historyDetail} ▸</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="admin-snap-hist-panel">
            <div className="admin-snap-hist-panel-head">
              <div>
                <div className="admin-snap-hist-panel-name">{selected.name}</div>
                <div className="admin-snap-hist-panel-meta">
                  <span className="admin-snap-mono">{selected.date}</span>
                  {' · '}
                  {selected.typeKey ? (labels.typeLabels[selected.typeKey] ?? selected.typeKey) : '-'}
                </div>
              </div>
              <button type="button" className="admin-snap-hist-panel-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="admin-snap-hist-panel-body">
              {selected.changes && selected.changes.length > 0 && (
                <table className="admin-snap-ba-table">
                  <thead>
                    <tr>
                      <th>{labels.historyField}</th>
                      <th>{labels.fieldBefore}</th>
                      <th>{labels.fieldAfter}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.changes.map((ch, i) => (
                      <tr key={i}>
                        <td className="admin-snap-ba-field">{labels.fieldLabels[ch.field] ?? ch.field}</td>
                        <td className="admin-snap-ba-before">{ch.before || '-'}</td>
                        <td className="admin-snap-ba-after">{ch.after || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selected.reason && (
                <>
                  <div className="admin-snap-hist-reason-label">{labels.historyReason}</div>
                  <div className="admin-snap-hist-reason">{selected.reason}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Wrapper — 서브뷰 탭 + 라우팅
 * ════════════════════════════════════════════════════════════ */
export default function OrgSnapshotCanvas({
  view = 'snapshot',
  onViewChange,
  loading = false,
  // 현황
  snapshot = {},
  queryDate = '',
  onQueryDateChange,
  snapshotTab = 'summary',
  onSnapshotTabChange,
  onExportSnapshot,
  // 발령 공통
  members = [],
  fieldOptions = {},
  changeableFields = [],
  bulkFields = [],
  selectFieldKeys = [],
  appointmentTypes = [],
  onSubmitSingle,
  onSubmitBulk,
  // 이력
  historyRecords = [],
  onExportHistory,
  labels: providedLabels,
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);
  const [internalTab, setInternalTab] = useState(snapshotTab);
  const activeTab = onSnapshotTabChange ? snapshotTab : internalTab;
  const setTab = onSnapshotTabChange || setInternalTab;

  const viewKeys = ['snapshot', 'single', 'bulk', 'history'];

  return (
    <div className="admin-snap-canvas">
      <div className="admin-snap-viewtabs">
        {viewKeys.map((v) => (
          <button
            key={v}
            type="button"
            className={`admin-snap-viewtab${view === v ? ' is-active' : ''}`}
            onClick={() => onViewChange?.(v)}
          >
            {labels.views[v]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-snap-loading">{labels.loading}</div>
      ) : (
        <>
          {view === 'snapshot' && (
            <OrgSnapshotStatusView
              data={snapshot}
              labels={labels}
              queryDate={queryDate}
              onQueryDateChange={onQueryDateChange}
              onExport={onExportSnapshot}
              activeTab={activeTab}
              onTabChange={setTab}
            />
          )}
          {view === 'single' && (
            <AppointmentSingleView
              members={members}
              fieldOptions={fieldOptions}
              changeableFields={changeableFields}
              selectFieldKeys={selectFieldKeys}
              appointmentTypes={appointmentTypes}
              labels={labels}
              onSubmit={onSubmitSingle}
            />
          )}
          {view === 'bulk' && (
            <AppointmentBulkView
              members={members}
              bulkFields={bulkFields}
              labels={labels}
              onSubmit={onSubmitBulk}
            />
          )}
          {view === 'history' && (
            <AppointmentHistoryView
              records={historyRecords}
              labels={labels}
              onExport={onExportHistory}
            />
          )}
        </>
      )}
    </div>
  );
}
