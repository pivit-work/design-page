import { useState } from 'react';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrAiInsights from './OkrAiInsights.jsx';
import OkrOverallCard from './OkrOverallCard.jsx';
import OkrObjectiveSection from './OkrObjectiveSection.jsx';
import OkrFeedbackComposeModal from './OkrFeedbackComposeModal.jsx';
import OkrKrFeedbackModal from './OkrKrFeedbackModal.jsx';
import OkrKrUpdateModal from './OkrKrUpdateModal.jsx';

/**
 * OkrPersonalCanvas — 개인 OKR 탭 콘텐츠 (스크롤 페이지).
 *
 * data: { person, periodLabel, links, parents, insights, overall, theme,
 *   objectives } — 데모 데이터는 wrapper(OkrPage)가 소유한다.
 * 피드백 모달 3종(작성/전체보기/요청 작성)의 열림 상태는 UI 상태이므로
 * 여기서 관리한다: '피드백 작성' 칩 → 작성 모달, '전체 보기' 칩 →
 * KR 피드백 모달 → '피드백 요청 보내기' → 요청 작성 모달.
 */
export default function OkrPersonalCanvas({ data, icons, baseUrl = '' }) {
  const { person, periodLabel, links, parents, insights, overall, theme, objectives } = data;
  const [composeOpen, setComposeOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [krDetail, setKrDetail] = useState(null);
  const [krUpdate, setKrUpdate] = useState(null);

  return (
    <div className="okr-personal-area">
      <div className="okr-p-profile">
        <img className="okr-p-avatar" src={person.avatar} alt={person.name} draggable={false} />
        <div>
          <p className="okr-p-name">{person.name}</p>
          <p className="okr-p-role">{person.role}</p>
        </div>
      </div>

      <div className="okr-p-period">
        <button className="okr-p-period-btn is-active">{periodLabel}</button>
        <button className="okr-p-period-btn">히스토리</button>
      </div>

      <OkrLinkedParents links={links} parents={parents} />
      <OkrAiInsights insights={insights} icons={icons} baseUrl={baseUrl} />
      <OkrOverallCard percent={overall.percent} status={overall.status} />

      <div className="okr-p-table-head">
        <span className="okr-p-theme">{theme}</span>
        <span className="okr-p-table-col okr-p-weight-head">Weight</span>
        <span className="okr-p-table-col okr-p-pic-head">PIC</span>
      </div>

      <div className="okr-p-objectives">
        {objectives.map((objective, i) => (
          <OkrObjectiveSection
            key={objective.label}
            objective={objective}
            icons={icons}
            baseUrl={baseUrl}
            defaultExpanded={i === 0}
            onWriteFeedback={() => setComposeOpen(true)}
            onViewFeedback={(kr) => kr.feedbackDetail && setKrDetail(kr.feedbackDetail)}
            onUpdateKr={(kr) => kr.updateDetail && setKrUpdate({ ...kr.updateDetail, title: kr.title })}
          />
        ))}
      </div>

      {composeOpen && (
        <OkrFeedbackComposeModal
          title="피드백 작성"
          placeholder=""
          submitLabel="완료"
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setComposeOpen(false)}
        />
      )}
      {krDetail && (
        <OkrKrFeedbackModal
          detail={krDetail}
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setKrDetail(null)}
          onRequestFeedback={() => setRequestOpen(true)}
        />
      )}
      {krUpdate && (
        <OkrKrUpdateModal
          detail={krUpdate}
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setKrUpdate(null)}
        />
      )}
      {requestOpen && (
        <OkrFeedbackComposeModal
          title="피드백 요청 작성"
          placeholder="어떤 관점에서 피드백을 원하는지 적어주시면 좋아요 :)"
          submitLabel="보내기"
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setRequestOpen(false)}
        />
      )}
    </div>
  );
}
