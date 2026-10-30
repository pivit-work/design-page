import { useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';
import Tabs from '../shared/Tabs.jsx';
import Button from '../shared/Button.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryList from './OkrHistoryList.jsx';
import rowKey from './rowKey.js';
import { AI_PREREQUISITES } from './okrStrategyAiPrerequisites.js';
import stripListMarker from '../shared/stripListMarker.js';
import { OkrLabelsContext, makeOkrLabels } from './okr-labels.jsx';

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
 * onAiAutocomplete(rowId?, draftRows?): '전략 전체 AI 자동완성'. 행 id → 텍스트 맵을 반환하면
 *   편집 모드로 들어가며 초안을 채운다(사용자가 확인·수정 후 [저장]).
 *   행별 [AI] 는 AI_PREREQUISITES 의 선행 칸이 비어 있으면 부르지 않고 그 행 안에
 *   「Mission을 먼저 입력해주세요.」를 띄운다(편집 중이면 입력 중인 글로 판정 · PW-1505).
 * historyEmptyLabel: 히스토리 0건 문구. 앱이 ko/en 을 넘긴다.
 * toolbarAside: 서브탭 아래 도구 줄 오른쪽 끝에 놓는 것 — 전사 OKR 을 쓸 수 있는지(「작성 가능」·「읽기 전용」).
 *   기획 시안 전사 화면의 «권한 배지 줄» 자리다. 권한은 서브탭과 상관없이 전사 탭 전체라, 도구 줄이 없는
 *   Company OKR·히스토리 서브탭에도 같은 줄을 세워 그 오른쪽 끝에 둔다. 안 주면 종전 그대로다.
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
export default function OkrStrategyCanvas({ rows: initialRows, companyBoard, history, icons, baseUrl = '', onKrUpdate, onSubmitFeedback, onViewAllFeedback, onWriteFeedback, onSave, onAiAutocomplete, canEdit = true, onRefreshInsights, onInsightAction, onCloseInsights, showInsights = true, onToggleInitiative, canEditInitiative = false , focusKrId = null, focusObjectiveId = null, historyEmptyLabel, toolbarAside = null, labels }) {
  // 화면 문구 — 소비자가 번역을 넘긴다(PW-2415). 안 넘기면 종전 한국어.
  const L = useMemo(() => makeOkrLabels(labels), [labels]);
  const [subTab, setSubTab] = useState('canvas');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  // { rowId: string | null, message } — rowId 가 있으면 그 행 안에, 없으면 도구 줄 아래에 뜬다. ×로 닫는다(okr-policy §5).
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
    // 편집 중에 권한이 거둬졌으면(canEdit 이 꺼짐) 저장하지 않는다 — 소비자가 onSave 를 거둬도
    // 아래 미리보기 저장으로 흘러 화면에만 반영된 척하면 안 된다 (pivit-work PW-1508).
    if (!canEdit) return;
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
    } catch (err) {
      // 편집 모드를 유지해 입력한 내용을 보존한다. 권한 거절(403)은 소비자가 토스트로 알리고
      // canEdit 을 내린다 — «잠시 후 다시 시도» 를 겹치지 않는다 (pivit-work PW-1508).
      if (err?.response?.status !== 403) {
        setError({ rowId: null, message: L('strategy.saveFailed') });
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * AI 자동완성. rowId 를 주면 그 행만, 없으면 전체를 채운다.
   * 행 옆 'AI' 칩은 `cursor: pointer` 로 클릭 가능하게 그려져 있었는데 핸들러가
   * 없어 아무 반응도 없었다(PW-14) — 같은 자동완성을 행 단위로 잇는다.
   */
  const missingPrerequisites = (rowId) => {
    const current = editing ? draft : toDraft(rows);
    const filled = new Set(rows.filter((row, i) => (current[i] ?? '').trim()).map((row) => row.id));
    return (AI_PREREQUISITES[rowId] ?? [])
      .filter((id) => !filled.has(id))
      .map((id) => rows.find((row) => row.id === id)?.label ?? id);
  };

  const runAi = async (rowId) => {
    if (!onAiAutocomplete) return;
    if (rowId) {
      const missing = missingPrerequisites(rowId);
      if (missing.length > 0) {
        setError({ rowId, message: L('strategy.missingFirst', { fields: missing.join(', ') }) });
        return;
      }
    }
    setAiLoading(rowId ?? true);
    setError(null);
    try {
      // 편집 중이면 입력 중인 글(저장 전)을 같이 넘긴다 — 선행 칸 판정과 생성이 같은 글을 본다.
      const byId = await onAiAutocomplete(rowId, editing ? fromDraft(rows, draft) : undefined);
      const base = editing ? draft : toDraft(rows);
      setDraft(
        rows.map((row, i) => {
          if (rowId && row.id !== rowId) return base[i];
          return byId?.[row.id] ?? base[i];
        }),
      );
      setEditing(true);
    } catch (err) {
      if (err?.response?.status !== 403) {
        setError({ rowId: null, message: L('strategy.aiFailed') });
      }
    } finally {
      setAiLoading(false);
    }
  };

  const errorBanner = (
    <div className="okr-s-error" role="alert">
      <span>{error?.message}</span>
      {/* 공용 Button 에 종전 모양(okr-s-error-close)을 그대로 넘긴다 — 닫기 이름을 번역하면서 옮겼다(PW-2415). */}
      <Button className="okr-s-error-close" aria-label={L('strategy.close')} onClick={() => setError(null)}>
        <CloseGlyph size={13} aria-hidden="true" />
      </Button>
    </div>
  );

  const SUB_TABS = [
    { id: 'canvas', label: L('strategy.tabCanvas') },
    { id: 'company', label: 'Company OKR' },
    { id: 'history', label: L('strategy.tabHistory') },
  ];

  return (
    <OkrLabelsContext.Provider value={L}>
    <div className="okr-personal-area">
      {/* 화면 안 탭 — 공용 Tabs (PW-836). */}
      <div className="tl-tabs-row okr-s-tabs-row">
        <Tabs
          items={SUB_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
          value={subTab}
          onChange={setSubTab}
        />
      </div>

      {subTab !== 'canvas' && toolbarAside && (
        <div className="okr-s-toolbar">
          <span />
          <div className="okr-s-toolbar-right">{toolbarAside}</div>
        </div>
      )}

      {subTab === 'canvas' ? (
        <>
          <div className="okr-s-toolbar">
            {editing || !canEdit ? <span /> : (
              <button
                className="okr-s-ai-btn"
                onClick={() => runAi()}
                disabled={!onAiAutocomplete || aiLoading !== false}
              >
                {aiLoading === true ? L('strategy.aiAllRunning') : L('strategy.aiAll')}
              </button>
            )}
            <div className="okr-s-toolbar-right">
              {editing ? (
                <>
                  <button className="okr-s-edit-btn" onClick={cancelEdit} disabled={saving}>{L('strategy.cancel')}</button>
                  <button className="okr-s-save-btn" onClick={save} disabled={saving || !canEdit}>
                    {saving ? L('strategy.saving') : L('strategy.save')}
                  </button>
                </>
              ) : canEdit ? (
                <button className="okr-s-edit-btn" onClick={startEdit}>{L('strategy.edit')}</button>
              ) : null}
              {toolbarAside}
            </div>
          </div>
          {error && !error.rowId && errorBanner}

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
                      readOnly={!canEdit}
                      className="okr-s-input"
                      rows={Array.isArray(row.content) ? row.content.length + 1 : 2}
                      value={draft[i]}
                      onChange={(e) => setDraft(draft.map((d, di) => (di === i ? e.target.value : d)))}
                    />
                  ) : Array.isArray(row.content) ? (
                    <ol className="okr-s-list">
                      {row.content.map(stripListMarker).filter((line) => line.trim()).map((line, li) => <li key={rowKey(line, li)}>{line}</li>)}
                    </ol>
                  ) : (
                    <p className="okr-s-text">{row.content}</p>
                  )}
                  {error?.rowId === row.id && errorBanner}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="okr-s-ai-chip"
                    title={L('strategy.rowAi', { row: row.label })}
                    aria-label={L('strategy.rowAi', { row: row.label })}
                    data-testid={`okr-s-ai-${row.id}`}
                    onClick={() => runAi(row.id)}
                    disabled={!onAiAutocomplete || aiLoading !== false}
                  >
                    <Icon src={icons.aiChat} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                    <span>{aiLoading === row.id ? L('strategy.rowAiRunning') : L('strategy.rowAiShort')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : subTab === 'company' && companyBoard ? (
        <OkrBoard board={companyBoard} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onViewAllFeedback={onViewAllFeedback} onWriteFeedback={onWriteFeedback} onRefreshInsights={onRefreshInsights} onInsightAction={onInsightAction} onCloseInsights={onCloseInsights} showInsights={showInsights} onToggleInitiative={onToggleInitiative} canEditInitiative={canEditInitiative} focusKrId={focusKrId} focusObjectiveId={focusObjectiveId} />
      ) : subTab === 'history' ? (
        <OkrHistoryList history={history} icons={icons} baseUrl={baseUrl} emptyLabel={historyEmptyLabel} />
      ) : (
        <div className="okr-s-placeholder">{L('strategy.placeholder')}</div>
      )}
    </div>
    </OkrLabelsContext.Provider>
  );
}
