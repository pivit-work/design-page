import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * MicSelectModal — 마이크 선택/권한 모달.
 *
 * Figma node-id=16920-36805(initial) / 36849(granted) / 36985(failed).
 * status: 'initial' | 'granted' | 'failed'.  volume: 0~100 (입력 음량 % 초기값).
 * granted 상태에서는 실제 마이크 입력을 AnalyserNode 로 측정해 입력 음량
 * 게이지(%·막대)를 실시간 갱신한다. 상태 전환은 caller(오케스트레이터)가 처리.
 * 모든 데이터/라벨은 caller 주입. 내부 fallback 없음.
 */
export default function MicSelectModal({
  devices,
  selectedDevice,
  status = 'initial',
  volume = 0,
  baseUrl = '',
  labels,
  onRequestPermission,
  onSelectDevice,
  onStart,
  onBack,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 실시간 입력 음량 — granted 상태에서 마이크 레벨을 측정해 게이지에 반영.
  // 60fps 리렌더를 피하려고 state 대신 DOM(width·텍스트)을 직접 갱신한다.
  const fillRef = useRef(null);
  const pctRef = useRef(null);
  useEffect(() => {
    if (status !== 'granted') return undefined;
    let cancelled = false;
    let raf;
    let audioCtx;
    let stream;
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        audioCtx = new (window.AudioContext ?? window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        audioCtx.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const END_BIN = Math.min(40, data.length); // 음성 대역(≈0.2–7.5kHz)만 측정
        const tick = () => {
          raf = requestAnimationFrame(tick);
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 1; i < END_BIN; i++) sum += data[i];
          const v = sum / (END_BIN - 1) / 255;
          // 볼륨 미터라 게이트 없이 √ 커브로 저음량을 살려 보여준다.
          const pct = Math.min(100, Math.round(Math.sqrt(v) * 140));
          if (fillRef.current) fillRef.current.style.width = `${pct}%`;
          if (pctRef.current) pctRef.current.textContent = `${pct}%`;
        };
        tick();
      })
      .catch(() => {}); // 실측 불가 — volume prop 값 그대로 표시
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, [status]);

  return createPortal(
    <div className="mtg-overlay" onClick={onClose}>
      <div
        className="mtg-mic-modal"
        role="dialog"
        aria-labelledby="mtg-mic-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mtg-mic-topbar">
          <button type="button" className="mtg-mic-back" onClick={onBack}>
            <Icon src="/icons-solid/arrow-left.svg" size={18} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>{labels.back}</span>
          </button>
          <button type="button" className="mtg-modal-close" aria-label={labels.close} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--colors-foreground-fgQuaternary, #98a1b2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <h2 id="mtg-mic-title" className="mtg-mic-title">{labels.title}</h2>
        <p className="mtg-mic-subtitle">{labels.subtitle}</p>

        <div className="mtg-mic-field">
          <span className="mtg-mic-field-label">{labels.deviceLabel}</span>
          <div className="mtg-mic-select">
            <select
              value={selectedDevice}
              onChange={(e) => onSelectDevice?.(e.target.value)}
            >
              {devices.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <Icon src="/icons-solid/chevron-down.svg" size={18} color="var(--text-tertiary, #b1b6be)" baseUrl={baseUrl} />
          </div>
        </div>

        <div className="mtg-mic-field">
          <div className="mtg-mic-volume-head">
            <span className="mtg-mic-field-label">{labels.volumeLabel}</span>
            <span className="mtg-mic-volume-pct" ref={pctRef}>{volume}%</span>
          </div>
          <div className="mtg-mic-volume-track">
            <div className="mtg-mic-volume-fill" ref={fillRef} style={{ width: `${volume}%` }} />
          </div>
        </div>

        {status === 'initial' && (
          <>
            <button type="button" className="mtg-mic-request-btn" onClick={onRequestPermission}>
              {labels.requestButton}
            </button>
            <p className="mtg-mic-footnote">{labels.requestFootnote}</p>
          </>
        )}

        {status === 'granted' && (
          <>
            <p className="mtg-mic-granted">{labels.grantedText}</p>
            <button type="button" className="mtg-mic-start-btn" onClick={onStart}>
              {labels.startButton}
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mtg-mic-error">
              <Icon src="/icons-solid/alert-triangle.svg" size={18} color="var(--colors-background-bgErrorSolid, #f04438)" baseUrl={baseUrl} />
              <span>{labels.failedText}</span>
            </div>
            <p className="mtg-mic-footnote">{labels.failedFootnote}</p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
