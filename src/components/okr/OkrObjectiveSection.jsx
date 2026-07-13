import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrObjectiveSection — 개인 OKR Objective 행 + 펼침 콘텐츠.
 *
 * 모든 행은 공통 4컬럼 그리드를 쓴다: 라벨(206px)·메인(flex)·Weight(105px)·
 * PIC(140px). 하위 행(KR·피드백·코멘트·Initiative)은 블록 자체가 왼쪽으로
 * 32px 들여쓰기되지만 Weight/PIC 컬럼의 화면상 위치는 Objective 행과 같다
 * (컬럼이 오른쪽 끝 기준 고정폭이므로 자동으로 맞는다).
 */
function Pic({ pic }) {
  return (
    <>
      <img src={pic.avatar} alt={pic.name} draggable={false} />
      <span className="okr-p-pic-info">
        <span>{pic.name}</span>
        {pic.team && <span className="okr-p-pic-team">{pic.team}</span>}
      </span>
    </>
  );
}

function ProgressCell({ percent, barVariant, percentLabel, status }) {
  return (
    <div className="okr-p-progress">
      <OkrProgressBar percent={percent} variant={barVariant} width={56} />
      <span className="okr-p-progress-label">{percentLabel}</span>
      {status && <span className={`okr-status-text is-${status.tone}`}>{status.label}</span>}
    </div>
  );
}

export default function OkrObjectiveSection({ objective, icons, baseUrl = '', defaultExpanded = false, onWriteFeedback, onViewFeedback }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openFeedback, setOpenFeedback] = useState({});
  const toggleFeedback = (i) => setOpenFeedback((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="okr-p-objective">
      <div className="okr-p-row okr-p-obj-row" onClick={() => setExpanded((v) => !v)}>
        <div className="okr-p-col-label">
          <span className="okr-p-obj-name">{objective.label}</span>
          <span className={`okr-p-caret${expanded ? ' is-open' : ''}`}>
            <Icon src={icons.chevronDown} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
          </span>
        </div>
        <div className="okr-p-col-main">
          <div className="okr-p-heading">
            <p className="okr-p-obj-title">{objective.title}</p>
            <ProgressCell {...objective} />
          </div>
          {objective.teamLink && <p className="okr-p-obj-link">↑ {objective.teamLink}</p>}
        </div>
        <div className="okr-p-col-weight">{objective.weight}</div>
        <div className="okr-p-col-pic"><Pic pic={objective.pic} /></div>
      </div>

      {expanded && objective.krs?.map((kr, i) => (
        <div className="okr-p-kr-block" key={kr.label}>
          <div className="okr-p-row okr-p-kr-row">
            <div className="okr-p-col-label">
              <span className="okr-p-kr-name">{kr.label}</span>
            </div>
            <div className="okr-p-col-main">
              <div className="okr-p-heading">
                <p className="okr-p-kr-title">{kr.title}</p>
                <ProgressCell {...kr} />
              </div>
              {kr.teamLink && (
                <div className="okr-p-kr-teamlink">
                  <span className="okr-p-kr-teamlink-badge">↑ 팀{kr.teamLink.team}</span>
                  <span className="okr-p-kr-teamlink-title">{kr.teamLink.title}</span>
                  <ProgressCell {...kr.teamLink} />
                </div>
              )}
            </div>
            <div className="okr-p-col-weight is-muted">{kr.weight}</div>
            <div className="okr-p-col-pic"><Pic pic={kr.pic} /></div>
          </div>

          {kr.feedback && (
            <div className="okr-p-feedback">
              <div className="okr-p-row okr-p-feedback-head" onClick={() => toggleFeedback(i)}>
                <div className="okr-p-col-label">
                  <span className="okr-p-feedback-title">피드백</span>
                  <span className={`okr-p-caret${openFeedback[i] ? ' is-open' : ''}`}>
                    <Icon src={icons.chevronDown} size={16} color="var(--utility-green-600)" baseUrl={baseUrl} />
                  </span>
                  {!openFeedback[i] && <span className="okr-p-feedback-summary">{kr.feedback.summary}</span>}
                </div>
                <div className="okr-p-col-main" />
                <div className="okr-p-col-weight" />
                <div className="okr-p-col-pic">
                  <span className="okr-p-chip-btn" onClick={(e) => { e.stopPropagation(); onWriteFeedback && onWriteFeedback(kr); }}>피드백 작성</span>
                </div>
              </div>
              {openFeedback[i] && kr.feedback.comments.map((comment, ci) => (
                <div className="okr-p-row okr-p-comment" key={comment.author + comment.date}>
                  <div className="okr-p-col-label">
                    <img className="okr-p-comment-avatar" src={comment.avatar} alt={comment.author} draggable={false} />
                    <span className="okr-p-comment-name">{comment.author}</span>
                    <span className="okr-p-comment-date">{comment.date}</span>
                  </div>
                  <div className="okr-p-col-main">
                    <p className="okr-p-comment-text">{comment.text}</p>
                  </div>
                  <div className="okr-p-col-weight" />
                  <div className="okr-p-col-pic">
                    {ci === kr.feedback.comments.length - 1 && (
                      <span className="okr-p-chip-btn" onClick={() => onViewFeedback && onViewFeedback(kr)}>전체 보기</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {kr.initiatives?.map((initiative) => (
            <div className="okr-p-row okr-p-initiative" key={initiative.title}>
              <div className="okr-p-col-label">
                <span className="okr-p-initiative-label">Initiative</span>
              </div>
              <div className="okr-p-col-main">
                <span className={`okr-p-initiative-title${initiative.status.tone === 'done' ? ' is-done' : ''}`}>{initiative.title}</span>
              </div>
              <div className="okr-p-col-weight">
                <span className={`okr-pill is-${initiative.status.tone}`}>{initiative.status.label}</span>
              </div>
              <div className="okr-p-col-pic"><Pic pic={initiative.pic} /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
