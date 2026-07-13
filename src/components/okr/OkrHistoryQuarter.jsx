import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrHistoryQuarter — 개인 OKR 히스토리의 분기 블록 (접기/펼치기).
 *
 * quarter: { label('2025 Q2'), title, percent, barVariant, status?,
 *   objectives: [{ id, weight, title, percent, tone }],
 *   krGroups: [{ id, title, krs: [{ id, title, weight, status }] }] }
 */
export default function OkrHistoryQuarter({ quarter, icons, baseUrl = '', defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="okr-h-quarter">
      <div className="okr-h-head" onClick={() => setExpanded((v) => !v)}>
        <div className="okr-h-head-left">
          <span className="okr-h-label">{quarter.label}</span>
          <span className={`okr-p-caret${expanded ? ' is-open' : ''}`}>
            <Icon src={icons.chevronDown} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
          </span>
          <span className="okr-h-title">{quarter.title}</span>
        </div>
        <div className="okr-p-progress">
          <OkrProgressBar percent={quarter.percent} variant={quarter.barVariant} width={56} />
          <span className="okr-p-progress-label">{quarter.percent}%</span>
          {quarter.status && <span className={`okr-status-text is-${quarter.status.tone}`}>{quarter.status.label}</span>}
        </div>
      </div>

      {expanded && (
        <div className="okr-h-body">
          <div className="okr-h-obj-cards">
            {quarter.objectives.map((objective) => (
              <div className="okr-h-obj-card" key={objective.id}>
                <div className="okr-h-obj-meta">
                  <span>{objective.id}</span>
                  <span>{objective.weight}</span>
                </div>
                <p className="okr-h-obj-title">{objective.title}</p>
                <p className={`okr-h-obj-percent is-${objective.tone}`}>{objective.percent}%</p>
                <OkrProgressBar percent={objective.percent} variant={objective.tone} />
              </div>
            ))}
          </div>

          {quarter.krGroups.map((group) => (
            <div className="okr-h-group" key={group.id}>
              <div className="okr-h-group-head">
                <span className="okr-h-group-id">{group.id}</span>
                <span className="okr-h-group-title">{group.title}</span>
              </div>
              {group.krs.map((kr) => (
                <div className="okr-h-kr" key={kr.id}>
                  <span className="okr-h-kr-id">{kr.id}</span>
                  <span className="okr-h-kr-title">{kr.title}</span>
                  <span className="okr-h-kr-weight">{kr.weight}</span>
                  <span className="okr-pill is-done">{kr.status}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
