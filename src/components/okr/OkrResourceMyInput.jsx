import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import { RsStatCard, RsAiLabel, RsCommentThread } from './OkrResourcePieces.jsx';
import rowKey from './rowKey.js';
import { OKR_RESOURCE_DEFAULT_LABELS, statusLabel } from './okrResourceLabels.js';

/**
 * OkrResourceMyInput — 내 리소스 '내 입력' 뷰.
 * Figma 17478:21448 (기본) / 17478:22296 (내 KR 불러오기 펼침).
 *
 * 스탯 4 → AI 스니핏 기반 추정 배너 → 프로젝트 슬라이더 카드들 → Total →
 * 투입 항목 추가(스쿼드 칩·내 KR 불러오기·직접 입력) → [저장] → 매니저 코멘트.
 *
 * 슬라이더 값은 UI 상태(데모) — 저장은 onSave(entries) 로 위임한다.
 * 추정치 마커는 entry.estimate 위치 위에 다크 툴팁으로 뜬다.
 *
 * `data.aiEstimate` 가 없으면 추정 배너를 통째로 내린다. 근거가 될 스니핏이 모자란
 * 달에도 배너를 그리면 항목 0개짜리 목록과 눌러도 아무 일이 없는 [추정치 적용] 이
 * 남아, 고장으로 읽힌다.
 *
 * `readOnly`(끝난 달 · PW-1173)면 값은 보이되 고치는 길을 전부 내린다 — 추정 배너·슬라이더·
 * 숫자 입력·✕·경고·투입 항목 추가·저장. 매니저 코멘트와 답글은 남긴다.
 *
 * 새로 담은 항목은 어디서 왔는지(`source`: 'suggestion' | 'project' | 'kr' | 'custom')와
 * 고른 후보의 `ref`(후보 항목의 `ref` 값 그대로)를 함께 들고 onSave 로 돌아간다. 저장된 항목도
 * `data.entries` 에 `source`·`ref` 를 실어 주면 후보 칩을 그 `ref` 로 가린다. 이름만으로
 * 되짚으면 직접 적은 이름이 같은 이름의 프로젝트로 바뀐다(리소스 정책서 §9).
 *
 * 수동 % 와 추정 % 가 `ESTIMATE_GAP_PP` 이상 벌어지면 추정 라벨에 `M.estimateGap` 을 붙인다
 * (정책서 §5-3.4) — 슬라이더를 움직이는 즉시 붙고 풀린다. `entry.warn` 을 주면 그것이 우선이다.
 *
 * onReply(text) 가 false 를 돌려주거나 실패하면 쓴 글과 입력바를 그대로 둔다(정책서 §9 —
 * 다시 누를 수 있게). 그 밖의 결과(true·undefined)면 스레드에 붙이고 입력바를 닫는다.
 */
/** 수동 % 와 추정 % 의 차이가 이만큼(%p) 이상이면 «차이 큼» — 리소스 정책서 §5-3.4. */
export const ESTIMATE_GAP_PP = 15;

