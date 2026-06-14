import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * MicSelectModal — 마이크 선택/권한 모달.
 *
 * Figma node-id=16920-36805(initial) / 36849(granted) / 36985(failed).
 * status: 'initial' | 'granted' | 'failed'.  volume: 0~100 (입력 음량 %).
 * 마이크 권한은 시각 상태만 — getUserMedia 미연동. 상태 전환은 caller(오케스트레이터)가 처리.
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
            <span className="mtg-mic-volume-pct">{volume}%</span>
          </div>
          <div className="mtg-mic-volume-track">
            <div className="mtg-mic-volume-fill" style={{ width: `${volume}%` }} />
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
