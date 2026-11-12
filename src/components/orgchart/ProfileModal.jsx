import { useState, useEffect, useRef, useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import Avatar from '../shared/Avatar.jsx';
import PhotoOr from './PhotoOr.jsx';
import { ChairGlyph, CheckGlyph, ClockGlyph, MapPinGlyph, PencilGlyph, SettingsGlyph } from '../shared/lineIcons.jsx';
import { MEMBER_STATUSES } from './constants.js';
import { useOrgLabels, makeOrgLabels } from './orgchart-labels.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Stack from '../shared/Stack.jsx';
import OkrProgressBar from '../okr/OkrProgressBar.jsx';
import DateInput from '../shared/DateInput.jsx';
import Skeleton, { SkeletonList } from '../shared/Skeleton.jsx';
import ProfileCardFrame from '../profile/ProfileCardFrame.jsx';
import ProfileCardHeader from '../profile/ProfileCardHeader.jsx';
import HrInfoTab from '../profile/HrInfoTab.jsx';
import AiBriefingTab from '../profile/AiBriefingTab.jsx';
import SnippetTab from '../profile/SnippetTab.jsx';
import HealthTrendTab from '../profile/HealthTrendTab.jsx';
import OneOnOneTab from '../profile/OneOnOneTab.jsx';
import ActionItemsTab from '../profile/ActionItemsTab.jsx';
import { DEFAULT_PROFILE_TAB_LABELS, PROFILE_PHOTO_RADIUS, PROFILE_PHOTO_SIZE, PROFILE_TABS } from '../profile/constants.js';

const DEFAULT_PROFILE = {
  title: '사원',
  dept: '경영지원본부',
  bio: '열정적으로 업무에 임하고 있습니다.',
  skills: '경영전략 • 기획 • 매니징 • IR',
  contacts: '@woojin.kim\nmanager1@pivit.com',
  links: ['https://woojin.dev', 'https://github.com/woojin-kim'],
  teamMembers: [],
  employeeId: 'PVT-008',
  hireDate: '2026-05-02',
  phone: '010-1234-5678',
  employmentType: '정규직',
  rank: 'L3',
  workHours: '10-7',
};

// 값이 없는 칸의 표시 — 기획서 퍼블릭 카드 🔒 섹션과 같은 `—` (pivit-work PW-1064).
// 예전엔 빈 칸에 데모 값(사번 PVT-008·전화 010-1234-5678·직급 L3·업무시간 10-7·정규직)을
// 채워 보여서, 어드민이 남의 가짜 전화번호·사번을 실제 값으로 읽었다.
const EMPTY_VALUE = '—';
const shown = (v) => (v == null || v === '' ? EMPTY_VALUE : v);

// 소비자가 `profile` 을 안 넘긴 사람의 카드 — 데모 값(DEFAULT_PROFILE) 대신 빈 값으로 그린다.
const EMPTY_PROFILE = { title: '', dept: '', bio: '', skills: '', contacts: '', links: [], teamMembers: [] };

/**
 * 조직도 프로필 창 — Figma 17873:33191~34118 «profile_card modal 2» (2026-11-12).
 *
 * 1297 폭의 넓은 창. 왼쪽 410 칸은 사진(130 · 모서리 46) · 이름 · 직책 ∙ 소속 · 소개 · 근무 상태 · 통계 · 버튼,
 * 오른쪽은 세그먼트 탭 — «인사정보»(기본정보 하위 탭 + 호스트가 준 인사 묶음) · AI 브리핑 · 스니핏 · 헬스 트렌드 ·
 * 원온원 · 액션 아이템. 인사정보 말고는 `profile` 에 그 데이터가 있을 때만 탭이 선다.
 * 틀·머리·탭 내용은 `components/profile/` 의 공용 부품이고(매니저 팀원 창과 같다), 이 파일은 조직도 카드
 * 데이터를 그 부품에 꽂는 일만 한다.
 *
 * 예전 432 폭 세로 창(금색 그라데이션 + Spline 3D 육각 아바타, 아래로 길게 늘어선 정보 구획)은 사라졌다.
 */
// onFeedbackClick / onMeetingClick — 액션 버튼(피드백주기·미팅잡기) 콜백.
// 미지정이면 지금까지처럼 아무 동작도 하지 않는다(시각·레이아웃 변화 없음).
// isSelf — 본인 카드. 나에게 피드백을 주거나 나와 미팅을 잡을 수는 없으므로
// 퇴사·휴직과 같은 비활성 표시를 재사용한다(PW-28).
// resolvePhoto — 머리 사진 주소를 소비자가 구해 줄 때 쓴다. `(member) => url | null | Promise<url | null>`.
// 미지정이면 `member.avatar` 를 그대로 쓴다. 사진이 없거나(null·실패) 못 불러오면 이름 글자 원(Avatar)이 선다.
// 새 멤버로 열리면 그 사람 사진이 올 때까지 글자 원을 보여 앞사람 얼굴이 비치지 않게 한다.
// renderAvatar — 사진 자리를 소비자가 통째로 그릴 때. `(member) => node`.
// statIcons — 예전 3D 배지 PNG 묶음. 통계 줄 아이콘이 디자이너 선 아이콘(user-03 · layers-three-02 · clock)으로
// 바뀌어 더는 읽지 않는다 — 소비자가 넘겨도 무시한다(넘기던 호출이 깨지지 않게 자리만 남긴다).
// hideFeedback — 피드백주기 버튼을 그리지 않는다(팀 피드백을 쓰지 않는 사람 — 조직장이 아닌 어드민 · 기획 TC-FB-014).
// actions — 피드백주기·미팅잡기 대신 그 자리에 놓을 버튼들. `[{ key, label, onClick(member), variant, testId }]`.
// variant 'primary' 는 피드백주기, 그 밖은 미팅잡기와 같은 모양이다 — 새 모양을 만들지 않는다.
// 어드민 조직단위 설정이 조직장 카드에 «변경»·«해제»를 붙이려고 쓴다(PW-1303). 관리 동작이라
// 본인·퇴사·휴직이어도 막지 않는다(퇴사한 조직장도 해제할 수 있어야 한다).
// 미지정이면 지금까지처럼 피드백주기·미팅잡기다(시각·레이아웃 변화 없음).
// slackDmUrl — 연락처의 슬랙 핸들을 누르면 열 DM 주소(PW-1636). member.profile.slack·email 을 주면 연락처가 눌리는 줄이 된다.
// workHours — 오늘 근무시간 칸(pivit-work PW-1479 · 근무시간 조정 정책서 §2-1). 모두 선택이고, 안 주면 지금까지 그대로다.
//   { value, badge, note, onEdit, editLabel, editDisabled, editing, panel }
//   value — `profile.workHours` 대신 보일 값(오늘 조정된 근무시간) · badge — 값 아래 «오늘 변경됨» 노란 딱지 문구
//   note — 조정 메모. 값에 마우스를 올리면 뜬다 · onEdit — 본인 카드(isSelf)에서만 값이 눌리고 연필이 붙는다
//   editDisabled — 오늘 휴가처럼 고칠 수 없을 때 · editing — 창이 열려 칸을 강조 · panel — 칸 아래 펼칠 창(WorkHoursAdjustPanel)
//   absent — 오늘 휴가라 value 자리에 근무시간 대신 «부재중»을 회색으로 보인다(pivit-work PW-2210 · 정책서 §3 「당일 휴가」)
// cardStatus — 'loading' | 'error'. 소비자가 카드 칸을 받는 중·못 받았을 때 준다(pivit-work PW-2665). 주면 member 가 없어도 창이 열리고
//   카드 자리 전체를 스켈레톤(loading) 또는 cardError(error)로 바꾼다. 닫기 X·바깥 누르기는 그대로. 안 주면 지금까지 그대로다.
// cardError — error 일 때 카드 자리에 놓을 안내(번역된 문구 + 다시 시도 버튼). 소비자가 그려 준다.
// 오른쪽 탭 데이터 — `profile.aiBriefing | aiBrief`(+ agendas · metrics) · `profile.snippets`(+ snippetsSummary · snippetsMore) ·
//   `profile.healthTrend` · `profile.oneOnOne` · `profile.actionItems` · `profile.hrProfile`(인사정보 하위 탭 묶음) —
//   모양·약속은 매니저 팀원 창과 같다(`components/profile/*Tab.jsx` 주석). 콜백도 같은 이름이다:
//   onAiBriefingGenerate · onAiBriefingReload · aiBriefingNotice · onSnippetsMore · onActionItemsMore · onOneOnOneRetry ·
//   onHrProfileRetry · onHrRowAction(member, rowKey) · icons(summarySparkle 등).
/** «성과 정보» 한 줄. 문구는 소비자가 번역해서 준다 — 막대 · 알약 · 안내 글 셋 중 하나. */
function PerformanceRow({ row }) {
  const testId = `profile-performance-${row.key}`;
  if (row.note) return <div className="profile-perf-note" data-testid={testId}>{row.note}</div>;
  if (row.percent != null) {
    return (
      <Stack gap="xs" testId={testId}>
        <div className="profile-perf-head">
          <span className="okr-p-overall-label">{row.label}</span>
          <span className={`okr-group-percent is-${row.variant}`}>{row.percent}%</span>
        </div>
        <OkrProgressBar percent={row.percent} variant={row.variant} />
      </Stack>
    );
  }
  return (
    <div className="profile-perf-inline" data-testid={testId}>
      <span className="okr-p-overall-label">{row.label}</span>
      {row.tone
        ? <StatusBadge tone={row.tone} className="modal-health-chip profile-perf-chip">{row.check && <CheckGlyph size={12} />}{row.text}</StatusBadge>
        : <span className="profile-perf-note">{row.text}</span>}
    </div>
  );
}

export default function ProfileModal({ member, onClose, statIcons, baseUrl = '', renderAvatar, resolvePhoto, adminMode = false, findSubordinates, showSubordinates = true, subordinatesTitle, directReportChipLabel, onFeedbackClick, onMeetingClick, isSelf = false, labels, actions, hideFeedback = false, slackDmUrl, managerHistory, asOf, onEditVisibility, editVisibilityLabel, workHours, cardStatus, cardError, icons, onAiBriefingGenerate, onAiBriefingReload, aiBriefingNotice, onSnippetsMore, onActionItemsMore, onOneOnOneRetry, onHrProfileRetry, onHrRowAction }) {
  // 화면 문구 — 조직도 캔버스 안에서 열리면 캔버스가 받은 번역을 쓰고, 캔버스 밖(소비자가
  // 따로 띄우는 카드)에서는 `labels` 로 받는다(PW-705). 둘 다 없으면 한국어 기본값.
  // `subordinatesTitle`·`directReportChipLabel`(PW-546)은 주면 그것이 이긴다.
  const ctxL = useOrgLabels();
  const ownL = useMemo(() => (labels ? makeOrgLabels(labels) : null), [labels]);
  const L = ownL || ctxL;
  // 오른쪽 탭 부품의 문구 묶음 — `profile.<키>` 로 같은 사전에서 꺼낸다.
  const TL = useMemo(
    () => Object.fromEntries(Object.keys(DEFAULT_PROFILE_TAB_LABELS).map((k) => [k, L(`profile.${k}`)])),
    [L],
  );
  const scrollWrapRef = useRef(null);
  const [activeTab, setActiveTab] = useState('hr');
  // 닫힘 애니메이션 중에도 마지막 멤버 콘텐츠가 계속 보이도록 state 로 유지.
  // "Adjusting state while rendering" 패턴으로 member prop 변화에 맞춰 갱신.
  const [displayMember, setDisplayMember] = useState(member);
  if (member && member !== displayMember) setDisplayMember(member);

  // 소비자가 구해 준 사진 — `{ for: member, src }`. 지금 멤버 것일 때만 쓴다(앞사람 사진이 비치지 않게).
  const [resolved, setResolved] = useState(null);
  useEffect(() => {
    if (!resolvePhoto || !member) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => resolvePhoto(member))
      .catch(() => null)
      .then((src) => { if (!cancelled) setResolved({ for: member, src: src || null }); });
    return () => { cancelled = true; };
  }, [resolvePhoto, member]);
  const photoSrc = resolvePhoto
    ? (resolved?.for === displayMember ? resolved.src : null)
    : (displayMember?.avatar || null);

  // 새 멤버로 열릴 때 스크롤 위치 초기화.
  useEffect(() => {
    if (member && scrollWrapRef.current) {
      scrollWrapRef.current.scrollTop = 0;
    }
  }, [member]);
  const profile = displayMember?.profile || EMPTY_PROFILE;
  // 카드 칸을 받는 중·못 받았을 때도 창은 연다 — 카드 자리는 CardStatusBlock 이 대신한다(pivit-work PW-2665).
  const isOpen = !!member || !!cardStatus;

  const statusBadge = (
    <StatusBadge className="modal-status-badge">{L(`member.status.${MEMBER_STATUSES[displayMember?.status] ? displayMember.status : 'working'}`)}</StatusBadge>
  );

  // ── 왼쪽 머리 칸 ──
  const stats = [
    ...(adminMode ? [
      {
        key: 'employment',
        icon: <Icon src="/icons-solid/user-03.svg" size={24} color="var(--fg-primary)" baseUrl={baseUrl} />,
        label: L('profile.employmentType'),
        value: <div className="profile-stat-value">{shown(profile.employmentType)}</div>,
      },
      {
        key: 'rank',
        icon: <Icon src="/icons-solid/layers-three-02.svg" size={24} color="var(--fg-primary)" baseUrl={baseUrl} />,
        label: L('profile.rank'),
        value: <div className="profile-stat-value">{shown(profile.rank)}</div>,
        // 본인이 직급을 비공개로 둔 사람 — 어드민이 이 값을 남에게 전해도 되는지 판단하게
        // 「본인이 비공개로 설정함」을 값 아래 작게 붙인다(기획서 public-card 정책서 AdminOrgInfoBlock ·
        // 시안 org-chart-app.jsx). 값 옆에 이어 붙이면 칸이 넓어져 옆 칸 글자가 중간에서 꺾였다.
        note: profile.rankNote,
        noteTestId: 'profile-rank-note',
      },
    ] : []),
    {
      key: 'workHours',
      icon: <Icon src="/icons-solid/clock.svg" size={24} color="var(--fg-primary)" baseUrl={baseUrl} />,
      label: L('profile.workHours'),
      value: <WorkHoursValue value={shown(workHours?.value ?? profile.workHours)} workHours={workHours} isSelf={isSelf} />,
    },
  ];

  let actionButtons;
  let actionsClassName = '';
  if (actions && actions.length > 0) {
    actionButtons = actions.map((action) => (
      <button
        key={action.key}
        type="button"
        className={action.variant === 'primary' ? 'profile-btn-primary' : 'profile-btn-secondary'}
        data-testid={action.testId}
        onClick={() => action.onClick(displayMember)}
      >
        {action.label}
      </button>
    ));
  } else {
    const isDisabled =
      isSelf ||
      displayMember?.status === 'resigned' ||
      displayMember?.status === 'leave';
    actionsClassName = isDisabled ? 'is-disabled' : '';
    actionButtons = (
      <>
        {!hideFeedback && (
          <button
            type="button"
            className="profile-btn-primary"
            disabled={isDisabled}
            onClick={onFeedbackClick ? () => onFeedbackClick(displayMember) : undefined}
          >
            <Icon src="/icons-solid/send-03.svg" size={20} baseUrl={baseUrl} />
            {L('profile.feedback')}
          </button>
        )}
        <button
          type="button"
          className="profile-btn-secondary"
          disabled={isDisabled}
          onClick={onMeetingClick ? () => onMeetingClick(displayMember) : undefined}
        >
          <Icon src="/icons-solid/calendar-heart-02.svg" size={20} baseUrl={baseUrl} />
          {L('profile.meeting')}
        </button>
      </>
    );
  }

  const header = (
    <ProfileCardHeader
      name={displayMember?.name}
      photo={photoSrc}
      renderPhoto={renderAvatar ? () => renderAvatar(displayMember) : undefined}
      photoLabel={TL.photoView}
      closeLabel={TL.close}
      // 둘 중 하나가 비어도 ' · ' 만 남지 않게 조립한다 — 직급·직책이 없거나
      // 비공개인 사람의 카드에서 구분자가 매달려 보였다.
      title={[profile.title, profile.affiliations ? '' : profile.dept].filter(Boolean).join(' · ')}
      afterTitle={profile.affiliations?.length > 0 && (
        <ul className="profile-affiliations" data-testid="profile-affiliations" aria-label={L('profile.affiliations')}>
          {profile.affiliations.map((a) => (
            <li key={a.id} className="profile-affiliation-row">
              {a.name}
              {a.isPrimary && <StatusBadge tone="neutral" className="modal-team-chip">{L('profile.primary')}</StatusBadge>}
              {a.isLeader && <StatusBadge tone="neutral" className="modal-team-chip">{L('profile.leader')}</StatusBadge>}
            </li>
          ))}
        </ul>
      )}
      note={profile.bio}
      // 헬스체크 점수 칩 — 카드 주인이 공개를 켰고 점수가 있을 때만 소비자가 `profile.healthChip`
      // (`{ value, tone }`)을 준다. 근무 상태 배지 옆 같은 알약 모양, 색은 뜻(tone)이 정한다
      // (pivit-work PW-2226 · 기획 조직도 screen-member §2-3). 없으면 배지만 종전 그대로 그린다.
      badge={profile.healthChip ? (
        <div className="profile-badge-row">
          {statusBadge}
          <StatusBadge tone={profile.healthChip.tone} className="modal-health-chip" data-testid="profile-health-chip">
            {L('profile.healthCheck')} {profile.healthChip.value}
          </StatusBadge>
        </div>
      ) : statusBadge}
      // 현지 시간 — 카드 주인이 공개했고 시간대가 있을 때만 소비자가 `profile.localTime` 을 준다.
      // 없으면 줄째 그리지 않는다(pivit-specs Public-Card 정책 §2 LocalTimeRow, PW-1217).
      afterBadge={profile.localTime && (
        <div className="profile-local-time" data-testid="profile-local-time">
          <ClockGlyph size={14} />
          <span>{L('profile.localTime')}</span>
          <span className="profile-local-time-value">{profile.localTime}</span>
        </div>
      )}
      stats={stats}
      afterStats={workHours?.panel}
      actions={actionButtons}
      actionsClassName={actionsClassName}
    />
  );

  // ── 오른쪽 «인사정보» 탭 — 기본정보 줄들 ──
  const subs = showSubordinates && findSubordinates ? findSubordinates(displayMember) : [];
  const teamList = showSubordinates ? (subs.length > 0 ? subs : (profile.teamMembers || [])) : [];
  const basicRows = [
    ...(adminMode ? [
      { key: 'employeeNo', label: L('profile.employeeNo'), content: shown(profile.employeeId) },
      { key: 'joinedAt', label: L('profile.joinedAt'), content: shown(profile.hireDate) },
      { key: 'phone', label: L('profile.phone'), content: shown(profile.phone) },
      // 헬스체크 — 어드민은 카드 주인의 공개 여부와 무관하게 본다. 본인이 꺼 두었으면 소비자가
      // `profile.healthCheckNote`(「본인이 비공개로 설정함」)를 준다 (pivit-work PW-2226).
      {
        key: 'healthCheck',
        label: L('profile.healthCheck'),
        testId: 'profile-health-check',
        content: [shown(profile.healthCheck), profile.healthCheck != null && profile.healthCheck !== '' ? profile.healthCheckNote : null].filter(Boolean).join(' · '),
      },
    ] : []),
    { key: 'skills', label: L('profile.skills'), content: profile.skills },
    // 담당 프로젝트 — 공개했고 한 건 이상일 때만. 이름 문자열 또는 `{ name }` (PW-1217).
    // 색 점 없이 이름만 — 같은 창 «연락처»«링크» 줄과 같은 글자 (PW-1514).
    ...(profile.projects?.length > 0 ? [{
      key: 'projects',
      label: L('profile.projects'),
      testId: 'profile-projects',
      content: (
        <ul className="profile-project-list">
          {profile.projects.map((p, i) => {
            const name = typeof p === 'string' ? p : p?.name;
            if (!name) return null;
            return <li key={i} className="profile-project-item profile-project-name">{name}</li>;
          })}
        </ul>
      ),
    }] : []),
    {
      key: 'contact',
      label: L('profile.contact'),
      content: (
        <>
          {profile.slack || profile.email ? (
            // 슬랙·이메일을 따로 받으면 눌리는 줄로 그린다(공개 카드 정책서 §4 — 핸들 → 슬랙 DM, 이메일 → mailto · PW-1636).
            // 슬랙 DM 주소(slackDmUrl prop — 멤버와 따로 받는다: 멤버 객체가 바뀌면 창이 새로 열린 것으로 본다)를
            // 못 받은 사람은 핸들을 글자로만 둔다 — 눌러도 아무 데도 안 가는 링크를 만들지 않는다.
            // 모양은 아래 «링크» 줄과 같은 profile-link 다(새 모양을 만들지 않는다).
            <div className="profile-contacts">
              {profile.slack && (slackDmUrl ? (
                <a className="profile-link" href={slackDmUrl} target="_blank" rel="noopener noreferrer" data-testid="profile-contact-slack">
                  {profile.slack}
                </a>
              ) : (
                <div data-testid="profile-contact-slack">{profile.slack}</div>
              ))}
              {profile.email && (
                <a className="profile-link" href={`mailto:${profile.email}`} data-testid="profile-contact-email">
                  {profile.email}
                </a>
              )}
            </div>
          ) : (
            <div className="profile-contacts">{profile.contacts}</div>
          )}
          {/* 자리 — 회사가 정한 자리 한 줄(빌딩 · 층 · 책상 · 자리 유형). 이메일 바로 다음 · 본인 공개 «위치»보다 먼저 ·
              전 역할 항상 공개 · 값이 없으면 줄 없음(PW-2600 · 조직도 screen-member.policy v1.25 §2-3 «자리 한 줄»).
              모양은 아래 «위치» 줄과 같은 profile-location 줄이고 아이콘만 의자로 가른다(한 카드에 같은 아이콘 두 줄 금지).
              누를 수 없는 글자이고, 마우스를 올리면 «자리» 툴팁만(screen-member.policy §4). 선 아이콘은 기본이
              aria-hidden 이라 aria-label 만 주면 읽히지 않는다 — 이 아이콘은 줄의 이름이라 그림으로 드러낸다. */}
          {profile.seat && (
            <div className="profile-location" data-testid="profile-seat" title={L('profile.seat')}>
              <ChairGlyph size={16} role="img" aria-hidden={false} aria-label={L('profile.seat')} />
              <span>{profile.seat}</span>
            </div>
          )}
          {/* 근무지 — 공개했고 값이 있을 때만 연락처 아래 핀 줄로(PW-1217). */}
          {profile.location && (
            <div className="profile-location" data-testid="profile-location">
              <MapPinGlyph size={16} aria-label={L('profile.location')} />
              <span>{profile.location}</span>
            </div>
          )}
        </>
      ),
    },
    {
      key: 'links',
      label: L('profile.links'),
      content: (
        <div className="profile-links">
          {(profile.links || []).map((link, i) => (
            <a key={i} className="profile-link" href={link} target="_blank" rel="noopener noreferrer">
              {link}
              <Icon src="/icons/arrow-up-right.svg" size={12} color="var(--text-tertiary)" baseUrl={baseUrl} />
            </a>
          ))}
        </div>
      ),
    },
    // 성과 정보 (pivit-work PW-2531) — 보는 사람 몫이 있을 때만 소비자가 `profile.performance` 를 준다.
    // 없으면 자리도 남기지 않는다. 이름표·숫자·막대는 디자이너 OKR 화면 값(okr.css), 표시는 같은 창 헬스체크 칩 알약을 쓴다.
    ...(profile.performance?.rows?.length > 0 ? [{
      key: 'performance',
      label: profile.performance.title,
      testId: 'profile-performance',
      content: (
        <Stack gap="lg">
          {profile.performance.rows.map((row) => <PerformanceRow key={row.key} row={row} />)}
        </Stack>
      ),
    }] : []),
    // 매니저 이력 · 날짜별 소속·직급 (pivit-work PW-1837) — 소비자가 볼 수 있는 사람에게만 넘긴다. 안 넘기면 줄이 없다.
    ...managerHistoryRow(managerHistory, L),
    ...asOfRow(asOf, L),
    // 직속팀원 — 조직 트리(findSubordinates) 또는 profile.teamMembers. showSubordinates=false 면(조직 계층 맥락이 아닌 곳,
    // 예: 어드민 개요) 줄을 숨긴다. 제목은 소비자가 로케일로 준다 — 조직 없이 바로 보고하는 사람(COS·비서)도 섞이므로
    // 「팀원」이 맞지 않는 곳이 있다(pivit-specs spec-org-hierarchy-exceptions.md §5 F9).
    ...(teamList.length > 0 ? [{
      key: 'team',
      label: (
        <>
          {subordinatesTitle || L('profile.directReports')}
          <span className="profile-row-count">{L('profile.peopleCount', { count: teamList.length })}</span>
        </>
      ),
      testId: 'profile-team',
      content: (
        <div className="profile-team-grid">
          {teamList.map((tm, i) => (
            <div key={i} className="profile-team-member">
              <div className="profile-team-avatar-wrap">
                <PhotoOr src={tm.avatar} className="profile-team-avatar" fallback={<Avatar name={tm.name} size={48} className="profile-team-avatar" />} />
                <span className={`profile-team-dot ${tm.online ? 'online' : 'offline'}`} />
              </div>
              <div className="profile-team-name">{tm.name}</div>
              {/* 조직 단위 없이 바로 보고하는 사람(직속 칸)에만 붙는다 — 조직 소속과 가른다. */}
              {tm.isDirectReport && <StatusBadge className="modal-team-chip">{directReportChipLabel || L('profile.directReportChip')}</StatusBadge>}
              <div className="profile-team-role">{tm.role || L('profile.roleDefault')}</div>
            </div>
          ))}
        </div>
      ),
    }] : []),
  ];

  // 호스트가 준 인사정보 묶음(조직·재직 정보 · 개인 정보 · 학력 · 경력 · 자격증 · 교육)이 기본정보 뒤에 하위 탭으로 선다.
  const hr = profile.hrProfile;
  const hrSections = [
    { key: 'basic', label: TL.basicInfo, rows: basicRows },
    ...(hr?.sections ?? []).map((s) => ({
      key: s.key,
      label: s.title,
      rows: (s.rows ?? []).map((r) => ({ key: r.key, label: r.label, content: r.value, action: r.action })),
    })),
  ];

  const available = {
    hr: true,
    ai: !!(profile.aiBriefing || profile.aiBrief),
    snippet: !!profile.snippets,
    health: !!profile.healthTrend,
    oneonone: !!profile.oneOnOne,
    action: !!profile.actionItems,
  };
  const tabLabel = { hr: TL.tabHr, ai: TL.tabAi, snippet: TL.tabSnippet, health: TL.tabHealth, oneonone: TL.tabOneOnOne, action: TL.tabAction };
  const tabs = PROFILE_TABS.filter((key) => available[key]).map((key) => ({ value: key, label: tabLabel[key] }));
  const tab = available[activeTab] ? activeTab : 'hr';

  return (
    <ProfileCardFrame
      open={isOpen}
      onClose={onClose}
      closeLabel={TL.close}
      scrollRef={scrollWrapRef}
      className={cardStatus ? 'is-status' : ''}
      aside={cardStatus ? null : (
        <>
          {isSelf && onEditVisibility && (
            <button type="button" className="profile-close profile-visibility" aria-label={editVisibilityLabel} title={editVisibilityLabel} onClick={onEditVisibility} data-testid="profile-edit-visibility">
              <SettingsGlyph size={20} />
            </button>
          )}
          {header}
        </>
      )}
    >
      {cardStatus ? <CardStatusBlock status={cardStatus} error={cardError} onClose={onClose} /> : (
        <>
          {/* 공용 SegmentedControl(PW-836) — 디자이너가 이 창에 그린 탭 줄(17873:33231): 줄 폭 가득, 칸은 글자 폭만큼.
              데이터가 있는 탭이 하나뿐이면 고를 것이 없으니 줄을 그리지 않고 내용만 놓는다. */}
          {tabs.length > 1 && (
            <div className="profile-seg-dock">
            <SegmentedControl
              block
              className="profile-seg"
              ariaLabel={TL.tabsAriaLabel}
              items={tabs}
              value={tab}
              onChange={setActiveTab}
            />
            </div>
          )}
          {tab === 'hr' && (
            <HrInfoTab
              sections={hrSections}
              status={hr ? { loading: hr.loading, loadingLabel: hr.loadingLabel, error: hr.error, personalError: hr.personalError } : undefined}
              onRetry={onHrProfileRetry}
              onRowAction={(sectionKey, rowKey) => onHrRowAction?.(displayMember, rowKey)}
            />
          )}
          {tab === 'ai' && (
            <AiBriefingTab
              profile={profile}
              agendas={profile.agendas ?? []}
              icons={icons}
              baseUrl={baseUrl}
              onGenerate={onAiBriefingGenerate}
              onReload={onAiBriefingReload}
              notice={aiBriefingNotice}
              labels={TL}
            />
          )}
          {tab === 'snippet' && (
            <SnippetTab profile={profile} icons={icons} baseUrl={baseUrl} onMore={onSnippetsMore} labels={TL} />
          )}
          {tab === 'health' && <HealthTrendTab trend={profile.healthTrend} labels={TL} />}
          {tab === 'oneonone' && (
            <OneOnOneTab data={profile.oneOnOne} onRetry={onOneOnOneRetry} labels={TL} />
          )}
          {tab === 'action' && (
            <ActionItemsTab data={profile.actionItems} onMore={onActionItemsMore} labels={TL} baseUrl={baseUrl} />
          )}
        </>
      )}
    </ProfileCardFrame>
  );
}

