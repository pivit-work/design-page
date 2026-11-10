import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Toast from '../shared/Toast.jsx';
import Button from '../shared/Button.jsx';
import TextArea from '../shared/TextArea.jsx';
import Select from '../shared/Select.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { TargetIcon, CpuIcon, MailIcon, SparkleIcon, ClockIcon, ChatIcon, ArrowRightIcon, CheckCircleIcon } from './evalIcons';
import Avatar from '../shared/Avatar.jsx';
import Chip from '../shared/Chip.jsx';
import FeedbackOkrPanel from './FeedbackOkrPanel.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { FeedbackTextLimitContext, useFeedbackTextLimit, useFeedbackTextTooLong } from './feedbackTextLimit.js';
import FeedbackLengthNote from './FeedbackLengthNote.jsx';
import Spinner from '../shared/Spinner.jsx';
import Tabs from '../shared/Tabs.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import LoadMoreButton from '../shared/LoadMoreButton.jsx';
import MemberAiButton from '../oneonone/MemberAiButton.jsx';

/**
 * EvalFeedbackComposeCanvas — 팀 피드백 (매니저 뷰, v2 재설계).
 *
 * 단일 작성 폼을 폐기하고 **TeamListScreen(팀원 목록) + FeedbackThreadScreen(팀원
 * 드릴인: KR/이니셔티브 블록카드 + 스레드 모달 + AI 초안 작성)** 로 재구성한다
 * (spec-feedback FB3, screen-feedback-manager.policy). 시안 feedback-manager-view.jsx.
 */

// 디자인시스템 토큰화(전면) — 정기평가 캔버스와 동일한 semantic 토큰 사용.
// 유틸리티 스케일이 sparse 해 미정의 스텝은 fallback hex 로 렌더된다.
const C = {
  bg: 'var(--bg-primary)',
  surface: 'var(--bg-quaternary)',
  border: 'var(--border-secondary)',
  borderL: 'var(--border-tertiary)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-tertiary)',
  accent: 'var(--utility-brand-600)',
  accentBg: 'var(--utility-brand-50)',
  accentBd: 'var(--utility-brand-200)',
  green: 'var(--utility-success-600)',
  greenBg: 'var(--utility-success-50)',
  greenBd: 'var(--utility-success-200)',
  // PW-1930 — 지난 기간 띠·읽기 전용 줄은 경고가 아니라 안내라 연회색(bg-secondary).
  pastBg: 'var(--bg-secondary)',
  amber: 'var(--utility-warning-700)',
  amberBg: 'var(--utility-warning-50)',
  red: 'var(--utility-error-600)',
  redBg: 'var(--utility-error-50)',
  purple: 'var(--utility-purple-500)',
  purpleBg: 'var(--utility-purple-50)',
  purpleBd: 'var(--utility-purple-200)',
};
const FONT = 'var(--font-family-body)';

const DEFAULT_LABELS = {
  // PW-1799 — 입력칸이 본문 최대 길이에 닿았을 때. {max} 는 숫자로 바뀐다.
  textLimitNote: '최대 {max}자까지 쓸 수 있습니다.',
  // 대화 요약·빈 요청·AI 초안 힌트 (pivit-work PW-2415 — 종전엔 창 안에 박혀 있어 영어 화면에도 한국어로 남았다)
  summarize: '대화 요약',
  summarizing: '요약 중...',
  summarizeNotEnough: '아직 대화가 충분하지 않습니다',
  summaryFailed: '대화 요약에 실패했습니다. 직접 스크롤하여 확인해 주세요.',
  emptyRequest: '(내용 없는 요청)',
  aiDraftHint: '{title} 관련 피드백',
  // 내가 쓴 피드백의 작성자 이름 — 영어 화면에서는 소비 측이 'Me' 를 넘긴다.
  me: '나',
  emptyItemText: '(내용 없음)',
  // 본문 없이 «확인» 만 누른 팀원 답 (PW-1538 — 스레드 창에 박혀 있던 문구를 라벨로 뺐다)
  replyConfirmed: '확인했습니다',
  // 팀원 답장이 Slack DM 의 [답장]으로 들어왔을 때 말풍선 아래 한 줄 (PW-1908)
  replyViaSlack: 'Slack 에서 보냄',
  title: '팀 피드백',
  subtitle: '팀원별로 OKR 달성 과정에 대한 피드백을 남깁니다.',
  cardRequests: '피드백 요청',
  cardNoFeedback: '피드백 없음',
  cardOverdue: '30일 초과',
  cardNormal: '정상',
  countSuffix: '건',
  peopleSuffix: '명',
  noFeedbackBadge: '피드백 없음',
  daysAgo: '일 전',
  daysOver: '일 경과',
  requestChip: '요청',
  writeFeedback: '피드백 작성 ›',
  back: '← 팀 목록',
  periodLabel: '기간',
  // 지난 기간 옵션 뒤에 붙는 표시. 이모지 글리프를 쓰지 않는다 — 앱 저장소 규칙 (PW-1261).
  pastPeriodMark: ' (과거 기간)',
  // 과거 기간 문구 — 팀원 화면과 같은 문장(screen-feedback-manager §3.6 · EC-11, pivit-work PW-2479).
  pastBanner: '과거 기록을 조회 중입니다. 피드백 작성은 현재 기간에서만 가능합니다.',
  sectionKr: 'KEY RESULTS',
  sectionInit: 'INITIATIVES',
  emptyBlock: '이 KR에 연결된 피드백이 없어요',
  myTurn: '내 차례',
  waiting: '대기',
  openThread: '스레드 열기 ›',
  threadEmpty: '이 항목에 연결된 피드백이 없어요',
  close: '닫기',
  incomingReq: '받은 피드백 요청',
  // [PW-1736] 팀원이 동료에게 보낸 요청·이미 답한 요청도 스레드에 기록으로 보인다 — 팀원 본인 화면
  // (EvalFeedbackCanvas 보낸 요청 말풍선)과 같은 말을 쓴다.
  requestPending: '대기중',
  requestAnswered: '응답됨',
  kindManager: '매니저',
  kindPeer: '동료',
  composePlaceholder:
    'SBI 형식을 참고해 자유롭게 작성해 주세요.\n상황(S): 언제, 어떤 맥락에서\n행동(B): 구체적으로 어떤 행동을\n영향(I): 팀/OKR에 어떤 영향이 있었는지',
  aiDraft: 'AI 추천 받기',
  // PW-2696 — AI 버튼이 «AI» 를 그리므로 버튼 글자는 동작 낱말만(읽는 이름은 aiDraft).
  aiDraftAction: '추천 받기',
  aiDrafting: '생성 중...',
  aiHintIdle: 'KR 달성률·최근 스니핏 기반 추천',
  aiHintDone: 'AI 초안 — 수정 후 전달하세요',
  // PW-2481 — 한 글자라도 고친 초안(확인). 정책 §4.3 의 «✓» 는 글자 대신 체크 아이콘으로 그린다(PW-315 글리프 금지).
  aiHintConfirmed: 'AI 초안 확인됨',
  // PW-2481 — 그 팀원의 OKR 을 못 불러왔을 때 꺼진 [AI 추천 받기] 의 말풍선 (§4.3 · §5 · EC-3)
  aiNeedsOkr: 'OKR 컨텍스트가 필요합니다',
  aiPersonalized: '수신자 선호 스타일 반영됨',
  aiFooter: '스니핏·OKR 데이터를 기반으로 AI가 초안을 작성했습니다',
  send: '전달 →',
  pastReadonly: '과거 기록에는 피드백을 작성할 수 없습니다',
  toastSent: '피드백을 전달했습니다',
  toastError: '전송에 실패했습니다. 다시 시도해 주세요',
  aiError: 'AI 추천 생성에 실패했습니다. 직접 작성해 주세요.',
  // 요약을 연 뒤 대화가 늘었을 때 요약 블록 안내 (screen-feedback-member §10-17)
  summaryStale: '요약 이후 새 대화가 있습니다',
  // ── 팀원 스레드 화면 (screen-feedback-manager §3.2~§3.8, PW-1455) ──
  // 진입점 성격 안내 — {name} 에 팀원 이름 (§3.2.1)
  infoBanner:
    '{name} 님이 OKR을 달성해 가는 과정에 대한 수시 피드백 화면입니다. 목표 수립·조정에 대한 피드백은 OKR 화면에서 진행됩니다.',
  // OKR 컨텍스트 패널 (§3.3) — {objectives}·{krs}·{covered}·{total} 을 채운다.
  okrPanelTitle: 'OKR 컨텍스트',
  okrPanelCounts: 'OBJECTIVE {objectives}개 · KR {krs}개',
  okrPanelCoverage: '{covered}/{total} KR 커버',
  okrObjectiveSuffix: ' Objective',
  okrPanelInitiatives: 'Initiatives',
  okrPanelSnippets: '최근 스니핏',
  // 받은 요청 칸 (§3.4) — {count} 에 건수
  incomingSection: '받은 피드백 요청 {count}건',
  // PW-2696 — 팀 목록 위 소제목. {count} 는 팀원 수.
  teamSection: '팀원 {count}명',
  // PW-2684 — 받은 요청 앞 3건만 펼치고 나머지는 이 버튼으로. {count} 는 접어 둔 건수.
  incomingMore: '나머지 {count}건 더 보기',
  answerRequest: '이 요청에 답변 작성',
  linkedKrFallback: 'KR',
  linkedInitFallback: '이니셔티브',
  // 기타 칸 (§3.2-8) — 연결 없거나 목록 밖 대상의 피드백. 새로 쓰는 칸은 없다(FB1).
  sectionEtc: '기타',
  etcHint: '목록 밖의 KR에 연결되었거나 연결 대상이 없는 피드백이에요',
  // 보낸 피드백 수정·삭제 (§3.8)
  feedbackEdit: '수정',
  feedbackDelete: '삭제',
  feedbackEditSave: '저장',
  feedbackEditCancel: '취소',
  feedbackEditError: '수정에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  // 삭제 실패는 토스트로 (manager §3.8 「삭제 실패」 · pivit-work PW-2482)
  feedbackDeleteError: '삭제하지 못했습니다. 다시 시도해 주세요.',
  // 팀원 0명 빈 상태(FB-1) — 1행은 매니저 뷰 ME-1 과 같은 문장, 2행은 사유 (screen-feedback-manager §5-A).
  // ── 「받은 요청」 탭 (screen-feedback-manager §2.6, pivit-work PW-2479) ──
  tabTeam: '팀 피드백',
  // 탭 이름. 건수는 캔버스가 괄호로 붙인다 — 0 건·불러오는 중·실패면 괄호 없이(§2.6.1 · §2.6.3).
  tabRequests: '받은 요청',
  inboxNote: '팀원이 직접 요청한 피드백 {count}건입니다. 요청에 답변하면 해당 KR 스레드로 연결됩니다.',
  inboxRequested: '님이 피드백을 요청했습니다',
  // 화살표는 글자가 아니라 아이콘으로 붙인다 — 번역 문구에 기호 글리프를 쓰지 않는다(pivit-work PW-315).
  inboxWrite: '피드백 작성',
  inboxEmpty: '받은 피드백 요청이 없습니다',
  inboxEmptyHint: '팀원이 피드백을 요청하면 여기에 표시됩니다',
  // 연결 대상이 지금 기간 OKR 에 없을 때 칩 끝 (§3.4-A)
  inboxNotInPeriod: '· 현재 기간 OKR 에 없음',
  emptyTeam: '관리 중인 팀원이 없습니다.',
  emptyTeamHint: '팀원 배정은 관리자가 합니다. 워크스페이스 관리자에게 요청하세요.',
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}
/**
 * «받은 피드백 요청 5건»·«팀원 24명» 같은 소제목 — 개수 부분만 초록(원온원 «주의 필요 24명» .ono-section-count).
 * 문구 틀의 {count} 앞은 그대로, {count}와 그 뒤(«건»·«명»)를 묶어 칠한다 (PW-2696).
 */
