import { useState, useEffect, useRef } from 'react';
import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import ProfileCardFrame from '../profile/ProfileCardFrame.jsx';
import ProfileCardHeader from '../profile/ProfileCardHeader.jsx';
import HrInfoTab from '../profile/HrInfoTab.jsx';
import AiBriefingTab from '../profile/AiBriefingTab.jsx';
import SnippetTab from '../profile/SnippetTab.jsx';
import HealthTrendTab from '../profile/HealthTrendTab.jsx';
import OneOnOneTab from '../profile/OneOnOneTab.jsx';
import ActionItemsTab from '../profile/ActionItemsTab.jsx';
import { DEFAULT_PROFILE_TAB_LABELS, PROFILE_TABS } from '../profile/constants.js';

/**
 * 매니저 페이지 멤버 카드 클릭 시 노출되는 팀원 상세 창.
 *
 * 2026-11-12 시안(Figma 17873:33191~34118 «profile_card modal 2»)부터 조직도 프로필 창과 같은 넓은 틀을 쓴다 —
 * 왼쪽 머리 칸(사진 · 이름 · 직책 · AI 한 줄 · [1on1]·[메시지]) + 오른쪽 세그먼트 탭. 틀·머리·탭 내용은
 * `components/profile/` 의 공용 부품이고, 이 파일은 팀원 데이터를 그 부품에 꽂는 일만 한다.
 *
 * 헤더의 [1on1]·[메시지] 는 `MemberCard` 의 같은 이름 버튼과 동일한 콜백 이름을 받는다
 * (`onOneOnOneClick` / `onMessageClick`) — 소비자가 카드와 모달에 같은 핸들러를 물릴 수
 * 있게 하기 위함이다. 콜백을 안 넘기면(데모) 눌러도 아무 일도 일어나지 않는다.
 *
 * 「인사정보」 탭의 줄은 오른쪽 끝에 작은 버튼(`row.action`)을 둘 수 있다 — 직함 줄의
 * [고치기](PW-1094)가 그렇다. 누르면 `onHrRowAction(member, row.key)` 를 부른다. 1on1·메시지와
 * 달리 **이 모달을 닫지 않는다** — 소비자가 띄우는 창은 이 패널 위에 뜨고 패널은 그대로 둔다.
 *
 * 탭은 데이터가 있을 때만 낸다 — 아직 안 실어 보내는 화면에서 빈 탭이 늘어나지 않게 (PW-182·452).
 * AI 브리핑만은 늘 있다(이 창의 첫 탭이자 기본 탭).
 */