/**
 * 카드 칸을 받는 중·못 받았을 때 카드 자리 전체를 대신한다(pivit-work PW-2665 · Public-Card 정책 §8 «카드 내용» 행 · §9).
 * loading — 사진·이름 줄·직책 줄·정보 줄 자리를 진짜 카드와 같은 크기로 깐다.
 * error — 소비자가 준 안내(`cardError` — 번역된 문구 + 다시 시도)를 그대로 놓는다.
 * 조직도가 가진 이름·연락처로 카드 일부를 채우지 않는다 — 비공개로 둔 것과 못 불러온 것을 가를 수 없게 된다.
 */
function CardStatusBlock({ status, error }) {
  const loading = status === 'loading';
  return (
    <div className="profile-card-status" aria-busy={loading} data-testid={loading ? 'profile-card-loading' : 'profile-card-failed'}>
      {loading ? (
        <>
          <Skeleton width={PROFILE_PHOTO_SIZE} height={PROFILE_PHOTO_SIZE} radius={PROFILE_PHOTO_RADIUS} className="profile-card-status-avatar" />
          <Skeleton width={140} height={24} className="profile-card-status-name" />
          <Skeleton width={180} height={14} />
          <SkeletonList count={3} height={52} className="profile-card-status-rows" />
        </>
      ) : (
        <div className="profile-card-status-error">{error}</div>
      )}
    </div>
  );
}

