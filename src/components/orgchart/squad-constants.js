/**
 * 스쿼드 뷰 상수 · 파생값 계산.
 *
 * 정본: `pivit-specs/조직도-renewal-with-public-card/screen-org-chart-squad.policy.md`
 *       (v3.7 — §5-2 상태/전이 · §5-3 캐파 · §5-3.4 팀원 리소스 구성)
 * 시안: 같은 폴더의 `org-chart-v2.jsx` (SquadView)
 *
 * 상태 코드는 서버 값(`planned|active|done|archived`)을 그대로 쓰고, 화면 라벨은 여기서
 * 해석한다 — 코드값이 화면에 새어 나가지 않게 하는 단일 지점이다.
 */

/** 가용 캐파 — 셀 %의 분모(§5-3.1). "스쿼드 내 상대 지분" 이 아니다. */
export const CAPACITY = 100;

/** 빈 셀 클릭·팀원 추가 시 기본 계획 투입%. */
export const DEFAULT_ASSIGN_PCT = 20;

/**
 * 카드 안에서 열리는 메뉴·팝오버의 z 층.
 *
 * 전면 클릭아웃 배경(`position: fixed; inset: 0`)은 **사이드바(App.css `.sidebar` = 100)
 * 보다 위**여야 한다 — 낮으면 메뉴가 열려도 좌측 내비가 덮이지 않아 바깥 클릭이 먹지 않는다
 * (선례 사고: BillingPlansCanvas 확인 모달이 zIndex 60 이라 사이드바 아래 깔렸다).
 * 회귀 가드: `designPageOverlayZ.drift.test.ts`.
 */
export const SQUAD_MENU_BACKDROP_Z = 10000;
export const SQUAD_MENU_Z = 10001;
/** 확인 모달 — 메뉴보다 위. */
export const SQUAD_MODAL_Z = 10050;

/** 생성 폼 색상 팔레트 (8종). */
export const SQUAD_PALETTE = [
  '#4F6AF5', '#8B5CF6', '#F59E0B', '#22C55E',
  '#EC4899', '#0EA5E9', '#EF4444', '#14B8A6',
];

/**
 * 상태 배지 — 라벨·색 (§5-2).
 * `counted` = 캐파 합계에 포함되는가. 완료·보관은 제외된다(§5-3).
 */
export const SQUAD_STATUS = {
  planned: { label: '준비중', bg: '#F8FAFC', text: '#94A3B8', counted: true },
  active: { label: '진행중', bg: '#EEF2FF', text: '#4F6AF5', counted: true },
  done: { label: '완료', bg: '#F0FDF4', text: '#16A34A', counted: false },
  archived: { label: '보관', bg: '#F1F5F9', text: '#64748B', counted: false },
};

/** 미지의 코드가 와도 원본 키를 그대로 렌더하지 않는다(라벨 폴백). */
export function squadStatusMeta(status) {
  return SQUAD_STATUS[status] || SQUAD_STATUS.planned;
}

export function squadStatusLabel(status) {
  return squadStatusMeta(status).label;
}

/** 캐파 합계에 포함되는 스쿼드인가 — 완료·보관은 빠진다(§5-3). */
export function isCountedStatus(status) {
  return squadStatusMeta(status).counted;
}

/**
 * 상태 전이 — 정방향 + 되돌리기만 (§5-2-A).
 *
 * planned ─시작→ active ─완료→ done ─보관→ archived
 *                    ←재개─┘       ←복원─┘
 *
 * 차단: → planned(전체), active → archived(완료 경유 필수), 단계 건너뛰기.
 * 서버가 판정의 단일 출처이며, 여기서는 **허용 전이만** 메뉴에 렌더한다
 * (차단 전이는 비활성 항목으로도 보여주지 않는다 — 선택지가 아님을 명확히).
 */
export const SQUAD_STATUS_TRANSITIONS = {
  planned: [{ to: 'active', label: '시작' }],
  active: [{ to: 'done', label: '완료' }],
  done: [{ to: 'archived', label: '보관' }, { to: 'active', label: '재개' }],
  archived: [{ to: 'done', label: '복원' }],
};

export function transitionsFrom(status) {
  return SQUAD_STATUS_TRANSITIONS[status] || [];
}

/** 기간 표기: "2026-01-05" → "26.01.05". 종료일 없으면 '미정'. */
export function fmtYmd(iso) {
  if (!iso) return '미정';
  return String(iso).slice(2, 10).replace(/-/g, '.');
}

