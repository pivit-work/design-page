import { useState } from 'react';
import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrObjectiveSection — 개인 OKR Objective 행 + 펼침 콘텐츠.
 *
 * Objective 행 클릭으로 접기/펼치기. 펼치면 Key Result 행(팀 KR 링크 포함),
 * 피드백 행(다시 접기/펼치기 — 펼치면 코멘트 목록), Initiative 행이 보인다.
 * 세 가지 Figma 상태(접힘/KR 펼침/피드백 펼침)를 모두 이 컴포넌트가 담당.
 */
export default function OkrObjectiveSection({ objective, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openFeedback, setOpenFeedback] = useState({});
  const toggleFeedback = (i) => setOpenFeedback((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="okr-p-objective">
      <div className="okr-p-obj-row" onClick={() => setExpanded((v) => !v)}>
        <div className="okr-p-obj-name">
          <span>{objective.label}</span>
          <span className={`okr-p-caret${expanded ? ' is-open' : ''}`}>⌄</span>
        </div>
        <div className="okr-p-obj-main">
          <p className="okr-p-obj-title">{objective.title}</p>
          {objective.teamLink && <p className="okr-p-obj-link">↑ {objective.teamLink}</p>}
        </div>
        <div className="okr-p-progress">
          <OkrProgressBar percent={objective.percent} variant={objective.barVariant} width={56} />
          <span className="okr-p-progress-label">{objective.percentLabel}</span>
          <span className={`okr-status-text is-${objective.status.tone}`}>{objective.status.label}</span>
        </div>
        <div className="okr-p-weight">{objective.weight}</div>
        <div className="okr-p-pic">
          <img src={objective.pic.avatar} alt={objective.pic.name} draggable={false} />
          <span>{objective.pic.name}</span>
        </div>
      </div>

      {expanded && objective.krs?.map((kr, i) => (
        <div className="okr-p-kr-block" key={kr.label}>
          <div className="okr-p-kr-row">
            <div className="okr-p-kr-name">{kr.label}</div>
            <div className="okr-p-kr-main">
              <div className="okr-p-kr-title-row">
                <p className="okr-p-kr-title">{kr.title}</p>
                <div className="okr-p-progress">
                  <OkrProgressBar percent={kr.percent} variant={kr.barVariant} width={56} />
                  <span className="okr-p-progress-label">{kr.percentLabel}</span>
                  <span className={`okr-status-text is-${kr.status.tone}`}>{kr.status.label}</span>
                </div>
              </div>
              {kr.teamLink && (
                <div className="okr-p-kr-teamlink">
                  <span className="okr-p-kr-teamlink-badge">↑ 팀{kr.teamLink.team}</span>
                  <span className="okr-p-kr-teamlink-title">{kr.teamLink.title}</span>
                  <div className="okr-p-progress">
                    <OkrProgressBar percent={kr.teamLink.percent} variant={kr.teamLink.barVariant} width={56} />
                    <span className="okr-p-progress-label">{kr.teamLink.percentLabel}</span>
                    <span className={`okr-status-text is-${kr.teamLink.status.tone}`}>{kr.teamLink.status.label}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="okr-p-weight">{kr.weight}</div>
            <div className="okr-p-pic">
              <img src={kr.pic.avatar} alt={kr.pic.name} draggable={false} />
              <span>{kr.pic.name}</span>
            </div>
          </div>

          {kr.feedback && (
            <div className="okr-p-feedback">
              <div className="okr-p-feedback-head" onClick={() => toggleFeedback(i)}>
                <div className="okr-p-feedback-title">
                  <span>피드백</span>
                  <span className={`okr-p-caret${openFeedback[i] ? ' is-open' : ''}`}>⌄</span>
                  <span className="okr-p-feedback-summary">{kr.feedback.summary}</span>
                </div>
                <span className="okr-p-feedback-write">피드백 작성</span>
              </div>
              {openFeedback[i] && (
                <div className="okr-p-feedback-comments">
                  {kr.feedback.comments.map((comment, ci) => (
                    <div className="okr-p-comment" key={comment.author + comment.date}>
                      <div className="okr-p-comment-author">
                        <img src={comment.avatar} alt={comment.author} draggable={false} />
                        <span className="okr-p-comment-name">{comment.author}</span>
                        <span className="okr-p-comment-date">{comment.date}</span>
                      </div>
                      <p className="okr-p-comment-text">{comment.text}</p>
                      {ci === 0 && <span className="okr-p-comment-all">전체 보기</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {kr.initiatives?.map((initiative) => (
            <div className="okr-p-initiative" key={initiative.title}>
              <span className="okr-p-initiative-label">Initiative</span>
              <span className="okr-p-initiative-title">{initiative.title}</span>
              <span className={`okr-pill is-${initiative.status.tone}`}>{initiative.status.label}</span>
              <div className="okr-p-pic">
                <img src={initiative.pic.avatar} alt={initiative.pic.name} draggable={false} />
                <span>{initiative.pic.name}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
