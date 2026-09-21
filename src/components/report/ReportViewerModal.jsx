import ModalShell from '../shared/ModalShell.jsx';
import TimelineWeeklyView from '../timeline/TimelineWeeklyView.jsx';

/**
 * ReportViewerModal — 생성된 리포트/생성 중 상태를 보여주는 풀 모달.
 * Figma 17250:19627.
 *
 * 리스트 위에 오버레이로 뜨며, 좌상단에 자동 생성 시각, 우상단 X.
 * 본문은 TimelineWeeklyView 재사용 (isGenerating 이면 로딩 상태).
 *
 * 껍데기는 공용 창 틀(ModalShell · PW-836) — body 포털·ESC·막 클릭·닫기 X 를 틀이 갖는다.
 * 이 창은 제목이 없어 틀을 제목 줄 없이(title·description 미전달) 쓰고, 창 이름은 ariaLabel 로
 * 준다. 창 크기(화면 가득)는 변형 클래스 `.report-shell` 로 준다(report.css).
 *
 * Props:
 *   closeLabel  닫기 X 의 aria-label (소비처가 i18n 문구를 넘긴다)
 *   ariaLabel   창 이름 (제목 줄이 없어 화면 읽기 프로그램이 읽을 이름. ReportCanvas 는 리포트 기간을 넘긴다)
 */
export default function ReportViewerModal({
  report,
  generatedAt,
  isGenerating = false,
  baseUrl = '',
  closeLabel,
  ariaLabel,
  onClose,
}) {
  return (
    <ModalShell
      ariaLabel={ariaLabel}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={null}
      zIndex={1000}
      className="report-shell"
      bodyClassName="report-modal-body"
    >
      {generatedAt && <span className="report-modal-generated">{generatedAt}</span>}
      <TimelineWeeklyView
        baseUrl={baseUrl}
        report={report}
        isGenerating={isGenerating}
        showInfoBanner={false}
      />
    </ModalShell>
  );
}
