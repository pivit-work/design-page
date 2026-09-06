import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';
import OkrUnalignedBadge from './OkrUnalignedBadge.jsx';
import rowKey from './rowKey.js';

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

/**
 * 실행 항목(Initiative) 상태 배지.
 *
 * 작성 권한자에게는 **누르는 배지**다 — `todo → in_progress → done`, `done` 에서
 * 누르면 `in_progress` 로 한 단계만 되돌아간다(전이 규칙 자체는 소비 측이 갖는다.
 * 여기서는 「눌렸다」만 알린다).
 *
 * 🔴 권한이 없을 때 **흐리게 하거나 비활성으로 그리지 않는다** (okr-policy §2F.5 G3).
 * 라벨·색·`opacity` 를 권한자와 똑같이 두고 클릭만 받지 않는다 — 흐린 배지는
 * 「눌리는데 안 되는 화면」으로 읽혀 고장으로 보인다. 상태 표시는 열람이 막히지
 * 않아야 하므로 숨기지도 않는다(G2 읽기 전용 배지 · G4 열람 보장).
 */
function InitiativePill({ initiative, canEdit, onToggle }) {
  const cls = `okr-pill is-${initiative.status.tone}${canEdit ? ' is-toggleable' : ''}`;
  if (!canEdit) return <span className={cls}>{initiative.status.label}</span>;
  return (
    <span
      className={cls}
      role="button"
      tabIndex={0}
      title="클릭해 상태 전환"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      {initiative.status.label}
    </span>
  );
}

export default function OkrObjectiveSection({
  objective,
  icons,
  baseUrl = '',
  defaultExpanded = false,
  onWriteFeedback,
  onViewFeedback,
  onUpdateKr,
  onToggleInitiative,
  canEditInitiative = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [openFeedback, setOpenFeedback] = useState({});
  // 배지를 눌러 상태를 넘길 수 있는지. 콜백이 없으면(=배선 안 한 소비처) 권한과
  // 무관하게 읽기 전용이다 — 눌러도 아무 일이 없는 배지를 「눌리는 것처럼」 그리지 않는다.
  const canToggle = Boolean(canEditInitiative && onToggleInitiative);
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
          {/* 미정렬 배지 — 하위 KR 이 상위 KR 을 하나도 가리키지 않을 때만.
              판정은 소비자(어댑터)가 이미 끝낸 뒤 boolean 으로 넘긴다: 이 컴포넌트는
              표시용 라벨을 판정에 섞을 수 없어야 한다. 기본값 false 라 기존 소비처는 그대로다. */}
          {objective.unaligned && (
            <OkrUnalignedBadge note="회사 OKR 미연결" title="상위 KR 에 연결된 하위 KR 이 없습니다" />
          )}
        </div>
        <div className="okr-p-col-weight">{objective.weight}</div>
        <div className="okr-p-col-pic"><Pic pic={objective.pic} /></div>
      </div>

      {expanded && objective.krs?.map((kr, i) => (
        <div className="okr-p-kr-block" key={rowKey(kr, i, 'label')}>
          <div className="okr-p-row okr-p-kr-row" onClick={() => onUpdateKr && onUpdateKr(kr)}>
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
                <div className="okr-p-row okr-p-comment" key={rowKey(comment, ci, 'author')}>
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

          {kr.initiatives?.map((initiative, ii) => (
            <div className="okr-p-row okr-p-initiative" key={rowKey(initiative, ii, 'title')}>
              <div className="okr-p-col-label">
                <span className="okr-p-initiative-label">Initiative</span>
              </div>
              <div className="okr-p-col-main">
                <span className={`okr-p-initiative-title${initiative.status.tone === 'done' ? ' is-done' : ''}`}>{initiative.title}</span>
              </div>
              <div className="okr-p-col-weight">
                <InitiativePill
                  initiative={initiative}
                  canEdit={canToggle}
                  onToggle={() => onToggleInitiative(kr, initiative)}
                />
              </div>
              <div className="okr-p-col-pic"><Pic pic={initiative.pic} /></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