function CountHeading({ template, count }) {
  const [head, tail = ''] = String(template || '').split('{count}');
  return (
    <>
      {head}
      <span className="fbmgr-section-count">{`${count}${tail}`}</span>
    </>
  );
}

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
function krColor(p) {
  if (p >= 80) return C.green;
  if (p >= 50) return C.amber;
  return C.red;
}
function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

// ── 받은 요청 탭 (screen-feedback-manager §2.6, pivit-work PW-2479) ──
/**
 * 내가 매니저로 받은 미처리 요청. 순서·마감 배지는 소비 측이 정해 넘긴다(`due: { label, tone }`) —
 * 마감은 «보낸 날 + 7일»을 사용자 달력으로 세야 해서다. 요청 한 줄의 글자 순서는 기획 셸
 * InboxScreen 을 따른다: 사진 · 이름 «님이 피드백을 요청했습니다» · 연결 대상 칩 · (오른쪽) 보낸 날짜 · 배지
 * / 요청 본문 · 「피드백 작성 →」. 모양은 같은 화면의 팀원 카드(`.fbmgr-inbox-card`)와 상태 칩(`Chip`)이다.
 */
// 연결 대상 칩은 KR 제목(최대 255자)을 담는다 — 줄에서 줄어들 수 있게 해 칩 안에서 말줄임(dp-chip__label)되고,
// 전체 글은 마우스를 올리면 보인다(pivit-work PW-1535 dev 확인).
const LONG_CHIP = { minWidth: 0 };
// 같은 줄의 이름·날짜는 줄어들지 않는다 — 안 막으면 긴 칩과 함께 한 글자 폭까지 눌려 세로로 써진다
// (pivit-work PW-1535 결과 문서 · 「기타」 창의 「김지수」「11.8」). 줄어드는 몫은 LONG_CHIP 칩만 진다.
const NO_SHRINK = { flexShrink: 0, whiteSpace: 'nowrap' };

function inboxTargetLabel(req, L) {
  if (!req.linkedTargetType || !req.linkedTargetId) return null;
  // 받은 요청 탭과 팀원 화면(목록 밖 대상 · §3.4-A)이 같은 글을 쓴다.
  const title = req.linkedTargetTitle;
  const base =
    req.linkedTargetType === 'kr'
      ? `KR${title ? ` · ${title}` : ''}`
      : `# ${title || L.linkedInitFallback}`;
  return req.linkedTargetInCurrentPeriod === false ? `${base} ${L.inboxNotInPeriod}` : base;
}