/**
 * 매니저 이력 줄 — 현재 매니저가 맨 위(초록 점 · 「현재」 칩), 지난 매니저는 받은 순서(최신순) 그대로.
 * history: { status: 'loading' | 'error' | 'ready', current: { name, since } | null, past: [{ name, from, to }] }
 * ready 인데 현재·지난 둘 다 없으면 줄을 그리지 않는다(정책서 «이력 없음 → 숨김»).
 */
function managerHistoryRow(history, L) {
  if (!history) return [];
  const { status, current, past = [] } = history;
  if (status === 'ready' && !current && past.length === 0) return [];
  const content = status === 'ready' ? (
    <ul className="profile-project-list">
      {current && (
        <li className="profile-project-item" data-testid="profile-manager-history-current">
          <span className="profile-project-dot profile-history-dot-current" />
          {current.name}
          <StatusBadge className="modal-team-chip">{L('profile.managerHistoryCurrent')}</StatusBadge>
          <span className="profile-history-period">{current.since ? `${current.since} ~` : ''}</span>
        </li>
      )}
      {past.map((m, i) => (
        <li key={i} className="profile-project-item" data-testid="profile-manager-history-row">
          <span className="profile-project-dot" />
          {m.name}
          <span className="profile-history-period">{`${m.from || ''} ~ ${m.to || ''}`}</span>
        </li>
      ))}
    </ul>
  ) : (
    <div className="profile-project-item profile-history-note" role={status === 'error' ? 'alert' : undefined}>
      {L(status === 'error' ? 'profile.managerHistoryError' : 'profile.managerHistoryLoading')}
    </div>
  );
  return [{ key: 'managerHistory', label: L('profile.managerHistory'), testId: 'profile-manager-history', content }];
}

