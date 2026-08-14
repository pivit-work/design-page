import { useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * TeamSnippetFeed — 팀 스니핏 우측 피드 패널 (날짜별/KR별 서브탭).
 * Figma 17026:25297 (날짜별) / 17421:18420 (KR별) / 17421:19479·20057 (필터).
 *
 * byDate: [{ date, items: [{ id?, member, role, avatar, time, submitLabel,
 *   score, tone, text, tags, warning?, kr?: { okr, name, percent, tone } }] }]
 * byKr:   [{ id?, okr, tone, title, percent?, members, avatars, snippets:
 *   [{ id?, member, avatar, date, score, tone, text, flagged? }] }]
 *   `percent` 도 선택 — KR 이 아닌 묶음(예: 'KR 미연결' 버킷)에는 진척률이 없다.
 *
 * `id` 는 선택이지만 **있으면 그것으로 리스트 key 를 잡는다.** 제목은 유일하지 않다 —
 * 다른 OKR 에 같은 이름의 KR 이 있으면(팀마다 같은 KR 을 두는 조직에서 흔하다) key 가
 * 겹쳐, 필터를 바꿔도 이전 목록의 그룹이 그대로 남는다.
 * 필터(memberFilter/redFlagOnly)는 부모가 소유하고 여기서 적용만 한다.
 *
 * `kr` 은 선택이다 — OKR 에 연결하지 않고 쓴 스니핏이 실데이터에는 흔하다.
 * 없으면 '기여 KR' 블록 자체를 그리지 않는다 (0% 막대를 그리면 "진척 0" 으로 읽힌다).
 *
 * onOneOnOne: 카드의 [1on1 제안] 핸들러. 해당 item 을 그대로 돌려준다 — 소비자가
 * 자기 식별자(예: memberId)를 item 에 실어 두고 그것으로 이동한다. 안 넘기면 버튼은
 * 표시만 되고 아무 일도 하지 않는다(데모).
 */
export default function TeamSnippetFeed({ byDate, byKr, memberFilter, redFlagOnly, onClearMember, onClearRedFlag, onOneOnOne, icons, baseUrl = '' }) {
  const [tab, setTab] = useState('date');

  const dateGroups = byDate
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        (!memberFilter || item.member === memberFilter) && (!redFlagOnly || item.warning)),
    }))
    .filter((group) => group.items.length > 0);

  const krGroups = byKr
    .map((group) => ({
      ...group,
      snippets: group.snippets.filter((item) =>
        (!memberFilter || item.member === memberFilter) && (!redFlagOnly || item.flagged)),
    }))
    .filter((group) => group.snippets.length > 0);

  const filterCount = tab === 'date'
    ? dateGroups.reduce((n, g) => n + g.items.length, 0)
    : krGroups.reduce((n, g) => n + g.snippets.length, 0);
  const hasFilter = memberFilter || redFlagOnly;

  return (
    <div className="mgr-ts-feed">
      <div className="mgr-ts-feed-tabs">
        <span className={`mgr-ts-feed-tab${tab === 'date' ? ' is-active' : ''}`} onClick={() => setTab('date')}>날짜별</span>
        <span className={`mgr-ts-feed-tab${tab === 'kr' ? ' is-active' : ''}`} onClick={() => setTab('kr')}>KR별</span>
      </div>

      {hasFilter && (
        <div className="mgr-ts-filterbar">
          <span className="mgr-ts-filterbar-label">필터:</span>
          {memberFilter && (
            <span className="mgr-ts-filter-chip is-member" onClick={onClearMember}>{memberFilter} ×</span>
          )}
          {redFlagOnly && (
            <span className="mgr-ts-filter-chip is-flag" onClick={onClearRedFlag}>레드플래그 ×</span>
          )}
          <span className="mgr-ts-filterbar-count">· {filterCount}건</span>
        </div>
      )}

      {tab === 'date' ? (
        dateGroups.map((group) => (
          <div className="mgr-ts-dategroup" key={group.date}>
            <p className="mgr-ts-date">
              <Icon src={icons.calendarSolid} size={16} color="var(--fg-primary)" baseUrl={baseUrl} />
              <span>{group.date}</span>
            </p>
            {group.items.map((item) => (
              <div className="mgr-ts-card" key={item.id ?? item.member + item.time + item.text}>
                <div className="mgr-ts-card-head">
                  <img src={item.avatar} alt={item.member} draggable={false} />
                  <div className="mgr-ts-card-who">
                    <p className="mgr-ts-card-name">{item.member}</p>
                    <p className="mgr-ts-card-role">{item.role}</p>
                  </div>
                  <div className="mgr-ts-card-when">
                    <p className="mgr-ts-card-time">{item.time}</p>
                    <p className="mgr-ts-card-submit">{item.submitLabel}</p>
                  </div>
                  <span className={`mgr-ts-score is-${item.tone}`}>{item.score}</span>
                </div>
                {item.warning && <div className="mgr-ts-warning">▲ {item.warning}</div>}
                <p className="mgr-ts-card-text">{item.text}</p>
                <div className="mgr-ts-tags">
                  {item.tags.map((tag) => <span key={tag} className="mgr-ts-tag">#{tag}</span>)}
                </div>
                {item.kr && (
                  <div className="mgr-ts-kr">
                    <p className="mgr-ts-kr-label">기여 KR</p>
                    <div className="mgr-ts-kr-row">
                      <span className="mgr-ts-kr-name">{item.kr.name}</span>
                      <span className="mgr-ts-kr-okr">{item.kr.okr} <b>{item.kr.percent}%</b></span>
                    </div>
                    <div className="mgr-ts-kr-track">
                      <div className={`mgr-ts-kr-fill is-${item.kr.tone}`} style={{ width: `${item.kr.percent}%` }} />
                    </div>
                  </div>
                )}
                <button type="button" className="mgr-ts-oneonone" onClick={() => onOneOnOne?.(item)}>1on1 제안</button>
              </div>
            ))}
          </div>
        ))
      ) : (
        krGroups.map((group) => (
          <div className="mgr-ts-krgroup" key={group.id ?? group.title}>
            <div className="mgr-ts-krgroup-hd">
              <p className={`mgr-ts-krgroup-okr is-${group.tone}`}><i /> {group.okr}</p>
              <div className="mgr-ts-krgroup-head">
                <h3 className="mgr-ts-krgroup-title">{group.title}</h3>
                {group.percent != null && (
                  <span className={`mgr-ts-krgroup-percent is-${group.tone}`}>{group.percent}%</span>
                )}
              </div>
              {group.percent != null && (
                <div className="mgr-ts-kr-track">
                  <div className={`mgr-ts-kr-fill is-${group.tone}`} style={{ width: `${group.percent}%` }} />
                </div>
              )}
              <div className="mgr-ts-krgroup-meta">
                <span className="mgr-ts-krgroup-avatars">
                  {group.avatars.map((src, i) => <img key={i} src={src} alt="" draggable={false} />)}
                </span>
                <span className="mgr-ts-krgroup-members">{group.members}</span>
                <span className="mgr-ts-krgroup-count">스니핏 {group.snippets.length}건</span>
              </div>
            </div>
            <div className="mgr-ts-krgroup-list">
              {group.snippets.map((item) => (
                <div className="mgr-ts-krsnippet" key={item.id ?? item.member + item.date + item.text}>
                  {item.flagged && (
                    <Icon src={icons.alertTriangle} size={16} color="var(--utility-error-500)" baseUrl={baseUrl} />
                  )}
                  <img src={item.avatar} alt={item.member} draggable={false} />
                  <div className="mgr-ts-krsnippet-body">
                    <div className="mgr-ts-krsnippet-head">
                      <span className="mgr-ts-krsnippet-name">{item.member}</span>
                      <span className="mgr-ts-krsnippet-date">{item.date}</span>
                      <span className={`mgr-ts-score is-${item.tone}`}>{item.score}</span>
                    </div>
                    <p className="mgr-ts-krsnippet-text">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
