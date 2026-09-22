import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tabs from '../shared/Tabs.jsx';

/**
 * KrContributionDetail — KR 드릴다운 우측 기여 상세 패널.
 * Figma 17026:23299 (스니핏 탭) / 17026:24830 (Jira 탭).
 *
 * member.detail: {
 *   snippets: [{ date, text, tags: [string] }],
 *   actions:  [{ text, due, status: { label, tone } }],
 *   jira:     [{ key, title, status: { label, tone } }],
 * }
 */
const DETAIL_TABS = [
  { key: 'snippets', label: '스니핏' },
  { key: 'actions', label: '액션' },
  { key: 'jira', label: 'Jira' },
];

export default function KrContributionDetail({ member }) {
  const [tab, setTab] = useState('snippets');
  const detail = member.detail ?? {};

  return (
    <div className="mgr-krd-panel">
      <div className="mgr-krd-head">
        <img className="mgr-krd-avatar" src={member.avatar} alt={member.name} draggable={false} />
        <div className="mgr-krd-title-wrap">
          <p className="mgr-krd-title">{member.name}의 기여 상세</p>
          <p className="mgr-krd-role">{member.role}</p>
        </div>
        <span className="mgr-krd-percent">{member.percent}%</span>
      </div>

      <div className="tl-tabs-row mgr-krd-tabs-row">
        <Tabs
          items={DETAIL_TABS.map((t) => ({ value: t.key, label: t.label }))}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'snippets' && (
        <div className="mgr-krd-list">
          {detail.snippets?.map((item) => (
            <div className="mgr-krd-snippet" key={item.date + item.text}>
              <p className="mgr-krd-date">{item.date}</p>
              <p className="mgr-krd-text">{item.text}</p>
              <div className="mgr-krd-tags">
                {item.tags?.map((tag) => <StatusBadge className="mgr-krd-tag" key={tag}>{tag}</StatusBadge>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'actions' && (
        <div className="mgr-krd-list">
          {detail.actions?.map((item) => (
            <div className="mgr-krd-row" key={item.text}>
              <span className="mgr-krd-row-title">{item.text}</span>
              <span className="mgr-krd-due">{item.due}</span>
              <StatusBadge className={`mgr-krd-pill is-${item.status.tone}`}>{item.status.label}</StatusBadge>
            </div>
          ))}
        </div>
      )}

      {tab === 'jira' && (
        <div className="mgr-krd-list">
          {detail.jira?.map((item) => (
            <div className="mgr-krd-row" key={item.key + item.title}>
              <span className="mgr-krd-key">{item.key}</span>
              <span className="mgr-krd-row-title">{item.title}</span>
              <StatusBadge className={`mgr-krd-pill is-${item.status.tone}`}>{item.status.label}</StatusBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
