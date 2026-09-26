/**
 * 상태 딱지의 «뜻 → 색» 표와 «상태값 → 뜻» 표 (PW-840).
 *
 * 「충족」·「시급」·「진행 중」 같은 색 딱지를 화면마다 따로 그려서, 같은 뜻인데 화면마다 색이
 * 조금씩 다르고 어떤 뜻에 어떤 색인지 적은 표가 어디에도 없었다. 새 상태가 생겨도 색을 고를
 * 근거가 없어 다른 상태의 색을 그대로 가져다 쓰는 일이 생겼다(PW-743 — 「수습」이 「휴직」과
 * 같은 색).
 *
 * 이제 화면은 색을 직접 고르지 않는다. **뜻**만 고르면 색은 이 표가 정한다.
 *
 *   <StatusBadge tone="success" className="evc-status-badge">완료</StatusBadge>
 *
 * 색을 바꾸는 것은 디자이너 몫이라, 여기 값을 고치는 것은 디자이너 결정이 있을 때만 한다.
 * 같은 값이 `src/status-badge.css` 의 `:root` 에도 있고, 둘이 어긋나면
 * `npm run check:status-badges` 가 막는다.
 */

/**
 * 뜻 일곱. `bg`·`fg` 는 `src/status-badge.css` 의 `--dp-badge-<이름>-bg`·`-fg` 와 같아야 한다.
 * `when` 은 이 뜻을 언제 쓰는지 — 새 상태에 딱지를 붙일 때 여기서 고른다.
 */
export const TONES = {
  neutral: {
    label: '중립',
    when: '아무 일도 일어나지 않은 상태 · 해당 없음 · 꺼져 있음',
    bg: 'var(--bg-secondary)',
    fg: 'var(--text-tertiary)',
  },
  info: {
    label: '정보',
    when: '알려 주기만 하는 표시 · 갈래 구분 (재촉하지 않는다)',
    bg: 'var(--utility-blue-50)',
    fg: 'var(--utility-blue-600)',
  },
  progress: {
    label: '진행',
    when: '하는 중 · 아직 안 끝났지만 늦은 것은 아님',
    bg: 'var(--utility-purple-50)',
    fg: 'var(--utility-purple-500)',
  },
  success: {
    label: '성공',
    when: '끝남 · 됨 · 충족 · 승인됨',
    bg: 'var(--utility-green-50)',
    fg: 'var(--utility-green-600)',
  },
  warning: {
    label: '주의',
    when: '곧 지남 · 사람이 한 번 봐야 함 (아직 잘못된 것은 아님)',
    bg: 'var(--utility-warning-50)',
    fg: 'var(--utility-warning-700)',
  },
  danger: {
    label: '위험',
    when: '지남 · 실패 · 시급 · 막힘',
    bg: 'var(--utility-error-50)',
    fg: 'var(--utility-error-700)',
  },
  accent: {
    label: '강조',
    when: '우리 서비스가 붙인 표시 · 기본값 · 고른 것',
    bg: 'var(--bg-brand-secondary)',
    fg: 'var(--text-brand-secondary)',
  },
};

/** 뜻 이름 목록. 검사와 소비자 테스트가 쓴다. */
export const TONE_NAMES = Object.keys(TONES);

/**
 * 상태값 → 뜻. 화면들이 각자 두고 있던 작은 표들을 여기로 모았다.
 * 키는 서버·화면이 쓰는 상태값 그대로다(스네이크·카멜 섞여 있는 것도 실제 값이라 그대로 둔다).
 *
 * 🔴 여기 없는 상태값을 만나면 **색을 새로 고르지 말고 이 표에 한 줄을 더한다.** 그것이 이
 * 표를 한 곳에 두는 이유다.
 */
export const STATUS_TONE = {
  // ── 아직 안 함 ──────────────────────────────────────────────────────────
  pending: 'neutral',
  not_started: 'neutral',
  unbooked: 'neutral',
  none: 'neutral',
  excluded: 'neutral',
  disabled: 'neutral',
  archived: 'neutral',
  // 고객지원 문의 — 접수(아직 아무도 안 봄) · 종료 (PW-1129)
  open: 'neutral',
  closed: 'neutral',
  // ── 하는 중 ────────────────────────────────────────────────────────────
  in_progress: 'info',
  ongoing: 'info',
  preparing: 'info',
  meeting: 'info',
  running: 'progress',
  review: 'progress',
  redirected: 'progress',
  // ── 됐다 ──────────────────────────────────────────────────────────────
  done: 'success',
  completed: 'success',
  submitted: 'success',
  approved: 'success',
  leader_approved: 'success',
  connected: 'success',
  active: 'success',
  resolved: 'success',
  // ── 봐야 한다 ──────────────────────────────────────────────────────────
  due_soon: 'warning',
  unconfirmed: 'warning',
  on_hold: 'warning',
  warning: 'warning',
  // 고객지원 문의 — 운영자가 고객 답을 기다린다 (PW-1129)
  waiting_customer: 'warning',
  // ── 잘못됐다 ───────────────────────────────────────────────────────────
  overdue: 'danger',
  failed: 'danger',
  error: 'danger',
  urgent: 'danger',
  rejected: 'danger',
  // ── 우리가 붙인 표시 ────────────────────────────────────────────────────
  default: 'accent',
  primary: 'accent',
  selected: 'accent',
};

/**
 * 상태값에 붙일 뜻을 돌려준다. 표에 없으면 `fallback`(기본 중립)이다 —
 * **화면이 색을 직접 고르는 자리를 만들지 않기 위해서** 던지지 않고 중립으로 떨어뜨린다.
 */
export function toneForStatus(status, fallback = 'neutral') {
  if (status && Object.prototype.hasOwnProperty.call(STATUS_TONE, status)) return STATUS_TONE[status];
  return fallback;
}
