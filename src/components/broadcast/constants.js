/**
 * 공지 바의 종류 — 어드민이 서비스 전체에 띄우는 브로드캐스트 (Figma 17816:26924 · 17816:26435).
 *
 *   notice  — 일반 공지. 보라 → 초록 그라데이션 (17816:27174)
 *   warning — 경고·장애. 분홍 → 주황 그라데이션 (17816:26907)
 */
export const BROADCAST_KINDS = ['notice', 'warning'];

/** 공지 바 한 줄의 높이 — 위아래 6 + 닫기 버튼 36. 호스트가 셸(사이드바·머리 줄)을 이만큼 내린다. */
export const BROADCAST_BAR_HEIGHT = 48;
