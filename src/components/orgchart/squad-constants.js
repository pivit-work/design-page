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

/** 가용 캐파 — 「캐파 사용」의 분모(§5-3.1). "스쿼드 내 상대 지분" 이 아니다. */
export const CAPACITY = 100;

/** 스쿼드 내 비중의 분모 — 그 스쿼드의 총 볼륨 100(§5-3.4). 캐파와 **다른 축**이다. */
export const SQUAD_BASE = 100;

/**
 * 신규 배정 기본값 — **두 축 모두 0** 이다 (§5-3.7 v3.10).
 *
 * 종전 `캐파 20%` 는 **관리자가 남의 시간에 대해 적어 넣은 근거 없는 값**이라 폐기했다.
 * 캐파의 소유자는 본인이고, 본인이 정하기 전까지의 사실은 「미설정」(`capacitySetBy`
 * = null)이며 그 배정은 캐파 합계에서 빠진다. 비중을 0(미배분)으로 두는 것과 같은
 * 이유 — 틀린 값을 사실처럼 채우지 않는다.
 */
export const DEFAULT_ASSIGN_PCT = 0;
export const DEFAULT_SHARE_PCT = 0;

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

/**
 * 생성 폼 색상 팔레트 (8종) — 스쿼드의 신원색.
 *
 * 여기만 **리터럴 hex** 다. 스쿼드 색은 토큰이 아니라 사용자가 고르는 값이고,
 * 카드 테두리·셀 배경에 `${color}18` 처럼 알파를 이어 붙여 쓰기 때문에 `var()` 로는
 * 표현할 수 없다. 대신 값 자체는 디자인 토큰의 utility 500 색과 같은 것을 쓴다 —
 * 임의의 팔레트를 쓰면 카드 위 색 띠와 매트릭스 점만 다른 앱처럼 튄다.
 */
export const SQUAD_PALETTE = [
  '#6172f3', // utility indigo 500
  '#7a5af8', // utility purple 500
  '#f79009', // utility warning 500
  '#17b26a', // utility success 500
  '#ee46bc', // utility pink 500
  '#0ba5ec', // utility blue-light 500
  '#f04438', // utility error 500
  '#2dbd82', // utility brand 500
];

/**
 * 상태 배지 — 라벨·색 (§5-2).
 *
 * 프로젝트 탭의 `PROJECT_STATUSES` 와 **같은 모양·같은 필드명**이다 — 두 탭의 상태
 * 배지가 같은 부품(`pj-card-status` + `pj-status-dot`)으로 그려지도록 맞췄다.
 * `counted` = 캐파 합계에 포함되는가. 완료·보관은 제외된다(§5-3).
 */
