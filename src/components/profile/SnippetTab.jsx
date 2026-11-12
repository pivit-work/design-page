import Icon from '../shared/Icon.jsx';
import LoadMoreButton from '../shared/LoadMoreButton.jsx';
import ProfileFailure from './ProfileFailure.jsx';
import SnippetItem from './SnippetItem.jsx';

/**
 * 「스니핏」 탭 (Figma 17873:33786) — AI 요약 카드 + 최근 스니핏 카드들 + 목록 끝의 「더 보기」(PW-925).
 *
 * `profile.snippetsMore` 가 있을 때만 목록 아래에 한 줄을 더 그린다. 호스트가 표시 문자열까지
 * 만들어 넘긴다 — 캔버스는 i18n 도, 더 남았는지도 모른다.
 *  - `{ label, loadingLabel, loading }` — 버튼. 불러오는 동안 누를 수 없고 라벨이 바뀐다
 *  - `{ error: { message, retryLabel } }` — 버튼 자리에 실패 문구와 [다시 시도]. 이미 보이던
 *    카드는 그대로 둔다. 다시 시도도 `onMore` 로 간다
 * 더 남은 것이 없으면 호스트가 `snippetsMore` 를 빼서 버튼이 사라진다.
 */
export default function SnippetTab({ profile, icons, baseUrl = '', onMore, labels: L }) {
  // 볼 수 있는 스니핏이 0건이면 AI 요약·[더 보기] 없이 빈 안내만 — 같은 창 액션 아이템 탭의 빈 목록과
  // 같은 모양(.profile-empty). 요약 자리를 카드 브리핑 문장으로 채우지 않는다 (PW-2512 · 매니저 뷰 §10-2).
  if (profile.snippets.length === 0 && !profile.snippetsMore) {
    return (
      <div className="profile-tab-body">
        <p className="profile-empty">{L.snippetEmpty}</p>
      </div>
    );
  }
  return (
    <div className="profile-tab-body">
      <div className="profile-brief-card">
        <div className="profile-brief-label-row">
          <Icon src={icons?.summarySparkle || '/icons-solid/ai-chat-01.svg'} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span className="profile-brief-label">{L.aiSummaryWeek}</span>
        </div>
        <p className="profile-brief-text">{profile.snippetsSummary || profile.aiBrief}</p>
      </div>

      {profile.snippets.map((s, i) => (
        <SnippetItem key={i} snippet={s} />
      ))}

      {profile.snippetsMore && (
        profile.snippetsMore.error ? (
          <ProfileFailure notice={profile.snippetsMore.error} onRetry={onMore} />
        ) : (
          // 디자이너가 그린 목록 끝 [더 보기](조직도 구성원 표 .pj-btn-more) 값 그대로인 공용 부품
          <LoadMoreButton
            label={profile.snippetsMore.label}
            loadingLabel={profile.snippetsMore.loadingLabel}
            loading={!!profile.snippetsMore.loading}
            onClick={onMore}
          />
        )
      )}
    </div>
  );
}
