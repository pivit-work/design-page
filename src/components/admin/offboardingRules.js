/**
 * 퇴사 처리 화면(AdminOffboardingCanvas · PW-1081)의 모양 · 문구 · 실행 조건.
 * 컴포넌트 파일과 나눈 까닭은 react-refresh — 컴포넌트 파일에는 컴포넌트만 둔다.
 * 호스트(pivit-work)는 `offboardingCanRun` 으로 같은 조건을 테스트·서버 검증 짝에 쓴다.
 */

/** 퇴사 유형 4종 — 구 화면(0fb446e^)에서 되찾은 그대로. 첫째가 기본값이다. */
export const OFFBOARDING_TYPE_IDS = ['voluntary', 'involuntary', 'contract_end', 'etc'];

/**
 * 데이터 처리 영역 8개 — 이 표는 «이 화면이 정하는 것»이 아니라 각 폴더 정본의 **인용**이다(§3).
 * 문구는 라벨(`areas.<id>`)에 있고, 여기에는 모양(상태·재확인·고를 자리)만 둔다.
 *   state 'fixed'  — 정본이 정했고 고를 수 없다
 *   state 'choice' — 고를 수 있는 자리가 하나 있다(`choice` 키 · 선택지 id)
 * `recheck` — 정본은 있으나 §2-D-8 네 축 재확인 전(§3-A). 실행은 한다.
 */
export const OFFBOARDING_AREAS = [
  { id: 'snippet', state: 'fixed', recheck: true },
  { id: 'okr', state: 'choice', choice: { key: 'okrPersonal', options: ['keep', 'archive', 'delete'] } },
  { id: 'oneonone', state: 'fixed' },
  { id: 'eval', state: 'choice', choice: { key: 'evalDrafts', options: ['keep', 'delete'] } },
  { id: 'resource', state: 'fixed' },
  { id: 'personal', state: 'fixed' },
  { id: 'meeting', state: 'fixed' },
  { id: 'billing', state: 'fixed' },
];

/** 고를 자리가 있는 영역만 — 선택값·사유의 키가 여기서 나온다. */
export const OFFBOARDING_CHOICE_AREAS = OFFBOARDING_AREAS.filter((a) => a.choice);

