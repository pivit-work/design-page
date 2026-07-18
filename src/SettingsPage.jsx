import { useState } from 'react';
import { MySettingsCanvas } from './components/settings/index.js';
import './admin.css';
import './settings.css';

/**
 * 내 설정 데모 페이지 — MySettingsCanvas 의 배선 의도(정본).
 *
 * 실제 앱(pivit-work)에서는 각 콜백이 API 로 이어진다:
 * - onSaveProfile → PATCH /users/profile (+ preferences timezone)
 * - onAddPhoto / onDeletePhoto → POST /users/avatar / DELETE /users/avatar
 * - onToggleVisibility → PATCH /users/preferences { cardVisibility } (즉시 자동 저장)
 * - onToggleNotif(채널 키) → PATCH /users/preferences { notificationPrefs.channels }
 * - onConnect/Disconnect/SyncIntegration → OAuth 시작 / 해제 / 수동 sync
 * - onChangePassword → PATCH /users/change-password (실패 시 인라인 에러)
 */

const TIMEZONES = [
  { value: 'Asia/Seoul', label: '서울 (GMT+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (GMT+9)' },
  { value: 'Asia/Singapore', label: '싱가포르 (GMT+8)' },
  { value: 'America/New_York', label: '뉴욕 (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'LA (GMT-8)' },
  { value: 'Europe/London', label: '런던 (GMT+0)' },
  { value: 'UTC', label: 'UTC' },
];

const VIS_ALWAYS = ['이름', '직함', '소속 팀·부서', '상태 (재직/휴가 등)', '근무 시간'];
const VIS_OPTIONAL = [
  { key: 'bio', label: '소개 (Bio)', on: true },
  { key: 'skills', label: '스킬·전문 분야', on: true },
  { key: 'projects', label: '진행 중 프로젝트', on: false },
  { key: 'location', label: '위치', on: true },
  { key: 'links', label: '링크 (LinkedIn 등)', on: false },
  { key: 'time', label: '현지 시간', on: true },
];

const NOTIF_GROUPS_INIT = [
  {
    key: 'snippetHealth',
    title: '스니핏·헬스체크',
    items: [
      { key: 'snippet_remind', label: '스니핏 미제출 리마인더', sub: '오후 5시 이후 미제출 시 알림', on: true },
      { key: 'health_low', label: '헬스체크 급락 감지', sub: '전주 대비 2점 이상 하락 시', on: true },
      { key: 'snippet_digest', label: 'Weekly Digest 생성', sub: '매주 금요일 오후 6시', on: true },
    ],
  },
  {
    key: 'oneOnOneMeeting',
    title: '1on1·회의',
    items: [
      { key: 'oneonone_sched', label: '1on1 일정 알림', sub: '예정 24시간 전', on: true },
      { key: 'oneonone_action', label: '액션 아이템 마감', sub: '마감 D-2 전', on: true },
      { key: 'meeting_done', label: '회의록 처리 완료', sub: 'STT·AI 요약 완료 시', on: false },
    ],
  },
  {
    key: 'okrEval',
    title: 'OKR·평가',
    items: [
      { key: 'okr_risk', label: 'KR 달성 위험 감지', sub: '목표 대비 30% 이상 지연', on: true },
      { key: 'eval_remind', label: '평가 마감 리마인더', sub: '마감 D-7, D-3 알림', on: true },
      { key: 'eval_complete', label: '평가 완료 알림', sub: '매니저 평가 등록 시', on: true },
    ],
  },
  {
    // Slack DM 채널은 개인 연동 탭의 Slack 세부 설정에서 관리 (시안 [F])
    key: 'channel',
    title: '채널',
    items: [
      { key: 'push_web', label: '웹 푸시 알림', sub: '브라우저 알림 허용 필요', on: true },
      { key: 'email_notif', label: '이메일 알림', sub: '주요 알림만 이메일 발송', on: false },
    ],
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');
  const [photos, setPhotos] = useState([{ id: 'p1', url: 'https://i.pravatar.cc/150?img=11' }]);
  const [activePhotoId, setActivePhotoId] = useState('p1');
  const [saveState, setSaveState] = useState('idle');
  const [visOptional, setVisOptional] = useState(VIS_OPTIONAL);
  const [notifGroups, setNotifGroups] = useState(NOTIF_GROUPS_INIT);
  const [slackDm, setSlackDm] = useState(true);
  const [gcalConnected, setGcalConnected] = useState(true);
  const [pwState, setPwState] = useState({ saving: false, saved: false, error: null });

  const profile = {
    name: '민현식',
    title: 'CEO',
    email: 'david@pivit.work',
    phone: '010-1234-5678',
    bio: 'Pivit 공동창업자. 일하는 맥락을 기억하는 HR을 만듭니다.',
    location: '서울 마포구',
    workStart: '09:00',
    workEnd: '18:00',
    timezone: 'Asia/Seoul',
    joinDate: '2025-09-01',
  };

  const handleSaveProfile = () => {
    setSaveState('saving');
    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    }, 500);
  };

  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      logo: '/icons-brand/slack.svg',
      connected: true,
      managedByOrg: true,
      desc: '스니핏 알림, 1on1 요약을 Slack DM으로 수신합니다. 워크스페이스 연결은 어드민이 관리합니다.',
      metaLines: ['david@pivit.work'],
      subSettingsTitle: '알림 채널',
      subSettings: [{ key: 'slack_dm', label: 'Slack DM 알림', on: slackDm }],
    },
    {
      id: 'google',
      name: 'Google Calendar',
      logo: '/icons-solid/calendar-check-02.svg',
      connected: gcalConnected,
      syncable: true,
      desc: '1on1·회의 일정을 자동으로 가져옵니다.',
      metaLines: gcalConnected ? ['david@pivit.work 계정으로 연결됨', '마지막 동기화: 5분 전'] : [],
    },
    {
      id: 'github',
      name: 'GitHub',
      logo: '/icons-brand/github.svg',
      connected: false,
      comingSoon: true,
      desc: '커밋·PR 활동을 스니핏 근거로 연결합니다.',
    },
  ];

  return (
    <div className="content-area">
      <MySettingsCanvas
      activeTab={tab}
      onTabChange={setTab}
      me={{ name: '민현식', title: 'CEO', initial: '민', color: '#EC4899' }}
      profile={profile}
      timezoneOptions={TIMEZONES}
      photos={photos}
      activePhotoId={activePhotoId}
      maxPhotos={5}
      minPhotos={0}
      onSelectPhoto={setActivePhotoId}
      onAddPhoto={(file) => {
        const id = `p${Date.now()}`;
        setPhotos((prev) => [...prev, { id, url: URL.createObjectURL(file) }]);
        setActivePhotoId(id);
      }}
      onDeletePhoto={(id) => {
        setPhotos((prev) => {
          const next = prev.filter((p) => p.id !== id);
          if (activePhotoId === id) setActivePhotoId(next[0] ? next[0].id : null);
          return next;
        });
      }}
      profileSaveState={saveState}
      onSaveProfile={handleSaveProfile}
      visibilityGroups={[
        {
          key: 'always',
          tone: 'green',
          icon: '🔓',
          title: '항상 공개',
          desc: '모든 팀원에게 항상 표시됩니다. 변경할 수 없습니다.',
          locked: true,
          badgeLabel: '공개 고정',
          items: VIS_ALWAYS.map((label, i) => ({ key: `always-${i}`, label })),
        },
        {
          key: 'optional',
          tone: 'brand',
          icon: '👤',
          title: '선택 공개',
          desc: '내가 직접 공개 여부를 결정합니다.',
          locked: false,
          items: visOptional,
        },
      ]}
      onToggleVisibility={(key, next) =>
        setVisOptional((prev) => prev.map((i) => (i.key === key ? { ...i, on: next } : i)))
      }
      notifGroups={notifGroups}
      onToggleNotif={(key, next) =>
        setNotifGroups((prev) =>
          prev.map((g) => ({
            ...g,
            items: g.items.map((i) => (i.key === key ? { ...i, on: next } : i)),
          })),
        )
      }
      integrations={integrations}
      onConnectIntegration={(id) => id === 'google' && setGcalConnected(true)}
      onDisconnectIntegration={(id) => id === 'google' && setGcalConnected(false)}
      onSyncIntegration={() => {}}
      onToggleIntegrationSetting={(id, key, next) => key === 'slack_dm' && setSlackDm(next)}
      passwordState={pwState}
      onChangePassword={() => {
        setPwState({ saving: true, saved: false, error: null });
        setTimeout(() => {
          setPwState({ saving: false, saved: true, error: null });
          setTimeout(() => setPwState({ saving: false, saved: false, error: null }), 2000);
        }, 500);
      }}
      sessions={[]}
      onLogout={() => {}}
      deleteAccountState={{ loading: false, error: false }}
      onDeleteAccount={() => {}}
      />
    </div>
  );
}
