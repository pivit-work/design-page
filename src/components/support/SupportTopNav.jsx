import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';

/**
 * SupportTopNav — 고객지원 화면(`/support/*`) 위쪽 띠 (PW-1129).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportTopNav`
 * (「고객지원」 제목 + 문의하기 · 내 문의 탭). 탭 줄은 공용 `SegmentedControl` 로 그린다.
 * PW-2687 부터 고정 띠가 아니라 각 캔버스 머리의 `nav` 칸에 넣는 탭 줄이다 — 큰 제목 «고객지원»
 * 아래에 놓여 스니핏·회의록과 같은 머리 자리를 쓴다. 제목은 캔버스 머리가 맡으므로 `title` 은 비워 둔다.
 *
 * Props:
 *   baseUrl   정적 에셋 base path (탭 아이콘)
 *   title     탭 줄 앞 작은 제목(선택 — 앱은 쓰지 않는다)
 *   tabs      [{ value, label, icon? }] — icon 은 icons-solid 경로
 *   active    지금 탭 value
 *   onChange(value)
 *   ariaLabel 탭 줄 이름(화면 읽기용). 없으면 title
 */
export default function SupportTopNav({
  baseUrl,
  title,
  tabs = [],
  active,
  onChange,
  ariaLabel,
}) {
  const items = tabs.map((t) => ({
    value: t.value,
    testId: `support-tab-${t.value}`,
    label: (
      <span className="sup-tab">
        {t.icon && <Icon src={t.icon} size={16} baseUrl={baseUrl} />}
        <span>{t.label}</span>
      </span>
    ),
  }));
  return (
    <nav className="sup-topnav" data-testid="support-topnav">
      {title && <span className="sup-topnav-title">{title}</span>}
      {items.length > 0 && (
        <SegmentedControl
          items={items}
          value={active}
          onChange={(v) => onChange?.(v)}
          ariaLabel={ariaLabel ?? title}
        />
      )}
    </nav>
  );
}