export function clampPct(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

/**
 * 활성(완료·보관 제외) 스쿼드의 배정 내역 — 캐파 게이지 세그먼트 소스.
 * 캐파가 *어디로* 갔는지 한 칸에서 읽히도록 스쿼드별 색을 함께 싣는다.
 */
export function planSegments(squads, userId) {
  return (squads || [])
    .filter((sq) => isCountedStatus(sq.status))
    .map((sq) => ({
      sq,
      pct: (sq.members || []).find((m) => m.userId === userId)?.allocationPct || 0,
    }))
    .filter((x) => x.pct > 0)
    .map((x) => ({ id: x.sq.id, name: x.sq.name, color: x.sq.color, pct: x.pct }));
}

/** 계획 투입% 합계 — 활성 스쿼드만 합산. 분모가 한 사람당 하나(100)라 합산이 성립한다. */
export function plannedTotalPct(squads, userId) {
  return planSegments(squads, userId).reduce((sum, s) => sum + s.pct, 0);
}

/** 참여 중인 활성·비활성 포함 스쿼드 개수 (「캐파 사용」 열의 `n개`). */
export function squadCountOf(squads, userId) {
  return (squads || []).filter((sq) =>
    (sq.members || []).some((m) => m.userId === userId),
  ).length;
}

/**
 * 세그먼트별 **누적 합** — 게이지가 각 세그먼트 중 100을 넘긴 몫(빗금 구간)을 그리려면
 * "이 세그먼트가 끝나는 지점" 을 알아야 한다. 컴포넌트 안에서 누산하면 렌더 중 변수
 * 재할당이라 렌더 순수성 규칙에 걸리므로 순수 함수로 뺀다.
 */
export function cumulativePct(segments) {
  const out = [];
  let running = 0;
  (segments || []).forEach((s) => { running += s.pct; out.push(running); });
  return out;
}

/** 캐파 대비 상태 — 100을 기준으로 남는지/딱 맞는지/넘는지 (§5-3.2). */
export function capacityState(total) {
  if (total > CAPACITY) return { key: 'over', label: '초과', color: '#DC2626', bg: '#FEF2F2', bd: '#FECACA' };
  if (total === CAPACITY) return { key: 'full', label: '가득', color: '#16A34A', bg: '#F0FDF4', bd: '#BBF7D0' };
  if (total >= 70) return { key: 'fit', label: '적정', color: '#16A34A', bg: '#F0FDF4', bd: '#BBF7D0' };
  if (total > 0) return { key: 'slack', label: '여유', color: '#0EA5E9', bg: '#F0F9FF', bd: '#BAE6FD' };
  return { key: 'none', label: '미배정', color: '#94A3B8', bg: '#F8FAFC', bd: '#E2E8F0' };
}

/**
 * 스쿼드 내 리소스 구성비 (§5-3.4) — **매트릭스 「캐파 사용」과 분모가 다른 값**이다.
 *   · 캐파 사용(매트릭스) = 개인 캐파 100 기준 → "이 사람은 과부하인가"
 *   · 구성비(여기)       = 이 스쿼드의 총 투입 100 기준 → "이 스쿼드 안에서 누가 무게를 지는가"
 * 분모가 스쿼드 하나로 고정되므로 팀원 간 비교는 성립하지만, 스쿼드를 넘는 합산은 불가.
 *
 * 반올림은 **최대잔여법(Hamilton)** — 단순 반올림이면 36+36+27=99 처럼 잔차가 남아
 * "합이 100" 이라는 화면 약속이 깨진다. 소수부가 큰 항목부터 1%p 씩 배분한다.
 * 파생값이며 저장하지 않는다.
 */
export function squadComposition(members) {
  const list = members || [];
  const totalPct = list.reduce((s, m) => s + (m.allocationPct || 0), 0);

  const raw = list.map((m) => (totalPct ? ((m.allocationPct || 0) / totalPct) * 100 : 0));
  const floors = raw.map(Math.floor);
  let remainder = (totalPct ? 100 : 0) - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i); // 잔여가 큰 순, 동률이면 원래 순서
  const shares = floors.slice();
  for (let k = 0; k < order.length && remainder > 0; k += 1, remainder -= 1) {
    shares[order[k].i] += 1;
  }

  const rows = list
    .map((m, i) => ({
      userId: m.userId,
      role: m.role,
      pct: m.allocationPct || 0, // 개인 캐파 기준 원값
      share: shares[i], // 스쿼드 100 기준 구성비 (합계 = 정확히 100)
    }))
    .sort((a, b) => b.pct - a.pct); // 무게 큰 순 — 비교가 목적이므로 정렬한다

  return { totalPct, fte: Math.round(totalPct / 10) / 10, rows };
}

/** 특정 멤버의 스쿼드 내 구성비 (툴팁 등 단건 조회용). */
export function sqShare(members, userId) {
  const list = members || [];
  const total = list.reduce((s, m) => s + (m.allocationPct || 0), 0);
  const me = list.find((m) => m.userId === userId);
  return total && me ? Math.round((me.allocationPct / total) * 100) : 0;
}

/** 스쿼드의 ⭐리드 배정 (없으면 null). */
export function leadOf(squad) {
  return (squad?.members || []).find((m) => m.role === 'lead') || null;
}
