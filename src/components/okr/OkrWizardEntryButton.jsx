import { useRef, useState } from 'react';
import useDismissLayer from '../shared/useDismissLayer.js';
import { ChevronDownGlyph } from '../shared/lineIcons.jsx';

/**
 * OkrWizardEntryButton — OKR 탭 오른쪽 위 [{단위} OKR 작성] / [OKR 작성 ▾].
 *
 * 시안 pivit-specs `F. OKR/okr-app.jsx` 의 `OkrTabNav` 액션(`scopeAware` 항목)을 포팅했다
 * (정책서 screen-okr-setup-wizard §2A.2 · okr-policy §2C.2).
 *  - 단위 화면: `onClick` — 그 단위 마법사를 바로 연다.
 *  - 단위가 없는 화면(대시보드·내 리소스): `menuItems` 를 주면 쓸 수 있는 단위 메뉴를 연다.
 *  - 권한이 없으면 `disabled` + `title`(툴팁 사유).
 *
 * 문구는 전부 소비자가 넘긴다(번역).
 */
function ChevronDown({ size = 16 }) {
  return <ChevronDownGlyph size={size} />;
}

export default function OkrWizardEntryButton({
  label,
  disabled = false,
  title,
  onClick,
  menuItems,
  onSelect,
  testId,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const hasMenu = Array.isArray(menuItems);

  // 메뉴 밖을 누르거나 Esc 면 닫는다.
  useDismissLayer(() => setOpen(false), rootRef, null, open);

  return (
    // 비활성 버튼은 브라우저가 마우스 이벤트를 막아 툴팁이 안 뜰 수 있다 — 감싼 쪽에도 사유를 둔다.
    <div className="okr-wz-entry" ref={rootRef} title={disabled ? title : undefined}>
      <button
        type="button"
        className="okr-wz-entry-btn"
        data-testid={testId}
        disabled={disabled}
        title={title}
        aria-haspopup={hasMenu ? 'menu' : undefined}
        aria-expanded={hasMenu ? open : undefined}
        onClick={() => {
          if (disabled) return;
          if (hasMenu) setOpen((o) => !o);
          else onClick?.();
        }}
      >
        <span>{label}</span>
        {hasMenu && !disabled && <ChevronDown />}
      </button>
      {hasMenu && open && (
        <div className="okr-wz-entry-menu" role="menu">
          {menuItems.map((item) => (
            <button
              type="button"
              role="menuitem"
              key={item.key}
              className="okr-wz-entry-item"
              onClick={() => { setOpen(false); onSelect?.(item.key); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
