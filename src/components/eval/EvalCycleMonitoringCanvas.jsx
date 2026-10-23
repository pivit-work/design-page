import { Fragment, useMemo, useState } from 'react';
import EvalProgressBar from './EvalProgressBar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import DatePicker from '../shared/DatePicker.jsx';
import { ChevronLeftIcon, PauseIcon, StopIcon, TrashIcon, UndoIcon } from './evalIcons.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';

/**
 * EvalCycleMonitoringCanvas — HR 진행 현황 (단계 진행·완료율·멤버 상태·리마인더·비상정지).
 * 순수 표현: stages/members/completionPct + 콜백(onRemind/onEmergencyStop/onReopen/onHold/onResume).
 */

const DEFAULT_LABELS = {
  title: '진행 현황',
  completion: '전체 완료율',
  stagesTitle: '단계별 진행',
  membersTitle: '구성원 현황',
  colMember: '구성원',
  colSelf: '셀프',
  colPeer: '동료 확정',
  colLeader: '하향',
  colGrade: '등급',
  // [PW-1462] 정책 §6.3 버튼 이름
  remind: '전체 리마인더 발송',
  // [PW-1462] 구성원 줄마다 — 미제출이 1건 이상인 사람 (정책 §6.2.1 액션 열)
  remindOne: '리마인더',
  reminded: '{{count}}명에게 리마인더 발송',
  emergencyStop: '비상 정지',
  stoppedBanner: '이 사이클은 비상 정지되었습니다. 제출이 차단됩니다.',
  reopen: '재개',
  // [PW-1120] 일시 중단(`on_hold`) 중 진행 현황 오른쪽 위 (정책 §6.6 버튼 위치 ②·라벨)
  resume: '평가 재개',
  // [PW-1458] 진행 중일 때 같은 자리의 [평가 일시 중단] + 확인 창 (정책 §6.6 — 사이클 목록과 같은 문구)
  hold: '평가 일시 중단',
  confirmHoldTitle: '평가를 일시 중단할까요?',
  confirmHoldBody: '«{{name}}»의 제출이 재개할 때까지 막힙니다. 작성 중인 내용은 지워지지 않습니다.',
  confirmHoldCancel: '취소',
  // [PW-2063 · 정책 §5.7.2] 사이클 회수 — 버튼 · 기록이 있으면 비활성 + 버튼 줄 아래 이유 한 줄(PW-2077 정정)
  revoke: '사이클 회수',
  revokeBlocked:
    '구성원 기록 {{count}}건이 있어 회수할 수 없습니다. 멈추려면 평가 일시 중단을, 치우려면 사이클 삭제를 쓰십시오.',
  revokeBlockedPublished: '구성원 기록 {{count}}건이 있어 회수할 수 없습니다. 멈추려면 평가 일시 중단을 쓰십시오.',
  confirmRevokeTitle: '사이클을 회수하시겠습니까?',
  revokeEffectsTitle: '회수하면 일어나는 일',
  revokeEffectDraft: '초안으로 돌아갑니다. 설정은 그대로 남고, 고쳐서 다시 오픈하거나 초안을 삭제할 수 있습니다.',
  withdrawEffectNotify: '오픈 알림을 받은 {{count}}명에게 「평가가 취소되었습니다」 알림이 갑니다(인앱 + 이메일).',
  revokeEffectSent: '이미 보낸 오픈 알림과 리마인더 {{count}}건은 거둘 수 없습니다.',
  withdrawEffectNotifyUnknown: '「평가가 취소되었습니다」 알림을 받을 인원: {{status}}',
  revokeEffectSentUnknown: '이미 보낸 오픈 알림과 리마인더: {{status}}',
  revokeEffectNoRecords: '작성된 응답 0건 · 제출된 리뷰 0건 — 구성원이 남긴 기록이 없어 회수할 수 있습니다.',
  revokeRejected: '그사이 구성원이 작성을 시작해 회수할 수 없습니다. 멈추려면 평가 일시 중단을 쓰십시오.',
  revoking: '회수하는 중…',
  // [PW-2085 · 정책 §5.7.3] 오픈한 사이클 삭제
  deleteCycle: '사이클 삭제',
  confirmDeleteTitle: '사이클을 삭제하시겠습니까?',
  deleteEffectsTitle: '삭제하면 일어나는 일',
  deleteEffectGone: '이 사이클과 구성원이 남긴 기록이 모두 지워집니다. 되돌릴 수 없습니다.',
  deleteEffectRecords:
    '지워지는 기록: 작성 중 응답 {{draft}}건 · 제출된 리뷰 {{submitted}}건 · 동료 추천 {{nominations}}건 · 이의 제기 {{objections}}건',
  deleteEffectRecordsFailed: '지워지는 기록: 불러오지 못했습니다',
  deleteEffectRecordsLoading: '지워지는 기록: 불러오는 중…',
  deleteEffectNoRecords: '구성원이 남긴 기록은 없습니다. 고쳐서 다시 오픈하려면 삭제 대신 사이클 회수를 쓰십시오.',
  deleteEffectAudit: '삭제한 사람·시각·지운 기록 수는 감사 기록에 남습니다.',
  deleteReasonLabel: '삭제 사유 (필수 · {{max}}자 이내)',
  deleteReasonPlaceholder: '예) 대상자를 잘못 넣어 오픈했습니다 — 다시 만들어 엽니다',
  deleteReasonHint: '사유는 감사 기록에 남습니다.',
  deleteNameLabel: '확인을 위해 사이클 이름을 입력하십시오',
  deleteChanged: '그사이 기록이 바뀌었습니다. 바뀐 수를 확인하고 다시 삭제하십시오.',
  deletePublished: '그사이 결과가 공개되어 삭제할 수 없습니다.',
  deleting: '삭제하는 중…',
  withdrawLoading: '불러오는 중…',
  withdrawLoadFailed: '불러오지 못했습니다',
  withdrawCancel: '취소',
  withdrawClose: '닫기',
  exclude: '제외',
  restore: '복원',
  excludedBadge: '제외됨',
  // [PW-534 ㉯] 오픈 뒤 합류한 대상자 (정책 §5.3.6)
  joinedBadge: '중도 합류',
  joinedTooltip: '{{at}} 합류',
  // [PW-1462] 평가 기간 중 퇴사 (정책 엣지케이스 「해당 구성원 평가 행 비활성 처리 + "퇴사 처리됨" 배지」)
  retiredBadge: '퇴사 처리됨',
  // [PW-1462] 부서 고르기 (정책 §6.4)
  deptFilterLabel: '부서',
  deptSearchPlaceholder: '부서 이름으로 찾기',
  deptSearchEmpty: '일치하는 부서가 없습니다',
  navTemplate: '템플릿',
  navCalibration: '캘리브레이션',
  navReport: '종합 리포트',
  navReportReview: '리포트 검수',
  // [PW-534] 단계 열의 셀 (정책 §6.2.2)
  colProgress: '진행률',
  // [PW-1462] 진행률 열 (정책 §6.2.1 「완료 N / 대상 M」 · 대상 0이면 –)
  progressCell: '완료 {{done}} / 대상 {{total}}',
  statusPending: '미제출',
  statusInProgress: '작성 중',
  statusSubmitted: '제출 완료',
  cellCount: '제출 {{done}} / 배정 {{total}}',
  cellNone: '–',
  submittedAtTooltip: '{{at}} 제출',
  // [PW-534] 내보내기 (정책 §6.9)
  exportTitle: '내보내기',
  exportFilter: '현재 필터: {{scope}} · {{count}}명',
  exportProgress: '진행 상태 CSV',
  exportAnswers: '평가 응답 CSV',
  exportProgressHint: '구성원별 단계 진행 상태 (1행 = 구성원)',
  exportAnswersHint: '평가 응답 원문 (1행 = 답변)',
  exportNoTarget: '내보낼 대상이 없습니다',
  exportNote:
    '평가 응답은 사유 입력이 필요하며, 익명 항목의 작성자 정보는 포함되지 않습니다.',
  exportModalTitleProgress: '진행 상태 CSV 내보내기',
  exportModalTitleAnswers: '평가 응답 CSV 내보내기',
  exportModalBodyProgress: '현재 화면에 보이는 {{count}}명의 단계별 진행 상태를 내려받습니다.',
  // [PW-1462] 정책 §6.9.4 — 행 수를 미리 밝힌다. [PW-2041] 한 문단이던 세 문장을 부제·알약·딱지로 쪼갰다
  // (문장은 그대로). 행 수 알약은 행 수를 센 호출부(`onOpenExport`)에서만 보인다.
  exportModalBodyAnswersShort: '평가 응답 원문을 내려받습니다. 사유를 입력해 주세요.',
  exportRowCount: '{{count}}행',
  exportAnonymousNote: '익명 항목의 작성자 정보는 포함되지 않습니다',
  exportAnswersCounting: '내려받을 행 수를 세는 중입니다…',
  exportAnswersCountFailed: '내려받을 행 수를 불러오지 못했습니다. 창을 닫고 다시 열어 주세요.',
  exportReasonLabel: '반출 사유',
  exportReasonPlaceholder: '예) 2026 상반기 평가 이력 보관 — 인사팀 아카이브',
  exportReasonRequired: '사유를 입력해 주세요 (200자 이내).',
  exportCancel: '취소',
  exportConfirm: '내려받기',
  historyTitle: '내보내기 이력',
  historyEmpty: '아직 내보낸 적이 없습니다.',
  historyKindProgress: '진행 상태',
  historyKindAnswers: '평가 응답',
  historyRows: '{{count}}행',
  historyRowsWithExcluded: '{{count}}행 · {{excluded}}행 제외',
  historyFailed: '실패',
  done: '완료',
  notDone: '미완료',
  // [PW-585] 단계 상세 (정책 §6.8 · §6.10)
  // 🔴 화살표는 글자가 아니라 인라인 SVG 로 그린다 — 번역 번들에 기호를 넣지 않는다.
  backToStages: '단계 목록',
  stageOpenNow: '진행 중',
  // stage keys
  stageSelfReview: '셀프 리뷰',
  stagePeerAssign: '동료 배정',
  stagePeerReview: '동료 리뷰',
  stageUpwardReview: '상향 리뷰',
  stageLeaderReview: '하향 리뷰',
  stageCalibration: '캘리브레이션',
  // [PW-1461] 결과 발송 단계 (정책 §6.8 · §5.2.1-C)
  stageResultShare: '결과 발송',
  // [PW-1461] 단계 카드의 기간 바로 고치기 (정책 §6.5)
  stageDateStart: '시작일 바꾸기',
  stageDateEnd: '종료일 바꾸기',
  stageDateLocked: '완료된 단계의 날짜는 변경할 수 없습니다.',
  stageDateSaveFailed: '날짜 변경에 실패했습니다. 다시 시도해 주세요.',
  // self status
  selfNotStarted: '시작 전',
  selfInProgress: '작성 중',
  selfSubmitted: '제출',
};

