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
 */
export default function OkrStrategyCanvas({ rows: initialRows, companyBoard, history, icons, baseUrl = '', onKrUpdate }) {
  const [subTab, setSubTab] = useState('canvas');
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  const startEdit = () => {
    setDraft(rows.map((row) => (Array.isArray(row.content) ? row.content.join('\n') : row.content)));
    setEditing(true);
  };
  const save = () => {
    setRows(rows.map((row, i) => ({
      ...row,
      content: Array.isArray(row.content) ? draft[i].split('\n').filter(Boolean) : draft[i],
    })));
    setEditing(false);
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
            {editing ? <span /> : <button className="okr-s-ai-btn">전략 전체 AI 자동완성</button>}
            <div className="okr-s-toolbar-right">
              {editing ? (
                <>
                  <button className="okr-s-edit-btn" onClick={() => setEditing(false)}>취소</button>
                  <button className="okr-s-save-btn" onClick={save}>저장</button>
                </>
              ) : (
                <button className="okr-s-edit-btn" onClick={startEdit}>편집</button>
              )}
            </div>
          </div>

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
        <OkrBoard board={companyBoard} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} />
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
