import { useState, useMemo, useRef, useEffect } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { buildOrgTree } from './orgTree.js';
import ModalShell from '../shared/ModalShell.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Tabs from '../shared/Tabs.jsx';
import {
  IconAlert, IconDownload, IconPlus, IconTrash, IconUpload,
} from './employeesIcons.jsx';
import {
  INVITE_MAX_ROWS, FAIL_LABEL_KEY, emailOk, jobPairIssue, ladderLocked, laddersForFamily,
  nameHasEmail, normEmail, reconcilePrimary, fmt,
} from './inviteRules.js';
import {
  INVITE_CSV_DEFAULT_LABELS, INVITE_CSV_MAX_ROWS,
  buildInviteCsvContext, buildInviteTemplateCsv, inviteCsvColumns, inviteCsvIssues,
  inviteCsvNotes, inviteCsvPayload, parseInviteCsv, resolveInviteCsvRow,
} from './inviteCsv.js';
import InviteCsvStagingTable from './InviteCsvStagingTable.jsx';
import { readCsvFileText } from '../shared/csvFileText.js';

/**
 * AdminInviteModal — 구성원 초대 발송 모달.
 *
 * 정본: pivit-specs `J. Admin_관리자/screen-admin-employees-invite.policy.md` v1.0
 *      시안 `J. Admin_관리자/admin-employees-view.jsx` 의 InviteModal
 * 근거: 2026-08-10 정기미팅 §8 액션 10 (PW-114)
 *
 * 왜 생겼나: 구성원 관리에는 초대 진입점이 두 곳(탭 A `+ 구성원 초대`, 탭 C
 * `+ 새 초대 발송`) 있었는데 **둘 다 클릭 핸들러가 없는 데모**였다. 실제 발송
 * 경로가 온보딩에만 있어서, 온보딩을 끝낸 워크스페이스는 사람을 더 초대할
 * 수단이 없었다. 두 진입점이 이 모달 하나를 연다.
 *
 * 핵심 규칙
 *  · 겸직 다중 소속 + 주 소속(소속 2개 이상이면 주 소속 필수, §2-3·§4-3)
 *  · **조직장은 여기서 지정하지 않는다** — 가입 전에는 team_members 행이 없어
 *    "그 팀 소속자만 조직장"(§1-3-f L3)을 만족할 수 없다
 *  · **인사 축은 직급·직군·직렬·근무지 4종**(+권한). 직렬은 직군에 매달린 2단
 *    선택이고, 직무(`job_duty`)·직함은 초대에서 받지 않는다
 *    — 2026-08-22 David 결정(PW-412), 정본 정책서 §2-2 v1.4
 *  · **직종은 조직이 켰을 때만 받는다**(`jobCategoryEnabled`) — 2026-09-15 David 확정
 *    (PW-644 · 정책서 §2-2·§2-3·§5 V12). 끈 조직에는 칸 자체가 없다
 *
 * 🔴 **이 축은 이미 두 번 뒤집혔다.** 「초대에서 직렬 제외」(2026-08-12)는 직군 칸이
 *    없는 **온보딩 초대 한정** 결정이고, 「초대 모달에 직무 칸이 있다」(2026-08-16)는
 *    라벨만 `직무` 였던 직렬 칸을 본 오독이었다(PW-189 라벨 정정). 여기를 고치기 전에
 *    정책서 §2-2 확정 배너를 먼저 읽을 것.
 *  · 좌석은 발송이 아니라 **가입 수락 시점**에 증가한다 → 헤더 문구가 미래형
 *  · 부분 성공은 모달을 **유지**한다(§3) — 닫으면 실패분의 이름·소속 입력이
 *    사라져 처음부터 다시 입력해야 한다
 *
 * 모든 문자열·데이터는 props 로 받는다. UI 상태(행·일괄값·확인 모달)만 내부 소유.
 */

