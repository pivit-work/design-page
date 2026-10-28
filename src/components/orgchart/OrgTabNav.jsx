import React from 'react';

/**
 * 조직도 화면 머리의 탭 줄 — 「조직도 · (프로젝트) · 스쿼드」 (Figma 17788:33051 · 2026-10-28).
 *
 * 디자이너가 그린 `.tab-nav` 줄(org_chart.css · 30px 굵게, 고른 탭만 진한 글씨) 그대로다. 캔버스마다 같은
 * 줄을 따로 그려 와서, 탭 하나를 더하려면 네 곳을 고쳐야 했다 — 한 곳으로 모았다.
 *
 * 「리스트」는 탭에서 빠졌다 — 조직도 탭 안의 보기(트리 ↔ 리스트 세그먼트, `OrgChartCanvas` `view`)가 됐다.
 * 옛 호스트가 넘기던 `showListTab` 은 받아도 아무 일도 하지 않는다.
 *
 * @param {'orgchart'|'project'|'squad'} active  지금 고른 탭
 * @param {(tab: string) => void} [onSubTabChange]
 * @param {boolean} [showProjectTab]
 * @param {(key: string) => string} L  조직도 문구
 */
export default function OrgTabNav({ active, onSubTabChange, showProjectTab = false, L }) {
  // 순서는 시안 — 조직도 · 스쿼드. 프로젝트는 호스트가 켤 때만 그 사이에.
  const tabs = [
    'orgchart',
    ...(showProjectTab ? ['project'] : []),
    'squad',
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