/**
 * 단계 키 → 이름표. 여기 없는 키는 줄 이름 자리에 **키가 그대로 나간다**
 * (`upward_review` 같은 코드값). [PW-841] 상향 리뷰가 빠져 있었다.
 */
const STAGE_KEY = {
  self_review: 'stageSelfReview',
  peer_assign: 'stagePeerAssign',
  peer_review: 'stagePeerReview',
  upward_review: 'stageUpwardReview',
  leader_review: 'stageLeaderReview',
  calibration: 'stageCalibration',
  result_share: 'stageResultShare',
};

/**
 * PW-2115 — 진행 현황 단계 줄이 «지금 열려 있나». 단계 키 → 그 단계가 열려 있는 사이클 상태.
 * 리뷰 작성 단계(`peer_review`)에는 동료·상향·하향이 함께 열려 있다(앱 `PHASE_STAGE` 와 같은 표).
 */
const OPEN_STATUS_OF_STAGE = {
  self_review: ['self_review'],
  peer_assign: ['peer_assign'],
  peer_review: ['peer_review'],
  upward_review: ['peer_review'],
  leader_review: ['peer_review'],
  calibration: ['calibration'],
  result_share: ['report_review', 'hr_review'],
};

/** `YYYY-MM-DD…` → 로컬 자정 `Date`. 못 읽으면 null. */
function isoToDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function dateToIso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * [PW-1461 · 정책 §6.5] 단계 카드의 기간 — 날짜를 누르면 그 자리에서 달력이 뜬다.
 *
 * · 끝나지 않은 단계만 고친다. 완료된 단계는 눌러도 아무 일 없고 이유만 툴팁으로 보인다.
 * · 고른 날짜는 바로 저장한다(`onChange` 가 프로미스). 실패하면 원래 날짜로 돌아가고
 *   부르는 쪽이 문구를 띄운다.
 * · 종료일은 시작일 앞을, 시작일은 종료일 뒤를 고를 수 없다 — 단계 안의 순서만 지킨다(겹침은 허용).
 */
