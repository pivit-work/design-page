/**
 * 자리 표시 — 불러오는 동안 내용이 올 자리에 먼저 깔아 두는 회색 막대 (PW-1010).
 *
 * 내 설정(변경 이력)·어드민 직원 관리(인사 기록)·결제 수단·매니저 KR 카드·평가 사이클 만들기
 * 등이 막대를 각자 칠해 일곱 벌이었다(바탕색 셋 · 반짝임 · 깜박임 · 멈춤). 한 벌로 모았다
 * (`src/loading.css`) — 옅은 회색 바탕에 천천히 깜박이고, 움직임 줄이기를 켠 사용자에게는 멈춘다.
 *
 *   <Skeleton width={96} height={13} inline />       한 줄 안의 짧은 막대
 *   <Skeleton height={92} />                           카드 한 장 자리
 *   <SkeletonList count={3} height={52} />             목록 줄 여러 개
 *
 * 크기는 올 내용과 같게 준다 — 다 불러온 뒤 자리가 튀지 않게.
 *
 * @param {number|string} [width]  기본은 부모 폭을 다 쓴다
 * @param {number|string} [height] 기본 16
 * @param {number|string} [radius] 모서리. 기본 `--radius-md`
 * @param {boolean} [inline]       글 줄 안에 놓는다(span)
 */
export default function Skeleton({ width, height = 16, radius, inline = false, className = '', style, ...rest }) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag
      aria-hidden="true"
      {...rest}
      className={['dp-skeleton', inline ? 'is-inline' : '', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/**
 * 같은 높이의 막대 여러 줄 — 목록을 불러오는 자리. 불러오는 중임을 `aria-busy` 로 알린다.
 * 나머지 속성(`data-testid` 등)은 겉 상자에 붙는다.
 */
export function SkeletonList({ count = 3, height = 52, gap = 8, className = '', ...rest }) {
  return (
    <div
      aria-busy="true"
      {...rest}
      className={['dp-skeleton-list', className].filter(Boolean).join(' ')}
      style={{ gap }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}
