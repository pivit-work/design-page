import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, ResetIcon, SlidersIcon } from './devtoolsIcons.jsx';
import './devtools.css';

/**
 * StateSwitcher — 데모 페이지가 캔버스에 넘기는 상태 prop 을 소스 수정 없이 바꾼다.
 *
 * 배치 규칙 (완료 조건: "어떤 컴포넌트의 시각도 바뀌지 않는다"):
 * - `position: fixed` 오버레이라 캔버스 레이아웃을 한 픽셀도 밀지 않는다.
 *   Figma 좌표 기준 시안 정합 작업이 그대로 가능해야 하므로 문서 흐름에 끼지 않는다.
 * - **document.body 로 포털**한다. `.app` 에 transform 이 걸려 있어서 그 안에 두면
 *   `position: fixed` 의 기준이 뷰포트가 아니라 `.app` 의 패딩 박스가 된다 — 가로
 *   스크롤이 있는 페이지(조직도·1on1)에서 패널이 화면 밖으로 밀려 안 보였다.
 * - 기본은 접힌 알약 버튼. 펼침 여부는 sessionStorage 에 남아 페이지를 옮겨도 유지된다.
 * - z-index 는 design-page 모달(.modal-overlay = 1000, .modal-scroll-wrap = 1001)보다
 *   위다. 모달을 띄운 채로도 knob 을 계속 돌릴 수 있어야 한다.
 * - knob 이 하나라도 기본값이 아니면 알약에 표시가 붙는다 — 접어 둔 채로 깨진 화면을
 *   보고 "원래 이렇게 깨져 있다" 고 오해하지 않도록.
 */

const OPEN_KEY = 'pv-dev-switcher-open';

function readOpen() {
  try {
    return window.sessionStorage.getItem(OPEN_KEY) === '1';
  } catch {
    return false;
  }
}

function writeOpen(open) {
  try {
    window.sessionStorage.setItem(OPEN_KEY, open ? '1' : '0');
  } catch {
    /* sessionStorage 가 막힌 환경(사파리 프라이빗 등)에서는 세션 유지만 포기한다 */
  }
}

export default function StateSwitcher({ spec, values, onChange, onReset, note }) {
  const [open, setOpen] = useState(readOpen);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      writeOpen(!prev);
      return !prev;
    });
  }, []);

  const activeCount = spec.filter((knob) => (values[knob.key] ?? 'default') !== 'default').length;

  if (!open) {
    return createPortal(
      <button
        type="button"
        className={`pv-dev-pill${activeCount ? ' is-active' : ''}`}
        onClick={toggle}
        data-testid="state-switcher-pill"
        title="상태 스위처 열기"
      >
        <SlidersIcon size={16} />
        <span>상태</span>
        {activeCount > 0 && <span className="pv-dev-pill-count">{activeCount}</span>}
      </button>,
      document.body,
    );
  }

  return createPortal(
    <div className="pv-dev-panel" data-testid="state-switcher">
      <div className="pv-dev-head">
        <span className="pv-dev-title">상태 스위처</span>
        <button
          type="button"
          className="pv-dev-icon-btn"
          onClick={onReset}
          disabled={activeCount === 0}
          title="모두 기본값으로"
          data-testid="state-switcher-reset"
        >
          <ResetIcon size={14} />
        </button>
        <button type="button" className="pv-dev-icon-btn" onClick={toggle} title="접기">
          <CloseIcon size={14} />
        </button>
      </div>

      {spec.map((knob) => (
        <div className="pv-dev-row" key={knob.key}>
          <span className="pv-dev-row-label">{knob.label}</span>
          <div className="pv-dev-seg" role="group" aria-label={knob.label}>
            {knob.options.map((option) => {
              const selected = (values[knob.key] ?? 'default') === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  className={`pv-dev-seg-btn${selected ? ' is-on' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onChange(knob.key, option.value)}
                  data-testid={`knob-${knob.key}-${option.value}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {note && <p className="pv-dev-note">{note}</p>}
    </div>,
    document.body,
  );
}