export const ADMIN_OFFBOARDING_DEFAULT_LABELS = {
  back: '구성원 목록으로',
  title: '퇴사 처리',
  subtitle: '되돌릴 수 없습니다. 아래를 확인한 뒤 한 번에 실행합니다.',
  listSeparator: ' · ',
  sections: {
    target: '대상자',
    data: '데이터 처리',
    dataDesc: '영역마다 처리 방식은 이미 정해져 있습니다. 이 화면은 그것을 보여 주고, 고를 수 있는 항목에서만 선택을 받습니다. 기본값은 워크스페이스 설정 > 퇴사 처리 기본값에서 옵니다.',
    effectsDue: '실행하면 즉시 일어나는 일',
    effectsScheduled: '퇴사일({date})에 일어나는 일',
    confirm: '확인',
    confirmDesc: '되돌릴 수 없습니다. 대상자 이름을 그대로 입력해야 실행됩니다.',
  },
  typeLabel: '퇴사 유형',
  types: {
    voluntary: '자발적 퇴사',
    involuntary: '권고사직',
    contract_end: '계약 만료',
    etc: '기타',
  },
  resignationDate: '퇴사일',
  resignationDateRequired: '퇴사일을 넣어야 실행할 수 있습니다',
  lastDay: '마지막 출근일',
  lastDayHint: '남은 휴가를 쓰면 퇴사일보다 앞설 수 있습니다',
  lastDayAfterResignation: '퇴사일보다 늦을 수 없습니다',
  states: {
    fixed: '정해짐',
    choice: '선택 가능',
    recheck: '재확인 대기',
    overridden: '기본값 덮어씀',
  },
  whyOpen: '왜 이렇게 되나',
  whyClose: '근거 접기',
  recheckNotice: '{areas} 의 처리 방식은 다시 확인하고 있어 나중에 바뀔 수 있습니다. 지금은 표시된 대로 실행됩니다.',
  areas: {
    snippet: {
      label: '스니핏 · 타임라인',
      rule: '작성자 이름만 「퇴사한 구성원」으로 대체하고, 스니핏은 팀 타임라인에 그대로 남깁니다. 무기한 보존입니다.',
      detail: '본문을 지우면 사라지는 것은 퇴사자의 기록이 아니라 팀 타임라인의 흐름입니다. 이 처리 방식은 다시 확인하고 있어 나중에 바뀔 수 있습니다.',
    },
    okr: {
      label: 'OKR',
      rule: '표시명만 「퇴사한 구성원」으로 가리고, 기여도·달성률 이력·인라인 피드백은 행째로 남깁니다.',
      detail: '기여도를 지우면 팀 KR 달성률이 지난 기간까지 거슬러 바뀌고, 기여도 합계가 100% 가 되지 않아 저장할 수 없게 됩니다.',
    },
    oneonone: {
      label: '1on1',
      rule: '아무것도 바꾸지 않습니다 — 익명화·삭제·이관 셋 다 하지 않습니다.',
      detail: '열람자가 대화 상대 한 사람뿐이라 이름을 지워도 아무도 보호되지 않고, 콘텐츠가 공동 저작이라 「작성자만 익명화」가 설 자리가 없습니다. 퇴사는 열람 범위를 어느 방향으로도 바꾸지 않습니다.',
    },
    eval: {
      label: '평가 · 피드백',
      rule: '퇴사자가 남에게 «준» 것은 표시명만 가리고 본문을 남기며, 캘리브레이션·등급 변경 같은 «조직의 의사결정 기록»은 가리지 않습니다.',
      detail: '답변을 지우면 응답 인원이 줄어 그 항목이 뒤늦게 최소 인원 아래로 내려가고, 남은 응답자의 익명이 깨집니다.',
    },
    resource: {
      label: '리소스 투입 현황',
      rule: '마감된 기간의 투입 스냅샷은 표시명만 가리고 값을 남기며, 진행 중인 기간은 팀 캐파 집계에서 뺍니다.',
      detail: '지우고 싶어지는 이유는 퇴사자가 집계에 계속 잡히기 때문입니다. 진행 중인 기간의 집계에서 빼므로 마감된 기간의 값을 지울 이유가 없습니다.',
    },
    personal: {
      label: '개인정보 변경 이력',
      rule: '값은 파기하고 「누가·언제·어느 항목을 바꿨다」는 사실은 남깁니다.',
      detail: '변경 이력은 지우는 선택지가 없습니다. 보존 기간이 나중에 정해져도 이 방식은 바뀌지 않습니다.',
    },
    meeting: {
      label: '회의록 녹음',
      rule: '퇴사와 무관합니다 — 녹음은 90일 자동 삭제 규칙을 그대로 따릅니다.',
      detail: '퇴사가 삭제 시점을 앞당기지도 늦추지도 않습니다.',
    },
    billing: {
      label: '좌석 · 구독',
      rule: '퇴사로 바뀌는 날(예약이면 퇴사일 당일) 활성 좌석에서 빠지고 다음 청구일에 반영됩니다. 환불은 없습니다.',
      detail: '약정 최소 좌석이 있는 계약이면 좌석이 줄어도 청구 금액이 낮아지지 않습니다.',
    },
  },
  choices: {
    okrPersonal: {
      label: '어느 상위에도 정렬되지 않은 개인 OKR',
      why: '상위 목표에 정렬된 OKR 은 다른 사람의 근거가 되므로 여기서 빠집니다 — 기준은 누가 만들었나가 아니라 집계에 반영됐는가입니다.',
      options: { keep: '그대로 둔다', archive: 'HR 아카이브로 옮긴다', delete: '삭제한다' },
    },
    evalDrafts: {
      label: '제출되지 않은 답변 · 확인하지 않은 AI 초안 · 발송되지 않은 피드백 초안',
      why: '어느 결정에도 쓰이지 않은 것들입니다. 확인하지 않은 AI 초안은 아직 결과물이 아닙니다.',
      options: { keep: '그대로 둔다', delete: '삭제한다' },
    },
  },
  reasonLabel: '덮어쓴 사유',
  reasonPlaceholder: '예: 분쟁 소지가 있어 법무 검토 전까지 보존',
  resetToDefault: '기본값으로 되돌리기',
  effects: {
    leaderWarning: '조직장 자리가 비게 됩니다 — 후임을 지정하세요.',
    leaderOf: '{names} 의 리드입니다. 후임은 자동으로 정해지지 않으며, 목록으로 돌아가면 해당 조직에 미배정 표시가 붙습니다.',
    scheduleNotice: '퇴사일이 아직 오지 않아 예약으로 실행됩니다. 그 전날까지는 재직 상태가 유지되고, 목록에는 퇴직 예정·출근 종료 표시가 붙습니다. 아래 일과 데이터 처리의 처분은 퇴사일 당일에 함께 일어납니다.',
    status: '재직 상태가 퇴사로 바뀌고 앞으로의 대상 명단에서 빠집니다.',
    seats: '활성 좌석이 {from}명 → {to}명이 됩니다.',
    seatsBilling: '다음 청구일에 반영되며, 환불은 없습니다.',
    seatsMinimum: '약정 최소 좌석({minimum}명) 기준으로 청구되므로 이번 변경은 청구 금액을 낮추지 않습니다.',
    candidates: '매니저·조직장·대표 후보에서 빠지고, 진행 중 기간의 팀 캐파 집계에서 제외됩니다.',
    oneOnOne: '1on1 예약 대상에서 빠집니다. 지나간 기록과 지표는 그대로 남습니다.',
    retention: '보존 기간이 지난 뒤의 파기 시점은 법무·노무 검토가 끝나면 정해집니다. 그때 값이 바뀌어도 위 처분 구조는 바뀌지 않습니다.',
  },
  nameLabel: '대상자 이름',
  nameMismatch: '이름이 일치하지 않습니다',
  missingReason: '기본값을 덮어쓴 항목에 사유가 비어 있습니다 — {areas}',
  run: '퇴사 처리',
  reserve: '퇴사 예약',
  running: '처리 중…',
  cancel: '취소',
};

/**
 * 실행 버튼 활성 조건 — 정책 §5-A 의 단일 정의.
 *
 *   이름 정확 일치(앞뒤 공백 무시 · E4) && 퇴사일 있음(E12) && 마지막 출근일 ≤ 퇴사일(E13 · 같은 날 허용)
 *   && 기본값을 덮어쓴 항목마다 사유가 비어 있지 않다(§4-A · 공백만이면 미입력)
 *
 * 「재확인 대기」 영역은 실행을 막지 않는다 — 막으면 퇴사 처리 자체가 불가능해진다.
 */
export function offboardingCanRun({
  memberName, typedName, resignationDate, lastDay, picks, defaults, reasons,
}) {
  if ((typedName ?? '').trim() !== memberName) return false;
  if (!resignationDate) return false;
  if (lastDay && lastDay > resignationDate) return false;
  const p = picks || {};
  const d = defaults || {};
  const r = reasons || {};
  return Object.keys(p).every((k) => p[k] === d[k] || Boolean(r[k]?.trim()));
}
