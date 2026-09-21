import { forwardRef } from 'react';
import { createPortal } from 'react-dom';

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
 * - 닫는 길은 막 누르기와 소비자가 그린 버튼뿐이다. Esc 는 두 패널 다 받지 않았고, 편집 중인
 *   값을 날리는 새 길을 틀이 몰래 더하지 않는다.
 *
 * 스타일은 `styles/side-panel-shell.css` (`admin.css`·`resource.css` 가 불러온다).
 *
 * Props:
 *   onClose          막을 눌렀을 때
 *   as               패널 태그 ('div' 기본, 'aside' 등)
 *   className        패널에 덧붙일 변형 클래스
 *   scrimClassName   막에 덧붙일 변형 클래스
 *   testId           패널의 data-testid
 *   ariaLabel        패널의 aria-label (제목 요소가 없을 때)
 *   ariaLabelledBy   패널의 aria-labelledby
 *   children         패널 안 전부
 * ref 는 패널 요소로 간다(스크롤 위치를 옮기는 소비자가 있다).
 */
const SidePanelShell = forwardRef(function SidePanelShell(
  {
    onClose,
    as: Tag = 'div',
    className = '',
    scrimClassName = '',
    testId,
    ariaLabel,
    ariaLabelledBy,
    children,
  },
  ref,
) {
  return createPortal(
    <div className="pw-side-panel-root">
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