function InboxScreen({ requests, L, onOpen, loading = false, failed = false }) {
  // 불러오는 동안 칸 자리 셋(§2.6.3 — 팀원 목록과 같은 모양). 못 불러왔으면 아무것도 그리지 않는다 —
  // «요청이 없다»로 읽히지 않게, 실패 안내와 다시 시도는 화면(소비 측)이 띄운다.
  if (loading) return <SkeletonList count={3} height={62} data-testid="fbmgr-inbox-skeleton" />;
  if (failed) return null;
  if (requests.length === 0) {
    return (
      <EmptyState
        data-testid="fbmgr-inbox-empty"
        icon={<MailIcon size={20} />}
        title={L.inboxEmpty}
        description={L.inboxEmptyHint}
      />
    );
  }
  return (
    <div className="fbmgr-inbox is-team" data-testid="fbmgr-inbox">
      <p className="fbmgr-inbox-note">
        <MailIcon size={16} /> {fill(L.inboxNote, { count: requests.length })}
      </p>
      {requests.map((req) => {
        const target = inboxTargetLabel(req, L);
        return (
          <div key={req.id} className="fbmgr-inbox-card" data-testid={`fbmgr-inbox-${req.id}`}>
            <Avatar name={req.requester?.name} photo={req.requester?.avatar} size={40} />
            <div className="fbmgr-inbox-main">
              <div className="fbmgr-inbox-head">
                <span className="fbmgr-inbox-who">
                  <span className="fbmgr-inbox-name">{req.requester?.name}</span>
                  {L.inboxRequested}
                </span>
              </div>
              {/* 연결 대상 칩은 이름 줄 아래 한 줄 — 넘치면 칩 안에서 말줄임, 전체는 마우스를 올리면(PW-2696) */}
              {target && (
                <div className="fbmgr-inbox-target">
                  <Chip tone="info" title={target} style={LONG_CHIP}>{target}</Chip>
                </div>
              )}
              {req.text && <p className="fbmgr-inbox-text">{req.text}</p>}
            </div>
            <div className="fbmgr-inbox-side">
              <span className="fbmgr-inbox-meta">
                <span>{fmtDate(req.sentAt)}</span>
                {req.due && (
                  <Chip tone={req.due.tone} data-testid={`fbmgr-inbox-due-${req.id}`}>
                    {req.due.label}
                  </Chip>
                )}
              </span>
              <Button variant="secondary" size="sm" onClick={() => onOpen?.(req)} data-testid={`fbmgr-inbox-open-${req.id}`}>
                {L.inboxWrite} <ArrowRightIcon size={14} />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 팀 목록 화면 ──
function TeamListScreen({ team, L, onSelect, loading = false, failed = false }) {
  // 불러오는 동안 카드 자리 셋을 깐다(§5). 못 불러왔으면 아무것도 그리지 않는다 — 「팀원이 없다」로
  // 읽히지 않게, 실패 안내와 다시 시도는 화면(소비 측)이 띄운다(§5 「API 실패」).
  if (loading) return <SkeletonList count={3} height={62} data-testid="fbmgr-team-skeleton" />;
  if (failed) return null;
  const members = [...(team.members || [])].sort((a, b) => {
    if (a.lastFeedbackAt == null && b.lastFeedbackAt != null) return -1;
    if (a.lastFeedbackAt != null && b.lastFeedbackAt == null) return 1;
    return new Date(a.lastFeedbackAt || 0) - new Date(b.lastFeedbackAt || 0);
  });
  const s = team.summary || { requests: 0, noFeedback: 0, overdue: 0, normal: 0 };
  // 바탕색 없이 뜻 있는 숫자 글자에만 색 — 요청 초록 · 없음 빨강 · 30일 초과 주황. 0 이거나 «정상»은 회색
  // (PW-2696 · 원온원 «이번 달 코칭 지표» 칸). tone 은 소비 측 시험이 읽도록 data-tone 에도 싣는다.
  const cards = [
    { key: 'requests', label: L.cardRequests, value: s.requests, tone: 'accent', suffix: L.countSuffix },
    { key: 'noFeedback', label: L.cardNoFeedback, value: s.noFeedback, tone: 'danger', suffix: L.peopleSuffix },
    { key: 'overdue', label: L.cardOverdue, value: s.overdue, tone: 'warning', suffix: L.peopleSuffix },
    { key: 'normal', label: L.cardNormal, value: s.normal, tone: 'muted', suffix: L.peopleSuffix },
  ];

  return (
    <div className="fbmgr-team">
      <div className="fbmgr-kpi-grid">
        {cards.map((c) => {
          const tone = c.value > 0 ? c.tone : 'muted';
          return (
            <div key={c.key} className="fbmgr-kpi" data-testid={`fbmgr-kpi-${c.key}`}>
              <span className="fbmgr-kpi-label">{c.label}</span>
              <span className={`fbmgr-kpi-value is-${tone}`} data-tone={tone}>
                {c.value}
                <span className="fbmgr-kpi-suffix">{c.suffix}</span>
              </span>
            </div>
          );
        })}
      </div>

      {members.length === 0 ? (
        <div data-testid="fbmgr-team-empty" className="fbmgr-team-empty">
          <p style={{ margin: 0, fontSize: 'var(--font-size-text-sm)', fontWeight: 600, color: C.text }}>{L.emptyTeam}</p>
          {L.emptyTeamHint && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-text-xs)', fontWeight: 500, color: C.sub }}>{L.emptyTeamHint}</p>}
        </div>
      ) : (
        <>
        <h3 className="fbmgr-section-heading" data-testid="fbmgr-team-heading">
          <CountHeading template={L.teamSection} count={members.length} />
        </h3>
        <div className="fbmgr-member-list">
          {members.map((m) => {
            const noFb = m.lastFeedbackAt == null;
            const over = !noFb && m.daysSince != null && m.daysSince >= 30;
            const badge = noFb
              ? { label: L.noFeedbackBadge, tone: 'danger' }
              : over
                ? { label: `${m.daysSince}${L.daysOver}`, tone: 'warning' }
                : { label: `${m.daysSince}${L.daysAgo}`, tone: 'success' };
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m)}
                data-testid={`fbmgr-member-${m.id}`}
                className="fbmgr-member-row"
              >
                <Avatar name={m.name} photo={m.avatar} size={40} />
                <span className="fbmgr-member-name">{m.name}</span>
                <Chip tone={badge.tone}>{badge.label}</Chip>
                {m.pendingRequests > 0 && (
                  <Chip tone="accent" icon={<MailIcon size={11} />}>{`${L.requestChip} ${m.pendingRequests}${L.countSuffix}`}</Chip>
                )}
                {m.department && <span className="fbmgr-member-dept">{m.department}</span>}
                {/* 줄 전체가 버튼이라 안에 버튼을 또 둘 수 없다 — 공용 Button 보조 모양 클래스만 입힌 글 */}
                <span className="dp-btn dp-btn--secondary dp-btn--sm fbmgr-member-cta" data-testid={`fbmgr-member-cta-${m.id}`}>
                  <span className="dp-btn__label">{L.writeFeedback}</span>
                </span>
              </button>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}

// ── 블록 카드(매니저) ──
/** KR 진행률 바 폭. 카드가 1080px 로 넓어져 40px 는 점처럼 보였다 (PW-218). */
const PROGRESS_BAR_W = 96;

/* [PW-1538] 미리보기에 팀원 답도 한 줄로 넣는다 — 스레드 창이 답을 따로 한 줄로 세듯이
   (ThreadModal threadCount). 빼면 답이 와도 카드에는 내 피드백만 보여 답이 안 온 줄 안다. */
function previewEntries(items) {
  const entries = [];
  for (const it of items) {
    entries.push({ key: it.id, kind: it.itemType, item: it, at: it.sentAt });
    if (it.itemType === 'feedback' && it.memberReply) {
      entries.push({ key: `${it.id}-reply`, kind: 'reply', item: it, at: it.memberReply.createdAt });
    }
  }
  return entries.sort((a, b) => new Date(a.at) - new Date(b.at)).slice(-2);
}

/* [PW-1736] 스레드에는 팀원의 KR 피드백이 전부 온다 — 동료·다른 매니저가 쓴 글, 팀원이 동료에게
   보낸 요청, 이미 답한 요청까지(OKR 「피드백 n건」 칩과 같은 건수). 내가 쓴 글·나에게 온 요청만 내 일이다.
   두 칸을 모르는 옛 응답은 종전대로 모두 내 것으로 본다. */
const isMine = (it) => it.itemType === 'feedback' && it.mine !== false;
const isToMe = (it) => it.itemType === 'request' && (!it.recipient || it.recipient.toMe !== false);

function BlockCard({ block, member, L, onOpen }) {
  const isKr = block.type === 'kr';
  const isEtc = block.type === 'etc';
  const items = block.items;
  const incoming = items.filter(isToMe);
  const barColor = isKr ? krColor(block.progress ?? 0) : C.purple;
  const latest = previewEntries(items);
  /* [PW-1054] 답하지 않은 요청이 있을 때만 「내 차례」. 같은 화면 팀 목록의 「요청 N」은 서버가
     답 안 된 것만 센다 — 요청이 하나라도 있으면 띄우던 종전 판정은 답을 보낸 뒤에도 남았다.
     `resolvedAt` 이 없는(모르는) 요청은 종전대로 답 안 된 것으로 본다. */
  const hasMyTurn = incoming.some((i) => !i.resolvedAt);
  /* [PW-1538] 「대기」는 마지막으로 보낸 피드백에 팀원이 아직 답하지 않았을 때만 (screen-feedback-manager
     §3.5 「피드백 전송 후 응답 대기」). 피드백이 있기만 하면 띄우던 종전 판정은 답이 온 뒤에도 남았다. */
  const lastFeedback = [...items]
    .filter(isMine)
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
    .at(-1);
  const isWaiting = !!lastFeedback && !lastFeedback.memberReply;

  return (
    <button
      type="button"
      onClick={() => onOpen(block)}
      data-testid={`fbmgr-block-${block.key}`}
      // 카드가 1080px 폭으로 넓어졌다 — 좌우 패딩만 소폭 키운다 (PW-218)
      style={{ display: 'block', width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', fontFamily: FONT }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isKr ? (
          <Chip tone="info">{block.badge}</Chip>
        ) : isEtc ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{L.sectionEtc}</span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}># {block.title}</span>
        )}
        {isKr && <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{block.title}</span>}
        {isKr && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: PROGRESS_BAR_W, height: 4, background: C.borderL, borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${block.progress ?? 0}%`, height: '100%', background: barColor }} />
            </span>
            <span style={{ fontSize: 12, color: C.sub }}>{block.progress ?? 0}%</span>
          </span>
        )}
      </div>
      {latest.length === 0 ? (
        <p style={{ fontSize: 'var(--font-size-text-xs)', fontStyle: 'italic', color: C.sub, margin: '4px 0' }}>{L.emptyBlock}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {latest.map(({ key, kind, item: it, at }) => {
            // 요청·답은 팀원이 쓴 것, 피드백은 내가 쓴 것 — 남이 쓴 피드백은 쓴 사람 이름 (PW-1736)
            const name = kind === 'request' ? it.author?.name : kind === 'reply' ? member?.name : isMine(it) ? L.me : it.author?.name;
            const photo = kind === 'reply' ? member?.avatar : it.author?.avatar;
            const text = kind === 'reply' ? it.memberReply.text || L.replyConfirmed : it.text || L.emptyItemText;
            return (
              <div key={key} data-testid={kind === 'reply' ? 'fbmgr-block-reply' : undefined} style={{ display: 'flex', gap: 8 }}>
                <Avatar name={name} photo={photo} size={22} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub }}>
                    <span style={{ ...NO_SHRINK, fontWeight: 700, color: C.text }}>{name}</span>
                    {kind === 'request' && <Chip tone="accent">{L.requestChip}</Chip>}
                    {isEtc && kind !== 'reply' && etcTargetLabel(it, L) && <Chip tone="info" title={etcTargetLabel(it, L)} style={LONG_CHIP}>{etcTargetLabel(it, L)}</Chip>}
                    <span style={NO_SHRINK}>{fmtDate(at)}</span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, margin: '2px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: C.sub }}>{items.length}{L.countSuffix}</span>
        {hasMyTurn && <Chip tone="warning">{L.myTurn}</Chip>}
        {!hasMyTurn && isWaiting && <Chip tone="progress">{L.waiting}</Chip>}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs)', fontWeight: 600, color: isKr ? C.accent : C.purple }}>{L.openThread}</span>
      </div>
    </button>
  );
}

// ── AI 초안 작성 박스 ──
function ModalComposeBox({ block, memberName, L, onSend, onAiDraft, aiDraftDisabled = false }) {
  const [text, setText] = useState('');
  // done = AI 초안 미확인(노랑) · confirmed = 한 글자라도 고친 초안(초록). 정책 §4.2·§4.3 (PW-2481)
  const [aiState, setAiState] = useState('idle'); // idle | loading | done | confirmed
  const [personalized, setPersonalized] = useState(false);
  // 초안이 KR 달성률·스니핏을 재료로 썼나. 거짓이면 «스니핏·OKR 기반» 안내를 숨긴다 —
  // 메모만으로 쓴 초안에 그 문구가 붙으면 근거 있는 글로 믿게 된다. 값을 안 주면 예전처럼 띄운다.
  const [grounded, setGrounded] = useState(true);
  const [busy, setBusy] = useState(false);
  const maxLen = useFeedbackTextLimit();
  const tooLong = useFeedbackTextTooLong(text);
  // AI 를 기다리는 동안 매니저가 직접 고쳤는가 — 그러면 늦게 온 초안은 버린다(manager §8-2).
  const typedDuringAi = useRef(false);
  // 다시 받기 전 상태 — 기다리는 동안 칸 색·문구를 그대로 보이고, 실패하면 이 상태로 돌아간다.
  // 그러지 않으면 고치지 않은 AI 초안이 직접 쓴 글처럼 보인다(§4.3 · 절대규칙 3, PW-2481 리뷰).
  const [beforeAi, setBeforeAi] = useState('idle');
  const textNow = useRef('');
  // AI 한도 안내 같은 «실패 대신 보일 안내» — onAiDraft 가 `{ notice }` 를 주면 누른 버튼 바로 아래(이 창 안)에 그린다.
  // 창 밖(페이지 머리)에 그리면 이 창의 막에 덮여 안 보인다(PW-2481 dev 확인).
  const [notice, setNotice] = useState(null);

  // 실패·빈 응답 안내는 onAiDraft 쪽(캔버스 루트)이 띄우고 null 을 준다. 입력은 그대로 둔다.
  const ai = async () => {
    if (!onAiDraft) return;
    typedDuringAi.current = false;
    // 버튼은 기다리는 동안 꺼져 있어 여기 올 때 aiState 는 loading 이 아니다.
    const before = aiState;
    setBeforeAi(before);
    setAiState('loading');
    setNotice(null);
    let res = null;
    try {
      res = await onAiDraft({ recipientName: memberName, hint: text.trim() || fill(L.aiDraftHint, { title: block.title }) });
    } catch {
      res = null;
    }
    if (res && typeof res === 'object' && res.notice) setNotice(res.notice);
    const draft = typeof res === 'string' ? res : res?.draft;
    if (!draft || typedDuringAi.current) {
      const hadDraft = before === 'done' || before === 'confirmed';
      // 칸에 AI 초안이 남아 있으면 그 상태로 — 기다리는 동안 고쳤으면 확인(초록), 전부 지웠으면 처음 상태.
      if (!hadDraft || textNow.current === '') setAiState('idle');
      else setAiState(typedDuringAi.current ? 'confirmed' : before);
      return;
    }
    setText(draft);
    textNow.current = draft;
    setPersonalized(typeof res === 'object' ? !!res.personalized : false);
    setGrounded(typeof res === 'object' ? res.grounded !== false : true);
    setAiState('done');
  };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSend({ linkedTargetType: block.type, linkedTargetId: block.id, text: text.trim() });
      setText('');
      textNow.current = '';
      setAiState('idle');
    } catch {
      // 실패 안내는 캔버스 루트가 띄웠다 — 입력은 그대로 둔다(manager §8-4).
      // 잡지 않으면 클릭 처리기에서 처리되지 않은 거절로 새어 나간다.
    } finally {
      setBusy(false);
    }
  };

  // 화면에 보이는 초안 상태 — 다시 받는 동안은 받기 전 상태를 그대로 보인다.
  const shown = aiState === 'loading' ? beforeAi : aiState;
  return (
    <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TextArea
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          textNow.current = e.target.value;
          if (aiState === 'loading') typedDuringAi.current = true;
          // 고치면 확인(초록). 확인은 전달하거나 전부 지울 때까지 남는다 — 다시 추천받으면 ai() 가 done 으로 되돌린다.
          if (aiState === 'done' || aiState === 'confirmed') setAiState(e.target.value === '' ? 'idle' : 'confirmed');
        }}
        placeholder={L.composePlaceholder}
        maxLength={maxLen}
        data-testid="fbmgr-compose-text"
        className={['evf-textarea', 'is-team', shown === 'done' && 'is-ai-unconfirmed', shown === 'confirmed' && 'is-ai-confirmed'].filter(Boolean).join(' ')}
      />
      <FeedbackLengthNote text={text} label={L.textLimitNote} color={C.red} testId="fbmgr-compose-limit" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {shown === 'done' || shown === 'confirmed' ? (
          <span
            data-testid="fbmgr-ai-state"
            data-state={shown === 'done' ? 'unconfirmed' : 'confirmed'}
            className={`evf-ai-state ${shown === 'done' ? 'is-unconfirmed' : 'is-confirmed'}`}
          >
            {shown === 'confirmed' && <CheckCircleIcon size={12} />}
            {shown === 'done' ? L.aiHintDone : L.aiHintConfirmed}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: C.sub }}>
            {L.aiHintIdle}
          </span>
        )}
        {(shown === 'done' || shown === 'confirmed') && personalized && (
          <Chip tone="accent" icon={<TargetIcon size={11} />}>{L.aiPersonalized}</Chip>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {onAiDraft && (
            <Tooltip content={aiDraftDisabled ? L.aiNeedsOkr : ''}>
            {/* 디자이너 AI 버튼(원온원 «AI 생성» · PW-2696). 버튼이 «AI» 를 그리므로 글자는 동작 낱말만 — 읽는 이름은 전체 문구. */}
            <MemberAiButton
              label={aiState === 'loading' ? L.aiDrafting : L.aiDraftAction}
              ariaLabel={L.aiDraft}
              onClick={ai}
              disabled={aiDraftDisabled}
              pending={aiState === 'loading'}
              className="fbmgr-ai-draft"
              testId="fbmgr-ai-draft"
            />
            </Tooltip>
          )}
          <Button
            type="button"
            disabled={!text.trim() || busy || tooLong}
            onClick={send}
            data-testid="fbmgr-send"
            className="evf-btn evf-btn-primary"
          >
            {L.send}
          </Button>
        </span>
      </div>
      {notice && <div data-testid="fbmgr-ai-notice">{notice}</div>}
      {(shown === 'done' || shown === 'confirmed') && grounded && <p style={{ fontSize: 12, color: C.sub, margin: 0 }}><CpuIcon size={11} /> {L.aiFooter}</p>}
    </div>
  );
}

/**
 * 내가 보낸 피드백 한 개 (§3.8). 팀원이 아직 답하지 않았고 지금 기간이면 수정·삭제가 붙는다.
 * 수정은 그 자리 입력칸 — 빈 글은 저장 못 하고, 취소하면 원래 글로 돌아간다. 삭제는 확인 없이 바로.
 * 실패하면 입력을 그대로 두고 말풍선 아래에 알린다.
 */
function FeedbackBubble({ item, member, L, canModify, onEdit, onDelete, targetLabel = null, asReply = false }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const maxLen = useFeedbackTextLimit();
  const editTooLong = useFeedbackTextTooLong(editText);
  // 동료·다른 매니저가 쓴 글은 읽기만 한다 (PW-1736).
  const mine = isMine(item);
  const author = mine ? L.me : item.author?.name;
  const modifiable = canModify && mine && !item.memberReply;

  const cancelEdit = () => {
    setEditing(false);
    setEditText(item.text || '');
    setError(null);
  };
  const save = async () => {
    if (!editText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onEdit(item, editText.trim());
      setEditing(false);
    } catch {
      setError(L.feedbackEditError);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(item);
    } catch {
      // 안내는 캔버스 토스트가 한다 — 버블은 그대로 둔다(§3.8 「삭제 실패」).
      setBusy(false);
    }
  };

  // 대화 모양은 디자이너 OKR «KR 피드백» 창의 댓글·답(.okr-krfb-comment · -reply-item)을 따른다(PW-2696):
  // 말 상자 없이 이름·날짜 줄 아래 글. 요청 뒤에 단 답(asReply)과 팀원 답은 36 들여 14/20 보조 회색.
  return (
    <div data-testid={`fbmgr-feedback-${item.id}`} className={asReply ? 'fbmgr-cm is-reply' : 'fbmgr-cm'} data-reply={asReply ? 'true' : undefined}>
      <div className="fbmgr-cm-head">
        <Avatar name={author} photo={item.author?.avatar} size={24} />
        <span className="fbmgr-cm-name">{author}</span>
        {targetLabel && <Chip tone="info" title={targetLabel} style={LONG_CHIP}>{targetLabel}</Chip>}
        <span className="fbmgr-cm-date">{fmtDate(item.sentAt)}</span>
        {modifiable && !editing && (
          <span className="fbmgr-cm-actions">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} disabled={busy} data-testid="fbmgr-feedback-edit">
              {L.feedbackEdit}
            </Button>
            <Button type="button" variant="danger-ghost" size="sm" onClick={remove} disabled={busy} data-testid="fbmgr-feedback-delete">
              {L.feedbackDelete}
            </Button>
          </span>
        )}
      </div>
      {editing ? (
        <div className="evf-incoming-compose">
          <TextArea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={maxLen}
            data-testid="fbmgr-feedback-edit-input"
            className="evf-textarea evf-incoming-textarea"
          />
          <FeedbackLengthNote text={editText} label={L.textLimitNote} color={C.red} testId="fbmgr-feedback-edit-limit" />
          <div className="evf-incoming-actions">
            <Button type="button" onClick={cancelEdit} data-testid="fbmgr-feedback-edit-cancel" className="evf-btn evf-btn-secondary">
              {L.feedbackEditCancel}
            </Button>
            <Button type="button" onClick={save} disabled={busy || !editText.trim() || editTooLong} data-testid="fbmgr-feedback-edit-save" className="evf-btn evf-btn-primary">
              {L.feedbackEditSave}
            </Button>
          </div>
        </div>
      ) : (
        <p className="fbmgr-cm-text">{item.text}</p>
      )}
      {error && <p data-testid="fbmgr-feedback-error" className="fbmgr-cm-error">{error}</p>}
      {item.memberReply && (
        // 팀원 답변 — 팀원 사진·이름 + 글 (screen-feedback-manager §3.8).
        <div data-testid="fbmgr-member-reply" className="fbmgr-cm is-reply">
          <div className="fbmgr-cm-head">
            <Avatar name={member?.name} photo={member?.avatar} size={24} />
            <span className="fbmgr-cm-name">{member?.name}</span>
          </div>
          <p className="fbmgr-cm-text">{item.memberReply.text || L.replyConfirmed}</p>
          {/* 출처 표시는 이름·날짜 줄과 같은 작은 회색 글씨 (PW-1908) */}
          {item.memberReply.source === 'slack' && (
            <div data-testid="fbmgr-reply-via-slack" className="fbmgr-cm-note">
              {L.replyViaSlack}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/**
 * 팀원이 보낸 요청. 나에게 온 것은 「받은 피드백 요청」, 동료에게 간 것은 받는 사람을 붙인 「요청」이다.
 * 답했는지는 팀원 본인 화면의 보낸 요청 말풍선과 같은 「대기중 / 응답됨」 칩으로 보인다 (PW-1736).
 * 이 말풍선에는 버튼이 없다 — 나에게 온 열린 요청의 답은 「받은 피드백 요청」 칸과 아래 작성칸이 맡는다.
 */
function RequestBubble({ item, L, targetLabel = null }) {
  const toMe = isToMe(item);
  const resolved = !!item.resolvedAt;
  // 요청 글은 원온원 읽기 상자(.ono-my-readbox) — 내 답과 갈려 «무엇에 대한 답»인지 보이게(PW-2696).
  return (
    <div className="fbmgr-cm" data-testid={`fbmgr-request-${item.id}`}>
      <div className="fbmgr-cm-head">
        <Avatar name={item.author?.name} photo={item.author?.avatar} size={24} />
        <span className="fbmgr-cm-name">{item.author?.name}</span>
        {!toMe && item.recipient && (
          <span className="fbmgr-cm-sub">
            → {item.recipient.name} ({item.recipientKind === 'peer' ? L.kindPeer : L.kindManager})
          </span>
        )}
        <Chip tone="accent" icon={<MailIcon size={11} />}>{toMe ? L.incomingReq : L.requestChip}</Chip>
        {(resolved || !toMe) && (
          <Chip tone={resolved ? 'success' : 'warning'}>{resolved ? L.requestAnswered : L.requestPending}</Chip>
        )}
        {targetLabel && <Chip tone="info" title={targetLabel} style={LONG_CHIP}>{targetLabel}</Chip>}
        <span className="fbmgr-cm-date is-end">{fmtDate(item.sentAt)}</span>
      </div>
      <p className="fbmgr-readbox">{item.text || L.emptyRequest}</p>
    </div>
  );
}

function ThreadModal({ block, member, memberName, L, isPastPeriod, onSend, onAiDraft, aiDraftDisabled, onSummarize, onEditFeedback, onDeleteFeedback, onClose }) {
  const isOrphan = !!block.orphan;
  const isKr = block.type === 'kr' && !isOrphan;
  const isEtc = block.type === 'etc';
  const targetOf = (it) => (isEtc ? etcTargetLabel(it, L) : null);
  const items = [...block.items].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  // 요청 뒤에 온 피드백은 그 요청의 답으로 들여 쓴다. 서버에 «어느 요청의 답» 연결이 없어 시간 순서로 가른다 —
  // 요청 없이 먼저 쓴 피드백은 답이 아니라 들여 쓰지 않는다(PW-2696 카드 메모).
  const replyIds = new Set();
  items.reduce((seenRequest, it) => {
    if (it.itemType !== 'feedback') return true;
    if (seenRequest) replyIds.add(it.id);
    return seenRequest;
  }, false);
  const [summary, setSummary] = useState(null);
  const [summaryState, setSummaryState] = useState('idle'); // idle | loading | error | notice
  // onSummarize 가 `{ notice }`(AI 한도 안내 등)를 주면 실패 문구 대신 이 창 안에 그 안내를 그린다(PW-2481).
  const [summaryNotice, setSummaryNotice] = useState(null);
  // 요약을 만들 때의 대화 수 — 그 뒤 늘면 요약은 그대로 두고 안내만 붙인다(일회성 뷰).
  const [summaryCount, setSummaryCount] = useState(0);
  // 활성화 조건: 스레드 아이템(피드백+요청+답변) ≥ 5 (ai-spec §11.2).
  const threadCount = items.reduce((n, it) => n + 1 + (it.memberReply ? 1 : 0), 0);
  const canSummarize = threadCount >= 5;

  const summarize = async () => {
    if (!onSummarize || !canSummarize) return;
    setSummaryState('loading');
    try {
      const res = await onSummarize(block);
      if (res?.notice) {
        setSummaryNotice(res.notice);
        setSummaryState('notice');
      } else if (res) {
        setSummary(res);
        setSummaryCount(threadCount);
        setSummaryState('idle');
      } else {
        setSummaryState('error');
      }
    } catch {
      setSummaryState('error');
    }
  };

  // 창 머리 — «KR»·«현재 기간 OKR 에 없음»은 제목 위 딱지로 떼고, 제목(공용 창 30px)은 2줄에서 말줄임 —
  // 255자 KR 제목이 창 절반을 덮었다. 전체는 마우스를 올리면 보인다(PW-2696 · OKR «KR 피드백» 창 머리 자리).
  const titleText = isEtc ? L.sectionEtc : block.type === 'kr' ? block.title : `# ${block.title}`;
  const eyebrow = [];
  if (isKr) eyebrow.push({ key: 'type', tone: 'info', label: block.badge });
  else if (isOrphan && block.type === 'kr') eyebrow.push({ key: 'type', tone: 'info', label: L.linkedKrFallback });
  if (isOrphan) eyebrow.push({ key: 'period', tone: 'neutral', label: String(L.inboxNotInPeriod || '').replace(/^[·\s]+/, '') });
  const titleNode = (
    <>
      {eyebrow.length > 0 && (
        <span className="fbmgr-thread-eyebrow" data-testid="fbmgr-thread-eyebrow">
          {eyebrow.map((e) => <Chip key={e.key} tone={e.tone}>{e.label}</Chip>)}
        </span>
      )}
      <span className="fbmgr-thread-title-text" title={titleText} data-testid="fbmgr-thread-title-text">{titleText}</span>
    </>
  );

  return (
    <ModalShell
      title={titleNode}
      description={isKr ? `${block.progress ?? 0}%` : isEtc ? L.etcHint : undefined}
      titleId="fbmgr-thread-title"
      closeLabel={L.close}
      onClose={onClose}
      zIndex={1000}
      className="evc-shell is-wide has-own-footer"
      testId="fbmgr-thread-modal"
      closeTestId="fbmgr-thread-close"
      footer={
        // 「기타」는 한 대상의 스레드가 아니라 새로 쓸 곳이 없다(FB1 — 연결 없는 피드백 작성 UI 미제공).
        isEtc ? null : isPastPeriod ? (
          <div style={{ padding: 16, background: C.pastBg, color: C.sub, fontSize: 'var(--font-size-text-xs)', textAlign: 'center' }}><ClockIcon size={12} /> {L.pastReadonly}</div>
        ) : (
          <ModalComposeBox block={block} memberName={memberName} L={L} onSend={onSend} onAiDraft={onAiDraft} aiDraftDisabled={aiDraftDisabled} />
        )
      }
    >
      <div className="evc-shell-thread-list is-team">
        {onSummarize && (
          <Tooltip content={canSummarize ? '' : L.summarizeNotEnough} className="fbmgr-summarize-tip">
            {/* 디자이너 AI 버튼(원온원 «AI 생성» · PW-2696). 기다리는 동안은 AI 마크 자리에서 돈다. */}
            <MemberAiButton
              label={summaryState === 'loading' ? L.summarizing : L.summarize}
              ariaLabel={L.summarize}
              onClick={summarize}
              disabled={!canSummarize}
              pending={summaryState === 'loading'}
              testId="fbmgr-summarize"
            />
          </Tooltip>
        )}
        {summary && (
          <div data-testid="fbmgr-summary" style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 'var(--font-size-text-xs)', fontWeight: 700, color: C.accent, marginBottom: 'var(--spacing-xs)' }}><SparkleIcon size={12} /> {L.summarize}</div>
            <p style={{ fontSize: 13, color: C.text, margin: 0, whiteSpace: 'pre-wrap' }}>{summary.summaryText}</p>
            {threadCount > summaryCount && (
              <p data-testid="fbmgr-summary-stale" style={{ fontSize: 12, color: C.sub, margin: '6px 0 0' }}>{L.summaryStale}</p>
            )}
          </div>
        )}
        {summaryState === 'notice' && <div data-testid="fbmgr-summary-notice">{summaryNotice}</div>}
        {summaryState === 'error' && (
          <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: 10, fontSize: 'var(--font-size-text-xs)' }}>
            {L.summaryFailed}
          </div>
        )}
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.sub, fontSize: 13, padding: 24 }}>{L.threadEmpty}</p>
        ) : (
          items.map((it) => it.itemType === 'feedback' ? (
            <FeedbackBubble
              asReply={replyIds.has(it.id)}
              key={it.id}
              item={it}
              member={member}
              L={L}
              canModify={!isPastPeriod && !!onEditFeedback && !!onDeleteFeedback}
              onEdit={onEditFeedback}
              onDelete={onDeleteFeedback}
              targetLabel={targetOf(it)}
            />
          ) : <RequestBubble key={it.id} item={it} L={L} targetLabel={targetOf(it)} />)
        )}
      </div>
    </ModalShell>
  );
}

function PeriodSelector({ periodKey, options, isPastPeriod, onChange, L }) {
  if (!options || options.length === 0) return null;
  // 공용 고르기 칸 + 이름표 (PW-1890). 지난 기간이면 이름표만 회색이고, 칸 안 글에 「(과거 기간)」이 붙는다.
  return (
    <span className="evf-period">
      <span className={`evf-period-label${isPastPeriod ? ' is-past' : ''}`}>{L.periodLabel}</span>
      <Select
        value={periodKey}
        onChange={(e) => onChange(e.target.value)}
        aria-label={L.periodLabel}
        data-testid="fbmgr-period"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
            {o.isCurrent ? '' : L.pastPeriodMark}
          </option>
        ))}
      </Select>
    </span>
  );
}

