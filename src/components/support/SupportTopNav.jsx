import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';

/**
 * SupportTopNav — 고객지원 화면(`/support/*`) 위쪽 띠 (PW-1129).
 *
 * 무엇을 보여 주나는 pivit-specs `M. 고객지원/support-app.jsx` 의 `SupportTopNav`
 * (「고객지원」 제목 + 문의하기 · 내 문의 탭). 탭 줄은 공용 `SegmentedControl` 로 그린다.
 * 앱 상단바(.top-nav, 높이 68px) 바로 아래에 붙는다 — 평가 화면의 `.evnav-nav` 와 같은 자리.
 * 고객지원 캔버스(`SupportNewCanvas`·`SupportMyCanvas`)는 이 띠 높이만큼 아래에서 시작한다.
 *
 * Props:
 *   baseUrl   정적 에셋 base path (탭 아이콘)
 *   title     띠 제목(「고객지원」)
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
