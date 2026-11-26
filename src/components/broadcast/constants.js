/**
 * 공지 바의 종류 — 어드민이 서비스 전체에 띄우는 브로드캐스트 (Figma 17816:26924 · 17816:26435).
 *
 *   notice  — 일반 공지. 파랑(blue-400 → blue-500) 그라데이션 (17816:27174)
 *   warning — 경고·장애. 분홍 → 주황 그라데이션 (17816:26907)
 *   error   — 결제 잠금처럼 «지금 막혔다». 옅은 빨강 바탕 + 빨간 글 (pivit-work PW-3260 · screen-billing-entitlement `.strip.err`)
 *   caution — 결제 실패 유예처럼 «곧 막힌다». 옅은 주황 바탕 + 주황 글 (`.strip.warn`)
 *   neutral — 요금제를 못 불러온 것처럼 «알아 두라». 회색 바탕 + 보조 글색 (`.strip.info`)
 */
export const BROADCAST_KINDS = ['notice', 'warning', 'error', 'caution', 'neutral'];

/** 공지 바 한 줄의 높이 — 위아래 6 + 닫기 버튼 36. 호스트가 셸(사이드바·머리 줄)을 이만큼 내린다. */
export const BROADCAST_BAR_HEIGHT = 48;