function groupBlocks(items, krs, initiatives) {
  const byKey = new Map();
  for (const it of items) {
    const key = it.linkedTargetType && it.linkedTargetId ? `${it.linkedTargetType}:${it.linkedTargetId}` : 'etc';
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  }
  const krBlocks = krs.map((kr, i) => ({ type: 'kr', id: kr.id, key: `kr:${kr.id}`, badge: kr.badge || `KR${i + 1}`, title: kr.title, progress: kr.progress ?? 0, items: byKey.get(`kr:${kr.id}`) || [] }));
  const initBlocks = initiatives.map((it) => ({ type: 'init', id: it.id, key: `init:${it.id}`, title: it.title, items: byKey.get(`init:${it.id}`) || [] }));
  // 「기타」 — 연결 대상이 없거나 연결된 KR·이니셔티브가 지금 목록에 없는 것 전부(§3.2-8).
  // 버리면 그 피드백이 이 화면 어디에도 안 보인다.
  const shown = new Set([...krBlocks, ...initBlocks].map((b) => b.key));
  const etcItems = [];
  for (const [key, list] of byKey) {
    if (!shown.has(key)) etcItems.push(...list);
  }
  const etc = etcItems.length ? { type: 'etc', id: 'etc', key: 'etc', title: '', items: etcItems } : null;
  // 목록 밖 대상마다 대화 창 하나(§3.4-A) — 카드로는 그리지 않고(글은 「기타」에 보인다), 그 대상에 걸린
  // 요청에 답할 때만 연다. 제목은 서버가 준 것(지워졌으면 글을 만들 때 남긴 제목)이다.
  const orphans = [];
  for (const [key, list] of byKey) {
    if (key === 'etc' || shown.has(key)) continue;
    const [type, ...rest] = key.split(':');
    const titled = [...list].reverse().find((it) => it.linkedTargetTitle);
    orphans.push({ type, id: rest.join(':'), key, orphan: true, title: titled?.linkedTargetTitle || '', items: list });
  }
  return { krBlocks, initBlocks, etc, orphans };
}