const DEFAULT_LABELS = {
  // CSV 열 이름·칸 사유 — 온보딩과 같은 한 벌(`inviteCsv.js`)을 쓴다(PW-902).
  ...INVITE_CSV_DEFAULT_LABELS,
  title: '구성원 초대',
  close: '닫기',
  seatsUnlimited: '좌석 무제한',
  seatsLeft: '남은 좌석 {n}석',
  seatsUnknown: '좌석 정보를 불러오지 못했어요',
  // 좌석은 수락 시점에 증가한다 — 반드시 미래형(§4-4).
  seatsWillGrow: '초대 시 {n}명 증가 (수락 시점 반영)',
  seatShort: '남은 좌석 {left}석 — {need}명을 초대하려면 플랜을 변경해야 합니다.',
  seatNone: '남은 좌석이 없습니다. 플랜을 변경해야 초대할 수 있습니다.',
  goBilling: '결제·구독',
  bulkTitle: '일괄 지정',
  bulkHint: '값을 바꿔도 이미 입력한 행에는 반영되지 않습니다. 전체 적용을 눌러야 덮어씁니다.',
  bulkApply: '전체 적용',
  bulkApplied: '{n}개 행에 적용했어요',
  bulkUndo: '실행 취소',
  role: '권한',
  roleMember: '멤버',
  roleManager: '매니저',
  roleAdmin: '어드민',
  jobLevel: '직급',
  jobFamily: '직군',
  // ⚠ 키는 `jobTitle` 이지만 값은 **직렬**이다(M5-b 승격). 라벨을 `직무` 로 두었던
  // 것이 PW-412 의 문서·구현 혼선을 만든 직접 원인이라 기본값도 정정한다.
  jobTitle: '직렬',
  workLocation: '근무지',
  jobCategory: '직종',
  unset: '미지정',
  optionsEmpty: '옵션 없음 — 직군/직렬/직무 설정에서 추가',
  // 직렬이 직군 때문에 잠겼을 때 — 「옵션 없음」이라고 하면 원인을 잘못 가리킨다
  ladderNeedsFamily: '직군을 먼저 선택하세요',
  email: '이메일',
  emailPlaceholder: 'name@company.com',
  name: '이름',
  namePlaceholder: '이름 (필수)',
  detail: '상세',
  collapse: '접기',
  removeRow: '행 삭제',
  addRow: '행 추가',
  maxRows: '한 번에 최대 {n}명까지 초대할 수 있어요',
  teams: '소속 (겸직 가능 — 여러 개 선택)',
  teamsEmpty: '조직이 없습니다 — 팀 관리에서 먼저 만들어주세요',
  teamSearch: '조직 검색',
  primaryTeam: '주 소속',
  primaryTeamRequired: '주 소속 (필수)',
  primaryBadge: '주',
  primaryHint: '소속을 2개 이상 고르면 주 소속을 지정해야 합니다',
  primaryMoved: '주 소속이 {path}(으)로 변경되었습니다',
  concurrentSummary: '겸직 {n} · {state}',
  primarySet: '주 소속 지정됨',
  primaryUnset: '주 소속 미지정',
  leaderNote: '조직장 지정은 가입 완료 후 팀 관리에서 할 수 있습니다.',
  squadNote: '스쿼드 배정은 조직도 스쿼드 뷰에서 별도로 합니다 (기능조직과 다른 축).',
  summary: '{n}명에게 초대를 보냅니다',
  cancel: '취소',
  send: '초대 보내기',
  sending: '보내는 중…',
  partialFail: '{n}건 실패 — 사유를 확인하세요',
  sendError: '초대를 보내지 못했어요. 잠시 후 다시 시도해주세요.',
  // 검증 문구 V1~V7
  errInvalidEmail: '유효하지 않은 이메일',
  errAlreadyMember: '이미 멤버입니다',
  errPendingInvite: '초대 대기 중',
  errDuplicate: '이 발송에 중복된 이메일이에요',
  errName: '이름을 입력해주세요',
  errNameTooLong: '이름은 {max}자까지 입력할 수 있어요',
  errNameEmail: '이름에 이메일 주소를 넣을 수 없어요. 실명을 입력해주세요',
  errPrimaryTeam: '주 소속을 지정해주세요',
  // V7 — (직군, 직렬) 쌍(INV-3)
  errLadderNeedsFamily: '직군을 먼저 선택해주세요',
  errJobPair: '직군에 없는 직렬입니다',
  // 발송 실패 사유(§8)
  failAlreadyMember: '이미 멤버입니다',
  failPendingExists: '이미 초대 대기 중입니다',
  failSeatLimit: '좌석이 부족합니다',
  failPrimaryTeam: '주 소속을 지정해주세요',
  failTeamNotFound: '고른 소속을 찾을 수 없습니다',
  failNameRequired: '이름을 입력해주세요',
  failInvalidEmail: '유효하지 않은 이메일',
  failDuplicate: '이 발송에 중복된 이메일이에요',
  failSendFailed: '발송에 실패했어요',
  failInvalidJobPair: '직군에 없는 직렬입니다',
  failInvalidField: '회사에 등록되지 않았거나 형식이 맞지 않는 값이 있어요',
  failEmployeeCodeTaken: '이미 다른 구성원이 쓰는 사번이에요',
  failUnknown: '발송에 실패했어요',
  // 어드민 확인 모달(§6-1)
  adminConfirmTitle: '어드민 권한으로 초대합니다',
  adminConfirmBody: '{names}은(는) 가입 즉시 다음을 할 수 있습니다.',
  adminConfirmP1: '전 구성원의 인사 정보 열람·수정',
  adminConfirmP2: '연봉·계좌 등 민감 정보 열람',
  adminConfirmP3: '조직 구조·권한·필드 옵션 변경',
  adminConfirmOk: '어드민으로 초대',
  // 닫기 확인(§6-2)
  discardTitle: '작성 중인 초대가 있습니다',
  discardBody: '입력한 {n}명의 정보가 사라집니다.',
  discardKeep: '계속 작성',
  discardLeave: '닫기',
  // CSV 업로드 탭(§2-4 / PW-212)
  tabDirect: '직접 입력',
  tabCsv: 'CSV 업로드',
  csvIntro: '템플릿을 받아 채운 뒤 올리면, 반영 전에 값을 화면에서 검토·수정할 수 있어요.',
  csvTemplate: '템플릿 다운로드',
  csvDropHere: 'CSV 파일을 드래그하거나 클릭해서 선택',
  csvLimits: 'CSV 파일, 한 번에 최대 {max}행',
  csvReplaceFile: '다른 파일 올리기',
  csvSummary: '총 {total}건 · 정상 {ok} · 오류 {err}',
  csvErrorsOnly: '오류 행만 보기',
  csvNoErrorRows: '오류 행이 없습니다.',
  csvRowOk: '정상',
  csvRowErrors: '오류 {n}',
  csvIgnoredColumns: '건너뛴 열: {columns}',
  // 정상 줄만 보낸다(기획서 탭 4 「부분 발송을 막지 않는다」) — 빠지는 줄이 있다는 것을 버튼 곁에 적는다.
  csvSummarySkip: '{n}명에게 초대를 보냅니다 · 오류 {m}줄은 보내지 않습니다',
  csvSentKeepErrors: '{n}명에게 초대를 보냈어요. 오류 {m}줄은 고쳐서 다시 보낼 수 있게 남겨 두었어요.',
  // 직종을 끈 조직의 직종 열 — 막지 않고 버린 뒤 알린다(정책 §5 V12)
  csvJobCategoryIgnored: '직종은 이 회사에서 쓰지 않는 항목이라 직종 열의 값을 무시했습니다',
  // 파일 자체를 못 읽는 경우 — 스테이징을 만들지 않는다
  csvErrEmpty: '내용이 없는 파일이에요.',
  csvErrNotCsv: 'CSV 파일만 업로드할 수 있어요.',
  csvErrRead: '파일을 읽지 못했어요. 다시 시도해주세요.',
  csvErrNoRows: '헤더만 있고 읽을 행이 없어요.',
  csvErrMissingColumns: '필수 열이 없어요: {columns}',
  // 초과분을 잘라내지 않고 업로드 자체를 거부한다(§5 V10)
  csvErrTooManyRows: '{count}행이라 올릴 수 없어요. 한 번에 최대 {max}행까지 가능합니다 — 파일을 나눠 올려주세요.',
};

/**
 * 초대에 실을 수 있는 권한 — **둘뿐이다** (PW-847).
 *
 * 🔴 `'manager'` 를 되살리지 말 것. 매니저는 저장하는 등급이 아니라 «그 사람이 어떤
 * 조직의 장인가» 라는 관계라, 초대에 실어 보낼 것이 없다.
 */
const ROLE_IDS = ['member', 'admin'];

let rowSeq = 0;
function blankRow(bulk) {
  rowSeq += 1;
  return {
    key: `r${rowSeq}`,
    email: '',
    name: '',
    role: bulk.role,
    jobLevel: bulk.jobLevel,
    jobFamily: bulk.jobFamily,
    jobTitle: bulk.jobTitle,
    jobCategory: bulk.jobCategory,
    workLocation: bulk.workLocation,
    teamIds: [...bulk.teamIds],
    primaryTeamId: bulk.primaryTeamId,
    open: false,
    failReason: null,
  };
}

const EMPTY_BULK = {
  role: 'member',
  jobLevel: '',
  jobFamily: '',
  jobTitle: '',
  jobCategory: '',
  workLocation: '',
  teamIds: [],
  primaryTeamId: '',
};

/**
 * 옵션 목록 → Select 항목. 값이 비어 있어도 '미지정' 은 항상 남긴다.
 *
 * `placeholder` 는 **비활성 사유를 그 칸에서 말하기 위한 것**이다. 직렬은 직군을
 * 고르기 전까지 잠기는데(INV-3 · PW-412), 그때 목록이 비었다고 `옵션 없음 — 조직
 * 설정에서 추가` 를 띄우면 원인을 엉뚱한 곳으로 가리킨다 — 조직 설정에는 직렬이
 * 멀쩡히 있고, 어드민이 할 일은 직군을 먼저 고르는 것이다.
 */
