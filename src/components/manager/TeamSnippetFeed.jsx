import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import Tabs from '../shared/Tabs.jsx';

/**
 * TeamSnippetFeed — 팀 스니핏 우측 피드 패널 (날짜별/KR별 서브탭).
 * Figma 17026:25297 (날짜별) / 17421:18420 (KR별) / 17421:19479·20057 (필터).
 *
 * byDate: [{ date, items: [{ id?, member, role, avatar, time, submitLabel,
 *   score, tone, text, tags, warning?, kr?: { okr, name, percent, tone } }] }]
 * byKr:   [{ id?, okr, tone, title, percent?, members, avatars, snippets:
 *   [{ id?, member, avatar, date, score, tone, text, flagged? }] }]
 *   `percent` 도 선택 — KR 이 아닌 묶음(예: 'KR 미연결' 버킷)에는 진척률이 없다.
 *   `score` 는 `null` 일 수 있다 — 헬스를 고르지 않고 낸 스니핏이다. 그때는 `-` 를 색 없이
 *   그린다(`tone` 도 비운다). 0 으로 그리면 빨간 칩이 붙어 위험한 사람으로 읽힌다 (PW-1213).
 *
 * `id` 는 선택이지만 **있으면 그것으로 리스트 key 를 잡는다.** 제목은 유일하지 않다 —
 * 다른 OKR 에 같은 이름의 KR 이 있으면(팀마다 같은 KR 을 두는 조직에서 흔하다) key 가
 * 겹쳐, 필터를 바꿔도 이전 목록의 그룹이 그대로 남는다.
 * 필터(memberFilter/redFlagOnly)는 부모가 소유하고 여기서 적용만 한다.
 * `memberFilter` 는 팀원 이름 또는 id 다 — 항목의 `memberId` 나 `member` 중 하나가 같으면 남긴다.
 * id 로 거를 때 필터 칩에 id 가 보이지 않게 `memberFilterLabel`(이름)을 함께 준다 (pivit-work PW-1373).
 *
 * `kr` 은 선택이다 — OKR 에 연결하지 않고 쓴 스니핏이 실데이터에는 흔하다.
 * 없으면 '기여 KR' 블록 자체를 그리지 않는다 (0% 막대를 그리면 "진척 0" 으로 읽힌다).
 *
 * onOneOnOne: 카드의 [1on1 제안] 핸들러. 해당 item 을 그대로 돌려준다 — 소비자가
 * 자기 식별자(예: memberId)를 item 에 실어 두고 그것으로 이동한다. 안 넘기면 버튼은
 * 표시만 되고 아무 일도 하지 않는다(데모).
 *
 * onOpenSnippet: 카드(날짜별·KR별 모두)를 누르면 그 item 을 돌려준다 — 소비자가 그 스니핏 전체를
 * 읽기 전용으로 연다(pivit-work PW-1251 · QA TC-MGR-005). 안 넘기면 카드는 눌리지 않는다(종전 그대로).
 * [1on1 제안] 을 눌렀을 때는 부르지 않는다.
 *
 * emptyLabel: 걸러진 결과가 0건일 때 피드 안에 띄우는 문구(매니저 시안 「해당하는 스니핏이
 * 없습니다」). 안 넘기면 아무것도 그리지 않는다 — 조회 실패 중에는 「없다」고 말하면 안 된다.
 */
function ScoreChip({ score, tone }) {
  if (score == null) return <span className="mgr-ts-score">-</span>;
  return <span className={`mgr-ts-score is-${tone}`}>{score}</span>;
}

// 카드 전체를 버튼처럼 — 안에 [1on1 제안] 버튼이 있어 <button> 으로 감쌀 수 없다.
const openProps = (onOpen, item) =>
  onOpen
    ? {
        role: 'button',
        tabIndex: 0,
        'data-clickable': '',
        onClick: () => onOpen(item),
        onKeyDown: (e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(item);
          }
        },
      }
    : {};

const matchesMember = (item, memberFilter) =>
  !memberFilter || item.memberId === memberFilter || item.member === memberFilter;