/**
 * 「기타」에 든 글의 연결 대상 칩(§3.7 · §3.4-A). 기타에는 연결 없는 글과 목록 밖 대상의 글만 들어서,
 * 대상이 있으면 늘 목록 밖이다. 연결 없는 글에는 칩이 없다.
 */
function etcTargetLabel(it, L) {
  return it.linkedTargetType && it.linkedTargetId ? orphanLabel(it.linkedTargetType, it.linkedTargetTitle, L) : null;
}

/** 목록 밖 대상의 칩·창 제목 — «KR · {제목} · 현재 기간 OKR 에 없음» (§3.4-A). 받은 요청 탭과 같은 글. */
function orphanLabel(type, title, L) {
  return inboxTargetLabel({ linkedTargetType: type, linkedTargetId: 'x', linkedTargetTitle: title, linkedTargetInCurrentPeriod: false }, L);
}

/** 요청에 걸린 대상 배지 문구 — 목록에 있으면 카드와 같은 이름, 없으면 종류만. */
function linkedLabel(item, krBlocks, initBlocks, L) {
  if (!item.linkedTargetType || !item.linkedTargetId) return null;
  const key = `${item.linkedTargetType}:${item.linkedTargetId}`;
  const kr = krBlocks.find((b) => b.key === key);
  if (kr) return `${kr.badge} · ${kr.title}`;
  const init = initBlocks.find((b) => b.key === key);
  if (init) return `# ${init.title}`;
  return orphanLabel(item.linkedTargetType, item.linkedTargetTitle, L);
}