/**
 * 날짜별 소속·직급 줄 — 날짜를 고르면 소비자가 그날 값을 받아 넘긴다.
 * asOf: { value, onChange, min, max, today, status: 'idle'|'loading'|'error'|'ready',
 *         result: { found, outOfRange, teamPath, jobLevel } }
 */
function asOfRow(asOf, L) {
  if (!asOf) return [];
  const { value, onChange, min, max, today, status = 'idle', result } = asOf;
  let body;
  if (status === 'loading' || status === 'error' || status === 'idle') {
    const key = status === 'loading' ? 'profile.asOfLoading' : status === 'error' ? 'profile.asOfError' : 'profile.asOfHint';
    body = (
      <div className="profile-project-item profile-history-note" role={status === 'error' ? 'alert' : undefined}>
        {L(key)}
      </div>
    );
  } else if (!result?.found) {
    body = (
      <div className="profile-project-item profile-history-note" data-testid="profile-asof-missing">
        {L(result?.outOfRange ? 'profile.asOfOutOfRange' : 'profile.asOfNotFound')}
      </div>
    );
  } else {
    body = (
      <ul className="profile-project-list" data-testid="profile-asof-result">
        <li className="profile-project-item">
          <span className="profile-history-key">{L('profile.asOfDept')}</span>
          {result.teamPath || L('profile.asOfEmpty')}
        </li>
        <li className="profile-project-item">
          <span className="profile-history-key">{L('profile.asOfLevel')}</span>
          {result.jobLevel || L('profile.asOfEmpty')}
        </li>
      </ul>
    );
  }
  const content = (
    <Stack gap="lg">
      <div className="profile-history-date">
        <DateInput
          className="profile-history-date-input"
          value={value || ''}
          onChange={onChange}
          min={min || undefined}
          max={max || undefined}
          today={today || undefined}
          aria-label={L('profile.asOfDate')}
        />
      </div>
      {body}
    </Stack>
  );
  return [{ key: 'asOf', label: L('profile.asOf'), testId: 'profile-asof', content }];
}