export default function OkrResourceMyInput({
  data, icons, baseUrl = '', onSave, onApplyEstimates, onReply, labels: L = OKR_RESOURCE_DEFAULT_LABELS,
  readOnly = false, monthLabel = '',
}) {
  const M = L.my;
  const [entries, setEntries] = useState(data.entries);
  const [krOpen, setKrOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  // [답글 달기] — 누르면 입력바가 열리고, 등록하면 답글(들여쓰기)로 스레드에 달린다.
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [extraComments, setExtraComments] = useState([]);
  const [replying, setReplying] = useState(false);

  const comments = [...data.comments, ...extraComments];
  const submitReply = async () => {
    const text = replyText.trim();
    if (!text || replying) return;
    setReplying(true);
    let ok;
    try {
      ok = await onReply?.(text);
    } catch {
      ok = false;
    } finally {
      setReplying(false);
    }
    if (ok === false) return;
    setExtraComments((p) => [...p, {
      author: data.commentAuthor?.name ?? M.me,
      avatar: data.commentAuthor?.avatar,
      date: data.commentDate ?? '',
      reply: true,
      text,
    }]);
    setReplyText('');
    setReplyOpen(false);
  };

  const patch = (id, value) => {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, value: v } : e)));
  };
  const remove = (id) => setEntries((p) => p.filter((e) => e.id !== id));
  // 추가되는 항목도 기본 퍼센트를 갖고 시작한다 — 0% 로 들어오면 "반영 안 된 항목"
  // 으로 읽혀서, 스니핏 추정값(없으면 10%)을 초기값으로 쓴다.
  //
  // 🔴 추정치 **마커**는 추정값이 실제로 있을 때만 단다. 없는데 10% 자리에 세우면
  // 근거 없는 위치에 "추정 10%" 가 서서, 사람이 그 눈금에 맞춰 값을 정하게 된다.
  // (KR·직접 입력 항목은 스니핏 태그 대상이 아니라 추정 자체가 없다.)
  const addEntry = (name, extra = {}) => {
    if (!name || taken(name, extra.ref)) return;
    const estimate = extra.estimate ?? null;
    setEntries((p) => [...p, {
      id: `rs-${extra.source ?? 'x'}-${extra.ref ?? name}`,
      name,
      tag: extra.tag ?? null,
      value: extra.value ?? estimate ?? 10,
      estimate,
      source: extra.source ?? null,
      ref: extra.ref ?? null,
    }]);
  };
  const gapNote = (entry) => {
    if (entry.warn) return entry.warn;
    if (entry.estimate == null || !M.estimateGap) return null;
    return Math.abs(entry.value - entry.estimate) >= ESTIMATE_GAP_PP ? M.estimateGap : null;
  };
  const total = entries.reduce((a, e) => a + e.value, 0);
  // 이미 투입 목록에 있는 항목의 추가 버튼은 숨긴다 — 눌러도 무시되는 버튼을
  // 남겨두면 고장으로 읽힌다. 항목을 삭제(X)하면 버튼이 다시 나타난다.
  // 'PIVIT v2.0'(KR 연결명) vs 'PIVIT V2.0'(항목명)처럼 표기만 다른 같은
  // 프로젝트가 있어 대소문자·공백을 정규화해 비교한다.
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const has = (name) => entries.some((e) => norm(e.name) === norm(name));
  // 후보(프로젝트·KR)가 이미 담겼나는 **어느 후보인가**(`ref`)로 본다 — 이름으로 보면 같은 이름의
  // 직접 항목이 그 프로젝트 칩을 가려, 정책서 §9 «둘 다 존재»가 깨진다. `ref` 가 없는 옛 데이터만 이름으로.
  const taken = (name, ref) => (ref ? entries.some((e) => e.ref === ref) : has(name));

  return (
    <div className="rsx-my">
      {readOnly && <p className="rsx-add-note" role="note">{M.readOnlyNotice(monthLabel)}</p>}
      <div className="rsx-stats">
        <RsStatCard label={M.total} value={`${data.stats.total}%`} tone="brand" bar={data.stats.total} />
        <RsStatCard label={M.items} value={data.stats.items} />
        <RsStatCard label={M.kr} value={<>{data.stats.kr[0]} <small>/ {data.stats.kr[1]}</small></>} />
        <RsStatCard label={M.status} value={statusLabel(data.stats.status, L)} tone={data.stats.status === '과부하' ? 'bad' : ''} />
      </div>

      {!readOnly && data.aiEstimate && (
        <div className="rsx-ai-banner">
          <div className="rsx-ai-banner-bar">
            <div className="rsx-ai-banner-info">
              <RsAiLabel>{M.aiEstimate}</RsAiLabel>
              <span>{data.aiEstimate.period}</span>
              <span>{data.aiEstimate.tagged}</span>
            </div>
            <button
              type="button"
              className="rsx-purple-btn"
              onClick={() => {
                // 기본 동작(데모): 추정치를 각 항목 값으로 반영. 호스트 콜백이 있으면 위임.
                if (onApplyEstimates) { onApplyEstimates(data.aiEstimate.items); return; }
                setEntries((p) => p.map((e) => {
                  const est = data.aiEstimate.items.find((it) => it.name === e.name);
                  return est ? { ...e, value: est.pct } : e;
                }));
              }}
            >
              {M.applyEstimates}
            </button>
          </div>
          <ul className="rsx-ai-banner-list">
            {data.aiEstimate.items.map((item, i) => (
              <li key={rowKey(item, i)}>{item.name} {item.pct}%</li>
            ))}
          </ul>
          <p className="rsx-ai-banner-note">{M.estimateNote}</p>
        </div>
      )}

      {entries.map((entry) => (
        <div className="rsx-entry" key={entry.id}>
          <div className="rsx-entry-main">
            <div className="rsx-entry-head">
              <div className="rsx-entry-title">
                <span className="rsx-entry-name">{entry.name}</span>
                {entry.tag && <StatusBadge className="rsx-tag">{entry.tag}</StatusBadge>}
              </div>
              <span className="rsx-entry-pct">{entry.value}%</span>
            </div>
            {!readOnly && (
              <div className="rsx-entry-slider">
                <div className="rsx-slider">
                  <div className="rsx-slider-track">
                    <i style={{ width: `${entry.value}%` }} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={entry.value}
                    aria-label={M.sliderAria(entry.name)}
                    onChange={(e) => patch(entry.id, e.target.value)}
                  />
                  <span className="rsx-slider-ball" style={{ left: `${entry.value}%` }} />
                  {entry.estimate != null && (
                    <span className="rsx-slider-marker" style={{ left: `${entry.estimate}%` }}>
                      <b>{M.marker}</b>
                      <i />
                    </span>
                  )}
                </div>
                <div className="rsx-entry-input">
                  <input
                    type="number"
                    value={entry.value}
                    aria-label={M.inputAria(entry.name)}
                    onChange={(e) => patch(entry.id, e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            )}
            {!readOnly && entry.estimate != null && (() => {
              const warn = gapNote(entry);
              return (
                <p className={`rsx-entry-note${warn ? ' is-warn' : ''}`}>
                  {M.estimate(entry.estimate)}{warn ? `  •  ${warn}` : ''}
                </p>
              );
            })()}
          </div>
          {!readOnly && (
            <button type="button" className="rsx-close-btn" onClick={() => remove(entry.id)} aria-label={M.removeAria(entry.name)}>
              <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
            </button>
          )}
        </div>
      ))}

      {readOnly && entries.length === 0 && <p className="rsx-add-note">{M.readOnlyEmpty}</p>}

      <div className="rsx-total">
        <p className="rsx-total-label">Total</p>
        <p className={`rsx-total-value${total > 100 || data.redFlag ? ' is-bad' : ''}`}>{total}%</p>
        {!readOnly && data.redFlag && (
          <div className="rsx-total-warn">
            <Icon src={icons.alertTriangle} size={12} color="var(--text-error-primary)" baseUrl={baseUrl} />
            <span>{data.redFlag}</span>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="rsx-add">
          <div className="rsx-add-head">
            <span className="rsx-add-title">{M.addTitle}</span>
            <StatusBadge className="rsx-badge is-brand">{M.confirmed}</StatusBadge>
          </div>
          <div className="rsx-add-suggest">
            <RsAiLabel>{M.suggestTitle}</RsAiLabel>
            {data.suggestions.filter((s) => !taken(s.name, s.ref)).map((s, i) => (
              <button
                type="button"
                className="rsx-suggest-chip"
                key={rowKey(s, i)}
                onClick={() => addEntry(s.name, { estimate: s.pct, source: 'suggestion', ref: s.ref })}
              >
                {M.suggestChip(s.name, s.pct)}
              </button>
            ))}
          </div>
          <div className="rsx-add-group">
            <p className="rsx-add-eyebrow">{M.squadProjects}</p>
            <div className="rsx-squads">
              {data.squads
                .map((squad) => ({ ...squad, items: squad.items.filter((item) => !taken(item.name, item.ref)) }))
                .filter((squad) => squad.items.length > 0)
                .map((squad, si) => (
                  <div className="rsx-squad" key={rowKey(squad, si)}>
                    <p className="rsx-squad-name">{squad.name}</p>
                    <div className="rsx-squad-items">
                      {squad.items.map((item, ii) => (
                        <button
                          type="button"
                          className="rsx-chip-btn"
                          key={rowKey(item, ii)}
                          onClick={() => addEntry(item.name, { estimate: item.pct, tag: squad.name, source: 'project', ref: item.ref })}
                        >
                          <Icon src={icons.plus} size={14} color="var(--text-primary)" baseUrl={baseUrl} />
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="rsx-add-group">
            <p className="rsx-add-eyebrow">{M.personalOkr}</p>
            <button type="button" className="rsx-kr-btn" onClick={() => setKrOpen((v) => !v)}>
              <span>{M.loadKrs}</span>
              {krOpen ? (
                <span className="rsx-kr-caret">
                  <Icon src={icons.chevronDown} size={16} color="var(--utility-blue-500)" baseUrl={baseUrl} />
                </span>
              ) : (
                <b>{data.krs.length}</b>
              )}
            </button>
            {krOpen && (
              <div className="rsx-kr-list">
                {data.krs.map((kr) => (
                  <div className="rsx-kr-row" key={kr.id}>
                    <span className="rsx-kr-id">{kr.id}</span>
                    <div className="rsx-kr-main">
                      <p className="rsx-kr-title">{kr.title}</p>
                      <p className="rsx-kr-sub">{kr.sub}</p>
                    </div>
                    {/* KR 은 연결 프로젝트가 이미 있어도 KR 자체를 별도 항목으로 추가한다
                        (시안 17478:22428 — PIVIT V2.0 항목이 있는 상태에서도 [추가] 노출).
                        같은 KR 을 이미 추가한 경우에만 버튼을 숨긴다. */}
                    {!taken(kr.title, kr.ref) && (
                      <button
                        type="button"
                        className="rsx-gray-btn"
                        onClick={() => addEntry(kr.title, { estimate: kr.pct, tag: M.personalOkr, source: 'kr', ref: kr.ref })}
                      >
                        {M.add}
                      </button>
                    )}
                  </div>
                ))}
                <p className="rsx-kr-note">{M.krNote}</p>
              </div>
            )}
          </div>
          <div className="rsx-add-group">
            <p className="rsx-add-eyebrow">{M.customTitle}</p>
            <div className="rsx-add-custom">
              <input
                value={customName}
                maxLength={20}
                placeholder={M.customPlaceholder}
                aria-label={M.customAria}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <button
                type="button"
                className="rsx-gray-btn is-md"
                onClick={() => { addEntry(customName.trim(), { source: 'custom' }); setCustomName(''); }}
              >
                {M.customAdd}
              </button>
            </div>
            <p className="rsx-add-note">{M.customNote}</p>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="rsx-save-row">
          <button type="button" className="rsx-save-btn" onClick={() => onSave?.(entries)}>{M.save}</button>
        </div>
      )}

      <div className="rsx-comments-section">
        <p className="rsx-section-title">{L.managerComments}</p>
        <RsCommentThread comments={comments} />
        {replyOpen ? (
          <div className="rsx-comment-input-row">
            <input
              autoFocus
              placeholder={M.replyPlaceholder}
              aria-label={M.replyAria}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitReply();
                if (e.key === 'Escape') { setReplyOpen(false); setReplyText(''); }
              }}
            />
            <button type="button" className="rsx-gray-btn is-md" disabled={replying} onClick={submitReply}>{M.replySubmit}</button>
          </div>
        ) : (
          <button type="button" className="rsx-reply-btn" onClick={() => setReplyOpen(true)}>
            <Icon src={icons.messageText} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>{M.reply}</span>
          </button>
        )}
      </div>
    </div>
  );
}
