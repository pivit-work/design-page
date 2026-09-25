/**
 * 「불러오는 중…」 글 — 목록·패널이 다 오기 전 그 자리에 두는 한 줄 (PW-1010).
 *
 * 어드민 직원 관리·조직 이력·팀 관리·스쿼드·매니저 팀 스니핏·평가 화면이 같은 글을 각자
 * 칠해 여러 벌이었다(여백 12~60px · 글씨 12~14px). 두 크기로 모았다(`src/loading.css`).
 *
 *   size="page"   화면·카드 한가운데 — 위아래 여백을 넉넉히(가장 많이 쓰던 60px)
 *   size="inline" 패널 안 한 줄 — 작은 글씨, 좁은 여백
 *
 * 화면 읽기 프로그램에는 «상태» 로 읽힌다. 글은 화면이 넘긴다(번역은 앱 몫).
 */
export default function LoadingState({ size = 'page', className = '', children, ...rest }) {
  return (
    <div
      role="status"
      {...rest}
      className={['dp-loading', `dp-loading--${size}`, className].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}
