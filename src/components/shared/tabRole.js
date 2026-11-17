import { isEnterKey } from './enterKey.js';

/**
 * 글자만 칠한 `<span>` 탭(OKR·조직도 위쪽 큰 제목 탭, 매니저 대시보드 탭)에 «탭» 표시를 단다.
 *
 * 왜 span 그대로인가: `<button>` 으로 바꾸면 브라우저 기본 버튼 테두리·글꼴·여백이 끼어 디자이너 모양이 바뀐다.
 * 그래서 태그는 두고 화면 읽기·키보드·E2E(`getByRole('tab')`)가 알아보는 표시와 Enter·Space 만 더한다.
 * 고른 탭도 포커스는 받는다(공용 Tabs 의 버튼처럼 모든 탭이 Tab 키 순서에 든다).
 *
 * @param {boolean} selected  지금 고른 탭인가
 * @param {() => void} [onActivate]  눌렀을 때 — 없으면 클릭·키 처리를 달지 않는다
 */
export function spanTabProps(selected, onActivate) {
  return {
    role: 'tab',
    'aria-selected': selected,
    tabIndex: 0,
    ...(onActivate
      ? {
          onClick: onActivate,
          onKeyDown: (e) => {
            if (!isEnterKey(e) && e.key !== ' ') return;
            e.preventDefault();
            onActivate();
          },
        }
      : {}),
  };
}
