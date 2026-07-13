import { useState } from 'react';
import OkrAiInsights from './OkrAiInsights.jsx';
import OkrOverallCard from './OkrOverallCard.jsx';
import OkrObjectiveSection from './OkrObjectiveSection.jsx';
import OkrFeedbackComposeModal from './OkrFeedbackComposeModal.jsx';
import OkrKrFeedbackModal from './OkrKrFeedbackModal.jsx';
import OkrKrUpdateModal from './OkrKrUpdateModal.jsx';

/**
 * OkrBoard — AI 인사이트 + 전체달성률 + Objective 테이블 + 피드백/업데이트
 * 모달 배선까지 포함한 공용 OKR 보드. 개인/팀/Company OKR 탭이 공유한다.
 *
 * board: { banner?, insights, overall, theme, objectives }
 */
export default function OkrBoard({ board, icons, baseUrl = '' }) {
  const { banner, insights, overall, theme, objectives } = board;
  const [composeOpen, setComposeOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [krDetail, setKrDetail] = useState(null);
  const [krUpdate, setKrUpdate] = useState(null);

  return (
    <>
      <OkrAiInsights banner={banner} insights={insights} icons={icons} baseUrl={baseUrl} />
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
    </>
  );
}
