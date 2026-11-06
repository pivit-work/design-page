import EmptyState from '../shared/EmptyState.jsx';
import assetUrl from '../shared/assetUrl.js';

/**
 * 팀 레벨 빈 상태 한 장 — 매니저 화면 «오늘 현황»과 «팀 스니핏»이 같은 모양으로 쓴다.
 * 모양은 디자이너가 1on1 대시보드에 그린 「팀원 0명」 안내(.ono-team-empty, 9f454350) 그대로 —
 * 종이 그림 + 제목 + 설명 + 글자 버튼. 클래스 이름은 소비자 테스트가 찾으므로 남긴다.
 */
export default function ManagerTeamEmpty({ teamEmpty, baseUrl = '' }) {
  return (
    <EmptyState
      className="manager-team-empty"
      data-testid="manager-team-empty"
      icon={<img className="manager-team-empty-paper" src={assetUrl(baseUrl, 'paper-empty.svg')} alt="" />}
      actions={
        teamEmpty.actionLabel ? (
          <button type="button" className="manager-team-empty-action" onClick={teamEmpty.onAction}>
            {teamEmpty.actionLabel}
          </button>
        ) : null
      }
    >
      <p className="dp-empty__title manager-team-empty-title">{teamEmpty.title}</p>
      <p className="dp-empty__desc manager-team-empty-desc">{teamEmpty.description}</p>
    </EmptyState>
  );
}
