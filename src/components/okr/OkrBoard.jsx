import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import OkrAiInsights from './OkrAiInsights.jsx';
import OkrOverallCard from './OkrOverallCard.jsx';
import OkrObjectiveSection from './OkrObjectiveSection.jsx';
import OkrFeedbackComposeModal from './OkrFeedbackComposeModal.jsx';
import OkrKrFeedbackModal from './OkrKrFeedbackModal.jsx';
import OkrKrUpdateModal from './OkrKrUpdateModal.jsx';
import rowKey from './rowKey.js';

/**
 * OkrBoard — AI 인사이트 + 전체달성률 + Objective 테이블 + 피드백/업데이트
 * 모달 배선까지 포함한 공용 OKR 보드. 개인/팀/Company OKR 탭이 공유한다.
 *
 * board: { banner?, insights, overall, theme, objectives }
 *
 * ⚠️ 모달은 반드시 createPortal 로 document.body 에 붙인다. 이 보드를 감싸는
 * 캔버스 루트(.okr-personal-area)가 position:fixed 라 스태킹 컨텍스트를 만들고,
 * 그 안에 렌더된 오버레이는 z-index:1000 이어도 사이드바(100)·헤더(90) 아래에
 * 갇힌다 — 딤이 안 덮이고 클릭까지 통과했다.
 */
export default function OkrBoard({
  board,
  icons,
  baseUrl = '',
  onKrUpdate,
  onSubmitFeedback,
  onSubmitReply,
  onRequestFeedback,
}) {
  const { banner, insights, overall, theme, objectives } = board;
  // 피드백 작성 대상 KR(null=닫힘). 저장 콜백에 krId 를 전달하기 위해 kr 을 보관.
  const [composeKr, setComposeKr] = useState(null);
  // 피드백 요청 대상 KR(null=닫힘) — 요청 저장에 krId 가 필요하다.
  const [requestKr, setRequestKr] = useState(null);
  // 피드백 상세는 스냅샷이 아니라 **열려 있는 KR id** 로 들고, 현재 board 에서
  // 매번 다시 찾는다. 스냅샷으로 들면 답변을 달아 board 를 재조회해도 모달이
  // 옛 코멘트 목록을 계속 보여준다(등록했는데 안 보이는 것처럼 읽힌다).
  const [krDetailId, setKrDetailId] = useState(null);
  const [krUpdate, setKrUpdate] = useState(null);

  const krDetail = useMemo(() => {
    if (!krDetailId) return null;
    for (const objective of objectives) {
      for (const kr of objective.krs ?? []) {
        if (kr.feedbackDetail && kr.krId === krDetailId) return kr.feedbackDetail;
      }
    }
    return null;
  }, [krDetailId, objectives]);

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
            key={rowKey(objective, i, 'label')}
            objective={objective}
            icons={icons}
            baseUrl={baseUrl}
            defaultExpanded={i === 0}
            onWriteFeedback={(kr) => setComposeKr(kr)}
            onViewFeedback={(kr) => kr.feedbackDetail && setKrDetailId(kr.krId)}
            onUpdateKr={(kr) => kr.updateDetail && setKrUpdate({ ...kr.updateDetail, title: kr.title })}
          />
        ))}
      </div>

      {composeKr && createPortal(
        <OkrFeedbackComposeModal
          title="피드백 작성"
          placeholder=""
          submitLabel="완료"
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setComposeKr(null)}
          onSubmit={(text) => {
            const trimmed = text.trim();
            if (trimmed && composeKr.krId) onSubmitFeedback?.(composeKr.krId, trimmed);
          }}
        />,
        document.body,
      )}
      {krDetail && createPortal(
        <OkrKrFeedbackModal
          detail={krDetail}
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setKrDetailId(null)}
          onSubmitReply={onSubmitReply}
          onRequestFeedback={() => setRequestKr(krDetail)}
        />,
        document.body,
      )}
      {krUpdate && createPortal(
        <OkrKrUpdateModal
          detail={krUpdate}
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setKrUpdate(null)}
          onConfirm={(value) => { if (krUpdate.krId) onKrUpdate?.(krUpdate.krId, value); }}
        />,
        document.body,
      )}
      {requestKr && createPortal(
        <OkrFeedbackComposeModal
          title="피드백 요청 작성"
          placeholder="어떤 관점에서 피드백을 원하는지 적어주시면 좋아요 :)"
          submitLabel="보내기"
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setRequestKr(null)}
          onSubmit={(text) => {
            const trimmed = text.trim();
            if (trimmed && requestKr.krId) onRequestFeedback?.(requestKr.krId, trimmed);
          }}
        />,
        document.body,
      )}
    </>
  );
}
