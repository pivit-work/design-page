import { useState } from 'react';
import { createPortal } from 'react-dom';
import OkrAiInsights from './OkrAiInsights.jsx';
import OkrOverallCard from './OkrOverallCard.jsx';
import OkrObjectiveSection from './OkrObjectiveSection.jsx';
import OkrFeedbackComposeModal from './OkrFeedbackComposeModal.jsx';
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
 *
 * 🔴 「전체 보기」 는 이 보드 안에서 모달을 열지 않는다 (PW-144). 피드백 스레드
 * 전체와 「보낸 요청」 의 정본은 수시 피드백 화면이고, OKR 은 그쪽으로 보내기만
 * 한다 — `onViewAllFeedback(kr)` 으로 소비 측에 넘긴다. 같은 정보를 두 화면에 두면
 * 어느 쪽이 정본인지 사용자가 판단해야 하고, 특히 옛 모달 안의 요청 발송 폼은
 * 「이미 스레드가 있는 KR 에 중복 요청 금지」 규칙 바깥에 있어 중복 요청을 실제로
 * 통과시켰다. 옛 패널은 `OkrKrFeedbackModal.jsx` 에 레거시로만 남아 있다.
 */
export default function OkrBoard({
  board,
  icons,
  baseUrl = '',
  onKrUpdate,
  onSubmitFeedback,
  onViewAllFeedback,
  onRefreshInsights,
  onInsightAction,
}) {
  const { banner, insights, overall, theme, objectives } = board;
  // 피드백 작성 대상 KR(null=닫힘). 저장 콜백에 krId 를 전달하기 위해 kr 을 보관.
  const [composeKr, setComposeKr] = useState(null);
  const [krUpdate, setKrUpdate] = useState(null);

  return (
    <>
      <OkrAiInsights
        banner={banner}
        insights={insights}
        icons={icons}
        baseUrl={baseUrl}
        onRefresh={onRefreshInsights}
        onAction={onInsightAction}
      />
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
            onViewFeedback={(kr) => onViewAllFeedback?.(kr)}
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
    </>
  );
}
