import OkrBoard from './OkrBoard.jsx';

/**
 * OkrMemberReadonlyView — 조직 축 탭 구성원 줄에서 누른 사람의 개인 OKR 조회 전용 보기
 * (pivit-work PW-2763 · okr-policy §3.2-B M4 · §8.6-B).
 *
 * 맨 위 «조회 전용 — …» 한 줄, 그 아래 진행률 요약과 OKR 표(공용 OkrBoard).
 * 🔴 조회 전용이라 넘기지 않는 것: KR 업데이트(onKrUpdate) · 피드백 작성·보기 · 이니셔티브 토글 · AI 위험 신호.
 *   KR 을 눌러도 업데이트 창이 열리지 않으려면 소비자가 KR 의 `updateDetail` 을, 피드백 행을 없애려면 `feedback` 을 빼서 넘긴다
 *   (OkrObjectiveSection 은 그 두 값이 있을 때만 행을 누를 수 있게 하고 피드백 줄을 그린다).
 * 리뷰의 출발점은 수시 피드백 팀 화면 하나다(§8.6 근거 ①) — 여기에 피드백 진입점을 두지 않는다.
 *
 * board: { overall, theme, objectives } · note: 맨 위 한 줄(소비자 번역).
 */
export default function OkrMemberReadonlyView({ board, note, icons, baseUrl = '' }) {
  return (
    <div data-testid="okr-member-readonly">
      <p className="okr-member-readonly-note">{note}</p>
      <OkrBoard board={board} icons={icons} baseUrl={baseUrl} showInsights={false} />
    </div>
  );
}