export default function TeamSnippetFeed({ byDate, byKr, memberFilter, memberFilterLabel, redFlagOnly, onClearMember, onClearRedFlag, onOneOnOne, onOpenSnippet, icons, baseUrl = '', emptyLabel, emptyTestId }) {
  const [tab, setTab] = useState('date');

  const dateGroups = byDate
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        matchesMember(item, memberFilter) && (!redFlagOnly || item.warning)),
    }))
    .filter((group) => group.items.length > 0);

  const krGroups = byKr
    .map((group) => ({
      ...group,
      snippets: group.snippets.filter((item) =>
        matchesMember(item, memberFilter) && (!redFlagOnly || item.flagged)),
    }))
    .filter((group) => group.snippets.length > 0);

  const filterCount = tab === 'date'
    ? dateGroups.reduce((n, g) => n + g.items.length, 0)
    : krGroups.reduce((n, g) => n + g.snippets.length, 0);
  const hasFilter = memberFilter || redFlagOnly;

  return (
    <div className="mgr-ts-feed">
      <div className="tl-tabs-row mgr-ts-feed-tabs-row">
        <Tabs
          items={[
            { value: 'date', label: '날짜별' },
            { value: 'kr', label: 'KR별' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {hasFilter && (
        <div className="mgr-ts-filterbar">
          <span>필터 :</span>
          {memberFilter && (
            <StatusBadge className="mgr-ts-filter-chip is-member" onClick={onClearMember}>{memberFilterLabel ?? memberFilter} ×</StatusBadge>
          )}
          {redFlagOnly && (
            <StatusBadge className="mgr-ts-filter-chip is-flag" onClick={onClearRedFlag}>레드플래그 ×</StatusBadge>
          )}
          <span className="mgr-ts-filterbar-count">{filterCount}건</span>
        </div>
      )}

      {emptyLabel && filterCount === 0 && (
        <p className="mgr-ts-empty" data-testid={emptyTestId}>{emptyLabel}</p>
      )}

      {tab === 'date' ? (
        dateGroups.map((group) => (
          <div className="mgr-ts-dategroup" key={group.date}>
            <p className="mgr-ts-date">
              <Icon src={icons.calendarSolid} size={16} color="var(--fg-primary)" baseUrl={baseUrl} />
              <span>{group.date}</span>
            </p>
            {group.items.map((item) => (
              <div className="mgr-ts-card" key={item.id ?? item.member + item.time + item.text} {...openProps(onOpenSnippet, item)}>
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
                  <ScoreChip score={item.score} tone={item.tone} />
                </div>
                {item.warning && <div className="mgr-ts-warning">⚠ {item.warning}</div>}
                <p className="mgr-ts-card-text">{item.text}</p>
                <div className="mgr-ts-tags">
                  {item.tags.map((tag) => <StatusBadge key={tag} className="mgr-ts-tag">#{tag}</StatusBadge>)}
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
                <button type="button" className="mgr-ts-oneonone" onClick={(e) => { e.stopPropagation(); onOneOnOne?.(item); }}>1on1 제안</button>
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
                <span>스니핏 {group.snippets.length}건</span>
              </div>
            </div>
            <div className="mgr-ts-krgroup-list">
              {group.snippets.map((item) => (
                <div className="mgr-ts-krsnippet" key={item.id ?? item.member + item.date + item.text} {...openProps(onOpenSnippet, item)}>
                  {item.flagged && (
                    <Icon src={icons.alertTriangle} size={16} color="var(--utility-error-500)" baseUrl={baseUrl} />
                  )}
                  <img src={item.avatar} alt={item.member} draggable={false} />
                  <div className="mgr-ts-krsnippet-body">
                    <div className="mgr-ts-krsnippet-head">
                      <span className="mgr-ts-krsnippet-name">{item.member}</span>
                      <span className="mgr-ts-krsnippet-date">{item.date}</span>
                      <ScoreChip score={item.score} tone={item.tone} />
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
