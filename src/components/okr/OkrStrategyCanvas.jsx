import { useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrStrategyCanvas — 전사 OKR 탭의 전략 캔버스.
 *
 * rows: [{ id, label, sub, content: string | string[] }] — 데모 데이터는
 * wrapper(OkrPage)가 소유. content 가 배열이면 번호 목록(BIG BETS).
 * 서브탭(전략 캔버스/Company OKR/히스토리) 중 전략 캔버스만 콘텐츠가 있고,
 * [편집]으로 초록 테두리 입력 모드 전환, [저장]으로 로컬 반영한다.
 */
export default function OkrStrategyCanvas({ rows: initialRows, icons, baseUrl = '' }) {
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
            <button className="okr-s-ai-btn">전략 전체 AI 자동완성</button>
            <div className="okr-s-toolbar-right">
              <button className="okr-s-edit-btn" onClick={() => (editing ? setEditing(false) : startEdit())}>편집</button>
              {editing && <button className="okr-s-save-btn" onClick={save}>저장</button>}
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
      ) : (
        <div className="okr-s-placeholder">준비 중인 화면입니다</div>
      )}
    </div>
  );
}