function StagePeriod({ stageKey, period, L, onChange, busy }) {
  const [picker, setPicker] = useState(null);
  const shown = (v) => String(v ?? '').slice(0, 10) || '—';
  const editable = !!onChange && !period.locked;
  const open = (field) => (e) => {
    e.stopPropagation();
    if (!editable || busy) return;
    const el = e.currentTarget;
    setPicker({ field, rect: el.getBoundingClientRect(), el });
  };
  const dateBtn = (field) => {
    const btn = (
      <button
        type="button"
        className={`evmon-stage-date${editable ? '' : ' is-locked'}`}
        aria-label={field === 'start' ? L.stageDateStart : L.stageDateEnd}
        aria-disabled={!editable || undefined}
        onClick={open(field)}
        data-testid={`evmon-stage-date-${field}-${stageKey}`}
      >
        {shown(period[field])}
      </button>
    );
    return period.locked ? (
      <Tooltip content={L.stageDateLocked}>{btn}</Tooltip>
    ) : (
      btn
    );
  };
  return (
    <span className="evmon-stage-period" data-testid={`evmon-stage-period-${stageKey}`}>
      {dateBtn('start')}
      <span aria-hidden="true">~</span>
      {dateBtn('end')}
      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={isoToDate(period[picker.field])}
          minDate={picker.field === 'end' ? isoToDate(period.start) ?? undefined : undefined}
          maxDate={picker.field === 'start' ? isoToDate(period.end) ?? undefined : undefined}
          onSelect={(d) => {
            const field = picker.field;
            setPicker(null);
            onChange(field, dateToIso(d));
          }}
          onClose={() => setPicker(null)}
          data-testid={`evmon-stage-picker-${stageKey}`}
        />
      )}
    </span>
  );
}
const SELF_KEY = {
  not_started: 'selfNotStarted',
  in_progress: 'selfInProgress',
  submitted: 'selfSubmitted',
};
// 등급 배지 색: 탁월=초록 / 충족=파랑 / 미흡=빨강.
const GRADE_TONE = {
  exceeds: 'tone-success',
  meets: 'tone-info',
  below: 'tone-error',
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
const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

/**
 * [PW-534] 셀 상태 → 라벨 키 (정책 §6.2.2).
 *
 * 「작성 중」이 없던 동안 임시저장한 사람은 미제출과 같이 칠해졌고, 그래서
 * **이미 쓰고 있는 사람에게 리마인더가 갔다.**
 */
const PHASE_STATUS_KEY = {
  pending: 'statusPending',
  in_progress: 'statusInProgress',
  submitted: 'statusSubmitted',
};
const PHASE_STATUS_TONE = {
  pending: 'tone-neutral',
  in_progress: 'tone-info',
  submitted: 'tone-success',
};
/** 여러 건을 쓰는 단계 — 셀 하나에 상태 하나가 안 들어간다 (§6.2.2). */
const MULTI_ASSIGN = new Set(['peer', 'upward']);

/** `2026-08-30T14:22:00+09:00` → `2026-08-30 14:22`. 파일 밖 표기와 같은 모양이다. */
function fmtSubmittedAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * [PW-534] 구성원 × 단계 한 칸 (정책 §6.2.2).
 *
 * · 셀프·하향 → 상태 배지 1개 (대상 1건)
 * · 동료·상향 → `제출 N / 배정 M` (배정 건수만큼 쓰므로 상태 하나로 안 뭉갠다)
 * · 대상 0건 → `–`
 *
 * 제출일시는 셀 «툴팁»이다. 표에 열로 펼치면 한 사람이 한 행이라는 축이 깨진다 —
 * 건별 내역은 평가 응답 CSV(§6.9 B)에서 본다.
 */
function PhaseCell({ phase, phaseKey, L }) {
  if (!phase || phase.status == null) {
    return <span className="evmon-self">{L.cellNone}</span>;
  }
  const at = fmtSubmittedAt(phase.lastSubmittedAt);
  const title = at ? fill(L.submittedAtTooltip, { at }) : undefined;
  const badge = (
    <StatusBadge
      className={`evc-status-badge ${PHASE_STATUS_TONE[phase.status] ?? 'tone-neutral'}`}
      data-testid="evmon-phase-badge"
      data-status={phase.status}>
      {L[PHASE_STATUS_KEY[phase.status]] ?? phase.status}
    </StatusBadge>
  );
  if (!MULTI_ASSIGN.has(phaseKey)) {
    return (
      <Tooltip content={title}>
        <span className="evmon-self" data-testid="evmon-phase-cell">
          {badge}
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={title}>
      <span className="evmon-self" data-testid="evmon-phase-cell">
        {badge}{' '}
        <span data-testid="evmon-phase-count">
          {fill(L.cellCount, { done: phase.done, total: phase.total })}
        </span>
      </span>
    </Tooltip>
  );
}

function Check({ ok }) {
  return (
    <span className={`evmon-check${ok ? ' is-on' : ''}`} aria-hidden="true">
      {ok ? '✓' : '·'}
    </span>
  );
}

/** [PW-1462] 진행률 — 대상이 있는 단계의 건수를 더한다(동료·상향은 배정 건수). */
function memberProgress(m) {
  const counted = (m.phases || []).filter((p) => p.status !== null);
  return counted.reduce(
    (acc, p) => ({ done: acc.done + (p.done || 0), total: acc.total + (p.total || 0) }),
    { done: 0, total: 0 },
  );
}

export default function EvalCycleMonitoringCanvas({
  cycle,
  stages = [],
  completionPct = 0,
  members = [],
  status,
  gradeLabels = {},
  labels: providedLabels,
  onRemind,
  onEmergencyStop,
  onReopen,
  /**
   * [PW-1458] 진행 중(`active`)일 때 [평가 일시 중단] — 확인 창을 거쳐 부른다 (정책 §6.6).
   * 프로미스를 돌려주면 끝날 때까지 확인 창을 잠근다. 실패 안내는 호출부가 한다.
   * 안 주면 버튼을 그리지 않는다.
   */
  onHold,
  onResume,
  /**
   * [PW-2063·2085 · 정책 §5.7.2·§5.7.3] 회수·삭제 버튼의 서버 판정 — `{ canRevoke, canDelete,
   * recordCount, resultPublished }`. 오픈한 사이클일 때만 넘긴다(안 주면 두 버튼 다 없다).
   * 회수 버튼은 늘 보이고 `canRevoke` 가 아니면 비활성 + 버튼 줄 아래 이유 한 줄(PW-2077 정정).
   * 삭제 버튼은 `canDelete` 일 때만 보인다(결과 공개 뒤에는 없다).
   */
  withdrawal = null,
  /**
   * [PW-2063·2085] 확인 창의 수치 — 창을 열 때 `onOpenWithdraw(kind)` 가 불리면 호출부가 서버에서 받는다.
   * `undefined` = 받는 중, `null` = 못 받음(실행 버튼을 막는다), 값 = `{ records: { draftAnswers,
   * submittedReviews, nominations, objections }, notifiedCount, remindersSent }`.
   */
  withdrawImpact,
  onOpenWithdraw,
  /** [PW-2063] 회수 실행 — `Promise<'done' | 'rejected' | 'failed'>`. rejected = 그사이 기록이 생겼다(409). */
  onRevoke,
  /**
   * [PW-2085] 삭제 실행 — `(reason, expectedCounts) => Promise<'done' | 'changed' | 'published' | 'failed'>`.
   * changed = 그사이 기록 수가 바뀌었다(호출부가 새 수를 `withdrawImpact` 로 다시 준다 · 입력은 남긴다).
   */
  onDeleteCycle,
  /** [PW-2085 · 정책 §5.7.3 D4] 삭제 사유 최대 글자 수 — 서버 정본 한도를 호출부가 넘긴다. */
  deleteReasonMaxLength = 200,
  onExclude,
  onRestore,
  onOpenTemplate,
  onOpenCalibration,
  onOpenReport,
  onOpenReportReview,
  /**
   * `toolbar` — 헤더 아래에 놓을 호출부 노드(선택). 사이클 안 형제 화면으로 오가는 탭
   * 줄이 이 자리에 선다. 이 캔버스의 `.evc-root` 는 `position: fixed` 라 호출부가
   * 바깥에 놓으면 본문 칸을 벗어난다.
   *
   * 위 `onOpen*` 네 콜백이 그리는 줄과 «같은 자리»다. 그 줄은 이 화면에만 있고 불이
   * 들어오는 칸이 없어서, 하나를 누르면 형제 화면으로 돌아올 길이 사라졌다 — 호출부는
   * 콜백 대신 `toolbar` 로 탭 줄을 넘긴다. 콜백 쪽은 단독 프리뷰를 위해 남겨 둔다. (PW-606)
   */
  toolbar = null,
  /**
   * PW-534 ㉮ — 화면 머리에 붙일 층 표시(보통 「사이클 관리」). 사이클 관리 화면의
   * 탭으로 열렸을 때 `{사이클명} · 사이클 관리` 로 읽히게 한다 (정책 §4.6.3).
   *
   * 셸 서브네비와 관리 탭 줄에 **같은 이름이 둘**(진행 현황 · 리포트) 있어서, 이 표시가
   * 없으면 「지금 한 사이클 «안»에 있다」가 화면에 드러나지 않는다.
   * 안 넘기면 종전 그대로 사이클 이름만 보인다.
   */
  manageSuffix = null,
  /**
   * PW-696 — 사이클 관리 화면의 «본문»으로만 그린다.
   *
   * 사이클 관리 탭 여섯이 머리·탭 줄을 각자 그리면 한 곳을 빠뜨린 탭만 어긋난다. 그래서
   * 틀(`EvalCycleManageCanvas`)은 호출부가 한 번만 그리고, 이 캔버스는 그 안의 본문만
   * 맡는다. 켜면 `.evc-root`·머리·`toolbar`·`onOpen*` 줄·`.evc-list` 를 그리지 않고,
   * 머리에 있던 조작(리마인더 · 비상 정지 · 재개)은 본문 맨 위 오른쪽 줄로 내려온다.
   * 안 켜면 종전 그대로다.
   */
  embedded = false,
  /**
   * [PW-534] 이 사이클에서 «열로 세울» 단계 — `[{ key, label }]` (정책 §6.2.1).
   *
   * 비어 있으면 개정 전 3종 고정 열(셀프·동료 확정·하향)로 그린다. 아직 이 값을
   * 안 주는 호출부(단독 프리뷰 등)의 시각을 바꾸지 않기 위해서다.
   */
  memberPhases = [],
  /** [PW-534] 내보내기 (정책 §6.9). 안 주면 내보내기 바·이력이 아예 안 보인다. */
  exportEnabled = false,
  exportScopeLabel = '',
  exportBusy = false,
  exportHistory = null,
  onExport,
  /**
   * [PW-585] 단계 줄을 «누를 수 있게» 한다 (정책 §6.8). 안 주면 종전대로 글자 줄이다 —
   * 단독 프리뷰와 옛 호출부의 시각을 바꾸지 않는다.
   *
   * 누르면 `onSelectStage(stageKey)`, 열린 단계를 다시 누르거나 「← 단계 목록」을 누르면
   * `onSelectStage(null)`.
   */
  onSelectStage,
  /** [PW-585] 지금 열린 단계 — `{ key, label, periodLabel }`. 주면 구성원 표 자리에 상세가 선다. */
  selectedStage = null,
  /** [PW-585] 상세 안에 놓을 호출부 노드. 지금은 「리마인더 발송 기록」 하나다(§6.10.1). */
  stageDetail = null,
  /**
   * [PW-1461 · 정책 §6.5] 단계 카드에 보일 기간 — `{ [stageKey]: { start, end, locked } }`
   * (`start`·`end` 는 `YYYY-MM-DD…`, `locked` = 완료된 단계). 없는 단계는 기간을 안 그린다.
   */
  stagePeriods = null,
  /**
   * [PW-1461 · 정책 §6.5] 기간의 날짜를 바로 고친다. `(stageKey, field, 'YYYY-MM-DD') => Promise`.
   * 실패하면 던진다 — 캔버스가 원래 날짜로 되돌리고 `stageDateSaveFailed` 를 띄운다.
   * 안 주면 기간은 글자로만 보인다.
   */
  onChangeStageDate,
  /**
   * [PW-1594 · 정책 §5.13.6] 단계 요약 아래 「하향 평가자」(오픈 뒤) 접이식 블록 — 호출부가 만든 노드
   * (보통 `EvalLeaderAssignmentLiveSection`). 차수별 배정이 없는 옛 사이클이면 호출부가 안 넘긴다.
   */
  leaderAssignments = null,
  /**
   * [PW-1462 · 정책 §6.4] 부서 고르기 — `[{ value, label, disabled }]`. 「전체」도 호출부가 첫 줄로 넣는다.
   * 구성원이 없는 부서는 `disabled`. 거르는 것도 호출부다 — 표·단계 상세·내보내기가 같은 범위를
   * 따라야 해서(§6.2.3) 캔버스가 표만 거르면 셋이 갈린다. 안 주면 그리지 않는다.
   *
   * 탭이 아니라 드롭다운이다 — 부서가 수십 개인 회사에서 탭 줄이 본문 칸을 넘어 지저분했다(커트 2026-10-10).
   */
  departmentOptions = null,
  departmentValue = null,
  onSelectDepartment,
  /**
   * [PW-1462 · 정책 §6.2.1 · §6.3] 구성원 줄의 「리마인더」. 미제출이 1건 이상이고, 빼지도
   * 퇴사하지도 않은 사람 줄에만 선다. `(memberId) => void`. 안 주면 버튼이 없다.
   */
  onRemindMember,
  /**
   * [PW-1462 · 정책 §6.9.4] 평가 응답 확인 창의 「N행」. `undefined` 면 세는 중, `null` 이면 못 셌다.
   * 창을 열 때 `onOpenExport('answers')` 가 불리면 호출부가 센다.
   */
  answersRowCount,
  onOpenExport,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  /* [PW-1461 · 정책 §6.5] 고른 날짜를 저장하는 동안 그 자리에 먼저 보인다. 실패하면 지운다(= 원래 날짜). */
  const [pendingDates, setPendingDates] = useState({});
  const [dateSaving, setDateSaving] = useState(false);
  const [dateFailed, setDateFailed] = useState(false);
  const changeStageDate = async (stageKey, field, iso) => {
    if (!onChangeStageDate || dateSaving) return;
    setDateFailed(false);
    setDateSaving(true);
    setPendingDates((p) => ({ ...p, [stageKey]: { ...(p[stageKey] ?? {}), [field]: iso } }));
    try {
      await onChangeStageDate(stageKey, field, iso);
    } catch {
      setDateFailed(true);
    } finally {
      // 성공하면 부르는 쪽이 새 기간을 내려준다. 실패하면 원래 날짜로 돌아간다 — 둘 다 지운다.
      setPendingDates((p) => {
        const next = { ...p };
        delete next[stageKey];
        return next;
      });
      setDateSaving(false);
    }
  };
  const periodOf = (key) => {
    const base = stagePeriods?.[key];
    if (!base) return null;
    return { ...base, ...(pendingDates[key] ?? {}) };
  };
  // [PW-534] 확인 모달 — null | 'progress' | 'answers'
  const [exportKind, setExportKind] = useState(null);
  const [exportReason, setExportReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  // [PW-1458] 일시 중단 확인 창 — 열림 · 보내는 중
  const [holdConfirmOpen, setHoldConfirmOpen] = useState(false);
  const [holdBusy, setHoldBusy] = useState(false);
  const confirmHold = async () => {
    setHoldBusy(true);
    try {
      await onHold?.();
    } catch {
      // 실패 안내는 호출부 몫이다 — 창만 닫는다.
    } finally {
      setHoldBusy(false);
      setHoldConfirmOpen(false);
    }
  };
  // [PW-2063·2085] 회수·삭제 확인 창 — null | 'revoke' | 'delete' · 창 안 거절 안내 · 입력
  const [withdrawKind, setWithdrawKind] = useState(null);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawStale, setWithdrawStale] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteTyped, setDeleteTyped] = useState('');
  const openWithdraw = (kind) => {
    setWithdrawKind(kind);
    setWithdrawStale(null);
    setDeleteReason('');
    setDeleteTyped('');
    onOpenWithdraw?.(kind);
  };
  const closeWithdraw = () => {
    if (withdrawBusy) return;
    setWithdrawKind(null);
    setWithdrawStale(null);
  };
  const impactRecords = withdrawImpact ? withdrawImpact.records : null;
  const impactTotal = impactRecords
    ? impactRecords.draftAnswers + impactRecords.submittedReviews + impactRecords.nominations + impactRecords.objections
    : 0;
  const deleteNeedsInputs = impactTotal > 0;
  const deleteInputsOk =
    !deleteNeedsInputs ||
    (deleteReason.trim().length > 0 && deleteTyped.trim() === (cycle?.name ?? '').trim());
  const runWithdraw = async () => {
    setWithdrawBusy(true);
    let outcome = 'failed';
    try {
      outcome =
        withdrawKind === 'revoke'
          ? await onRevoke?.()
          : await onDeleteCycle?.(deleteReason.trim() || null, impactRecords);
    } catch {
      outcome = 'failed';
    } finally {
      setWithdrawBusy(false);
    }
    // 창 안에 남겨 말하는 거절만 창을 둔다 — 성공은 호출부가 목록으로 옮기고, 그 밖 실패는 호출부 토스트다.
    if (outcome === 'rejected' || outcome === 'changed' || outcome === 'published') {
      setWithdrawStale(outcome);
    } else {
      setWithdrawKind(null);
    }
  };
  /* [PW-1054] 「보이는 N명」은 표에 보이는 줄 수 = 파일 줄 수다. 제외된 사람도 표에 흐리게
     남고, 서버 진행 상태 CSV 도 그 사람을 「제외 여부 Y」 줄로 싣는다(§6.9.2 「보이는 것과
     받는 것이 같아야 한다」). 제외자를 빼고 세면 화면 인원과 파일 줄 수가 갈리고, 전원이
     제외된 사이클은 서버가 만들 수 있는 파일을 화면이 잠갔다. */
  const visibleCount = members.length;
  const canExport = exportEnabled && !exportBusy && visibleCount > 0;

  const openExport = (kind) => {
    setExportKind(kind);
    onOpenExport?.(kind);
  };
  const closeExport = () => {
    setExportKind(null);
    setExportReason('');
    setReasonError(false);
  };
  const submitExport = () => {
    // 사유는 «응답» 벌만 받는다 — 매일 쓰는 명단에까지 물으면 형식적으로 채워지고,
    // 그러면 응답 벌의 사유도 같이 무의미해진다 (§6.9.4).
    const reason = exportReason.trim();
    if (exportKind === 'answers' && (!reason || reason.length > 200)) {
      setReasonError(true);
      return;
    }
    onExport?.(exportKind, exportKind === 'answers' ? reason : undefined);
    closeExport();
  };
  const stopped = status === 'emergency_stopped';
  const canStop = status && !['draft', 'done', 'emergency_stopped'].includes(status);
  const navItems = [
    onOpenTemplate && { key: 'tpl', label: L.navTemplate, on: onOpenTemplate, testid: 'evmon-nav-template' },
    onOpenCalibration && { key: 'cal', label: L.navCalibration, on: onOpenCalibration, testid: 'evmon-nav-calibration' },
    onOpenReport && { key: 'rep', label: L.navReport, on: onOpenReport, testid: 'evmon-nav-report' },
    onOpenReportReview && { key: 'rrv', label: L.navReportReview, on: onOpenReportReview, testid: 'evmon-nav-report-review' },
  ].filter(Boolean);

  // [PW-1120] 일시 중단 중에는 구성원 제출이 막혀 있어 리마인더를 받아도 할 수 있는 것이 없다 —
  // 그 자리에 [평가 재개]를 둔다(정책 §6.6 「진행 현황 탭 우상단(동일 동작)」).
  const isOnHold = status === 'on_hold';
  // [PW-1458] 일시 중단할 수 있는 «진행 중» — 서버(`EvalCycle.hold`)가 막는 상태를 뺀 나머지.
  const canHold =
    !!status && !['draft', 'done', 'on_hold', 'emergency_stopped', 'revoked'].includes(status);
  // [PW-2063·2085] 회수는 늘 보이고(기록이 있으면 비활성), 삭제는 결과 공개 전에만 보인다.
  const showRevoke = !!(withdrawal && onRevoke);
  const showDelete = !!(withdrawal?.canDelete && onDeleteCycle);
  const revokeBlockedNote =
    showRevoke && !withdrawal.canRevoke
      ? fill(withdrawal.resultPublished ? L.revokeBlockedPublished : L.revokeBlocked, {
          count: withdrawal.recordCount ?? 0,
        })
      : null;
  const hasControls =
    showRevoke ||
    showDelete ||
    (stopped
      ? !!onReopen
      : isOnHold
        ? !!onResume || !!(canStop && onEmergencyStop)
        : !!onRemind || !!(canHold && onHold) || !!(canStop && onEmergencyStop));
  const controls = (
    <div className="evmon-controls">
      {canHold && onHold && (
        <button
          type="button"
          className="evc-btn is-hold"
          onClick={() => setHoldConfirmOpen(true)}
          data-testid="evmon-hold"
        >
          <PauseIcon size={14} /> {L.hold}
        </button>
      )}
      {isOnHold && onResume && (
        <button type="button" className="evc-btn is-primary" onClick={() => onResume()} data-testid="evmon-resume">
          {L.resume}
        </button>
      )}
      {!stopped && !isOnHold && onRemind && (
        <button type="button" className="evc-btn is-ghost" onClick={() => onRemind()} data-testid="evmon-remind">
          {L.remind}
        </button>
      )}
      {stopped
        ? onReopen && (
            <button type="button" className="evc-btn is-primary" onClick={() => onReopen()} data-testid="evmon-reopen">
              {L.reopen}
            </button>
          )
        : canStop && onEmergencyStop && (
            <button type="button" className="evc-btn is-danger-ghost" onClick={() => onEmergencyStop()} data-testid="evmon-stop">
              <StopIcon size={14} /> {L.emergencyStop}
            </button>
          )}
      {showRevoke && (
        <button
          type="button"
          className="evc-btn is-danger-ghost"
          disabled={!withdrawal.canRevoke}
          onClick={() => openWithdraw('revoke')}
          aria-describedby={revokeBlockedNote ? 'evmon-revoke-blocked' : undefined}
          data-testid="evmon-revoke"
        >
          <UndoIcon size={14} /> {L.revoke}
        </button>
      )}
      {showDelete && (
        <button
          type="button"
          className="evc-btn is-danger-ghost"
          onClick={() => openWithdraw('delete')}
          data-testid="evmon-delete-cycle"
        >
          <TrashIcon size={14} /> {L.deleteCycle}
        </button>
      )}
    </div>
  );
  /* [PW-2077 정정] 툴팁이 아니라 늘 보이는 한 줄 — 눌러 볼 수 없는 버튼의 툴팁은 못 찾는다. */
  const revokeNote = revokeBlockedNote && (
    <p className="evc-field-note evmon-revoke-note" id="evmon-revoke-blocked" data-testid="evmon-revoke-blocked">
      {revokeBlockedNote}
    </p>
  );

  // `embedded` 면 바깥 틀(.evc-root · 머리 · 탭 줄 · .evc-list)을 그리지 않는다 — 틀은
  // 호출부의 `EvalCycleManageCanvas` 가 한 번만 그린다.
  const Frame = embedded ? Fragment : 'div';
  const frameProps = (className) => (embedded ? {} : { className });

  return (
    <Frame {...frameProps('evc-root')}>
      {embedded ? (
        hasControls && (
          <div
            className={`evmon-embedded-actions${revokeNote ? ' has-note' : ''}`}
            data-testid="evmon-embedded-actions"
          >
            {controls}
            {revokeNote}
          </div>
        )
      ) : (
        <header className="evc-header">
          <div>
            <h1 className="evc-title">{L.title}</h1>
            {cycle?.name && (
              <p className="evc-summary" data-testid="evc-manage-context">
                {cycle.name}
                {manageSuffix && (
                  <span className="evc-manage-suffix"> · {manageSuffix}</span>
                )}
              </p>
            )}
          </div>
          {revokeNote ? (
            <div className="evmon-embedded-actions has-note">
              {controls}
              {revokeNote}
            </div>
          ) : (
            controls
          )}
        </header>
      )}

      {!embedded && toolbar && <div className="evc-toolbar">{toolbar}</div>}

      {!embedded && navItems.length > 0 && (
        /* 불이 들어오는 칸이 없는 «나가는 버튼» 줄이라 탭이 아니다 — 탭 모양을 입히지 않는다(PW-832). */
        <div className="evmon-nav" data-testid="evmon-nav">
          {navItems.map((n) => (
            <button type="button" key={n.key} className="evc-btn is-ghost" onClick={() => n.on()} data-testid={n.testid}>
              {n.label}
            </button>
          ))}
        </div>
      )}

      {stopped && (
        <p className="evx-notice is-error" data-testid="evmon-stopped">
          {L.stoppedBanner}
        </p>
      )}

      <Frame {...frameProps('evc-list')}>
        {/* 완료율 + 단계 진행 */}
        <section className="evc-card">
          <div className="evmon-completion">
            <span className="evc-field-label">{L.completion}</span>
            {/* PW-2115 — 숫자 옆에 진행바(디자이너 OKR 묶음 카드 진행바). */}
            <div className="evmon-completion-row">
              <span className="evmon-completion-value" data-testid="evmon-completion">{completionPct}%</span>
              <EvalProgressBar pct={completionPct} className="evmon-completion-bar" testId="evmon-completion-bar" />
            </div>
          </div>
          <h3 className="evc-card-name">{L.stagesTitle}</h3>
          {/* PW-2115 — «단계를 클릭하면…» 안내 줄은 뺐다. 줄에 마우스를 올리면 바탕이 들어와 누르는 자리임을 보인다. */}
          <div className="evmon-stages">
            {stages.map((s) => {
              /* [PW-1968] 하향 차수 줄(`leader_review_2` …)은 키 표에 없는 이름이라 화면이 이름을 실어 보낸다. */
              const stageLabel = s.label ?? L[STAGE_KEY[s.key]] ?? s.key;
              const isOpenNow = !!status && (OPEN_STATUS_OF_STAGE[s.key] ?? []).includes(status);
              const inner = (
                <>
                  <span className="evmon-stage-label">
                    {stageLabel}
                    {isOpenNow && L.stageOpenNow && (
                      <span className="evmon-stage-now" data-testid={`evmon-stage-now-${s.key}`}>
                        {L.stageOpenNow}
                      </span>
                    )}
                  </span>
                  <EvalProgressBar done={s.done} total={s.total} className="evmon-stage-bar" testId={`evmon-stage-bar-${s.key}`} />
                  <span className="evmon-stage-count">{s.done}/{s.total}</span>
                </>
              );
              /* [PW-1461 · 정책 §6.5] 기간은 줄 «옆»에 둔다 — 줄이 버튼이라 그 안에 날짜 버튼을
                 넣을 수 없다(버튼 안 버튼). */
              const period = periodOf(s.key);
              const periodNode = period ? (
                <StagePeriod
                  stageKey={s.key}
                  period={period}
                  L={L}
                  busy={dateSaving}
                  onChange={
                    onChangeStageDate
                      ? (field, iso) => void changeStageDate(s.key, field, iso)
                      : undefined
                  }
                />
              ) : null;
              const withPeriod = (row) =>
                periodNode ? (
                  <div className="evmon-stage-row" key={s.key}>
                    {row}
                    {periodNode}
                  </div>
                ) : (
                  row
                );
              // [PW-585] 누를 수 있을 때만 button 으로 바꾼다 — 콜백이 없는 호출부에서
              // 커서·포커스 링만 생기고 아무 일도 안 나는 줄이 되면 안 된다.
              if (!onSelectStage) {
                return withPeriod(
                  <div className="evmon-stage" key={s.key} data-testid="evmon-stage">
                    {inner}
                  </div>,
                );
              }
              const open = selectedStage?.key === s.key;
              return withPeriod(
                <button
                  type="button"
                  className={`evmon-stage is-clickable${open ? ' is-open' : ''}`}
                  key={s.key}
                  data-testid="evmon-stage"
                  aria-expanded={open}
                  onClick={() => onSelectStage(open ? null : s.key)}
                >
                  {inner}
                  <span className="evmon-stage-chevron" aria-hidden="true">›</span>
                </button>,
              );
            })}
          </div>
          {dateFailed && (
            <p className="evmon-stage-date-error" role="alert" data-testid="evmon-stage-date-failed">
              {L.stageDateSaveFailed}
            </p>
          )}
        </section>

        {leaderAssignments}

        {/* 멤버 현황
            [PW-534] 단계 열을 사이클 phases 기반 «동적»으로 (§6.2.1) — 3종 고정이라
            상향 리뷰를 켠 사이클에도 그 열이 없었다. `memberPhases` 가 비면 예전
            3종 고정 열로 그린다(아직 값을 안 주는 호출부의 시각을 바꾸지 않는다). */}
        {/* [PW-585] 단계 상세 (정책 §6.8) — 들어가면 구성원 표 자리를 대신한다.
            둘을 함께 그리면 같은 화면에 «사람 축» 표와 «단계 축» 상세가 겹쳐 서서
            지금 무엇을 보고 있는지가 흐려진다. 「← 단계 목록」으로 돌아온다. */}
        {/* [PW-1462 · 정책 §6.4] 부서 고르기 — 구성원 표와 단계 상세가 함께 따른다. */}
        {departmentOptions && departmentOptions.length > 1 && (
          <div className="evmon-dept-filter" data-testid="evmon-dept-filter">
            <span className="evc-field-label" id="evmon-dept-label">{L.deptFilterLabel}</span>
            {/* [PW-1879] 부서가 수백 개인 회사도 이름 일부로 찾는다 — 칸 모양은 전과 같은 `dp-select`. */}
            <SearchSelect
              value={departmentValue ?? ''}
              onChange={(v) => onSelectDepartment?.(v)}
              options={departmentOptions}
              aria-labelledby="evmon-dept-label"
              searchPlaceholder={L.deptSearchPlaceholder}
              noResultLabel={L.deptSearchEmpty}
              data-testid="evmon-dept-select"
            />
          </div>
        )}
        {selectedStage ? (
          <section className="evc-card" data-testid="evmon-stage-detail">
            <div className="evmon-detail-head">
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() => onSelectStage?.(null)}
                data-testid="evmon-stage-back"
              >
                <ChevronLeftIcon size={14} /> {L.backToStages}
              </button>
              <div>
                <h3 className="evc-card-name">{selectedStage.label}</h3>
                {selectedStage.periodLabel && (
                  <p className="evc-empty-sub" data-testid="evmon-stage-period">
                    {selectedStage.periodLabel}
                  </p>
                )}
              </div>
            </div>
            {stageDetail}
          </section>
        ) : (() => {
        const dynamic = memberPhases.length > 0;
        // 마지막 칸은 「리마인더 · 제외」 두 버튼이 한 줄에 들어가는 폭 — 96px 이면 미제출자 줄의
        // 버튼 묶음이 카드 오른쪽을 넘었다(영어 「Remind · Exclude」는 더) (PW-1652).
        const actionsCol = '176px';
        const cols = dynamic
          ? ['2fr', ...memberPhases.map(() => '1.2fr'), '1.2fr', '1fr', actionsCol].join(' ')
          : `2fr 1fr 1fr 1fr 1fr ${actionsCol}`;
        return (
        <section className="evc-card">
          <h3 className="evc-card-name">{L.membersTitle}</h3>
          <div className="evmon-table" role="table">
            <div className="evmon-row evmon-head" role="row" style={{ gridTemplateColumns: cols }}>
              <span className="evmon-c-name">{L.colMember}</span>
              {dynamic ? (
                memberPhases.map((ph) => <span key={ph.key}>{ph.label}</span>)
              ) : (
                <>
                  <span>{L.colSelf}</span>
                  <span>{L.colPeer}</span>
                  <span>{L.colLeader}</span>
                </>
              )}
              {dynamic && <span>{L.colProgress}</span>}
              <span>{L.colGrade}</span>
              <span />
            </div>
            {members.map((m) => (
              <div className="evmon-row" role="row" key={m.memberId} data-testid="evmon-member" style={{ gridTemplateColumns: cols, opacity: m.excluded || m.retired ? 0.55 : 1 }}>
                <span className="evmon-c-name">
                  {m.name || m.memberId}
                  {m.excluded && (
                    <StatusBadge className="evc-status-badge tone-neutral" style={{ marginLeft: 'var(--spacing-sm)' }} data-testid="evmon-excluded-badge">
                      {L.excludedBadge}
                    </StatusBadge>
                  )}
                  {/* PW-534 ㉯ — 오픈 «뒤» 합류한 사람 (정책 §5.3.6).
                      지난 단계가 전부 미제출인 것이 «안 낸 것» 이 아니라 «있지도 않았던
                      것» 이다. 표시가 없으면 독촉 명단에서 둘이 섞인다. */}
                  {m.retired && (
                    <StatusBadge className="evc-status-badge tone-neutral" style={{ marginLeft: 'var(--spacing-sm)' }} data-testid="evmon-retired-badge">
                      {L.retiredBadge}
                    </StatusBadge>
                  )}
                  {m.joinedAt && (
                    <StatusBadge
                      className="evc-status-badge tone-info"
                      style={{ marginLeft: 'var(--spacing-sm)' }}
                      title={fill(L.joinedTooltip, { at: fmtSubmittedAt(m.joinedAt) })}
                      data-testid="evmon-joined-badge">
                      {L.joinedBadge}
                    </StatusBadge>
                  )}
                </span>
                {dynamic ? (
                  memberPhases.map((ph) => (
                    <PhaseCell
                      key={ph.key}
                      phaseKey={ph.key}
                      phase={(m.phases || []).find((x) => x.key === ph.key)}
                      L={L}
                    />
                  ))
                ) : (
                  <>
                    <span className="evmon-self">{L[SELF_KEY[m.selfStatus]] ?? m.selfStatus}</span>
                    <Check ok={m.peerConfirmed} />
                    <Check ok={m.leaderSubmitted} />
                  </>
                )}
                {dynamic && (() => {
                  const pr = memberProgress(m);
                  return (
                    <span className="evmon-self" data-testid="evmon-progress">
                      {pr.total > 0 ? fill(L.progressCell, pr) : L.cellNone}
                    </span>
                  );
                })()}
                <span>
                  {m.gradeKey ? (
                    <StatusBadge
                      className={`evc-status-badge ${GRADE_TONE[m.gradeKey] ?? 'tone-neutral'}`}
                      data-testid="evmon-grade-badge">
                      {gradeLabels?.[m.gradeKey] ?? m.gradeKey}
                    </StatusBadge>
                  ) : (
                    <Check ok={m.graded} />
                  )}
                </span>
                <span className="evmon-controls evmon-row-actions">
                  {/* [PW-1462] 미제출 1건 이상일 때만 (정책 §6.2.1). 뺀 사람·퇴사자는 리마인더를 받지 않는다. */}
                  {onRemindMember && !m.excluded && !m.retired && !stopped && !isOnHold &&
                    (m.phases || []).some((p) => p.status !== null && p.done < p.total) && (
                    <button type="button" className="evc-btn is-ghost" onClick={() => onRemindMember(m.memberId)} data-testid="evmon-remind-member">
                      {L.remindOne}
                    </button>
                  )}
                  {m.excluded
                    ? onRestore && (
                        <button type="button" className="evc-btn is-ghost" onClick={() => onRestore(m.memberId)} data-testid="evmon-restore">
                          {L.restore}
                        </button>
                      )
                    : onExclude && (
                        <button type="button" className="evc-btn is-ghost" onClick={() => onExclude(m.memberId)} data-testid="evmon-exclude">
                          {L.exclude}
                        </button>
                      )}
                </span>
              </div>
            ))}
          </div>
        </section>
        );
        })()}

        {/* ── [PW-534] 내보내기 바 (정책 §6.9) ─────────────────────────────
            두 벌로 나눈다 — A 진행 상태(1행 = 구성원) · B 평가 응답(1행 = 답변).
            축이 달라 합치지 않는다: 합치면 사람 정보가 답변 수만큼 복제돼 A의
            용도(명단·독촉)가 깨진다(§6.9.1).

            「현재 필터」를 «항상» 표기한다 — 보이는 것과 받는 것이 다르면 그 파일은
            신뢰를 잃는다(§6.9.2). */}
        {exportEnabled && (
          <section className="evc-card" data-testid="evmon-export">
            <h3 className="evc-card-name">{L.exportTitle}</h3>
            <p className="evc-empty-sub" data-testid="evmon-export-filter">
              {fill(L.exportFilter, {
                scope: exportScopeLabel,
                count: visibleCount,
              })}
            </p>
            <div className="evmon-controls">
              <Tooltip content={canExport ? L.exportProgressHint : L.exportNoTarget}>
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  disabled={!canExport}
                  onClick={() => openExport('progress')}
                  data-testid="evmon-export-progress"
                >
                  {L.exportProgress}
                </button>
              </Tooltip>
              <Tooltip content={canExport ? L.exportAnswersHint : L.exportNoTarget}>
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  disabled={!canExport}
                  onClick={() => openExport('answers')}
                  data-testid="evmon-export-answers"
                >
                  {L.exportAnswers}
                </button>
              </Tooltip>
            </div>
            <p className="evc-empty-sub">{L.exportNote}</p>
          </section>
        )}

        {/* [PW-534] 내보내기 이력 (§6.9.4) — 기록만 남기고 아무도 볼 수 없으면
            그 기록은 사고가 났을 때 되짚을 수 없다. 남기는 것과 보이는 것은 한 벌이다. */}
        {exportEnabled && exportHistory && (
          <section className="evc-card" data-testid="evmon-export-history">
            <h3 className="evc-card-name">{L.historyTitle}</h3>
            {exportHistory.length === 0 ? (
              <p className="evc-empty-sub">{L.historyEmpty}</p>
            ) : (
              <div className="evmon-table" role="table">
                {exportHistory.map((h) => (
                  <div
                    className="evmon-row"
                    role="row"
                    key={h.id}
                    data-testid="evmon-export-history-row"
                    style={{ gridTemplateColumns: '1.4fr 1.6fr 1fr 1.4fr' }}
                  >
                    <span className="evmon-c-name">{h.actorName}</span>
                    <span className="evmon-self">
                      {fmtSubmittedAt(h.createdAt)}
                    </span>
                    <span className="evmon-self">
                      {h.exportKind === 'answers'
                        ? L.historyKindAnswers
                        : L.historyKindProgress}
                    </span>
                    <span className="evmon-self">
                      {h.status === 'failed'
                        ? L.historyFailed
                        : h.excludedCount > 0
                          ? fill(L.historyRowsWithExcluded, {
                              count: h.rowCount,
                              excluded: h.excludedCount,
                            })
                          : fill(L.historyRows, { count: h.rowCount })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </Frame>

      {/* [PW-534] 확인 모달 (§6.9.4) — 응답 벌만 사유를 받는다. */}
      {holdConfirmOpen && (
        <ConfirmModal
          title={L.confirmHoldTitle}
          body={fill(L.confirmHoldBody ?? '', { name: cycle?.name ?? '' })}
          confirmLabel={L.hold}
          cancelLabel={L.confirmHoldCancel}
          /* PW-2115 — 사이클 목록과 같은 확인 창(같은 문구 키) — 멈추는 일은 빨간 버튼. */
          danger
          busy={holdBusy}
          onConfirm={() => void confirmHold()}
          onCancel={() => {
            if (!holdBusy) setHoldConfirmOpen(false);
          }}
          testId="evmon-hold-confirm"
          confirmTestId="evmon-hold-confirm-ok"
          cancelTestId="evmon-hold-confirm-cancel"
        />
      )}

      {/* [PW-2063 · 정책 §5.7.2] 회수 확인 창 — 일시 중단 창과 같은 공용 확인 창(위험 톤). 수치는 창을 열 때
          호출부가 서버에서 받는다. 못 받으면 «불러오지 못했습니다»를 적고 회수를 막는다. */}
      {withdrawKind === 'revoke' && (() => {
        // 수를 모르면 «…{N}명에게»에 문구를 끼우지 않고 «무엇: 불러오지 못했습니다» 줄로 쓴다.
        const unknown = withdrawImpact === undefined ? L.withdrawLoading : L.withdrawLoadFailed;
        const rejected = withdrawStale === 'rejected';
        const lines = rejected
          ? [cycle?.name ?? '']
          : [
              cycle?.name ?? '',
              '',
              L.revokeEffectsTitle,
              `· ${L.revokeEffectDraft}`,
              `· ${
                withdrawImpact
                  ? fill(L.withdrawEffectNotify, { count: withdrawImpact.notifiedCount })
                  : fill(L.withdrawEffectNotifyUnknown, { status: unknown })
              }`,
              `· ${
                withdrawImpact
                  ? fill(L.revokeEffectSent, { count: withdrawImpact.remindersSent })
                  : fill(L.revokeEffectSentUnknown, { status: unknown })
              }`,
              `· ${L.revokeEffectNoRecords}`,
            ];
        return (
          <ConfirmModal
            title={L.confirmRevokeTitle}
            body={
              <>
                {lines.join('\n')}
                {rejected && (
                  <span className="evc-tpl-confirm-error" role="alert" data-testid="evmon-revoke-rejected">
                    {'\n'}
                    {L.revokeRejected}
                  </span>
                )}
              </>
            }
            danger
            busy={withdrawBusy}
            confirmDisabled={rejected || !withdrawImpact}
            confirmLabel={withdrawBusy ? L.revoking : L.revoke}
            cancelLabel={rejected ? L.withdrawClose : L.withdrawCancel}
            onConfirm={() => void runWithdraw()}
            onCancel={closeWithdraw}
            testId="evmon-revoke-confirm"
            confirmTestId="evmon-revoke-confirm-ok"
            cancelTestId="evmon-revoke-confirm-cancel"
          />
        );
      })()}

      {/* [PW-2085 · 정책 §5.7.3] 삭제 확인 창 — 기록이 있으면 사유와 사이클 이름을 받는다(D4). 입력 칸은 위
          내보내기 창의 «반출 사유» 칸과 같은 클래스다. 이름을 똑같이 칠 때까지 삭제를 잠근다(조직도 스쿼드 삭제 창과 같은 방식). */}
      {withdrawKind === 'delete' && (() => {
        const published = withdrawStale === 'published';
        const loaded = !!withdrawImpact;
        const notifyLine = loaded
          ? fill(L.withdrawEffectNotify, { count: withdrawImpact.notifiedCount })
          : fill(L.withdrawEffectNotifyUnknown, {
              status: withdrawImpact === undefined ? L.withdrawLoading : L.withdrawLoadFailed,
            });
        const recordsLine = !loaded
          ? withdrawImpact === undefined
            ? L.deleteEffectRecordsLoading
            : L.deleteEffectRecordsFailed
          : deleteNeedsInputs
            ? fill(L.deleteEffectRecords, {
                draft: impactRecords.draftAnswers,
                submitted: impactRecords.submittedReviews,
                nominations: impactRecords.nominations,
                objections: impactRecords.objections,
              })
            : L.deleteEffectNoRecords;
        const lines = [
          cycle?.name ?? '',
          '',
          L.deleteEffectsTitle,
          `· ${L.deleteEffectGone}`,
          `· ${recordsLine}`,
          `· ${notifyLine}`,
          `· ${L.deleteEffectAudit}`,
        ];
        return (
          <ConfirmModal
            title={L.confirmDeleteTitle}
            body={
              <>
                {published ? cycle?.name ?? '' : lines.join('\n')}
                {withdrawStale && (
                  <span className="evc-tpl-confirm-error" role="alert" data-testid="evmon-delete-stale">
                    {'\n'}
                    {published ? L.deletePublished : L.deleteChanged}
                  </span>
                )}
                {!published && loaded && deleteNeedsInputs && (
                  <>
                    <label className="evc-sched-modal-field is-reason" data-testid="evmon-delete-reason-field">
                      <span className="evc-field-label">{fill(L.deleteReasonLabel, { max: deleteReasonMaxLength })}</span>
                      <textarea
                        className="evc-input"
                        rows={3}
                        maxLength={deleteReasonMaxLength}
                        value={deleteReason}
                        placeholder={L.deleteReasonPlaceholder}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        data-testid="evmon-delete-reason"
                      />
                      <span className="evc-field-note">{L.deleteReasonHint}</span>
                    </label>
                    <label className="evc-sched-modal-field is-reason" data-testid="evmon-delete-name-field">
                      <span className="evc-field-label">{L.deleteNameLabel}</span>
                      <input
                        className="evc-input"
                        value={deleteTyped}
                        placeholder={cycle?.name ?? ''}
                        onChange={(e) => setDeleteTyped(e.target.value)}
                        data-testid="evmon-delete-name"
                      />
                    </label>
                  </>
                )}
              </>
            }
            danger
            busy={withdrawBusy}
            confirmDisabled={published || !loaded || !deleteInputsOk}
            confirmLabel={withdrawBusy ? L.deleting : L.deleteCycle}
            cancelLabel={published ? L.withdrawClose : L.withdrawCancel}
            onConfirm={() => void runWithdraw()}
            onCancel={closeWithdraw}
            testId="evmon-delete-confirm"
            confirmTestId="evmon-delete-confirm-ok"
            cancelTestId="evmon-delete-confirm-cancel"
          />
        );
      })()}

      {exportKind && (
        <ModalShell
          title={
            exportKind === 'answers'
              ? L.exportModalTitleAnswers
              : L.exportModalTitleProgress
          }
          description={
            exportKind === 'answers'
              ? !onOpenExport
                ? L.exportModalBodyAnswersShort
                : answersRowCount === undefined
                  ? L.exportAnswersCounting
                  : answersRowCount === null
                    ? L.exportAnswersCountFailed
                    : L.exportModalBodyAnswersShort
              : fill(L.exportModalBodyProgress, { count: visibleCount })
          }
          titleId="evmon-export-modal-title"
          submitLabel={L.exportConfirm}
          cancelLabel={L.exportCancel}
          closeLabel={L.exportCancel}
          canSubmit={!(exportKind === 'answers' && onOpenExport && answersRowCount === undefined)}
          onClose={closeExport}
          onSubmit={submitExport}
          className={exportKind === 'answers' ? 'evc-shell' : ''}
        >
          {/* 필드·에러 표기는 일정 수정 모달과 같은 클래스를 쓴다 — 새 클래스를
              지으면 같은 모양이 두 벌이 된다. */}
          {/* [PW-2041] 부제에 몰려 있던 세 문장을 쪼갠다 — 행 수는 회색 알약(매니저 프로필 창 태그),
              «익명 작성자는 빠진다»는 초록 딱지(매니저 팀 요약 «구성원»). 높이는 내용만큼(evc-shell). */}
          {exportKind === 'answers' && (
            <div className="evc-export-badges">
              {typeof answersRowCount === 'number' && (
                <StatusBadge className="evc-meta-pill" data-testid="evmon-export-row-count">
                  {fill(L.exportRowCount, { count: answersRowCount.toLocaleString() })}
                </StatusBadge>
              )}
              <StatusBadge className="evc-label-chip" data-testid="evmon-export-anon-note">
                {L.exportAnonymousNote}
              </StatusBadge>
            </div>
          )}
          {exportKind === 'answers' && (
            <label
              className="evc-sched-modal-field is-reason is-export"
              data-testid="evmon-export-reason-field"
            >
              <span className="evc-field-label">{L.exportReasonLabel}</span>
              <textarea
                className={`evc-input${reasonError ? ' is-invalid' : ''}`}
                rows={3}
                maxLength={200}
                value={exportReason}
                placeholder={L.exportReasonPlaceholder}
                onChange={(e) => {
                  setExportReason(e.target.value);
                  setReasonError(false);
                }}
                data-testid="evmon-export-reason"
              />
              {reasonError && (
                <span
                  className="evc-tpl-confirm-error"
                  role="alert"
                  data-testid="evmon-export-reason-error"
                >
                  {L.exportReasonRequired}
                </span>
              )}
            </label>
          )}
        </ModalShell>
      )}
    </Frame>
  );
}
