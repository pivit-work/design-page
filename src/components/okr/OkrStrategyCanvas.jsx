import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';
import rowKey from './rowKey.js';

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
 * canEdit: 전략 캔버스를 편집할 수 있는 사용자인가. false 면 [편집] 버튼을
 *   **그리지 않는다**(시안 okr-company.jsx `canEdit && !editing`). 기본 true 라
 *   데모는 지금처럼 편집을 시연한다.
 *
 *   왜 `onSave` 유무로 갈음하지 않는가: onSave 가 없으면 이 컴포넌트는 로컬만
 *   바꾸는 데모 모드로 동작한다. 그런데 소비자가 "권한 없음" 을 onSave 미전달로
 *   표현하면, 권한 없는 사용자가 회사 미션을 고치고 [저장] 을 눌러 **에러 없이
 *   화면이 바뀌는** 가짜 성공을 본다(PW-106 에서 실제로 그랬다). 새로고침하면
 *   되돌아간다. 데모 모드와 권한은 별개 축이라 prop 을 나눈다.
 */
export default function OkrStrategyCanvas({ rows: initialRows, companyBoard, history, icons, baseUrl = '', onKrUpdate, onSubmitFeedback, onSubmitReply, onRequestFeedback, onSave, onAiAutocomplete, canEdit = true }) {
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

  /**
   * AI 자동완성. rowId 를 주면 그 행만, 없으면 전체를 채운다.
   * 행 옆 'AI' 칩은 `cursor: pointer` 로 클릭 가능하게 그려져 있었는데 핸들러가
   * 없어 아무 반응도 없었다(PW-14) — 같은 자동완성을 행 단위로 잇는다.
   */
  const runAi = async (rowId) => {
    if (!onAiAutocomplete) return;
    setAiLoading(rowId ?? true);
    setError(null);
    try {
      const byId = await onAiAutocomplete(rowId);
      const base = editing ? draft : toDraft(rows);
      setDraft(
        rows.map((row, i) => {
          if (rowId && row.id !== rowId) return base[i];
          return byId?.[row.id] ?? base[i];
        }),
      );
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
            {editing || !canEdit ? <span /> : (
              <button
                className="okr-s-ai-btn"
                onClick={() => runAi()}
                disabled={!onAiAutocomplete || aiLoading !== false}
              >
                {aiLoading === true ? 'AI 자동완성 중…' : '전략 전체 AI 자동완성'}
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
              ) : canEdit ? (
                <button className="okr-s-edit-btn" onClick={startEdit}>편집</button>
              ) : null}
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
                      {row.content.map((line, li) => <li key={rowKey(line, li)}>{line}</li>)}
                    </ol>
                  ) : (
                    <p className="okr-s-text">{row.content}</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="okr-s-ai-chip"
                    title={`${row.label} AI 자동완성`}
                    aria-label={`${row.label} AI 자동완성`}
                    data-testid={`okr-s-ai-${row.id}`}
                    onClick={() => runAi(row.id)}
                    disabled={!onAiAutocomplete || aiLoading !== false}
                  >
                    <Icon src={icons.aiChat} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                    <span>{aiLoading === row.id ? '생성 중…' : 'AI'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : subTab === 'company' && companyBoard ? (
        <OkrBoard board={companyBoard} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onSubmitReply={onSubmitReply} onRequestFeedback={onRequestFeedback} />
      ) : subTab === 'history' && history ? (
        <div className="okr-h-list">
          {history.map((quarter, i) => (
            <OkrHistoryQuarter key={rowKey(quarter, i, 'label')} quarter={quarter} icons={icons} baseUrl={baseUrl} />
          ))}
        </div>
      ) : (
        <div className="okr-s-placeholder">준비 중인 화면입니다</div>
      )}
    </div>
  );
}
