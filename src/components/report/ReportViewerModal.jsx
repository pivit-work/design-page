import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import TimelineWeeklyView from '../timeline/TimelineWeeklyView.jsx';

/**
 * ReportViewerModal — 생성된 리포트/생성 중 상태를 보여주는 풀 모달.
 * Figma 17250:19627.
 *
 * 리스트 위에 오버레이로 뜨며, 좌상단에 자동 생성 시각, 우상단 X.
 * 본문은 TimelineWeeklyView 재사용 (isGenerating 이면 로딩 상태).
 * ESC/오버레이/X 로 닫는다.
 */
export default function ReportViewerModal({ report, generatedAt, isGenerating = false, baseUrl = '', onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // main(.tl-page) 내부는 자체 stacking context 라 사이드바(z-index 100)를
  // 이기지 못한다 — body 로 포탈시켜 최상위에 띄운다.
  return createPortal(
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        {generatedAt && <span className="report-modal-generated">{generatedAt}</span>}
        <button className="report-modal-close" onClick={onClose}>
          <Icon src="/icons-solid/x-close.svg" size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="report-modal-body">
          <TimelineWeeklyView
            baseUrl={baseUrl}
            report={report}
            isGenerating={isGenerating}
            showInfoBanner={false}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