/**
 * 받은 피드백 요청 칸 (§3.4) — 그 팀원이 나에게 보낸, 아직 답하지 않은 요청만. 같은 대상으로
 * 피드백을 보내면 서버가 그 요청을 해결로 바꾸고 다시 읽은 스레드에서 빠진다.
 * 「답변 작성」은 그 요청의 KR/이니셔티브 대화 창을 연다. 걸린 대상이 지금 목록에 없어도(지워짐·
 * 지난 분기) 그 대상을 고정한 창을 연다 — 칩 끝에 «· 현재 기간 OKR 에 없음»(§3.4-A · EC-7, pivit-work PW-1535).
 */
/** 받은 요청은 최근 몇 건만 펼쳐 둔다 — 나머지는 «나머지 N건 더 보기» (PW-2684). */
const INCOMING_VISIBLE = 3;

function IncomingRequestsSection({ requests, krBlocks, initBlocks, orphans = [], L, onAnswer }) {
  const [showAll, setShowAll] = useState(false);
  if (requests.length === 0) return null;
  const sorted = [...requests].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const visible = showAll ? sorted : sorted.slice(0, INCOMING_VISIBLE);
  const restCount = sorted.length - visible.length;
  const blockFor = (it) =>
    it.linkedTargetType && it.linkedTargetId
      ? [...krBlocks, ...initBlocks, ...orphans].find((b) => b.key === `${it.linkedTargetType}:${it.linkedTargetId}`) || null
      : null;
  // 팀장 쪽은 소제목을 카드 밖에 두고, 요청은 흰 카드 한 장 안에 위아래 24 + 가는 줄(PW-2696 · 원온원 «주의 필요» 소제목 ·
  // OKR «KR 피드백» 창 이름·날짜 · 원온원 읽기 상자). 앞 3건 + «나머지 N건 더 보기»는 PW-2684 그대로.
  return (
    <section data-testid="fbmgr-incoming-section">
      <h3 className="fbmgr-section-heading" data-testid="fbmgr-incoming-title">
        <CountHeading template={L.incomingSection} count={requests.length} />
      </h3>
      <div data-testid="fbmgr-incoming" className="evf-incoming is-team">
        {visible.map((it) => {
          const target = blockFor(it);
          const label = linkedLabel(it, krBlocks, initBlocks, L);
          return (
            <div key={it.id} data-testid={`fbmgr-incoming-${it.id}`} className="evf-incoming-row">
              <Avatar name={it.author?.name} photo={it.author?.avatar} size={40} />
              <div className="evf-incoming-body">
                <div className="evf-incoming-head is-nowrap">
                  <span className="evf-incoming-name" style={NO_SHRINK}>{it.author?.name}</span>
                  {label && <Chip tone="info" title={label} style={LONG_CHIP}>{label}</Chip>}
                  <span className="evf-incoming-meta" style={NO_SHRINK}>{fmtDate(it.sentAt)}</span>
                </div>
                {it.text && <p className="fbmgr-readbox">{it.text}</p>}
                {target && (
                  <div className="fbmgr-incoming-act">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onAnswer(target)}
                      data-testid={`fbmgr-incoming-answer-${it.id}`}
                    >
                      {L.answerRequest}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {restCount > 0 && (
          <LoadMoreButton
            className="evf-incoming-more"
            label={fill(L.incomingMore, { count: restCount })}
            onClick={() => setShowAll(true)}
          />
        )}
      </div>
    </section>
  );
}

function ThreadScreen({ member, thread, krs, initiatives, okrGroups, snippets, L, onBack, onChangePeriod, onSend, onAiDraft, aiDraftDisabled, onSummarize, onEditFeedback, onDeleteFeedback, openTarget, onOpenTargetHandled, openBlockKey, onOpenBlockChange }) {
  // 연 창은 소비 측이 쥘 수도 있다(`openBlockKey` 를 넘기면) — 브라우저 뒤로가기로 창만 닫으려면
  // 창이 열린 것을 주소 기록에 남겨야 해서다(manager §8-10). 안 넘기면 종전처럼 캔버스가 쥔다.
  const controlled = openBlockKey !== undefined;
  const [localOpen, setLocalOpen] = useState(null);
  const openBlock = useMemo(
    () => (controlled ? (openBlockKey ? { key: openBlockKey } : null) : localOpen),
    [controlled, openBlockKey, localOpen],
  );
  const setOpenBlock = (block) => {
    if (!controlled) setLocalOpen(block);
    onOpenBlockChange?.(block ? block.key : null);
  };
  // 딥링크로 열린 모달을 사용자가 닫았는가 — 닫은 뒤 재조회로 되살아나지 않게.
  const [linkDismissed, setLinkDismissed] = useState(false);
  // [PW-1736] 팀원의 피드백은 전부 블록에 남긴다 — 답한 요청·동료에게 간 요청도 기록이다(OKR 칩과 같은 건수).
  // 「받은 피드백 요청」 칸만 나에게 온 아직 답하지 않은 요청이다 — 같은 대상으로 피드백을 보내면 사라진다(§3.4 · §3.6).
  const items = useMemo(() => thread?.items || [], [thread]);
  const { krBlocks, initBlocks, etc, orphans } = useMemo(() => groupBlocks(items, krs, initiatives), [items, krs, initiatives]);
  // 목록 밖 대상 중 나에게 온 열린 요청이 걸린 것만 창을 열 수 있다(§3.4-A). 그 밖의 목록 밖 대상은
  // 예전처럼 «기타»에서 읽기만 하고, 딥링크도 «찾을 수 없음»으로 둔다(§3.1.1).
  const answerable = useMemo(
    () => orphans.filter((b) => b.items.some((i) => isToMe(i) && !i.resolvedAt)),
    [orphans],
  );
  const openRequests = useMemo(() => items.filter((i) => isToMe(i) && !i.resolvedAt), [items]);

  // 딥링크 진입(OKR 타인 KR 「전체 보기」 → `/feedback/team?member=…&kr=…`).
  // 멤버 뷰와 같은 규칙 — 열 블록은 **파생값**이고 state 로 복사하지 않는다.
  // 비교는 문자열 일치다(id 는 UUID 일 수 있다).
  const linkedBlock = useMemo(() => {
    if (linkDismissed || !openTarget?.type || !openTarget?.id) return null;
    const key = `${openTarget.type}:${openTarget.id}`;
    return [...krBlocks, ...initBlocks, ...answerable].find((b) => b.key === key) || null;
  }, [openTarget, krBlocks, initBlocks, answerable, linkDismissed]);

  // 도착 결과를 한 번만 알린다. 소비 측은 스레드 로딩이 끝난 뒤에 `openTarget` 을
  // 넘겨야 한다 — 로딩 중에 넘기면 «찾을 수 없음» 으로 잘못 판정된다.
  const notified = useRef(null);
  useEffect(() => {
    if (!openTarget?.type || !openTarget?.id) return;
    const key = `${openTarget.type}:${openTarget.id}`;
    if (notified.current === key) return;
    notified.current = key;
    onOpenTargetHandled?.(Boolean(linkedBlock));
    // 소비 측이 창을 쥐면 딥링크로 연 창도 넘긴다 — 그래야 뒤로가기가 이 창을 닫는다.
    // 그 뒤로는 소비 측의 `openBlockKey` 만 창을 연다(아래 liveBlock).
    if (controlled && linkedBlock) onOpenBlockChange?.(linkedBlock.key);
  }, [openTarget, linkedBlock, onOpenTargetHandled, controlled, onOpenBlockChange]);

  const liveBlock = useMemo(() => {
    const active = openBlock || (controlled ? null : linkedBlock);
    if (!active) return null;
    // 답한 뒤에도 그 대상 창은 닫지 않는다 — 방금 보낸 답이 창에 보여야 한다(목록 밖 대상 전부를 본다).
    const found = [...krBlocks, ...initBlocks, ...orphans, ...(etc ? [etc] : [])].find((b) => b.key === active.key);
    if (found) return found;
    // 다시 읽은 뒤 블록이 사라졌으면(기타의 마지막 피드백을 지움 등) 창을 닫는다.
    // 소비 측이 준 키만 있고 블록이 아직 없으면(스레드 로딩 중) 열지 않는다.
    return active.items && active.type !== 'etc' ? active : null;
  }, [openBlock, controlled, linkedBlock, krBlocks, initBlocks, orphans, etc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={onBack} data-testid="fbmgr-back" style={{ border: 'none', background: 'none', color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{L.back}</button>
        <Avatar name={member.name} photo={member.avatar} size={30} />
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{member.name}</span>
        <span style={{ marginLeft: 'auto' }}>
          <PeriodSelector periodKey={thread?.periodKey} options={thread?.periodOptions} isPastPeriod={thread?.isPastPeriod} onChange={(k) => { setOpenBlock(null); onChangePeriod(k); }} L={L} />
        </span>
      </div>
      {thread?.isPastPeriod && (
        <div data-testid="fbmgr-past-banner" style={{ background: C.pastBg, border: `1px solid ${C.border}`, color: C.sub, borderRadius: 10, padding: '10px 12px', fontSize: 'var(--font-size-text-xs)' }}><ClockIcon size={12} /> {L.pastBanner}</div>
      )}
      {/* 안내는 테두리 상자 없이 아이콘 + 회색 한 줄(원온원 «보는 범위» 안내 쓰임 · PW-2696) */}
      <p data-testid="fbmgr-info-banner" className="fbmgr-team-hint">
        <ChatIcon size={16} /> {fill(L.infoBanner, { name: member.name })}
      </p>
      {okrGroups.length > 0 && krBlocks.length > 0 && (
        <FeedbackOkrPanel groups={okrGroups} krBlocks={krBlocks} initBlocks={initBlocks} snippets={snippets} L={L} testIdPrefix="fbmgr" />
      )}
      <IncomingRequestsSection requests={openRequests} krBlocks={krBlocks} initBlocks={initBlocks} orphans={answerable} L={L} onAnswer={setOpenBlock} />
      {krBlocks.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: 0.5 }}>{L.sectionKr}</div>}
      {krBlocks.map((b) => <BlockCard key={b.key} block={b} member={member} L={L} onOpen={setOpenBlock} />)}
      {initBlocks.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: 0.5, marginTop: 6 }}>{L.sectionInit}</div>}
      {initBlocks.map((b) => <BlockCard key={b.key} block={b} member={member} L={L} onOpen={setOpenBlock} />)}
      {etc && <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: 0.5, marginTop: 6 }}>{L.sectionEtc}</div>}
      {etc && <BlockCard block={etc} member={member} L={L} onOpen={setOpenBlock} />}
      {krBlocks.length === 0 && initBlocks.length === 0 && !etc && <p className="evc-empty-sub">{L.emptyBlock}</p>}

      {liveBlock && (
        <ThreadModal block={liveBlock} member={member} memberName={member.name} L={L} isPastPeriod={thread?.isPastPeriod} onSend={onSend} onAiDraft={onAiDraft} aiDraftDisabled={aiDraftDisabled} onSummarize={onSummarize} onEditFeedback={onEditFeedback} onDeleteFeedback={onDeleteFeedback} onClose={() => { setOpenBlock(null); setLinkDismissed(true); }} />
      )}
    </div>
  );
}

export default function EvalFeedbackComposeCanvas({
  /** 제목 바로 오른쪽 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2430). 안 주면 지금과 같다. */
  titleHelp,
  team = { members: [], summary: null },
  selectedMember = null,
  thread = null,
  krs = [],
  initiatives = [],
  // 팀원 OKR 컨텍스트 (§3.3) — Objective 그룹 `[{ id, unitLabel, title, progress, krIds }]` · 최근 스니핏 `[{ id, date, summary }]`
  okrGroups = [],
  snippets = [],
  labels: providedLabels,
  onSelectMember,
  onBack,
  openTarget = null,
  onOpenTargetHandled,
  onChangePeriod,
  onSendFeedback,
  onAiDraft,
  /**
   * 그 팀원의 OKR(KR)을 불러오지 못했거나 KR 이 없으면 참 — [✦ AI 추천 받기] 를 끄고 «OKR 컨텍스트가 필요합니다»
   * 말풍선을 단다(screen-feedback-manager.policy §4.3 · §5 · EC-3, pivit-work PW-2481). 안 주면 지금처럼 켜져 있다.
   */
  aiDraftDisabled = false,
  onSummarize,
  // 보낸 피드백 수정·삭제 (§3.8) — `(item, text)` · `(item)`. 실패는 던진다(말풍선이 받아 알린다).
  onUpdateFeedback,
  onDeleteFeedback,
  // 팀원 목록을 불러오는 중 / 못 불러왔다 (manager §5). 실패 안내는 소비 측이 띄운다.
  teamLoading = false,
  teamFailed = false,
  // 연 창(블록 key) — 넘기면 소비 측이 쥔다. 열고 닫을 때 onOpenBlockChange(key | null).
  openBlockKey,
  onOpenBlockChange,
  // 피드백 본문 최대 길이(PW-1799) — 쓰기·고치기 칸이 같이 쓴다. 안 넘기면 제한 없음.
  textMaxLength,
  // ── 「받은 요청」 탭 (§2.6, pivit-work PW-2479) — `onChangeTab` 을 넘겨야 탭 줄이 생긴다. ──
  // tab: 'team' | 'requests'. requests: 먼저 처리할 순으로 정렬된 요청
  // `[{ id, requester: { name, avatar }, text, sentAt, linkedTargetType, linkedTargetId, linkedTargetTitle,
  //    linkedTargetInCurrentPeriod, due: { label, tone } }]`. 실패 안내는 소비 측이 띄운다.
  tab = 'team',
  onChangeTab,
  requests = [],
  requestsLoading = false,
  requestsFailed = false,
  onOpenRequest,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleSend = async (payload) => {
    try {
      await onSendFeedback?.(payload);
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
      throw new Error('send failed');
    }
  };

  const handleDeleteFeedback = onDeleteFeedback
    ? async (item) => {
        try {
          await onDeleteFeedback(item);
        } catch (e) {
          showToast(L.feedbackDeleteError, 'error');
          throw e;
        }
      }
    : undefined;

  // AI 초안 실패·빈 응답은 안내하고 null 을 준다 — 입력칸은 건드리지 않는다(manager §4.3·§8-9).
  const handleAiDraft = onAiDraft
    ? async (input) => {
        let res = null;
        try {
          res = await onAiDraft(input);
        } catch {
          res = null;
        }
        // `{ notice }` 는 실패 문구 대신 창 안에 그릴 안내다 — 일반 실패 토스트를 겹쳐 띄우지 않는다(PW-2481).
        if (res && typeof res === 'object' && res.notice) return res;
        const draft = typeof res === 'string' ? res : res?.draft;
        if (!draft || !draft.trim()) {
          showToast(L.aiError, 'error');
          return null;
        }
        return res;
      }
    : undefined;

  return (
    <FeedbackTextLimitContext.Provider value={textMaxLength}>
    <div className="evc-root" style={{ background: C.bg, fontFamily: FONT }}>
      {/* PW-983 — 공용 Toast 로 그린다(<body> 바로 아래). `.evc-root` 가 position: fixed 라 그 안에
          그리면 z-index 가 앱 위쪽 바를 넘지 못해 알림이 바 밑에 깔려 보이지 않았다(PW-978 과 같은 원인). */}
      <Toast
        message={toast?.msg}
        tone={toast?.type === 'success' ? 'success' : 'error'}
        data-testid="fbmgr-toast"
      />
      {/* 폭은 .evc-root 의 기본값(폭 제한 없음, PW-1951)을 그대로 쓴다 — 수시 피드백 3화면과 정기 평가가
          같은 본문 폭이라야 탭을 옮길 때 내용의 좌우 끝이 움직이지 않는다 (PW-218). */}
      <header className="evc-header">
        <div>
          <h1 className="evc-title">
            {L.title}
            {titleHelp}
          </h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>
      {/* 탭 줄은 팀원 목록·받은 요청을 보는 동안만 — 팀원 스레드에 들어가면 숨긴다(§2.6.1).
          건수는 탭 이름 괄호 안에만 한 번, 불러온 뒤에만 붙인다(실패·0 건이면 괄호 없이 — §2.6.3). */}
      {!selectedMember && onChangeTab && (
        <div className="tl-tabs-row evc-tabs-row">
          <Tabs
            items={[
              { value: 'team', label: L.tabTeam, testId: 'fbmgr-tab-team' },
              {
                value: 'requests',
                label:
                  !requestsLoading && !requestsFailed && requests.length > 0
                    ? `${L.tabRequests} (${requests.length})`
                    : L.tabRequests,
                testId: 'fbmgr-tab-requests',
              },
            ]}
            value={tab}
            onChange={onChangeTab}
          />
        </div>
      )}
      <div className="evc-list">
        {selectedMember ? (
          <ThreadScreen
            member={selectedMember}
            thread={thread}
            krs={krs}
            initiatives={initiatives}
            okrGroups={okrGroups}
            snippets={snippets}
            L={L}
            onBack={onBack}
            onChangePeriod={onChangePeriod}
            onSend={handleSend}
            onAiDraft={handleAiDraft}
            aiDraftDisabled={aiDraftDisabled}
            onSummarize={onSummarize}
            onEditFeedback={onUpdateFeedback}
            onDeleteFeedback={handleDeleteFeedback}
            openTarget={openTarget}
            onOpenTargetHandled={onOpenTargetHandled}
            openBlockKey={openBlockKey}
            onOpenBlockChange={onOpenBlockChange}
          />
        ) : onChangeTab && tab === 'requests' ? (
          <InboxScreen requests={requests} L={L} onOpen={onOpenRequest} loading={requestsLoading} failed={requestsFailed} />
        ) : (
          <TeamListScreen team={team} L={L} onSelect={onSelectMember} loading={teamLoading} failed={teamFailed} />
        )}
      </div>
    </div>
    </FeedbackTextLimitContext.Provider>
  );
}
