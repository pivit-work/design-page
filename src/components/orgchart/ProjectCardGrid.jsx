import Icon from '../shared/Icon.jsx';
import { PROJECT_STATUSES } from './project-constants.js';

function ProjectCard({ project }) {
  const status = PROJECT_STATUSES[project.status];
  const barColor = project.status === 'completed' ? 'var(--utility-green-100)' : 'var(--utility-blue-100)';
  const progressValueColor = project.status === 'completed' ? 'var(--utility-green-600)' : null;

  return (
    <div className="pj-card">
      <div className="pj-card-status" style={{ color: status.textColor }}>
        {status.icon ? (
          <Icon src={status.icon} size={12} color="currentColor" />
        ) : (
          <span className="pj-status-dot" style={{ background: status.dotColor }} />
        )}
        <span>{status.label}</span>
      </div>
      <div className="pj-card-info">
        <p className="pj-card-name">{project.name}</p>
        <p className="pj-card-desc">{project.description}</p>
      </div>
      <div className="pj-card-progress">
        <div className="pj-progress-label">
          <span className="pj-progress-text">진행률</span>
          <span className="pj-progress-value" style={progressValueColor ? { color: progressValueColor } : undefined}>{project.progress}%</span>
        </div>
        <div className="pj-progress-bar">
          <div className="pj-progress-fill" style={{ width: `${project.progress}%`, background: barColor }} />
        </div>
      </div>
      <div className="pj-card-members">
        <div className="pj-avatar-group">
          {project.avatars.slice(0, 7).map((url, i) => (
            <img key={i} src={url} alt="" className="pj-avatar-sm" />
          ))}
          {project.memberCount > 7 && (
            <span className="pj-avatar-sm pj-avatar-more">+{project.memberCount - 7}</span>
          )}
        </div>
        <span className="pj-member-count">{project.memberCount}명</span>
      </div>
    </div>
  );
}

export default function ProjectCardGrid({ projects }) {
  return (
    <div className="pj-cards-grid">
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} />
      ))}
    </div>
  );
}
