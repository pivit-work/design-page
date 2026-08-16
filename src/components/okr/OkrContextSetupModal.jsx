import { useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrContextSetupModal — OKR 컨텍스트 설정 모달 (관리자 전용).
 * Figma 17332:22101. OKR 설정 마법사와 같은 800×1118 모달 셸(.okr-wz-modal)을 쓴다.
 *
 * 구성: 타이틀 + [관리자 전용] 배지 + '선택사항' → 안내 2줄 → 지식 소스 업로드
 * 드롭존 → AI 분석(키워드·전략 테마 추출) 섹션 → 푸터 [OKR설정 시작].
 *
 * 콜백은 전부 선택 주입:
 *  - onAddFiles(File[]) — 드롭존 클릭/드래그앤드롭. 미주입이면 표시 전용(데모).
 *  - onAnalyze() — [AI 분석]. 미주입이면 눌러도 아무 일 없음.
 *  - onStartOkr() — 푸터 CTA. 미주입이면 버튼 비활성(시안의 disabled 상태).
 *
 * 업로드/외부링크 아이콘은 공용 에셋에 없어 인라인 SVG 로 그린다
 * (OkrContextSetupCanvas 와 동일 규약).
 */
export default function OkrContextSetupModal({ icons, baseUrl = '', onClose, onAddFiles, onAnalyze, onStartOkr }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFiles = (list) => {
    const files = [...(list ?? [])];
    if (files.length) onAddFiles?.(files);
  };

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-wz-modal okr-ctx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>

        <div className="okr-wz-body">
          <div className="okr-ctx-head">
            <div className="okr-ctx-head-left">
              <h2 className="okr-wz-title">OKR 컨텍스트 설정</h2>
              <span className="okr-ctx-admin-badge">관리자 전용</span>
            </div>
            <span className="okr-ctx-optional">선택사항</span>
          </div>

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
                <p className="okr-ctx-dropzone-hint">SVG, PNG, JPG, DOC, PDF 등</p>
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
              <button className="okr-wz-ai-btn" onClick={() => onAnalyze?.()}>AI 분석</button>
            </div>
            <div className="okr-wz-vision-card">
              <div className="okr-wz-vision-box" />
            </div>
          </div>
        </div>

        <div className="okr-modal-footer okr-wz-footer">
          <span className="okr-wz-footer-hint">AI 분석은 선택입니다. 확인하지 않은 분석 결과는 컨텍스트로 주입되지 않습니다.</span>
          <button className="okr-btn is-brand" disabled={!onStartOkr} onClick={() => onStartOkr?.()}>
            OKR설정 시작
          </button>
        </div>
      </div>
    </div>
  );
}
