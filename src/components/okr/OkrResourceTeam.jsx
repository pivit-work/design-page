import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import { RsStatCard, RsStatusBadge, RsStackBar, RsBullets, RsCommentThread } from './OkrResourcePieces.jsx';
import rowKey from './rowKey.js';

/**
 * OkrResourceTeam — 내 리소스 '팀 현황' 뷰 (직속 팀원).
 * Figma 17478:22890 (접힘) / 23383 (코멘트 패널 펼침) / 24312 (복수 펼침).
 *
 * 스탯 4(팀원 총원/여유/몰입/과부하) → 팀원 카드: 아바타·이름·직함·상태 배지·
 * 투입% + 스택 바 + 색상 불릿 + 우측 '항목 n/코멘트 n' 메타와 펼침 화살표
 * (닫힘 ▼ / 펼침 ▲ — Figma 23487 rotate-180 은 펼친 상태). 펼치면 매니저 코멘트
 * 스레드 + 입력줄. [코멘트 남기기] 는 로컬로 스레드에 즉시 달리고(작성자 =
 * data.commentAuthor), onComment(member, text) 로 호스트에도 알린다.
 */
export default function OkrResourceTeam({ data, icons, baseUrl = '', onComment }) {
  const [openIds, setOpenIds] = useState({});
  const [drafts, setDrafts] = useState({});
  const [added, setAdded] = useState({});
  const toggle = (id) => setOpenIds((p) => ({ ...p, [id]: !p[id] }));

  // 펼침·초안·추가 코멘트는 모두 rowKey 로 담는다. 이름으로 담으면 동명이인 둘이
  // 한 칸을 나눠 써서, 한 명을 펼치면 둘 다 펼쳐지고 초안·코멘트가 섞인다 (PW-308).
  const commentsOf = (member, i) => [...member.comments, ...(added[rowKey(member, i)] ?? [])];
  const submit = (member, i) => {
    const rk = rowKey(member, i);
    const text = (drafts[rk] ?? '').trim();
    if (!text) return;
    const comment = {
      author: data.commentAuthor?.name ?? '나',
      avatar: data.commentAuthor?.avatar,
      date: data.commentDate ?? '',
      text,
    };
    setAdded((p) => ({ ...p, [rk]: [...(p[rk] ?? []), comment] }));
    setDrafts((p) => ({ ...p, [rk]: '' }));
    onComment?.(member, text);
  };

  return (
    <div className="rsx-team">
      <p className="rsx-scope-label">{data.label}</p>
      <div className="rsx-stats">
        <RsStatCard label="팀원 총원" value={data.stats.total} tone="brand" />
        <RsStatCard label="여유" value={data.stats.relaxed} />
        <RsStatCard label="몰입" value={data.stats.focused} />
        <RsStatCard label="과부하" value={data.stats.overloaded} tone={data.stats.overloaded > 0 ? 'bad' : ''} />
      </div>

      {data.members.map((member, i) => {
        const rk = rowKey(member, i);
        return (
        <div className="rsx-member-group" key={rk}>
          <div className="rsx-member">
            <div className="rsx-member-main">
              <div className="rsx-member-head">
                <div className="rsx-member-who">
                  <img className="rsx-avatar" src={member.avatar} alt={member.name} draggable={false} />
                  <span className="rsx-member-name">{member.name}</span>
                  <span className="rsx-member-role">{member.role}</span>
                  <RsStatusBadge status={member.status} />
                </div>
                <span className="rsx-member-pct">{member.pct}%</span>
              </div>
              <div className="rsx-member-bar-row">
                <RsStackBar segments={member.segments} />
                <div className="rsx-member-meta">
                  <p>항목 {member.items.length}</p>
                  <p>코멘트 {commentsOf(member, i).length}</p>
                </div>
              </div>
              <RsBullets items={member.items} />
            </div>
            <button
              type="button"
              className={`rsx-caret-btn${openIds[rk] ? ' is-open' : ''}`}
              onClick={() => toggle(rk)}
              aria-label={`${member.name} 코멘트 ${openIds[rk] ? '접기' : '펼치기'}`}
            >
              <Icon src={icons.chevronDown} size={24} color="var(--text-tertiary)" baseUrl={baseUrl} />
            </button>
          </div>
          {openIds[rk] && (
            <div className="rsx-member-panel">
              <p className="rsx-section-title">매니저 코멘트</p>
              <RsCommentThread comments={commentsOf(member, i)} />
              <div className="rsx-comment-input-row">
                <input
                  placeholder={data.commentPlaceholder}
                  aria-label={`${member.name} 코멘트 입력`}
                  value={drafts[rk] ?? ''}
                  onChange={(e) => setDrafts((p) => ({ ...p, [rk]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit(member, i); }}
                />
                <button type="button" className="rsx-gray-btn is-md" onClick={() => submit(member, i)}>코멘트 남기기</button>
              </div>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