export default function ProfileModal({
  member,
  onClose,
  baseUrl = '',
  icons,
  onOneOnOneClick,
  onMessageClick,
  onHrRowAction,
  onHrProfileRetry,
  onOneOnOneRetry,
  onSnippetsMore,
  // 「액션 아이템」 탭 맨 아래 [더 보기] (pivit-work PW-1941) — `profile.actionItems.more` 가 있을 때만 그린다
  onActionItemsMore,
  // 「AI 브리핑」 탭 생성·새로고침·재생성 / 불러오기 다시 시도 (pivit-work PW-1531) — `profile.aiBriefing` 이 있을 때만 쓴다
  onAiBriefingGenerate,
  onAiBriefingReload,
  // 「AI 브리핑」 탭 브리핑 카드 바로 아래 칸 — 호스트의 체험 AI 소진 안내 등 (PW-1531)
  aiBriefingNotice,
  // 탭을 옮기면 그 탭 키를 알린다 — 호스트가 펼쳐 둔 것을 접는다
  // (pivit-work PW-2702 · 기획 매니저 뷰 §6-4-B «상태 유지» «탭을 옮기면 모두 접힌다»)
  onTabChange,
  // 화면 문구 묶음 — 키는 `DEFAULT_PROFILE_TAB_LABELS`. 빠진 키는 기본 한국어 (PW-2216).
  labels,
}) {
  const L = { ...DEFAULT_PROFILE_TAB_LABELS, ...(labels ?? {}) };
  const [activeTab, setActiveTab] = useState('ai');
  const scrollWrapRef = useRef(null);

  const [displayMember, setDisplayMember] = useState(member);
  if (member && member !== displayMember) setDisplayMember(member);

  // 머리 사진 — 팀원의 avatar. 예전 3D 텍스처용 `splineImage` 를 넘기던 호출도 그대로 사진으로 쓴다.
  // 둘 다 없거나 못 불러오면 이름 글자 원(Avatar) — 남의 기본 얼굴을 빌리지 않는다.
  const photoSrc = displayMember?.avatar || displayMember?.splineImage || null;

  // 다른 팀원으로 열릴 때만 맨 위로 — 호스트는 탭 상태(「AI 브리핑」 생성 중 등)가 바뀔 때마다 팀원 값을 새로
  // 만들어 넘긴다. 값 자체를 보면 버튼을 누를 때마다 창이 맨 위로 튄다 (pivit-work PW-1531).
  const openMemberId = member?.id ?? null;
  useEffect(() => {
    if (openMemberId != null && scrollWrapRef.current) scrollWrapRef.current.scrollTop = 0;
  }, [openMemberId]);

  const isOpen = !!member;
  const profile = displayMember?.profile;
  // [1on1] 은 뷰어가 이 팀원의 조직장일 때만 (pivit-work PW-2486). 없으면 [메시지]가 줄을 쓴다.
  const canOneOnOne = displayMember?.canOneOnOne !== false;
  const agendas = profile?.agendas ?? [];

  const available = {
    hr: !!profile?.hrProfile,
    ai: true,
    snippet: !!profile?.snippets,
    health: !!profile?.healthTrend,
    oneonone: !!profile?.oneOnOne,
    action: !!profile?.actionItems,
  };
  const tabLabel = { hr: L.tabHr, ai: L.tabAi, snippet: L.tabSnippet, health: L.tabHealth, oneonone: L.tabOneOnOne, action: L.tabAction };
  const tabs = PROFILE_TABS.filter((key) => available[key]).map((key) => ({ value: key, label: tabLabel[key] }));
  const tab = available[activeTab] ? activeTab : 'ai';

  const hr = profile?.hrProfile;
  const hrSections = (hr?.sections ?? []).map((s) => ({
    key: s.key,
    label: s.title,
    rows: (s.rows ?? []).map((r) => ({ key: r.key, label: r.label, content: r.value, action: r.action })),
  }));

  return (
    <ProfileCardFrame
      open={isOpen}
      onClose={() => onClose?.()}
      closeLabel={L.close}
      scrollRef={scrollWrapRef}
      aside={(
        <ProfileCardHeader
          name={displayMember?.name}
          photo={photoSrc}
          photoLabel={L.photoView}
          closeLabel={L.close}
          title={displayMember?.role}
          note={profile?.aiRecommendation}
          noteTone="ai"
          actions={(
            <>
              {canOneOnOne && (
                <button type="button" className="profile-btn-primary" onClick={onOneOnOneClick}>
                  <Icon src={icons?.userOutline} size={20} color="var(--text-white)" baseUrl={baseUrl} />
                  <span>1on1</span>
                </button>
              )}
              <button type="button" className="profile-btn-secondary" onClick={onMessageClick}>
                <Icon src={icons?.messageText} size={20} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
                <span>{L.message}</span>
              </button>
            </>
          )}
        />
      )}
    >
      {/* 공용 SegmentedControl(PW-836) — 디자이너가 이 창에 그린 탭 줄(17873:33231): 줄 폭 가득, 칸은 글자 폭만큼.
          데이터가 있는 탭이 하나뿐이면 고를 것이 없으니 줄을 그리지 않고 내용만 놓는다. */}
      {tabs.length > 1 && (
        <div className="profile-seg-dock">
        <SegmentedControl
          block
          className="profile-seg"
          ariaLabel={L.tabsAriaLabel}
          items={tabs}
          value={tab}
          onChange={(key) => {
            setActiveTab(key);
            onTabChange?.(key);
          }}
        />
        </div>
      )}

      {tab === 'hr' && hr && (
        <HrInfoTab
          sections={hrSections}
          status={{ loading: hr.loading, loadingLabel: hr.loadingLabel, error: hr.error, personalError: hr.personalError }}
          onRetry={onHrProfileRetry}
          onRowAction={(sectionKey, rowKey) => onHrRowAction?.(displayMember, rowKey)}
        />
      )}
      {tab === 'ai' && profile && (
        <AiBriefingTab
          profile={profile}
          agendas={agendas}
          icons={icons}
          baseUrl={baseUrl}
          onGenerate={onAiBriefingGenerate}
          onReload={onAiBriefingReload}
          notice={aiBriefingNotice}
          labels={L}
        />
      )}
      {tab === 'snippet' && profile?.snippets && (
        <SnippetTab profile={profile} icons={icons} baseUrl={baseUrl} onMore={onSnippetsMore} labels={L} />
      )}
      {tab === 'health' && profile?.healthTrend && (
        <HealthTrendTab trend={profile.healthTrend} labels={L} />
      )}
      {tab === 'oneonone' && profile?.oneOnOne && (
        <OneOnOneTab
          data={profile.oneOnOne}
          onSchedule={canOneOnOne ? onOneOnOneClick : undefined}
          onRetry={onOneOnOneRetry}
          labels={L}
        />
      )}
      {tab === 'action' && profile?.actionItems && (
        <ActionItemsTab data={profile.actionItems} onMore={onActionItemsMore} labels={L} baseUrl={baseUrl} />
      )}
    </ProfileCardFrame>
  );
}
