/**
 * 화면별 본문 폭 — 기획서 billing-app.jsx 값(구독 현황 880 · 플랜 1080 · 결제수단 640). 기획서가 폭을 안 적은 화면은
 * 시안 값(청구 내역 960 · 청구 정보 · 영업 문의 680 · 결제하기 640). 시작점은 모두 왼쪽 — 탭을 넘겨도 제목이 좌우로 뛰지 않는다.
 */
export const BILLING_PAGE_WIDTH = {
  overview: 880,
  plans: 1080,
  checkout: 640,
  methods: 640,
  history: 960,
  settings: 680,
  contact: 680,
};
