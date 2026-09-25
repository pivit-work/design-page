/**
 * 빈 화면 안내 — 「아직 없습니다」 칸 (PW-1014).
 *
 * 56개 파일이 이 칸을 따로 그려 모양이 85가지였다(`evc-empty`, `admin-snap-empty`,
 * `ono-mem-empty` …). 한 메뉴 안에서도 테두리가 있다 없다, 가운데다 왼쪽이다가 갈렸다.
 * 이 부품이 모양을 하나로 정한다 — 옅은 바탕에 점선 테두리, 가운데 정렬, 위에서부터
 * 아이콘 · 제목 · 설명 · 버튼.
 *
 *   <EmptyState description="지난 1on1 기록이 없습니다" />
 *   <EmptyState size="lg" title="기록 시작 전입니다" description="…" actions={<Button …/>} />
 *
 * 크기는 둘이다. 화면 한가운데를 채우는 안내는 `lg`, 카드·목록 안의 한 칸은 `md`(기본).
 * 넓이는 부모를 채운다.
 *
 * @param {import('react').ReactNode} [title] 굵은 한 줄. 없으면 설명만
 * @param {import('react').ReactNode} [description] 설명 — 제목이 없으면 이것이 안내 문장이다
 * @param {import('react').ReactNode} [icon] 맨 위 아이콘(인라인 SVG)
 * @param {import('react').ReactNode} [actions] 맨 아래 버튼 줄
 * @param {'md'|'lg'} [size='md']
 * @param {string} [as='div'] 감싸는 태그 — 표 칸 안이면 `td` 가 아니라 그 안에 넣는다
 */
export default function EmptyState({
  title,
  description,
  icon,
  actions,
  size = 'md',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const classes = ['dp-empty', `dp-empty--${size}`, className].filter(Boolean).join(' ');
  return (
    <Tag className={classes} {...rest}>
      {icon && <span className="dp-empty__icon" aria-hidden>{icon}</span>}
      {title && <p className="dp-empty__title">{title}</p>}
      {description && <p className="dp-empty__desc">{description}</p>}
      {children}
      {actions && <div className="dp-empty__actions">{actions}</div>}
    </Tag>
  );
}