export { DEFAULT_PROFILE };

/**
 * 통계 줄의 근무시간 값 — 본인 카드면 눌러서 «근무시간 조정» 창을 연다(정책서 §4: 값을 누르거나 연필을 누르면 같은 동작).
 * 연필은 값 옆에 붙고, 마우스를 올리거나 칸에 초점이 오면 보인다(§2-1 «hover 시»). 고칠 수 없는 날(휴가)은 잠긴다.
 */
function WorkHoursValue({ value, workHours, isSelf }) {
  const badge = workHours?.badge ? (
    <StatusBadge tone="warning" className="modal-wh-badge" data-testid="profile-work-hours-badge">
      {workHours.badge}
    </StatusBadge>
  ) : null;
  const note = workHours?.note || undefined;
  if (isSelf && workHours?.onEdit) {
    return (
      <>
        <button
          type="button"
          className={`profile-stat-value modal-wh-edit ${workHours.editing ? 'is-editing' : ''} ${workHours.absent ? 'is-absent' : ''}`.replace(/\s+/g, ' ').trim()}
          onClick={workHours.onEdit}
          disabled={!!workHours.editDisabled}
          aria-expanded={!!workHours.editing}
          aria-label={workHours.editLabel ? `${workHours.editLabel} · ${value}` : undefined}
          title={note}
          data-testid="profile-work-hours-edit"
        >
          <span>{value}</span>
          <PencilGlyph size={12} className="modal-wh-pencil" />
        </button>
        {badge}
      </>
    );
  }
  return (
    <>
      <div className={`profile-stat-value${workHours?.absent ? ' is-absent' : ''}`} title={note} data-testid="profile-work-hours-value">{value}</div>
      {badge}
    </>
  );
}
