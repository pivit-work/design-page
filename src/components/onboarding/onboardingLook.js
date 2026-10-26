import { createContext, useContext } from 'react';

/**
 * 디자이너 로그인 틀 안에서 그리는 중인가 (pivit-work PW-1815 · PW-2243).
 *
 * 디자이너(stesslee)가 2026-10-27 에 회원가입 단계를 로그인 틀(`components/login/`)로 다시 그렸다. 앱의 단계 화면은
 * 이 폴더의 온보딩 부품(기획 시안에서 개발이 옮긴 것)으로 짜여 있어서, 틀(`OnboardingLoginFrame`·`OnboardingLoginCenter`)
 * 이 이 값을 깔면 부품이 같은 뜻의 디자이너 회원가입 부품 클래스(login.css)로 그린다 — 값을 새로 칠하지 않는다.
 * 값이 없으면(틀 밖 — 베타 신청서·신청 현황 창 등) 예전 모양 그대로다.
 *
 * 값: { baseUrl, claimHeading(id, withSubtitle) → release | null, titleEl, subtitleEl }
 */
export const OnbLoginLookContext = createContext(null);

export function useOnbLoginLook() {
  return useContext(OnbLoginLookContext);
}
