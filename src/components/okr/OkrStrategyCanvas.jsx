import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';

/**
 * OkrStrategyCanvas — 전사 OKR 탭 (전략 캔버스/Company OKR/히스토리).
 *
 * rows: [{ id, label, sub, content: string | string[] }] — 데모 데이터는
 * wrapper(OkrPage)가 소유. content 가 배열이면 번호 목록(BIG BETS).
 * 전략 캔버스는 [편집]으로 초록 테두리 입력 모드 전환, [저장]으로 반영.
 * Company OKR 서브탭은 공용 OkrBoard, 히스토리는 개인 OKR 과 동일 구조.
 *
 * onSave(rows): [저장] 시 서버 반영. 주지 않으면 로컬 표시만 바뀐다(데모).
 *   반환 Promise 가 reject 하면 편집 모드를 유지하고 인라인 에러를 띄운다 —
 *   작성 중 내용을 삼키지 않는다.
 * onAiAutocomplete(): '전략 전체 AI 자동완성'. 행 id → 텍스트 맵을 반환하면
 *   편집 모드로 들어가며 초안을 채운다(사용자가 확인·수정 후 [저장]).
 */
export default function OkrStrategyCanvas({ rows: initialRows, companyBoard, history, icons, baseUrl = '', onKrUpdate, onSubmitFeedback, onSubmitReply, onRequestFeedback, onSave, onAiAutocomplete }) {
  const [subTab, setSubTab] = useState('canvas');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // onSave 가 있으면 rows 의 정본은 소비자(서버) 다 — 저장 후 소비자가 새 rows 를
  // 내려주므로 로컬 사본을 두지 않는다. onSave 가 없는 데모에서만 로컬로 반영한다.
  // (props→state 동기화 useEffect 를 두면 cascading render 가 된다.)
  const [demoRows, setDemoRows] = useState(null);
  const rows = demoRows ?? initialRows;

  const toDraft = (list) =>
    list.map((row) => (Array.isArray(row.content) ? row.content.join('\n') : row.content));
  const fromDraft = (list, values) =>
    list.map((row, i) => ({
      ...row,
      content: Array.isArray(row.content) ? (values[i] ?? '').split('\n').filter(Boolean) : (values[i] ?? ''),
    }));

  const startEdit = () => {
    setDraft(toDraft(rows));
    setError(null);
    setEditing(true);
  };
  const cancelEdit = () => {
    setEditing(false);
    setError(null);
  };
  const save = async () => {
    const next = fromDraft(rows, draft);
    if (!onSave) {
      setDemoRows(next);
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // 편집 모드를 유지해 입력한 내용을 보존한다.
      setError('전략 캔버스 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  const runAi = async () => {
    if (!onAiAutocomplete) return;
    setAiLoading(true);
    setError(null);
    try {
      const byId = await onAiAutocomplete();
      const base = editing ? draft : toDraft(rows);
      setDraft(rows.map((row, i) => byId?.[row.id] ?? base[i]));
      setEditing(true);
    } catch {
      setError('AI 자동완성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setAiLoading(false);
    }
  };

  const SUB_TABS = [
    { id: 'canvas', label: '전략 캔버스' },
    { id: 'company', label: 'Company OKR' },
    { id: 'history', label: '히스토리' },
  ];

  return (
    <div className="okr-personal-area">
      <div className="okr-s-subtabs">
        {SUB_TABS.map((tab) => (
          <span
            key={tab.id}
            className={`okr-s-subtab${subTab === tab.id ? ' is-active' : ''}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </span>
        ))}
      </div>

      {subTab === 'canvas' ? (
        <>
          <div className="okr-s-toolbar">
            {editing ? <span /> : (
              <button className="okr-s-ai-btn" onClick={runAi} disabled={!onAiAutocomplete || aiLoading}>
                {aiLoading ? 'AI 자동완성 중…' : '전략 전체 AI 자동완성'}
              </button>
            )}
            <div className="okr-s-toolbar-right">
              {editing ? (
                <>
                  <button className="okr-s-edit-btn" onClick={cancelEdit} disabled={saving}>취소</button>
                  <button className="okr-s-save-btn" onClick={save} disabled={saving}>
                    {saving ? '저장 중…' : '저장'}
                  </button>
                </>
              ) : (
                <button className="okr-s-edit-btn" onClick={startEdit}>편집</button>
              )}
            </div>
          </div>
          {error && <p className="okr-s-error">{error}</p>}

          <div className="okr-s-card">
            {rows.map((row, i) => (
              <div className="okr-s-row" key={row.id}>
                <div className="okr-s-label">
                  <p className="okr-s-title">{row.label}</p>
                  <p className="okr-s-sub">{row.sub}</p>
                </div>
                <div className="okr-s-content">
                  {editing ? (
                    <textarea
                      className="okr-s-input"
                      rows={Array.isArray(row.content) ? row.content.length + 1 : 2}
                      value={draft[i]}
                      onChange={(e) => setDraft(draft.map((d, di) => (di === i ? e.target.value : d)))}
                    />
                  ) : Array.isArray(row.content) ? (
                    <ol className="okr-s-list">
                      {row.content.map((line) => <li key={line}>{line}</li>)}
                    </ol>
                  ) : (
                    <p className="okr-s-text">{row.content}</p>
                  )}
                </div>
                <span className="okr-s-ai-chip">
                  <Icon src={icons.aiChat} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                  <span>AI</span>
                </span>
              </div>
            ))}
          </div>
        </>
      ) : subTab === 'company' && companyBoard ? (
        <OkrBoard board={companyBoard} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onSubmitReply={onSubmitReply} onRequestFeedback={onRequestFeedback} />
      ) : subTab === 'history' && history ? (
        <div className="okr-h-list">
          {history.map((quarter) => (
            <OkrHistoryQuarter key={quarter.label} quarter={quarter} icons={icons} baseUrl={baseUrl} />
          ))}
        </div>
      ) : (
        <div className="okr-s-placeholder">준비 중인 화면입니다</div>
      )}
    </div>
  );
}
