import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_WAVE, useMicWave } from './OneOnOneRecordingWidget.jsx';

/**
 * MicPermissionModal — 1on1 진행 최초 진입 시 뜨는 마이크 권한 안내 모달.
 * Figma 17416:27675(미허용) / 17507:22691(허용됨).
 *
 * 브라우저 마이크 권한을 Permissions API 로 감시해, 사용자가 허용을 완료하면
 * 모달 내용이 자동으로 허용 상태(그린 배너 + [진행하기] 단일 버튼)로 바뀐다.
 *
 * onComplete: [나중에]/[진행하기] — 다음 단계(매니저 지정)로 진행.
 * onRetry: [요청하기] — 미지정 시 브라우저 마이크 권한을 실제로 다시 요청한다.
 * onOpenSettings: [설정 열기] — 브라우저 설정은 JS로 열 수 없어 호스트에 위임.
 * labels: 고정 문구를 키별로 덮어쓴다(호스트 번역). 안 넘긴 키는 한국어 기본값 (PW-786).
 * guideUrl: 「브라우저 권한 설정 가이드 보기」 링크 대상. 미지정 시 Chrome 도움말.
 */
export const MIC_PERMISSION_GUIDE_URL = 'https://support.google.com/chrome/answer/2693767';

export const MIC_PERMISSION_DEFAULT_LABELS = {
  title: '마이크 권한 필요',
  desc: '이 1on1을 음성 녹취하려면 브라우저의 마이크 권한이 필요합니다. 권한이 거부된 상태에서는 STT 변환과 AI 미팅 요약이 생성되지 않습니다.',
  granted: '마이크 사용 가능합니다.',
  warning: '권한 없이 진행 시: 마이크 없이 진행하면 텍스트 입력(메모)만으로 진행됩니다. AI 요약은 메모 기반으로 제한적으로 생성됩니다.',
  proceed: '진행하기',
  later: '나중에',
  retry: '요청하기',
  openSettings: '설정 열기',
  guide: '브라우저 권한 설정 가이드 보기 →',
  footnote: '브라우저 마이크 사용 권한 허용을 하지 않으면 회의록 녹음 기능을 사용하실 수 없습니다.',
  close: '닫기',
};

export default function MicPermissionModal({ onClose, onComplete, onRetry, onOpenSettings, labels, guideUrl = MIC_PERMISSION_GUIDE_URL }) {
  const L = { ...MIC_PERMISSION_DEFAULT_LABELS, ...(labels || {}) };
  const [granted, setGranted] = useState(false);
  // 허용 상태 배너의 실시간 마이크 미리보기 파형 (17507:22691).
  const waveRef = useRef(null);
  useMicWave(waveRef, { enabled: granted });

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 권한 상태 감시 — 열려 있는 동안 사용자가 브라우저 프롬프트/사이트 설정에서
  // 허용하면 change 이벤트로 즉시 허용 화면으로 전환된다.
  useEffect(() => {
    let status;
    let cancelled = false;
    const sync = () => { if (!cancelled) setGranted(status?.state === 'granted'); };
    navigator.permissions?.query?.({ name: 'microphone' })
      .then((s) => { status = s; sync(); status.addEventListener('change', sync); })
      .catch(() => {}); // Permissions API 미지원(사파리 구버전 등) — 미허용 화면 유지
    return () => { cancelled = true; status?.removeEventListener('change', sync); };
  }, []);

  const handleRetry = () => {
    if (onRetry) { onRetry(); return; }
    // getUserMedia 성공 = 허용 — Permissions API 폴백으로도 즉시 전환해 둔다.
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setGranted(true);
      })
      .catch(() => {});
  };

  return createPortal(
    <div className="ons-overlay" onClick={onClose}>
      <div className="ons-modal is-compact" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ons-close" onClick={onClose} aria-label={L.close}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="ons-head">
          <h2 className="ons-title">{L.title}</h2>
          <p className="ons-desc">{L.desc}</p>
        </div>
        {granted ? (
          <div className="ons-success">
            <p>{L.granted}</p>
            <div className="ons-mic-wave" ref={waveRef}>
              {DEFAULT_WAVE.map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="ons-warning">{L.warning}</div>
        )}
        {granted ? (
          <div className="ons-actions">
            <button type="button" className="ons-btn is-brand" onClick={onComplete}>{L.proceed}</button>
          </div>
        ) : (
          <div className="ons-actions">
            <button type="button" className="ons-btn is-outline" onClick={onComplete}>{L.later}</button>
            <button type="button" className="ons-btn is-brand-soft" onClick={handleRetry}>{L.retry}</button>
            <button type="button" className="ons-btn is-brand" onClick={() => onOpenSettings?.()}>{L.openSettings}</button>
          </div>
        )}
        <div className="ons-footnote">
          <a href={guideUrl} target="_blank" rel="noreferrer">{L.guide}</a>
          <p>{L.footnote}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
