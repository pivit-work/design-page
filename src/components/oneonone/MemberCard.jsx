import ProgressBar from './ProgressBar.jsx';
import StatusBadge from './StatusBadge.jsx';
import Tag from './Tag.jsx';
import { PROGRESS_COLORS } from './constants.js';

/**
 * Full 1on1 dashboard member card.
 *
 * The `member` object is normalized data prepared by the host app.
 * All color decisions are pre-computed by the caller via `okrColor`,
 * `healthCheck.color`, `readyColor`, and `actionItems.color`.
 *
 * @param {object} props
 * @param {Member} props.member
 * @param {React.ComponentType} props.Icon - Icon component supplied by the host app
 * @param {() => void} [props.onClick] - click handler on the card
 * @param {(member) => React.ReactNode} [props.renderAvatar] - custom avatar renderer;
 *   defaults to <img src={member.avatar}> which is only safe for direct URLs.
 * @param {object} [props.labels] - localized section/date labels
 *
 * @typedef {object} Member
 * @property {string|number} id
 * @property {string} name
 * @property {string} role
 * @property {string} [avatar]
 * @property {'preparing'|'meeting'|'done'|'hcWarning'|'unbooked'} status
 * @property {string} statusLabel
 * @property {boolean} [active]
 * @property {Array<{type:'positive'|'warning',icon?:string,text:string}>} [tags]
 * @property {number} [okr]
 * @property {keyof PROGRESS_COLORS} [okrColor]
 * @property {{score:number,label:string,color:keyof PROGRESS_COLORS}} [healthCheck]
 * @property {number|null} [memberReady]
 * @property {number|null} [managerReady]
 * @property {keyof PROGRESS_COLORS|null} [readyColor]
 * @property {{done:number,total:number,percent:number,color:keyof PROGRESS_COLORS}|null} [actionItems]
 * @property {string} [prevDate]
 * @property {string} [nextDate]
 */
export default function MemberCard({
  member,
  Icon,
  onClick,
  renderAvatar,
  labels = DEFAULT_LABELS,
}) {
  const clickable = typeof onClick === 'function';
  const avatar = renderAvatar
    ? renderAvatar(member)
    : member.avatar
      ? <img src={member.avatar} alt="" className="avatar" />
      : null;

  const handleKeyDown = clickable
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      className={`member-card${member.active ? ' member-card-active' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <StatusBadge status={member.status} label={member.statusLabel} Icon={Icon} />

      <div className="card-header">
        {avatar}
        <div className="card-name-wrap">
          <h3 className="card-name">{member.name}</h3>
          <p className="card-role">{member.role}</p>
        </div>
      </div>

      {member.tags && member.tags.length > 0 && (
        <div className="card-tags">
          {member.tags.map((tag, i) => (
            <Tag
              key={i}
              type={tag.type}
              text={tag.text}
              icon={tag.icon}
              Icon={Icon}
            />
          ))}
        </div>
      )}

      <div className="card-sections">
        {typeof member.okr === 'number' && (
          <div className="card-section">
            <div className="section-row">
              <span className="section-label">{labels.okr}</span>
              <span
                className="section-value"
                style={{ color: PROGRESS_COLORS[member.okrColor]?.text }}
              >
                {member.okr}%
              </span>
            </div>
            <ProgressBar percent={member.okr} color={member.okrColor} />
          </div>
        )}

        {member.healthCheck && (
          <div className="card-section">
            <div className="section-row">
              <span className="section-label">{labels.healthCheck}</span>
              <span
                className="section-value-label"
                style={{ color: PROGRESS_COLORS[member.healthCheck.color]?.text }}
              >
                {member.healthCheck.label} {member.healthCheck.score.toFixed(1)}
              </span>
            </div>
            <ProgressBar
              percent={member.healthCheck.score * 10}
              color={member.healthCheck.color}
            />
          </div>
        )}

        {member.memberReady != null && member.managerReady != null && (
          <div className="card-section readiness-section">
            <div className="readiness-col">
              <div className="section-row">
                <span className="section-label">{labels.memberReady}</span>
                <span
                  className="section-value"
                  style={{ color: PROGRESS_COLORS[member.readyColor]?.text }}
                >
                  {member.memberReady}%
                </span>
              </div>
              <ProgressBar percent={member.memberReady} color={member.readyColor} />
            </div>
            <div className="readiness-col">
              <div className="section-row">
                <span className="section-label">{labels.managerReady}</span>
                <span
                  className="section-value"
                  style={{ color: PROGRESS_COLORS[member.readyColor]?.text }}
                >
                  {member.managerReady}%
                </span>
              </div>
              <ProgressBar percent={member.managerReady} color={member.readyColor} />
            </div>
          </div>
        )}

        {member.actionItems && (
          <div className="card-section">
            <div className="section-row">
              <span className="section-label">{labels.actionItems}</span>
              <span
                className="section-value"
                style={{ color: PROGRESS_COLORS[member.actionItems.color]?.text }}
              >
                {member.actionItems.done}/{member.actionItems.total} · {member.actionItems.percent}%
              </span>
            </div>
            <ProgressBar
              percent={member.actionItems.percent}
              color={member.actionItems.color}
            />
          </div>
        )}
      </div>

      {(member.prevDate || member.nextDate) && (
        <div className="card-dates">
          <div className="date-item">
            <span className="date-label">{labels.prevDate}</span>
            <span className="date-value prev">{member.prevDate || '-'}</span>
          </div>
          <div className="date-item">
            <span className="date-label">{labels.nextDate}</span>
            <span className="date-value next">{member.nextDate || '-'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_LABELS = {
  okr: 'OKR 달성률',
  healthCheck: 'Health Check',
  memberReady: '멤버 준비도',
  managerReady: '매니저 준비도',
  actionItems: '이전 액션 아이템',
  prevDate: '이전',
  nextDate: '다음',
};
