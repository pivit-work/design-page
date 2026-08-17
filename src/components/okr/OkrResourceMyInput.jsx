import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import { RsStatCard, RsAiLabel, RsCommentThread } from './OkrResourcePieces.jsx';
import rowKey from './rowKey.js';

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
 */
export default function OkrResourceMyInput({ data, icons, baseUrl = '', onSave, onApplyEstimates, onReply }) {
  const [entries, setEntries] = useState(data.entries);
  const [krOpen, setKrOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  // [답글 달기] — 누르면 입력바가 열리고, 등록하면 답글(들여쓰기)로 스레드에 달린다.
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [extraComments, setExtraComments] = useState([]);

  const comments = [...data.comments, ...extraComments];
  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    setExtraComments((p) => [...p, {
      author: data.commentAuthor?.name ?? '나',
      avatar: data.commentAuthor?.avatar,
      date: data.commentDate ?? '',
      reply: true,
      text,
    }]);
    setReplyText('');
    setReplyOpen(false);
    onReply?.(text);
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
    if (!name || has(name)) return;
    const estimate = extra.estimate ?? null;
    setEntries((p) => [...p, {
      id: `rs-${name}`,
      name,
      tag: extra.tag ?? null,
      value: extra.value ?? estimate ?? 10,
      estimate,
    }]);
  };
  const total = entries.reduce((a, e) => a + e.value, 0);
  // 이미 투입 목록에 있는 항목의 추가 버튼은 숨긴다 — 눌러도 무시되는 버튼을
  // 남겨두면 고장으로 읽힌다. 항목을 삭제(X)하면 버튼이 다시 나타난다.
  // 'PIVIT v2.0'(KR 연결명) vs 'PIVIT V2.0'(항목명)처럼 표기만 다른 같은
  // 프로젝트가 있어 대소문자·공백을 정규화해 비교한다.
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const has = (name) => entries.some((e) => norm(e.name) === norm(name));

  return (
    <div className="rsx-my">
      <div className="rsx-stats">
        <RsStatCard label="투입 합계" value={`${data.stats.total}%`} tone="brand" bar={data.stats.total} />
        <RsStatCard label="투입 항목" value={data.stats.items} />
        <RsStatCard label="내 KR" value={<>{data.stats.kr[0]} <small>/ {data.stats.kr[1]}</small></>} />
        <RsStatCard label="상태" value={data.stats.status} tone={data.stats.status === '과부하' ? 'bad' : ''} />
      </div>

      {data.aiEstimate && (
        <div className="rsx-ai-banner">
          <div className="rsx-ai-banner-bar">
            <div className="rsx-ai-banner-info">
              <RsAiLabel>스니핏 기반 추정</RsAiLabel>
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
              추정치 적용
            </button>
          </div>
          <ul className="rsx-ai-banner-list">
            {data.aiEstimate.items.map((item, i) => (
              <li key={rowKey(item, i)}>{item.name} {item.pct}%</li>
            ))}
          </ul>
          <p className="rsx-ai-banner-note">추정은 참고치입니다. 적용 후 슬라이더로 보정하고 저장해야 반영됩니다.</p>
        </div>
      )}

      {entries.map((entry) => (
        <div className="rsx-entry" key={entry.id}>
          <div className="rsx-entry-main">
            <div className="rsx-entry-head">
              <div className="rsx-entry-title">
                <span className="rsx-entry-name">{entry.name}</span>
                {entry.tag && <span className="rsx-tag">{entry.tag}</span>}
              </div>
              <span className="rsx-entry-pct">{entry.value}%</span>
            </div>
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
                  aria-label={`${entry.name} 투입 비율`}
                  onChange={(e) => patch(entry.id, e.target.value)}
                />
                <span className="rsx-slider-ball" style={{ left: `${entry.value}%` }} />
                {entry.estimate != null && (
                  <span className="rsx-slider-marker" style={{ left: `${entry.estimate}%` }}>
                    <b>추정치</b>
                    <i />
                  </span>
                )}
              </div>
              <div className="rsx-entry-input">
                <input
                  type="number"
                  value={entry.value}
                  aria-label={`${entry.name} 투입 비율 입력`}
                  onChange={(e) => patch(entry.id, e.target.value)}
                />
                <span>%</span>
              </div>
            </div>
            {entry.estimate != null && (
              <p className={`rsx-entry-note${entry.warn ? ' is-warn' : ''}`}>
                추정 {entry.estimate}%{entry.warn ? `  •  ${entry.warn}` : ''}
              </p>
            )}
          </div>
          <button type="button" className="rsx-close-btn" onClick={() => remove(entry.id)} aria-label={`${entry.name} 삭제`}>
            <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
          </button>
        </div>
      ))}

      <div className="rsx-total">
        <p className="rsx-total-label">Total</p>
        <p className={`rsx-total-value${total > 100 || data.redFlag ? ' is-bad' : ''}`}>{total}%</p>
        {data.redFlag && (
          <div className="rsx-total-warn">
            <Icon src={icons.alertTriangle} size={12} color="var(--text-error-primary)" baseUrl={baseUrl} />
            <span>{data.redFlag}</span>
          </div>
        )}
      </div>

      <div className="rsx-add">
        <div className="rsx-add-head">
          <span className="rsx-add-title">투입 항목 추가</span>
          <span className="rsx-badge is-brand">확정</span>
        </div>
        <div className="rsx-add-suggest">
          <RsAiLabel>스니핏에 기록됐지만 목록에 없는 프로젝트</RsAiLabel>
          {data.suggestions.filter((s) => !has(s.name)).map((s, i) => (
            <button
              type="button"
              className="rsx-suggest-chip"
              key={rowKey(s, i)}
              onClick={() => addEntry(s.name, { estimate: s.pct })}
            >
              + {s.name} 추정 {s.pct}%
            </button>
          ))}
        </div>
        <div className="rsx-add-group">
          <p className="rsx-add-eyebrow">스쿼드 프로젝트</p>
          <div className="rsx-squads">
            {data.squads
              .map((squad) => ({ ...squad, items: squad.items.filter((item) => !has(item.name)) }))
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
                        onClick={() => addEntry(item.name, { estimate: item.pct, tag: squad.name })}
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
          <p className="rsx-add-eyebrow">개인 OKR</p>
          <button type="button" className="rsx-kr-btn" onClick={() => setKrOpen((v) => !v)}>
            <span>내 KR 불러오기</span>
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
                  {!has(kr.title) && (
                    <button
                      type="button"
                      className="rsx-gray-btn"
                      onClick={() => addEntry(kr.title, { estimate: kr.pct, tag: '개인 OKR' })}
                    >
                      추가
                    </button>
                  )}
                </div>
              ))}
              <p className="rsx-kr-note">KR 정보는 개인 OKR에서 수동으로 불러온 항목입니다 (자동 동기화 없음). 스니핏 추정에는 포함되지 않습니다.</p>
            </div>
          )}
        </div>
        <div className="rsx-add-group">
          <p className="rsx-add-eyebrow">목록에 없는 프로젝트</p>
          <div className="rsx-add-custom">
            <input
              value={customName}
              maxLength={20}
              placeholder="프로젝트 직접 입력 (20자 이내)"
              aria-label="프로젝트 직접 입력"
              onChange={(e) => setCustomName(e.target.value)}
            />
            <button
              type="button"
              className="rsx-gray-btn is-md"
              onClick={() => { addEntry(customName.trim(), {}); setCustomName(''); }}
            >
              직접 추가
            </button>
          </div>
          <p className="rsx-add-note">직접 추가한 프로젝트는 내 입력에만 표시되는 개인 항목이며, 스니핏 기반 추정에는 포함되지 않습니다.</p>
        </div>
      </div>

      <div className="rsx-save-row">
        <button type="button" className="rsx-save-btn" onClick={() => onSave?.(entries)}>저장</button>
      </div>

      <div className="rsx-comments-section">
        <p className="rsx-section-title">매니저 코멘트</p>
        <RsCommentThread comments={comments} />
        {replyOpen ? (
          <div className="rsx-comment-input-row">
            <input
              autoFocus
              placeholder="답글을 입력하세요"
              aria-label="답글 입력"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitReply();
                if (e.key === 'Escape') { setReplyOpen(false); setReplyText(''); }
              }}
            />
            <button type="button" className="rsx-gray-btn is-md" onClick={submitReply}>답글 남기기</button>
          </div>
        ) : (
          <button type="button" className="rsx-reply-btn" onClick={() => setReplyOpen(true)}>
            <Icon src={icons.messageText} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>답글 달기</span>
          </button>
        )}
      </div>
    </div>
  );
}
