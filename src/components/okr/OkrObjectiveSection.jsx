import { useEffect, useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';
import OkrUnalignedBadge from './OkrUnalignedBadge.jsx';
import rowKey from './rowKey.js';
import scrollToFocus from '../shared/scrollToFocus.js';

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
    <Tooltip content="클릭해 상태 전환">
      <span
        className={cls}
        role="button"
        tabIndex={0}
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
    </Tooltip>
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
  focusKrId = null,
  focusObjectiveId = null,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  // 소비처가 가리킨 KR(또는 목표)이 이 목표 안에 있으면 펼치고 그 줄까지 내린다 (PW-2016).
  // 내리기는 사용자가 이 목표를 직접 여닫기 전까지만 — 접었다 다시 펼칠 때 화면이 튀지 않게.
  // (이펙트 안에서 «했다» 를 적으면 React 개발 모드가 이펙트를 걷었다 다시 돌릴 때 건너뛴다.)
  const focusedKrIndex = focusKrId ? (objective.krs ?? []).findIndex((kr) => kr.krId === focusKrId) : -1;
  const focused = focusedKrIndex >= 0 || Boolean(focusObjectiveId && objective.id === focusObjectiveId);
  const focusKey = focused ? `${focusKrId ?? ''}|${focusObjectiveId ?? ''}` : null;
  const rootRef = useRef(null);
  const focusedKrRef = useRef(null);
  const scrolledFor = useRef(null);
  // 가리킨 값이 새로 오면 렌더 중에 한 번 펼친다 (effect 안 setState 를 피하는 React 권장 모양).
  const [openedFor, setOpenedFor] = useState(null);
  if (focusKey && openedFor !== focusKey) {
    setOpenedFor(focusKey);
    setExpanded(true);
  }
  useEffect(() => {
    if (!focusKey || !expanded || scrolledFor.current === focusKey) return;
    return scrollToFocus(focusedKrRef.current ?? rootRef.current);
  }, [focusKey, expanded]);
  const [openFeedback, setOpenFeedback] = useState({});
  // 배지를 눌러 상태를 넘길 수 있는지. 콜백이 없으면(=배선 안 한 소비처) 권한과
  // 무관하게 읽기 전용이다 — 눌러도 아무 일이 없는 배지를 「눌리는 것처럼」 그리지 않는다.
  const canToggle = Boolean(canEditInitiative && onToggleInitiative);
  // KR 줄을 눌러 달성률 업데이트 창을 열 수 있는지. 소비처가 그 KR 에 updateDetail 을
  // 실어 주지 않았으면(= 고칠 권한이 없다) 손가락 커서도 주지 않는다 — 눌러도 아무 일이
  // 없는 줄을 「눌리는 것처럼」 그리면 사용자는 고장으로 읽는다.
  const canUpdateKr = (kr) => Boolean(onUpdateKr && kr.updateDetail);
  const toggleFeedback = (i) => setOpenFeedback((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="okr-p-objective" ref={rootRef} data-objective-id={objective.id}>
      <div
        className="okr-p-row okr-p-obj-row"
        onClick={() => {
          scrolledFor.current = focusKey;
          setExpanded((v) => !v);
        }}
      >
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
        <div
          className="okr-p-kr-block"
          key={rowKey(kr, i, 'label')}
          data-kr-id={kr.krId}
          ref={i === focusedKrIndex ? focusedKrRef : undefined}
        >
          <div
            className={`okr-p-row okr-p-kr-row${canUpdateKr(kr) ? '' : ' is-static'}`}
            {...(canUpdateKr(kr) ? { onClick: () => onUpdateKr(kr) } : {})}
          >
            <div className="okr-p-col-label">
              <span className="okr-p-kr-name">{kr.label}</span>
            </div>
            <div className="okr-p-col-main">
              <div className="okr-p-heading">
                <p className="okr-p-kr-title">{kr.title}</p>
                <ProgressCell {...kr} />
              </div>
              {/* 상위 KR 연결 — 한 KR 이 상위 KR 여럿에 기여할 수 있어(N:M) 배열도 받는다.
                  `badge` 를 주면 화살표 뒤 글자로 그대로 쓴다(「회사 KR 1-2」처럼 소비자가 번역해 넘긴다). */}
              {(kr.teamLinks ?? (kr.teamLink ? [kr.teamLink] : [])).map((link, n) => (
                <div className="okr-p-kr-teamlink" key={link.id ?? n}>
                  <span className="okr-p-kr-teamlink-badge">↑ {link.badge ?? `팀${link.team}`}</span>
                  <span className="okr-p-kr-teamlink-title">{link.title}</span>
                  <ProgressCell {...link} />
                </div>
              ))}
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
                  {/* canWrite === false 면 칩을 그리지 않는다 — 소비처가 «이 KR 에는 쓰러 갈 곳이 없다»
                      (볼 수 없는 사람의 KR 등)고 판정했을 때. 눌러도 막히는 칩을 두지 않는다 (PW-1600). */}
                  {kr.feedback.canWrite !== false && (
                    <StatusBadge className="okr-p-chip-btn" onClick={(e) => { e.stopPropagation(); onWriteFeedback && onWriteFeedback(kr); }}>피드백 작성</StatusBadge>
                  )}
                </div>
              </div>
              {openFeedback[i] && kr.feedback.comments.map((comment, ci) => (
                <div className="okr-p-row okr-p-comment" key={rowKey(comment, ci, 'author')}>
                  <div className="okr-p-col-label">
                    <img className="okr-p-comment-avatar" src={comment.avatar} alt={comment.author} draggable={false} />
                    <span className="okr-p-comment-name">{comment.author}</span>
                    {/* 쓴 사람의 자리(매니저·동료·본인) — 같은 KR 피드백의 옛 창(OkrKrFeedbackModal)에 그린 배지 그대로.
                        소비처가 라벨을 못 정하면 role 을 비워 배지를 그리지 않는다 (PW-1719). */}
                    {comment.role && (
                      <StatusBadge className={`okr-role-badge is-${comment.roleTone ?? 'gray'}`}>{comment.role}</StatusBadge>
                    )}
                    <span className="okr-p-comment-date">{comment.date}</span>
                  </div>
                  <div className="okr-p-col-main">
                    <p className="okr-p-comment-text">{comment.text}</p>
                  </div>
                  <div className="okr-p-col-weight" />
                  <div className="okr-p-col-pic">
                    {ci === kr.feedback.comments.length - 1 && (
                      <StatusBadge className="okr-p-chip-btn" onClick={() => onViewFeedback && onViewFeedback(kr)}>전체 보기</StatusBadge>
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
