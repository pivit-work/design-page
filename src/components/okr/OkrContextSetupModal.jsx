import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import OkrContextAnalysisResult from './OkrContextAnalysisResult.jsx';

/**
 * OkrContextSetupModal — OKR 컨텍스트 설정 모달 (관리자 전용).
 * Figma 17332:22101. OKR 설정 마법사와 같은 800×1118 크기 — 껍데기는 공용 창 틀(ModalShell ·
 * PW-836)에 `okr-wz-modal` 크기 변형을 얹는다. 제목 줄(배지·「선택사항」)은 틀의 제목 칸 안에 둔다.
 *
 * 구성: 타이틀 + [관리자 전용] 배지 + '선택사항' → 안내 2줄 → 지식 소스 업로드
 * 드롭존 → AI 분석(키워드·전략 테마 추출) 섹션 → 푸터 [OKR설정 시작].
 *
 * 콜백은 전부 선택 주입:
 *  - onAddFiles(File[]) — 드롭존 클릭/드래그앤드롭. 미주입이면 표시 전용(데모).
 *  - onAnalyze() — [AI 분석]. 미주입이면 눌러도 아무 일 없음.
 *  - onConfirmAnalysis() — 결과 카드의 [확인 — OKR 마법사에서 사용] (pivit-work PW-1363).
 *
 * AI 분석 상태(선택 · PW-1363 — 정책 §3-3). 결과는 컨텍스트 설정 화면과 같은 카드
 * (OkrContextAnalysisResult)로 시안의 빈 결과 칸 자리에 그린다. 아무것도 안 주면 시안 그대로 빈 칸.
 *  - analysis — { summary, themes, keywords, status, sourceCount } | null
 *  - analyzing / analyzeFailed / confirmingAnalysis
 *  - analyzeDisabledReason — 주면 [AI 분석]을 끄고 이 문구를 툴팁(title)으로 단다(다 읽은 소스 0건 등).
 *  - analysisNotice — 분석 칸 위에 그릴 호스트 노드(체험 AI 소진 안내 등).
 *  - analysisLabels — 분석 칸 문구 { run, rerun, running, failed, retry, result: {...} }.
 *  - onStartOkr() — 푸터 CTA. 미주입이면 버튼 비활성(시안의 disabled 상태).
 *
 * 문구 주입(선택):
 *  - dropzoneHint — 드롭존 형식 안내. 호스트가 서버가 실제로 받는 형식을 알려 줄 때 쓴다
 *    (pivit-work PW-1223 — 서버가 글자를 뽑을 수 있는 형식만 받게 됐다). 미주입이면 시안 문구.
 *
 * 업로드/외부링크 아이콘은 공용 에셋에 없어 인라인 SVG 로 그린다
 * (OkrContextSetupCanvas 와 동일 규약).
 */
const ANALYSIS_LABELS = {
  run: 'AI 분석',
  rerun: '다시 분석',
  running: '소스를 분석하고 있습니다… (평균 30초)',
  failed: 'AI 분석에 실패했습니다. 컨텍스트 없이도 OKR 설정은 진행할 수 있습니다.',
  retry: '다시 시도',
};