function OptionSelect({ id, label, value, onChange, options, labels, disabled, placeholder }) {
  const list = Array.isArray(options) ? options.filter(Boolean) : [];
  return (
    <label className="admin-inv-field">
      <span className="admin-inv-label" id={`${id}-label`}>{label}</span>
      <select
        id={id}
        className="admin-inv-select"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {placeholder || (list.length === 0 ? labels.optionsEmpty : labels.unset)}
        </option>
        {list.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * 겸직 소속 선택 — 계층 들여쓰기(§2-3 → spec-team-management §5-A P1).
 *
 * depth 당 왼쪽 패딩을 주고 상위 조직도 고를 수 있게 둔다(P3). 공백문자·`└─` 로
 * 들여쓰지 않는다 — 폰트에 따라 정렬이 깨지고 스크린리더가 무의미한 문자를 읽는다.
 */
function TeamMultiPicker({ rowKey, tree, selected, primaryId, onToggle, labels }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q
    ? tree.filter((e) => e.pathLabel.toLowerCase().includes(q))
    : tree;

  if (tree.length === 0) {
    return <p className="admin-inv-hint">{labels.teamsEmpty}</p>;
  }

  return (
    <div className="admin-inv-teams">
      <input
        type="text"
        className="admin-inv-team-search"
        value={query}
        placeholder={labels.teamSearch}
        aria-label={labels.teamSearch}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="admin-inv-team-list" role="group" aria-label={labels.teams}>
        {visible.map((entry) => {
          const on = selected.includes(entry.id);
          const inputId = `inv-team-${rowKey}-${entry.id}`;
          return (
            <div
              key={entry.id}
              className={`admin-inv-team-row${on ? ' is-on' : ''}`}
              // 들여쓰기는 시각 표현이라 aria-level 로 계층을 따로 전달한다.
              style={{ paddingLeft: 8 + entry.depth * 12 }}
            >
              <input
                type="checkbox"
                id={inputId}
                className="admin-inv-team-check"
                checked={on}
                onChange={() => onToggle(entry.id)}
              />
              <label htmlFor={inputId} className="admin-inv-team-name" title={entry.pathLabel}>
                {entry.name}
              </label>
              {primaryId === entry.id && selected.length >= 2 && (
                <StatusBadge className="admin-inv-primary-badge">{labels.primaryBadge}</StatusBadge>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="admin-inv-hint">{labels.teamsEmpty}</p>}
      </div>
    </div>
  );
}

export default function AdminInviteModal({
  open = false,
  onClose,
  onSend,
  orgUnits = [],
  /** 이미 워크스페이스 멤버인 이메일 (V5) */
  existingEmails = [],
  /**
   * CSV 상급자(이메일) 칸이 「회사 구성원인가」를 볼 명부. 안 주면 `existingEmails` 를
   * 쓴다(종전 동작). 「이미 구성원」과 기준이 다를 수 있어 따로 받는다(PW-1056).
   */
  supervisorEmails,
  /** 대기 중 초대가 있는 이메일 (V6) */
  pendingEmails = [],
  /** { limit, remaining } — null 이면 조회 실패(발송은 허용, 서버 402 가 최종 방어) */
  seats = null,
  /** { jobLevel: [], jobFamily: [], jobTitle: [], workLocation: [] } — `jobTitle` 은 **직렬** */
  fieldOptions = {},
  /**
   * 직군 값 → 그 직군의 직렬 값 목록 (§1-3-d 매핑, INV-3).
   *
   * 직렬 Select 를 이 표로 좁히고, 직군을 고르기 전에는 잠근다. **비어 있으면
   * 좁히지 않는다** — 매핑 조회 실패로 선택지를 0으로 만들면 값을 아예 넣지 못하는데
   * 화면은 그 이유를 말해주지 못한다. 그 경우 서버(422 INVALID_JOB_PAIR)가 판정한다.
   */
  laddersByFamily = {},
  /** 직렬 값 → 그 직렬의 직무 값 목록 (INV-8). CSV 의 `(직렬, 직무)` 짝을 본다(PW-902). */
  dutiesByLadder = {},
  /** 이 회사 스쿼드 이름 — CSV 스쿼드 칸 확인. 못 받았으면 `null`(서버가 판정한다). */
  squadNames = null,
  /** 조직장이 있는 조직 id — CSV 상급자 칸이 쓰이지 않는 줄을 안내한다(PW-902). */
  headTeamIds = [],
  /**
   * 이 조직이 직종을 쓰는가 (PW-644 · 선택 적용). `true` 일 때만 직종 칸·CSV 열이 생긴다.
   * 켰는지 못 읽었으면 호출부가 `false` 를 넘긴다 — 칸이 없을 뿐 초대는 그대로 된다
   * (정책 §7: 스위치 하나 때문에 초대를 막지 않는다). 선택지는 `fieldOptions.jobCategory`.
   */
  jobCategoryEnabled = false,
  onGoBilling,
  maxRows = INVITE_MAX_ROWS,
  /*
    ── 앱이 정하는 규칙 (PW-1057) ──
    초대는 서버가 최종 판정한다. 화면이 서버와 다른 기준으로 줄을 통과시키면 일괄 발송에서
    그 한 줄 때문에 나머지까지 못 나갔다. 규칙은 앱이 서버와 맞춰 넘기고 이 창은 쓰기만 한다.
    안 넘기면 예전 판정 그대로다.
  */
  /** 초대 이메일 칸 판정 — 기본은 모양만 보는 `emailOk`. */
  emailValid = emailOk,
  /** 이름 글자 수 상한 — `null` 이면 보지 않는다. */
  nameMaxLength = null,
  /** CSV 칸(열 key) → `{ maxLength?, maxItems?, itemMaxLength? }`. */
  csvFieldLimits = {},
  /** CSV 조직경로 글자 → 조직 id(못 찾으면 `null`). 없으면 이 창의 경로 해석을 쓴다. */
  resolveOrgPath = null,
  /** CSV 고용상태 중 초대에 쓸 수 없는 코드(예: `['terminated']`) — 그 줄을 오류로 세운다(PW-1042). */
  csvBlockedEmploymentStatuses = [],
  /**
   * 남은 좌석을 쓰지 않는 이메일 — 예: 이 회사를 떠났던 사람을 다시 부르는 초대.
   * 이 이메일의 줄은 좌석 부족 판정에서 세지 않는다(서버와 같은 셈).
   */
  seatExemptEmails = [],
  labels: providedLabels,
}) {
  const labels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...(providedLabels || {}) }),
    [providedLabels],
  );
  const tree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);

  const [bulk, setBulk] = useState(EMPTY_BULK);
  const [rows, setRows] = useState(() => [blankRow(EMPTY_BULK)]);
  /* 모드 2종(§1). CSV 행은 **직접 입력 행과 따로** 들고 있다 — 탭을 옮겼다고 반대
     탭의 입력이 사라지면, 500행을 올려 두고 직접 입력을 확인하러 간 순간 파일을
     다시 올려야 한다. 발송은 보고 있는 탭의 행만 보낸다. */
  const [mode, setMode] = useState('direct');
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const [csvNotices, setCsvNotices] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [banner, setBanner] = useState('');
  const [sending, setSending] = useState(false);
  const [undoRows, setUndoRows] = useState(null);
  const [applyToast, setApplyToast] = useState('');
  const undoTimer = useRef(null);

  /* 모달을 다시 열면 깨끗한 상태로 시작한다 — 지난 발송의 실패 행이 남아 있으면
     어드민이 "또 보내야 하는 사람" 으로 오해한다.

     "이전 props 와 비교해 렌더 중 상태 조정" 패턴(OrgTreePicker 선례)을 쓴다.
     effect 안 setState 는 캐스케이드 렌더가 되고, 한 프레임 동안 **지난 입력이
     그대로 보이는** 화면이 실제로 그려진다. */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setBulk(EMPTY_BULK);
      setRows([blankRow(EMPTY_BULK)]);
      setMode('direct');
      setCsvRows([]);
      setCsvError('');
      setCsvNotices([]);
      setBanner('');
      setConfirmAdmin(false);
      setConfirmDiscard(false);
      setUndoRows(null);
      setApplyToast('');
    }
  }

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const existing = useMemo(() => new Set(existingEmails.map(normEmail)), [existingEmails]);
  const pending = useMemo(() => new Set(pendingEmails.map(normEmail)), [pendingEmails]);

  /* 활성 탭의 행 — 검증·발송·부분 성공 처리는 전부 이 목록에 적용된다.
     두 탭이 같은 코드를 지나야 CSV 가 이름 칸 이메일 차단(PW-207) 같은 규칙의
     우회 경로가 되지 않는다. */
  const isCsv = mode === 'csv';
  const activeRows = isCsv ? csvRows : rows;
  const setActiveRows = isCsv ? setCsvRows : setRows;

  /**
   * 행 한 칸 수정.
   *
   * **직군을 바꾸면 그 행의 직렬을 정리한다(E19).** 구 직군의 직렬이 남으면
   * `(직군, 직렬)` 쌍(INV-3)을 깬 값이 그대로 발송된다. 새 직군에서도 유효한
   * 직렬이면 남긴다 — CSV 스테이징에서 «직군을 고쳐 쌍을 맞추는» 것이 정상 경로라,
   * 무조건 지우면 어드민이 파일에 적어 넣은 직렬이 말없이 사라진다.
   */
  const patch = (key, p) =>
    setActiveRows((rs) => rs.map((r) => {
      if (r.key !== key) return r;
      const next = { ...r, ...p, failReason: null };
      if (p.jobFamily !== undefined && p.jobTitle === undefined) {
        if (jobPairIssue(laddersByFamily, next.jobFamily, next.jobTitle)) next.jobTitle = '';
      }
      return next;
    }));

  /** 소속 토글 — 주 소속 자동 처리(§4-3). */
  const toggleTeam = (row, teamId) => {
    const has = row.teamIds.includes(teamId);
    const teamIds = has
      ? row.teamIds.filter((t) => t !== teamId)
      : [...row.teamIds, teamId];
    patch(row.key, { teamIds, primaryTeamId: reconcilePrimary(teamIds, row.primaryTeamId) });
  };

  /* 행별 검증 V1~V6. 서버가 최종 판정이지만, 화면이 먼저 막아야 50명을 넣고
     발송을 눌러서야 사유를 알게 되는 일이 없다.
     행이 50개뿐이라 memo 없이 매 렌더 계산한다 — 의존성을 손으로 나열하는 쪽이
     빠뜨리기 쉽고(검증이 옛 값으로 굳는다) 이득도 없다. */
  const errorsByKey = {};
  for (const r of rows) {
    const e = [];
    const key = normEmail(r.email);
    if (!(emailValid || emailOk)(r.email)) e.push(labels.errInvalidEmail);
    else if (existing.has(key)) e.push(labels.errAlreadyMember);
    else if (pending.has(key)) e.push(labels.errPendingInvite);
    else if (rows.filter((x) => normEmail(x.email) === key).length > 1) {
      e.push(labels.errDuplicate);
    }
    // V7 은 길이 검사와 배타다 — 한 칸에 두 줄이 서면 무엇부터 고쳐야 할지 흐려진다.
    const name = String(r.name || '').trim();
    if (name.length < 2) e.push(labels.errName);
    else if (nameMaxLength && name.length > nameMaxLength) {
      e.push(fmt(labels.errNameTooLong, { max: nameMaxLength }));
    } else if (nameHasEmail(r.name)) e.push(labels.errNameEmail);
    if (r.teamIds.length >= 2 && !r.primaryTeamId) e.push(labels.errPrimaryTeam);
    const pair = jobPairIssue(laddersByFamily, r.jobFamily, r.jobTitle);
    if (pair === 'family') e.push(labels.errLadderNeedsFamily);
    else if (pair === 'pair') e.push(labels.errJobPair);
    errorsByKey[r.key] = e;
  }

  /* CSV 탭 — 칸마다 사유를 만든다. 두 초대 화면이 같은 판정(`inviteCsvIssues`)을 쓴다(PW-902).
     파싱 때 굳혀 두지 않고 매 렌더 다시 만든다 — 표에서 고친 칸의 사유가 바로 사라져야 한다. */
  const csvColumns = inviteCsvColumns({ jobCategoryEnabled });
  const csvCtx = buildInviteCsvContext(csvRows, {
    orgTree: tree, fieldOptions, laddersByFamily, dutiesByLadder, jobCategoryEnabled,
    squadNames, memberEmails: existingEmails, supervisorEmails, pendingEmails, headTeamIds, labels,
    emailValid, nameMaxLength, fieldLimits: csvFieldLimits, resolveOrgPath,
    blockedEmploymentStatuses: csvBlockedEmploymentStatuses,
  });
  const csvIssuesByKey = {};
  const csvNotesByKey = {};
  for (const r of csvRows) {
    csvIssuesByKey[r.key] = inviteCsvIssues(r, csvCtx);
    csvNotesByKey[r.key] = inviteCsvNotes(r, csvCtx);
  }
  const csvValidRows = csvRows.filter((r) => csvIssuesByKey[r.key].length === 0 && !r.failReason);
  const csvErrorCount = csvRows.length - csvValidRows.length;

  const validRows = isCsv ? csvValidRows : rows.filter((r) => errorsByKey[r.key].length === 0);
  const validCount = validRows.length;
  const seatsLeft = seats && seats.limit !== null ? seats.remaining : null;
  const seatExempt = new Set(seatExemptEmails.map(normEmail));
  const seatNeed = validRows
    .filter((r) => !seatExempt.has(normEmail(isCsv ? r.values.email : r.email)))
    .length;
  const seatShort = seatsLeft !== null && seatNeed > seatsLeft;
  const adminRows = isCsv
    ? csvValidRows
      .filter((r) => resolveInviteCsvRow(r, csvCtx).role === 'admin')
      .map((r) => ({ name: r.values.name, email: r.values.email }))
    : validRows.filter((r) => r.role === 'admin');

  /* 발송 버튼 활성 조건 E1~E7.
     · 직접 입력 — 오류 행이 하나라도 있으면 막는다. 오류 행을 조용히 빼고 보내면 어드민은 그
       사람들도 초대된 줄 안다.
     · CSV — **정상 줄만 보낸다**(기획서 탭 4 「부분 발송을 막지 않는다」 · PW-902). 빠지는 줄이
       있다는 것은 버튼 곁 요약(`csvSummarySkip`)이 적고, 보낸 뒤 오류 줄은 표에 남는다. */
  const canSend = !sending && !seatShort && (isCsv
    ? validCount > 0
    : activeRows.length > 0 && validCount === activeRows.length);

  /** 입력이 있는지 — 빈 행 1개뿐이면 확인 없이 닫는다(§6-2). */
  const isDirty =
    rows.length > 1 ||
    rows.some(
      (r) => r.email.trim() || r.name.trim() || r.teamIds.length > 0,
    ) ||
    csvRows.length > 0;

  const requestClose = () => {
    if (sending) return; // 발송 중에는 닫기를 막는다(§3)
    if (isDirty) setConfirmDiscard(true);
    else onClose?.();
  };

  const applyBulkToAll = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoRows(rows);
    setRows((rs) =>
      rs.map((r) => ({
        ...r,
        role: bulk.role,
        jobLevel: bulk.jobLevel,
        jobFamily: bulk.jobFamily,
        jobTitle: bulk.jobTitle,
        jobCategory: bulk.jobCategory,
        workLocation: bulk.workLocation,
        teamIds: [...bulk.teamIds],
        primaryTeamId: reconcilePrimary(bulk.teamIds, bulk.primaryTeamId),
      })),
    );
    setApplyToast(fmt(labels.bulkApplied, { n: rows.length }));
    // 행별로 다르게 지정해 둔 값도 덮어쓰므로 실행 취소를 반드시 제공한다(§4-2).
    undoTimer.current = setTimeout(() => {
      setUndoRows(null);
      setApplyToast('');
    }, 5000);
  };

  const undoBulk = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (undoRows) setRows(undoRows);
    setUndoRows(null);
    setApplyToast('');
  };

  /* ── CSV 업로드(§2-4) ────────────────────────────────────────────────── */

  const downloadTemplate = () => {
    const blob = new Blob([buildInviteTemplateCsv(labels, { jobCategoryEnabled })], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivit_invite_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const readCsvFile = async (file) => {
    setCsvError('');
    setCsvNotices([]);
    if (!file) return;
    // 확장자·MIME 둘 다 본다 — 브라우저·OS 조합에 따라 CSV 의 MIME 이
    // `application/vnd.ms-excel` 로 오거나 아예 비어 있다.
    const name = String(file.name || '').toLowerCase();
    if (!name.endsWith('.csv') && !String(file.type || '').includes('csv')) {
      setCsvError(labels.csvErrNotCsv);
      return;
    }
    let text;
    try {
      // 한국어 엑셀이 저장한 EUC-KR 파일도 열 이름이 깨지지 않게 읽는다 (PW-968).
      text = await readCsvFileText(file);
    } catch {
      setCsvError(labels.csvErrRead);
      return;
    }
    const res = parseInviteCsv(text, { labels, jobCategoryEnabled, maxRows: INVITE_CSV_MAX_ROWS });
    if (!res.ok) {
      // 상한 초과·필수 열 누락은 **스테이징을 만들지 않는다.** 앞 500행만 남기는
      // 조용한 절단은 정책 §5 V10 이 금지한다.
      setCsvError(res.error);
      setCsvRows([]);
      return;
    }
    const notices = [];
    if (res.jobCategoryIgnored) notices.push(labels.csvJobCategoryIgnored);
    if (res.ignoredColumns.length > 0) {
      notices.push(fmt(labels.csvIgnoredColumns, { columns: res.ignoredColumns.join(', ') }));
    }
    setCsvNotices(notices);
    setCsvRows(res.rows);
    setBanner('');
  };

  /** 표의 칸 하나를 고친다 — 그 줄만 새 객체가 되어 그 줄만 다시 그린다. */
  const patchCsvCell = (rowKey, colKey, value) =>
    setCsvRows((rs) => rs.map((r) => (r.key === rowKey
      ? { ...r, values: { ...r.values, [colKey]: value }, failReason: null, failField: null }
      : r)));

  const resetCsv = () => {
    setCsvRows([]);
    setCsvError('');
    setCsvNotices([]);
    setBanner('');
  };

  /** 서버 실패 사유의 칸(요청 키) → 표의 칸. */
  const CSV_FAIL_FIELD = { squadNames: 'squad', leaderTeamIds: 'leader', teamId: 'primaryPath', teamIds: 'orgPath' };

  const doSendCsv = async () => {
    setSending(true);
    setBanner('');
    const sendRows = csvValidRows;
    try {
      const res = await onSend?.(sendRows.map((r) => inviteCsvPayload(r, csvCtx)));
      const failed = res?.failed ?? [];
      const failedByKey = new Map();
      for (const f of failed) {
        const row = sendRows[f.index] ?? sendRows.find((r) => normEmail(r.values.email) === normEmail(f.email));
        if (row) failedByKey.set(row.key, f);
      }
      const sentKeys = new Set(sendRows.filter((r) => !failedByKey.has(r.key)).map((r) => r.key));
      const remaining = csvRows
        .filter((r) => !sentKeys.has(r.key))
        .map((r) => {
          const f = failedByKey.get(r.key);
          if (!f) return r;
          const key = FAIL_LABEL_KEY[f.reason];
          return {
            ...r,
            failReason: (key && labels[key]) || labels.failUnknown,
            failField: CSV_FAIL_FIELD[f.detail] ?? f.detail ?? null,
          };
        });
      if (remaining.length === 0) {
        onClose?.();
        return;
      }
      setCsvRows(remaining);
      setBanner(failed.length > 0
        ? fmt(labels.partialFail, { n: failed.length })
        : fmt(labels.csvSentKeepErrors, { n: sentKeys.size, m: remaining.length }));
    } catch {
      // 전건 실패 — 표를 그대로 두고 창 안에 사유를 남긴다(§3).
      setBanner(labels.sendError);
    } finally {
      setSending(false);
    }
  };

  const doSend = async () => {
    if (isCsv) {
      await doSendCsv();
      return;
    }
    setSending(true);
    setBanner('');
    try {
      const payload = activeRows.map((r) => ({
        email: r.email.trim(),
        name: r.name.trim(),
        role: r.role,
        jobLevel: r.jobLevel || undefined,
        jobFamily: r.jobFamily || undefined,
        // 계약 키는 `jobLadder` 다(arch-admin-data-model 초대 발송 API · PW-412).
        // 행 모델의 `jobTitle` 은 컬럼 이름이 남은 것일 뿐 값은 직렬이다.
        jobLadder: r.jobTitle || undefined,
        // 끈 조직은 **키째** 싣지 않는다 — 서버도 버리지만(V12) 보내지 않는 쪽이 계약이 분명하다.
        ...(jobCategoryEnabled && r.jobCategory ? { jobCategory: r.jobCategory } : {}),
        workLocation: r.workLocation || undefined,
        teamIds: r.teamIds.length ? r.teamIds : undefined,
        teamId: r.primaryTeamId || undefined,
      }));
      const res = await onSend?.(payload);
      const failed = res?.failed ?? [];
      if (failed.length === 0) {
        onClose?.();
        return;
      }
      /* 부분 성공 — 모달을 유지하고 **실패 행만** 남긴다(§3).
         닫아 버리면 그 행들의 이름·소속·직군 입력이 통째로 사라져
         처음부터 다시 입력해야 한다. */
      setBanner(fmt(labels.partialFail, { n: failed.length }));
      setActiveRows((rs) =>
        failed
          .map((f) => {
            const row = rs[f.index] ?? rs.find((r) => normEmail(r.email) === normEmail(f.email));
            if (!row) return null;
            const key = FAIL_LABEL_KEY[f.reason];
            return {
              ...row,
              failReason: (key && labels[key]) || labels.failUnknown,
            };
          })
          .filter(Boolean),
      );
    } catch {
      // 전건 실패 — 입력을 보존한 채 모달에 사유를 남긴다(§3).
      setBanner(labels.sendError);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const seatSummary =
    seats === null
      ? labels.seatsUnknown
      : seats.limit === null
        ? labels.seatsUnlimited
        : fmt(labels.seatsLeft, { n: seats.remaining });

  const bulkFields = (
    <>
      <label className="admin-inv-field">
        <span className="admin-inv-label">{labels.role}</span>
        <select
          className="admin-inv-select"
          value={bulk.role}
          onChange={(e) => setBulk({ ...bulk, role: e.target.value })}
        >
          {ROLE_IDS.map((id) => (
            <option key={id} value={id}>
              {labels[`role${id[0].toUpperCase()}${id.slice(1)}`]}
            </option>
          ))}
        </select>
      </label>
      <OptionSelect
        id="inv-bulk-jobLevel" label={labels.jobLevel} labels={labels}
        value={bulk.jobLevel} options={fieldOptions.jobLevel}
        onChange={(v) => setBulk({ ...bulk, jobLevel: v })}
      />
      <OptionSelect
        id="inv-bulk-jobFamily" label={labels.jobFamily} labels={labels}
        value={bulk.jobFamily} options={fieldOptions.jobFamily}
        onChange={(v) => setBulk((b) => ({
          ...b,
          jobFamily: v,
          // 직군을 바꾸면 그 직군에 없는 직렬은 버린다(E19)
          jobTitle: jobPairIssue(laddersByFamily, v, b.jobTitle) ? '' : b.jobTitle,
        }))}
      />
      <OptionSelect
        id="inv-bulk-jobTitle" label={labels.jobTitle} labels={labels}
        value={bulk.jobTitle}
        options={laddersForFamily(laddersByFamily, bulk.jobFamily, fieldOptions.jobTitle)}
        // 직군을 고르기 전에는 직렬을 고를 수 없다 — 직군 없는 직렬은 INV-3 위반 값이다
        disabled={ladderLocked(laddersByFamily, bulk.jobFamily)}
        placeholder={
          ladderLocked(laddersByFamily, bulk.jobFamily) ? labels.ladderNeedsFamily : undefined
        }
        onChange={(v) => setBulk((b) => ({ ...b, jobTitle: v }))}
      />
      {jobCategoryEnabled && (
        <OptionSelect
          id="inv-bulk-jobCategory" label={labels.jobCategory} labels={labels}
          value={bulk.jobCategory} options={fieldOptions.jobCategory}
          onChange={(v) => setBulk((b) => ({ ...b, jobCategory: v }))}
        />
      )}
      <OptionSelect
        id="inv-bulk-workLocation" label={labels.workLocation} labels={labels}
        value={bulk.workLocation} options={fieldOptions.workLocation}
        onChange={(v) => setBulk({ ...bulk, workLocation: v })}
      />
      <button
        type="button"
        className="admin-emp-btn is-ghost is-sm"
        onClick={applyBulkToAll}
        disabled={rows.length === 0}
      >
        {labels.bulkApply}
      </button>
    </>
  );

  const footer = (
    <div className="adm-shell-foot">
      <span className="admin-inv-summary">
        {validCount > 0
          ? (isCsv && csvErrorCount > 0
            ? fmt(labels.csvSummarySkip, { n: validCount, m: csvErrorCount })
            : fmt(labels.summary, { n: validCount }))
          : ''}
      </span>
      <div className="adm-shell-foot-actions">
        <button
          type="button"
          className="tl-group-modal-btn tl-group-modal-btn-secondary"
          disabled={sending}
          onClick={requestClose}
        >
          {labels.cancel}
        </button>
        <button
          type="button"
          className="tl-group-modal-btn tl-group-modal-btn-primary"
          disabled={!canSend}
          onClick={() => (adminRows.length > 0 ? setConfirmAdmin(true) : doSend())}
        >
          {sending ? labels.sending : labels.send}
        </button>
      </div>
    </div>
  );

  /* 껍데기는 공용 창 틀(ModalShell · PW-836). 헤더 — 좌석 요약. 좌석은 '수락 시점' 에
     증가하므로 미래형 문구(§4-4). 막·닫기 X·Esc 는 모두 requestClose 로 간다 — 입력이
     있으면 버릴지 먼저 묻는다. 발송 중(busy)에는 닫지 않는다(§3).
     🔴 확인 창 둘은 창 틀의 «형제»로 둔다 — 틀 안에 두면 확인 창 막 클릭이 React 트리를
     따라 틀까지 올라간다. */
  return (
    <>
    <ModalShell
      title={labels.title}
      description={`${seatSummary} · ${fmt(labels.seatsWillGrow, { n: validCount })}`}
      titleId="admin-invite-title"
      closeLabel={labels.close}
      onClose={requestClose}
      busy={sending}
      zIndex={1000}
      className={`adm-shell has-own-footer admin-inv-modal${isCsv && csvRows.length > 0 ? ' is-csv-wide' : ''}`}
      testId="admin-invite-modal"
      footer={footer}
    >
        {/* 모드 탭(§2-1). 탭 전환은 반대 탭의 입력을 지우지 않는다 — 각자 행 목록을
            따로 들고 있고, 발송은 보고 있는 탭의 행만 보낸다. 발송 중에는 바꾸지 않는다. */}
        <div className="tl-tabs-row adm-tabs-row">
          <Tabs
            items={[
              { value: 'direct', label: labels.tabDirect, disabled: sending },
              { value: 'csv', label: labels.tabCsv, disabled: sending },
            ]}
            value={mode}
            onChange={(id) => {
              setMode(id);
              setBanner('');
            }}
          />
        </div>

        {(seatShort || banner) && (
          <div className="admin-inv-banners">
            {seatShort && (
              <div className="admin-inv-banner is-warn" role="status">
                <IconAlert size={16} />
                <span>
                  {seatsLeft === 0
                    ? labels.seatNone
                    : fmt(labels.seatShort, { left: seatsLeft, need: seatNeed })}
                </span>
                {onGoBilling && (
                  <button type="button" className="admin-emp-btn is-ghost is-sm" onClick={onGoBilling}>
                    {labels.goBilling}
                  </button>
                )}
              </div>
            )}
            {banner && (
              <div className="admin-inv-banner is-error" role="alert">
                <IconAlert size={16} />
                <span>{banner}</span>
              </div>
            )}
          </div>
        )}

        {/* 일괄 지정 바 — 값 변경은 기존 행에 전파하지 않는다(§4-2).
            40명을 입력해 둔 뒤 직급 하나를 바꿨을 때 39명의 개별 지정이 조용히
            날아가는 것을 막는다. 전파는 [전체 적용] 이라는 명시적 행동으로만.
            CSV 탭에는 없다 — 값은 파일이 들고 오고, 잘못된 값은 그 행에서 고친다. */}
        {!isCsv && (
        <div className="admin-inv-bulk">
          <div className="admin-inv-bulk-head">
            <span className="admin-inv-bulk-title">{labels.bulkTitle}</span>
            <span className="admin-inv-hint">{labels.bulkHint}</span>
          </div>
          <div className="admin-inv-bulk-fields">{bulkFields}</div>
          {applyToast && (
            <div className="admin-inv-undo" role="status">
              <span>{applyToast}</span>
              <button type="button" className="admin-emp-btn is-ghost is-sm" onClick={undoBulk}>
                {labels.bulkUndo}
              </button>
            </div>
          )}
        </div>
        )}

        <div className="admin-inv-body">
          {isCsv && (
            <div className="admin-inv-csv">
              <div className="admin-inv-csv-head">
                <p className="admin-inv-hint">{labels.csvIntro}</p>
                <button
                  type="button"
                  className="admin-emp-btn is-ghost is-sm"
                  onClick={downloadTemplate}
                >
                  <IconDownload size={14} />{labels.csvTemplate}
                </button>
              </div>

              {csvRows.length === 0 ? (
                <>
                  {/* 드롭존 — label 로 감싸 클릭·드래그 둘 다 같은 input 을 쓴다 */}
                  <label
                    className={`admin-inv-drop${dragOver ? ' is-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      readCsvFile(e.dataTransfer?.files?.[0]);
                    }}
                  >
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="admin-inv-drop-input"
                      aria-label={labels.csvDropHere}
                      onChange={(e) => { readCsvFile(e.target.files?.[0]); e.target.value = ''; }}
                    />
                    <IconUpload size={22} />
                    <span className="admin-inv-drop-title">{labels.csvDropHere}</span>
                    <span className="admin-inv-hint">
                      {fmt(labels.csvLimits, { max: INVITE_CSV_MAX_ROWS })}
                    </span>
                  </label>
                  {csvError && (
                    <p className="admin-inv-row-error" role="alert">{csvError}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="admin-inv-csv-head">
                    <button
                      type="button"
                      className="admin-emp-btn is-ghost is-sm"
                      disabled={sending}
                      onClick={resetCsv}
                    >
                      {labels.csvReplaceFile}
                    </button>
                  </div>

                  {/* 무시한 열은 조용히 버리지 않는다 — 어드민이 그 값이 반영된 줄
                      알고 가입 후에 다시 확인하지 않는다(§2-4). */}
                  {csvNotices.map((n) => (
                    <div key={n} className="admin-inv-banner is-warn" role="status">
                      <IconAlert size={16} />
                      <span>{n}</span>
                    </div>
                  ))}

                  {/* 미리보기 표 — 온보딩과 같은 부품이다(PW-902). 모든 칸을 그 자리에서 고친다. */}
                  <InviteCsvStagingTable
                    rows={csvRows}
                    columns={csvColumns}
                    issuesByKey={csvIssuesByKey}
                    notesByKey={csvNotesByKey}
                    fieldOptions={fieldOptions}
                    labels={labels}
                    disabled={sending}
                    onChangeCell={patchCsvCell}
                  />
                </>
              )}
            </div>
          )}

          {!isCsv && rows.map((r) => {
            /* 아직 아무것도 입력하지 않은 행에는 오류를 띄우지 않는다.
               모달을 열자마자 빈 행이 빨갛게 "유효하지 않은 이메일 · 이름을
               입력해주세요" 를 외치면, 사용자가 뭘 잘못한 줄 알고 멈칫한다.
               발송 버튼은 어차피 비활성이라 잘못 나갈 위험은 없다. */
            const touched =
              r.email.trim() !== '' || r.name.trim() !== '' || r.teamIds.length > 0;
            const errs = touched ? errorsByKey[r.key] : [];
            const bad = errs.length > 0 || Boolean(r.failReason);
            return (
              <div key={r.key} className={`admin-inv-row${bad ? ' is-error' : ''}`}>
                <div className="admin-inv-row-main">
                  <label className="admin-inv-field admin-inv-field-email">
                    <span className="admin-inv-label">{labels.email}</span>
                    <input
                      type="email"
                      className="admin-inv-input"
                      value={r.email}
                      placeholder={labels.emailPlaceholder}
                      disabled={sending}
                      onChange={(e) => patch(r.key, { email: e.target.value })}
                    />
                  </label>
                  <label className="admin-inv-field admin-inv-field-name">
                    <span className="admin-inv-label">{labels.name}</span>
                    <input
                      type="text"
                      className="admin-inv-input"
                      value={r.name}
                      placeholder={labels.namePlaceholder}
                      disabled={sending}
                      onChange={(e) => patch(r.key, { name: e.target.value })}
                    />
                  </label>
                  <label className="admin-inv-field">
                    <span className="admin-inv-label">{labels.role}</span>
                    <select
                      className="admin-inv-select"
                      value={r.role}
                      disabled={sending}
                      onChange={(e) => patch(r.key, { role: e.target.value })}
                    >
                      {ROLE_IDS.map((id) => (
                        <option key={id} value={id}>
                          {labels[`role${id[0].toUpperCase()}${id.slice(1)}`]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="admin-emp-btn is-ghost is-sm"
                    aria-expanded={r.open}
                    onClick={() => patch(r.key, { open: !r.open })}
                  >
                    {r.open ? labels.collapse : labels.detail}
                  </button>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="admin-emp-btn is-ghost is-sm admin-emp-danger"
                      aria-label={labels.removeRow}
                      title={labels.removeRow}
                      disabled={sending}
                      onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    >
                      <IconTrash size={14} />
                    </button>
                  )}
                </div>

                {/* 접어도 겸직 상태를 알 수 있게 요약 칩을 남긴다(엣지 E6) */}
                {!r.open && r.teamIds.length > 0 && (
                  <p className="admin-inv-row-summary">
                    {r.teamIds.length >= 2
                      ? fmt(labels.concurrentSummary, {
                          n: r.teamIds.length,
                          state: r.primaryTeamId ? labels.primarySet : labels.primaryUnset,
                        })
                      : (tree.find((e) => e.id === r.teamIds[0])?.pathLabel ?? '')}
                  </p>
                )}

                {r.open && (
                  <div className="admin-inv-row-detail">
                    <div className="admin-inv-row-fields">
                      <OptionSelect
                        id={`inv-${r.key}-jobLevel`} label={labels.jobLevel} labels={labels}
                        value={r.jobLevel} options={fieldOptions.jobLevel} disabled={sending}
                        onChange={(v) => patch(r.key, { jobLevel: v })}
                      />
                      <OptionSelect
                        id={`inv-${r.key}-jobFamily`} label={labels.jobFamily} labels={labels}
                        value={r.jobFamily} options={fieldOptions.jobFamily} disabled={sending}
                        onChange={(v) => patch(r.key, { jobFamily: v })}
                      />
                      <OptionSelect
                        id={`inv-${r.key}-jobTitle`} label={labels.jobTitle} labels={labels}
                        value={r.jobTitle}
                        options={laddersForFamily(laddersByFamily, r.jobFamily, fieldOptions.jobTitle)}
                        disabled={sending || ladderLocked(laddersByFamily, r.jobFamily)}
                        placeholder={
                          ladderLocked(laddersByFamily, r.jobFamily)
                            ? labels.ladderNeedsFamily
                            : undefined
                        }
                        onChange={(v) => patch(r.key, { jobTitle: v })}
                      />
                      {jobCategoryEnabled && (
                        <OptionSelect
                          id={`inv-${r.key}-jobCategory`} label={labels.jobCategory} labels={labels}
                          value={r.jobCategory} options={fieldOptions.jobCategory} disabled={sending}
                          onChange={(v) => patch(r.key, { jobCategory: v })}
                        />
                      )}
                      <OptionSelect
                        id={`inv-${r.key}-workLocation`} label={labels.workLocation} labels={labels}
                        value={r.workLocation} options={fieldOptions.workLocation} disabled={sending}
                        onChange={(v) => patch(r.key, { workLocation: v })}
                      />
                    </div>

                    <div className="admin-inv-teams-block">
                      <span className="admin-inv-label">{labels.teams}</span>
                      <TeamMultiPicker
                        rowKey={r.key}
                        tree={tree}
                        selected={r.teamIds}
                        primaryId={r.primaryTeamId}
                        labels={labels}
                        onToggle={(id) => toggleTeam(r, id)}
                      />
                      {r.teamIds.length >= 2 && (
                        // 힌트를 label 안에 두면 접근성 이름이 "주 소속 (필수)소속을
                        // 2개 이상 고르면…" 으로 붙어 버린다 — htmlFor 로 묶고 힌트는
                        // 밖에 둔다.
                        <div className="admin-inv-field admin-inv-primary">
                          <label className="admin-inv-label" htmlFor={`inv-${r.key}-primary`}>
                            {labels.primaryTeamRequired}
                          </label>
                          <select
                            id={`inv-${r.key}-primary`}
                            className="admin-inv-select"
                            value={r.primaryTeamId}
                            disabled={sending}
                            onChange={(e) => patch(r.key, { primaryTeamId: e.target.value })}
                          >
                            <option value="">{labels.unset}</option>
                            {r.teamIds.map((id) => (
                              <option key={id} value={id}>
                                {tree.find((e) => e.id === id)?.pathLabel ?? id}
                              </option>
                            ))}
                          </select>
                          <span className="admin-inv-hint">{labels.primaryHint}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {errs.length > 0 && (
                  <p className="admin-inv-row-error">{errs.join(' · ')}</p>
                )}
                {r.failReason && (
                  <p className="admin-inv-row-error">{r.failReason}</p>
                )}
              </div>
            );
          })}

          {!isCsv && (
            <div className="admin-inv-addrow">
              <button
                type="button"
                className="admin-emp-btn is-ghost is-sm"
                disabled={rows.length >= maxRows || sending}
                onClick={() => setRows((rs) => [...rs, blankRow(bulk)])}
              >
                <IconPlus size={14} />{labels.addRow}
              </button>
              {rows.length >= maxRows && (
                <span className="admin-inv-hint">{fmt(labels.maxRows, { n: maxRows })}</span>
              )}
            </div>
          )}

          {/* 조직장·스쿼드는 직접 입력 탭에서 지정하지 않는다(§2-3). CSV 는 두 칸을 받는다(PW-902). */}
          {!isCsv && (
          <p className="admin-inv-note">
            {labels.leaderNote}
            <br />
            {labels.squadNote}
          </p>
          )}
        </div>

    </ModalShell>

      {/* 어드민 역할 초대 확인(§6-1) — 건수만 쓰지 않고 **이름을 나열**한다.
          건수만 보여주면 누구인지 확인하지 않고 넘긴다. */}
      {confirmAdmin && (
        <ConfirmModal
          testId="admin-invite-admin-confirm"
          title={labels.adminConfirmTitle}
          body={
            <>
              <p className="admin-inv-confirm-body">
                {fmt(labels.adminConfirmBody, {
                  names: adminRows.map((r) => `${r.name}(${r.email})`).join(', '),
                })}
              </p>
              <ul className="admin-inv-confirm-list">
                <li>{labels.adminConfirmP1}</li>
                <li>{labels.adminConfirmP2}</li>
                <li>{labels.adminConfirmP3}</li>
              </ul>
            </>
          }
          cancelLabel={labels.cancel}
          confirmLabel={labels.adminConfirmOk}
          onCancel={() => setConfirmAdmin(false)}
          onConfirm={() => { setConfirmAdmin(false); doSend(); }}
        />
      )}

      {/* 입력 중 닫기 확인(§6-2) — 50명 입력은 복원되지 않으므로(E11)
          이 확인이 실수 유실을 막는 유일한 장치다. */}
      {confirmDiscard && (
        <ConfirmModal
          testId="admin-invite-discard-confirm"
          title={labels.discardTitle}
          body={fmt(labels.discardBody, { n: rows.length })}
          cancelLabel={labels.discardKeep}
          confirmLabel={labels.discardLeave}
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => { setConfirmDiscard(false); onClose?.(); }}
        />
      )}
    </>
  );
}
