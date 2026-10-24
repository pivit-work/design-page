import React from 'react';

/**
 * 조직도 화면 머리의 탭 줄 — 「조직도 · (프로젝트) · 스쿼드 · (리스트)」.
 *
 * 디자이너가 그린 `.tab-nav` 줄(org_chart.css · 30px 굵게, 고른 탭만 진한 글씨) 그대로다. 캔버스마다 같은
 * 줄을 따로 그려 와서, 탭 하나를 더하려면 네 곳을 고쳐야 했다(pivit-work PW-678 「리스트」 탭) — 한 곳으로 모았다.
 *
 * @param {'orgchart'|'project'|'squad'|'list'} active  지금 고른 탭
 * @param {(tab: string) => void} [onSubTabChange]
 * @param {boolean} [showProjectTab]
 * @param {boolean} [showListTab]  「리스트」 탭(pivit-specs org-chart-public-card-spec.md §3-D) — 호스트가 켠다
 * @param {(key: string) => string} L  조직도 문구
 */
export default function OrgTabNav({ active, onSubTabChange, showProjectTab = false, showListTab = false, L }) {
  const tabs = [
    'orgchart',
    ...(showProjectTab ? ['project'] : []),
    'squad',
    ...(showListTab ? ['list'] : []),
  ];
  return (
    <div className="tab-nav">
      {tabs.map((tab) =>
        tab === active ? (
          <span key={tab} className="tab-active">{L(`tab.${tab}`)}</span>
        ) : (
          <span
            key={tab}
            className="tab-inactive"
            data-testid={`org-tab-${tab}`}
            onClick={() => onSubTabChange && onSubTabChange(tab)}
          >
            {L(`tab.${tab}`)}
          </span>
        ),
      )}
    </div>
  );
}