export default function OkrContextSetupModal({
  onClose,
  onAddFiles,
  onAnalyze,
  onStartOkr,
  dropzoneHint,
  analysis = null,
  analyzing = false,
  analyzeFailed = false,
  onConfirmAnalysis,
  confirmingAnalysis = false,
  analyzeDisabledReason,
  analysisNotice = null,
  analysisLabels,
}) {
  const AL = { ...ANALYSIS_LABELS, ...(analysisLabels || {}) };
  const analyzeDisabled = analyzing || !!analyzeDisabledReason;
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (list) => {
    const files = [...(list ?? [])];
    if (files.length) onAddFiles?.(files);
  };

  return (
    <ModalShell
      title={(
        <span className="okr-ctx-head">
          <span className="okr-ctx-head-left">
            OKR 컨텍스트 설정
            <StatusBadge className="okr-ctx-admin-badge">관리자 전용</StatusBadge>
          </span>
          <span className="okr-ctx-optional">선택사항</span>
        </span>
      )}
      titleId="okr-ctx-title"
      onClose={onClose}
      zIndex={1000}
      className="okr-shell okr-wz-modal"
      bodyClassName="okr-shell-body"
      footer={(
        <>
          <span className="okr-wz-footer-hint">AI 분석은 선택입니다. 확인하지 않은 분석 결과는 컨텍스트로 주입되지 않습니다.</span>
          <button type="button" className="okr-btn is-brand" disabled={!onStartOkr} onClick={() => onStartOkr?.()}>
            OKR설정 시작
          </button>
        </>
      )}
    >
      <div className="okr-ctx-intro">
        <p className="okr-ctx-intro-desc">
          AI가 우리 회사를 이해하는 기반 지식입니다. 회사 문서·링크·전략 메모를 한 곳에 등록해두면, 이후 모든 OKR 수립(전사→부문→팀→개인)에서 AI 제안의 정확도가 높아집니다.
        </p>
        <p className="okr-ctx-intro-note">비워두고도 OKR 설정을 진행할 수 있어요.</p>
      </div>

      <div className="okr-wz-stepblock">
        <div className="okr-wz-section">
          <p className="okr-wz-step-eyebrow">STEP1 - Backward Looking</p>
          <p className="okr-wz-question">지식 소스</p>
          <p className="okr-wz-desc">파일·링크·텍스트를 하나의 목록에 자유롭게 추가하세요. 분류는 필요 없습니다.</p>
        </div>
        <div
          className={`okr-ctx-dropzone${dragOver ? ' is-dragover' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer?.files); }}
          role="button"
          aria-label="지식 소스 파일 업로드"
        >
          <span className="okr-ctx-dropzone-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 16.24A4.5 4.5 0 0 1 6.5 7.5a6 6 0 0 1 11.7 1.6A3.75 3.75 0 0 1 17 16.24M12 12v9m0-9-3.5 3.5M12 12l3.5 3.5" />
            </svg>
          </span>
          <div className="okr-ctx-dropzone-texts">
            <p className="okr-ctx-dropzone-action">
              <b>업로드하려면 클릭하세요</b>
              <svg className="okr-ctx-dropzone-ext" viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 2H2.5A1.5 1.5 0 0 0 1 3.5v6A1.5 1.5 0 0 0 2.5 11h6A1.5 1.5 0 0 0 10 9.5V7M7 1h4v4M11 1 5.5 6.5" />
              </svg>
              <span className="okr-ctx-dropzone-or">또는 끌어서 놓기</span>
            </p>
            <p className="okr-ctx-dropzone-hint">{dropzoneHint ?? 'SVG, PNG, JPG, DOC, PDF 등'}</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      </div>

      <div className="okr-wz-vision">
        <div className="okr-wz-vision-head">
          <div className="okr-wz-section">
            <p className="okr-wz-vision-title">AI 분석 — 키워드·전략 테마 추출</p>
            <p className="okr-wz-desc">소스가 1건 이상일 때 분석할 수 있습니다. 선택 사항이며 수동으로 실행됩니다.</p>
          </div>
          <button
            type="button"
            className="okr-wz-ai-btn"
            data-testid="okr-ctx-modal-analyze"
            disabled={analyzeDisabled}
            title={analyzeDisabledReason || undefined}
            onClick={() => onAnalyze?.()}
          >
            {analysis ? AL.rerun : AL.run}
          </button>
        </div>
        {analysisNotice}
        <div className="okr-wz-vision-card">
          {analyzing ? (
            <p className="okr-wz-desc" data-testid="okr-ctx-modal-analyzing">{AL.running}</p>
          ) : analyzeFailed ? (
            <p className="okr-wz-desc" role="alert">
              {AL.failed}{' '}
              {onAnalyze && !analyzeDisabledReason && (
                <button type="button" className="okr-wz-ai-btn" onClick={() => onAnalyze()}>{AL.retry}</button>
              )}
            </p>
          ) : null}
          {!analyzing && analysis ? (
            <OkrContextAnalysisResult
              analysis={analysis}
              onConfirm={onConfirmAnalysis}
              confirming={confirmingAnalysis}
              labels={AL.result}
            />
          ) : !analyzing && !analyzeFailed ? (
            <div className="okr-wz-vision-box" />
          ) : null}
        </div>
      </div>
    </ModalShell>
  );
}
