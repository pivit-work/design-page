import { forwardRef, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { confirmOpen, isTopLayer, pushLayer } from './dismissStack.js';

/**
 * SidePanelShell — 오른쪽에서 밀려 나오는 패널의 공용 껍데기 (PW-893).
 *
 *   막(scrim)   화면 전체를 덮는다 — 왼쪽 메뉴·위쪽 바까지. 누르면 onClose
 *   패널        오른쪽 끝에 붙는다. 안은 전부 children 이 그린다(머리·본문·발 줄)
 *
 * 가운데 뜨는 창의 `ModalShell` 과 짝이다. 공용 창 틀이 생긴 뒤에도 옆 패널은 틀이 없어
 * 어드민 구성원 편집 패널과 리소스 멤버 패널이 막·겹침 순서를 각자 그렸다 — 창 뒤 막이
 * 왼쪽 메뉴까지 덮는가를 화면마다 따로 맞춰야 했다(PW-802 류).
 *
 * - **body 로 포털한다.** 화면 루트가 `position: fixed`·`overflow: hidden` 이면 그 안에서
 *   그린 막은 사이드바(z:100)·위쪽 바(z:90) 아래로 깔리거나 잘린다(리소스 화면이 그랬다).
 * - **겹침 순서는 사이드바보다 위(101)** 가 기본이다. 패널 안에서 여는 창은 이보다 높아야 한다
 *   (어드민 변경 사유 창 `.admin-notif-modal-root` 등).
 * - 기본 생김새는 어드민 구성원 편집 패널 그대로다(2026-09-22 커트 결정 — 어드민은 디자이너
 *   대기 없이 개발이 맞춘다). 어드민이 아닌 화면은 `className`·`scrimClassName` 으로 제
 *   생김새를 덧입혀 지금 모양을 지킨다(리소스 화면).
 * - 닫는 길은 막 누르기와 소비자가 그린 버튼이 기본이다. Esc 는 **소비자가 `closeOnEscape` 로
 *   켤 때만** 받는다 — 편집 중인 값을 날리는 새 길을 틀이 몰래 더하지 않는다. 어드민 구성원
 *   편집 패널은 막 누르기와 똑같이 닫혀도 되는 패널이라 켠다(PW-1070).
 * - Esc 는 창·메뉴와 같은 «떠 있는 층» 목록(`dismissStack.js`)을 따른다 — 패널 위에 연 창·메뉴가
 *   있으면 그것이 먼저 닫히고, 공용 확인 창이 떠 있으면 패널은 Esc 를 받지 않는다.
 *
 * 스타일은 `styles/side-panel-shell.css` (`admin.css`·`resource.css` 가 불러온다).
 *
 * Props:
 *   onClose          막을 눌렀을 때 (closeOnEscape 면 Esc 에도)
 *   closeOnEscape    true 면 Esc 로도 닫는다 — 단 맨 위 층일 때만. 기본 false
 *   as               패널 태그 ('div' 기본, 'aside' 등)
 *   className        패널에 덧붙일 변형 클래스
 *   scrimClassName   막에 덧붙일 변형 클래스
 *   testId           패널의 data-testid
 *   ariaLabel        패널의 aria-label (제목 요소가 없을 때)
 *   ariaLabelledBy   패널의 aria-labelledby
 *   zIndex           겹침 순서 (기본은 CSS 의 101). 가운데 창 위에서 여는 패널이 쓴다 —
 *                    평가 사이클 마법사 창(1000) 위의 리마인더 패널(PW-1066)
 *   children         패널 안 전부
 * ref 는 패널 요소로 간다(스크롤 위치를 옮기는 소비자가 있다).
 */
const SidePanelShell = forwardRef(function SidePanelShell(
  {
    onClose,
    closeOnEscape = false,
    as: Tag = 'div',
    className = '',
    scrimClassName = '',
    testId,
    ariaLabel,
    ariaLabelledBy,
    zIndex,
    children,
  },
  ref,
) {
  // onClose 는 ref 로 읽는다 — 인라인 함수가 렌더마다 바뀌어도 층을 내렸다 올리지 않게(층 순서가 흔들린다).
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  // 층 올리기는 그리기 전에(layout) — 창(`ModalLayer`)과 같은 때에 올려야 나중에 연 쪽이 위가 된다.
  useLayoutEffect(() => {
    if (!closeOnEscape) return undefined;
    const token = {};
    const popLayer = pushLayer(token);
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.isComposing) return;
      if (!isTopLayer(token) || confirmOpen()) return;
      onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      popLayer();
    };
  }, [closeOnEscape]);

  return createPortal(
    <div className="pw-side-panel-root" style={zIndex != null ? { zIndex } : undefined}>
      <div
        className={`pw-side-panel-scrim ${scrimClassName}`.trim()}
        role="presentation"
        onClick={onClose}
        data-testid="side-panel-scrim"
      />
      <Tag
        ref={ref}
        className={`pw-side-panel ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-testid={testId}
      >
        {children}
      </Tag>
    </div>,
    document.body,
  );
});

export default SidePanelShell;