export const SQUAD_STATUS = {
  planned: {
    label: '준비중',
    dotColor: 'var(--text-tertiary)',
    textColor: 'var(--text-tertiary)',
    counted: true,
  },
  active: {
    label: '진행중',
    dotColor: 'var(--utility-blue-500)',
    textColor: 'var(--utility-blue-500)',
    counted: true,
  },
  done: {
    label: '완료',
    dotColor: 'var(--fg-brand-primary)',
    textColor: 'var(--text-brand-tertiary)',
    counted: false,
  },
  archived: {
    label: '보관',
    dotColor: 'var(--text-quaternary)',
    textColor: 'var(--text-quaternary)',
    counted: false,
  },
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

/** 한글·한자·가나 등 글자 폭이 넓은 문자. */
const CJK_RE = /[ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯豈-﫿]/;

/**
 * 아바타 원 안 글자 크기 — **고정 크기 원에 가변 길이 이름이 들어온다**(CLAUDE.md).
 *
 * 명부 라벨은 라틴 이니셜('JD')일 수도, 한글 이름 전체('전나은')일 수도 있다. 한 크기로
 * 박아 두면 한글 세 글자에서 줄바꿈이 나 원 밖으로 글자가 흘러나온다(실제로 그랬다).
 * 글자 폭을 추정해 줄이되(CJK ≒ 폰트 크기, 라틴·숫자 ≒ 62%), 짧은 값은 기본 크기를
 * 그대로 둬 시각 변화를 만들지 않는다. CSS 쪽 `nowrap`·`overflow: hidden` 이 최종 방어다.
 */
export function avatarFontPx(text, size) {
  const base = Math.max(8, Math.round(size * 0.34));
  const chars = [...String(text || '')];
  if (chars.length === 0) return base;
  const widthPerFontPx = chars.reduce((sum, ch) => sum + (CJK_RE.test(ch) ? 1 : 0.62), 0);
  const available = size * 0.86; // 원 안쪽 가용 폭(좌우 여백 제외)
  return Math.max(8, Math.min(base, Math.floor(available / widthPerFontPx)));
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
 * 캐파 **미설정** 판정 — `capacitySetBy` 가 null 이면 "아직 아무도 정하지 않음" 이다.
 *
 * ⚠️ `0%` 와 다르다. `0%` 는 본인이 "이 스쿼드엔 시간을 안 쓴다" 고 정한 값이라 합계에
 * 0 으로 들어가고, 미설정은 **합계에서 빠진다**. 둘을 같게 다루면 합계가 낮은 이유를
 * 화면이 스스로 설명하지 못한다(§5-3.7 · §10-A19·A20).
 */
export function isCapacityUnset(member) {
  return !member || member.capacitySetBy == null;
}

/** 「비중 > 0 · 캐파 = 0」 안내 문구 — 셀·칩 툴팁이 같은 문장을 쓴다(§5-3.6). */
export const CAPACITY_IDLE_HINT = '캐파 사용이 지정되지 않았습니다';

/**
 * 「비중 > 0 · 캐파 = 0」 판정 — **안내 대상**이지 오류가 아니다(§5-3.6 · §10-A15).
 *
 * 조직이 배분은 해 놨는데 그 시간이 **누구의 캐파에도 잡혀 있지 않다**는 뜻이라,
 * 과부하 판정에서 통째로 빠진다. 저장은 막지 않고 표시만 한다.
 *
 * ⚠️ 미설정(`capacitySetBy = null`)은 여기 **들어오지 않는다.** 그쪽은 점선 `—` 로
 * 따로 표시되고 캐파 합계에서 빠진다. 「아직 아무도 안 정함」 과 「본인이 0 으로 정함」
 * 을 같은 표시로 묶으면 두 상태를 구별할 수 없게 된다(§10-A19·A20).
 *
 * ⚠️ 「비중 50 · 캐파 10」 같은 조합에는 **아무것도 붙지 않는다**(§10-A14) — 볼륨이
 * 작은 스쿼드에서 큰 몫을 지면 정상적으로 나오는 값이고, 여기에 경고를 붙이는 순간
 * v3.7 의 파생 가정이 되살아난다.
 */
export function isCapacityIdle(member) {
  if (!member) return false;
  if (isCapacityUnset(member)) return false;
  return (member.sharePct || 0) > 0 && (member.allocationPct || 0) === 0;
}

/**
 * 활성(완료·보관 제외) 스쿼드의 배정 내역 — 캐파 게이지 세그먼트 소스.
 * 캐파가 *어디로* 갔는지 한 칸에서 읽히도록 스쿼드별 색을 함께 싣는다.
 *
 * 🔴 소스는 `allocationPct` **한 축뿐**이다. `sharePct` 는 분모가 달라 여기 섞이면
 * 합산 자체가 성립하지 않는다(§5-3.2).
 */
export function planSegments(squads, userId) {
  return (squads || [])
    .filter((sq) => isCountedStatus(sq.status))
    .map((sq) => {
      const mm = (sq.members || []).find((m) => m.userId === userId);
      // 미설정은 0 으로 더하지 않고 아예 뺀다.
      return { sq, pct: isCapacityUnset(mm) ? 0 : (mm.allocationPct || 0) };
    })
    .filter((x) => x.pct > 0)
    .map((x) => ({ id: x.sq.id, name: x.sq.name, color: x.sq.color, pct: x.pct }));
}

/** 계획 투입% 합계 — 활성 스쿼드만 합산. 분모가 한 사람당 하나(100)라 합산이 성립한다. */
export function plannedTotalPct(squads, userId) {
  return planSegments(squads, userId).reduce((sum, s) => sum + s.pct, 0);
}

/**
 * 활성 스쿼드 중 **캐파가 아직 설정되지 않은** 배정 수 — 「미설정 n곳」 표기용.
 * 합계가 실제보다 낮게 보이는 이유를 화면이 스스로 말하게 하는 값이다(§5-3.7).
 */
export function unsetCapacityCount(squads, userId) {
  return (squads || [])
    .filter((sq) => isCountedStatus(sq.status))
    .filter((sq) => {
      const mm = (sq.members || []).find((m) => m.userId === userId);
      return !!mm && isCapacityUnset(mm);
    }).length;
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

/**
 * 캐파 대비 상태 — 100을 기준으로 남는지/딱 맞는지/넘는지 (§5-3.2).
 * 색은 디자인 토큰으로만 말한다(`ProjectCardGrid` 가 상태색을 `var(--…)` 문자열로
 * 넘기는 것과 같은 방식) — 리터럴 hex 를 박으면 이 탭만 다른 팔레트로 보인다.
 */
export function capacityState(total) {
  if (total > CAPACITY) {
    return {
      key: 'over', label: '초과',
      color: 'var(--text-error-primary)',
      bg: 'var(--utility-error-50)',
      bd: 'var(--utility-error-200)',
    };
  }
  if (total === CAPACITY) {
    return {
      key: 'full', label: '가득',
      color: 'var(--text-brand-tertiary)',
      bg: 'var(--utility-success-50)',
      bd: 'var(--utility-success-200)',
    };
  }
  if (total >= 70) {
    return {
      key: 'fit', label: '적정',
      color: 'var(--text-brand-tertiary)',
      bg: 'var(--utility-success-50)',
      bd: 'var(--utility-success-200)',
    };
  }
  if (total > 0) {
    return {
      key: 'slack', label: '여유',
      color: 'var(--utility-blue-500)',
      bg: 'var(--utility-blue-50)',
      bd: 'var(--utility-blue-200)',
    };
  }
  return {
    key: 'none', label: '미배정',
    color: 'var(--text-tertiary)',
    bg: 'var(--bg-secondary)',
    bd: 'var(--border-secondary)',
  };
}

/**
 * 스쿼드 카드의 두 줄 — **비중 축**(배분)과 **캐파 축**(인력)을 각각 낸다 (§5-3.4).
 *
 * 🔴 **비중은 저장 값을 그대로 쓴다. 캐파값에서 계산하지 않는다.**
 *   · 캐파 사용(매트릭스) = `allocationPct` — 분모는 개인 캐파 100 → "이 사람은 과부하인가"
 *   · 스쿼드 내 비중(여기) = `sharePct`     — 분모는 이 스쿼드의 볼륨 100 → "누가 무게를 지는가"
 *
 * v3.7까지는 비중을 `캐파값 ÷ Σ캐파값` 으로 **파생**시켰다. 그 식은 *"모든 스쿼드의
 * 볼륨이 같다"* 를 몰래 가정하므로 볼륨이 다르면 틀린다(§5-3.1). 반올림 보정(최대잔여법)도
 * 함께 폐기했다 — 정수 입력값이라 잔차 자체가 없다(§10-A8).
 *
 *  · `allotted` = Σ sharePct. **100을 강제하지 않는다** — 미배분(<100)·초과 배분(>100)
 *    모두 실재하는 중간 상태이고, 숨기면 관리자가 배분이 덜 끝난 것을 못 본다.
 *  · `capSum`/`fte` = 캐파 축. **인분(FTE) 환산이 가능한 쪽은 여기뿐이다** — 비중은
 *    볼륨을 모르므로 인분으로 바꿀 수 없다. 그래서 카드에서도 다른 줄에 놓는다.
 *  · 정렬은 **비중 내림차순**(리드를 위로 올리지 않는다 — 비교가 목적이다).
 */
export function squadComposition(members) {
  const list = members || [];
  const allotted = list.reduce((s, m) => s + (m.sharePct || 0), 0);
  const capSum = list.reduce((s, m) => s + (m.allocationPct || 0), 0);

  const rows = list
    .map((m) => ({
      userId: m.userId,
      role: m.role,
      share: m.sharePct || 0, // 스쿼드 100 기준 — 저장 값 그대로
      pct: m.allocationPct || 0, // 개인 캐파 100 기준 — 다른 축
      capacityUnset: isCapacityUnset(m),
      // 판정은 여기 한 곳에서만 한다 — 셀·칩·범례가 각자 다시 계산하면 갈라진다.
      capacityIdle: isCapacityIdle(m),
    }))
    .sort((a, b) => b.share - a.share || b.pct - a.pct);

  return { allotted, capSum, fte: Math.round(capSum / 10) / 10, rows };
}

/**
 * 특정 멤버의 스쿼드 내 비중 (툴팁 등 단건 조회용) — **저장 값을 그대로 읽는다.**
 * 계산 경로가 없으므로 범례·툴팁·셀이 어긋날 자리도 없다(구 최대잔여법이 만들던
 * "범례 37% · 툴팁 36%" 불일치는 파생과 함께 사라졌다).
 */
export function sqShare(members, userId) {
  return (members || []).find((m) => m.userId === userId)?.sharePct || 0;
}

/** 스쿼드의 ⭐리드 배정 (없으면 null). */
export function leadOf(squad) {
  return (squad?.members || []).find((m) => m.role === 'lead') || null;
}

/**
 * ── 팝오버 오버플로 규격 (§5-3.8, v3.11 · PW-109) ────────────────────────────
 *
 * **팝오버 높이를 상수로 가정하지 않는다.** 배정 편집 팝오버는 슬라이더 2개·미리보기
 * 2개·구분 캡션에 더해 출처 안내(`미설정` / `관리자 조정` / `완료 스쿼드 제외`)가
 * 조건부로 붙어 **높이가 상태에 따라 변한다**. 종전 코드는 내용 높이를 `340px` 로
 * 가정하고 `top` 만 클램프했는데, v3.8·v3.10 을 거치며 실제 높이가 그 값을 넘어섰다.
 * 컨테이너는 `overflow: hidden` 이고 배경 스크롤도 잠겨 있어, 뷰포트 하단 행에서는
 * ② 캐파 슬라이더와 액션 행에 **도달할 방법이 아예 없었다** — 편집을 시작할 수는
 * 있는데 끝낼 수가 없는 상태였다.
 */
export const POP_W = 272; // 팝오버 폭
export const POP_GUTTER = 8; // 뷰포트 가장자리 최소 여백
export const POP_ANCHOR_GAP = 10; // 위로 뒤집을 때 클릭 지점과 띄우는 간격
export const POP_MIN_H = 240; // 이 높이도 안 나오는 쪽에는 붙이지 않는다 (뒤집기 기준)

/**
 * 배정 편집 팝오버의 **세로 배치**를 고른다 (§5-3.8).
 *
 * | # | 조건 | 배치 |
 * |---|---|---|
 * | 1 | 클릭 지점 아래 공간 ≥ `POP_MIN_H` | 기본 — 아래에 붙이고 `maxHeight = 아래 공간` |
 * | 2 | 아래는 모자라고 위가 더 큼 | 위로 뒤집는다 — 하단을 클릭 지점에 붙인다 |
 * | 3 | 위·아래 모두 최소 높이 미만 | 앵커를 포기하고 뷰포트에 맞춘다 |
 *
 * 🔴 어느 배치든 `maxHeight` 를 **반드시 함께** 돌려준다. 위치만 옮기고 높이를 열어
 * 두면 같은 버그가 다른 좌표에서 재발한다. 넘치는 만큼은 본문만 스크롤한다.
 */
export function assignPopoverVertical(anchorY, viewportH) {
  const spaceBelow = viewportH - anchorY - POP_GUTTER;
  const spaceAbove = anchorY - POP_ANCHOR_GAP - POP_GUTTER;
  if (Math.max(spaceBelow, spaceAbove) < POP_MIN_H) {
    // 초단신 뷰포트 — 앵커를 포기한다. 앵커에 붙이는 것보다 조작 가능한 것이 먼저다.
    return { top: POP_GUTTER, maxHeight: Math.max(0, viewportH - POP_GUTTER * 2) };
  }
  if (spaceBelow >= POP_MIN_H) return { top: anchorY, maxHeight: spaceBelow };
  return { bottom: viewportH - anchorY + POP_ANCHOR_GAP, maxHeight: spaceAbove };
}

/** 상태 이력 팝오버 목록의 최대 높이 — append-only 감사 로그라 행이 쌓이기만 한다(§5-3.8). */
export const HIST_LIST_MAX_H = 220;
