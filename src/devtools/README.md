# 상태 스위처 (데모 페이지 전용)

데모 페이지 아홉 장(`src/*Page.jsx`)이 캔버스에 넘기는 **상태 prop 을 소스 수정 없이**
바꾼다. 화면 오른쪽 아래 알약 버튼(**상태**)을 누르면 열린다.

지금까지는 상태가 한 값에 못 박혀 있어서, 예를 들어 `MySettingsCanvas` 의 저장 실패
화면을 보려면 `SettingsPage.jsx` 를 직접 고쳐야 했다.

## 무엇을 돌릴 수 있나

| knob | 값 | 무엇이 바뀌나 |
|---|---|---|
| **항목 수** | 기본 / 0개 / 1개 / 아주 많음 | 목록·카드·멤버 수. 빈 상태와 과밀 상태 |
| **라벨** | 기본 / 긴 CJK / 영문 / 미해석 코드값 | 배지·칩·이름처럼 칸이 고정된 자리의 문자열 길이 |
| **비동기** | 기본 / 로딩·저장 중 / 실패 | 저장·생성 상태를 그 자리에 붙잡아 둔다 |
| **모달** | 닫힘 / (페이지별 목록) | 클릭 경로를 타지 않고 모달·팝오버를 바로 연다 |

페이지마다 있는 knob 이 다르다. 패널 맨 아래 한 줄에 그 페이지에서 무엇이 바뀌는지 적혀 있다.

**라벨 knob 의 세 값은 실제 사고에서 나왔다.**
`긴 CJK` = 관리자가 등급·팀 이름을 길게 정의한 경우, `영문` = 로케일 전환
(`탁월` 2자 ↔ `Exceeds Expectations` 19자), `미해석 코드값` = 라벨 해석이 끊겨
원본 enum 키(`exceeds`, `in_progress`)가 그대로 노출된 경우.

## 규칙

- **기본값 = 지금까지의 화면.** 스위처를 건드리지 않으면 렌더 결과가 한 글자도 안 달라진다
  (데모 페이지 5장에서 `.app` 의 innerHTML 길이가 도입 전과 동일함을 확인).
- **레이아웃을 밀지 않는다.** `document.body` 로 포털된 `position: fixed` 오버레이라
  캔버스는 문서 흐름 그대로다 — Figma 좌표 기준 시안 정합 작업에 영향이 없다.
- **접어 놔도 티가 난다.** knob 이 하나라도 기본값이 아니면 알약에 개수 배지가 붙는다.
  접어 둔 채로 깨진 화면을 보고 "원래 이렇다" 고 오해하지 않도록.
- **깨진 화면은 링크로 공유된다.** 선택한 값이 URL 쿼리(`?knobs=labels:raw`)에 실린다.

## 깨짐을 찾는 법

브라우저 콘솔에서 — jsdom 유닛 테스트는 레이아웃을 계산하지 않아 오버플로를 못 잡는다.

```js
[...document.querySelectorAll('body *')]
  .filter((el) => {
    if (el.closest('.pv-dev-panel, .pv-dev-pill')) return false;
    const cs = getComputedStyle(el);
    const clipX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
    const clipY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
    return (clipX && el.scrollWidth > el.clientWidth + 2)
        || (clipY && el.scrollHeight > el.clientHeight + 2);
  })
  .map((el) => [el.className, el.scrollWidth + '>' + el.clientWidth, el.innerText.slice(0, 20)]);
```

**기본값에서도 잡히는 항목은 빼고 본다** — 의도된 말줄임(`text-overflow: ellipsis`)이나
드래그로 미는 캔버스(조직도·OKR)가 여기 걸린다. knob 을 돌렸을 때만 새로 나타나는
항목이 진짜다.

## 파일

| 파일 | 역할 |
|---|---|
| `StateSwitcher.jsx` | 패널 UI. 페이지가 knob 목록·현재 값·onChange 를 넘긴다 |
| `knobs.js` | 공용 knob 정의(`VOLUME_KNOB`·`LABEL_KNOB`·`ASYNC_KNOB`·`modalKnob`), URL 동기화 훅, `resize()`, `knobKey()` |
| `stress.js` | 라벨 길이 변환. 자유 입력 문자열에는 `stressText`(코드값 폴백 제외) |
| `devtoolsIcons.jsx` | 인라인 SVG 아이콘 |
| `devtools.css` | 패널 스타일 |

이 폴더는 **데모 하네스 전용**이라 npm 패키지(`package.json` 의 `exports`)에 실리지
않는다. publish 워크플로가 보는 경로(`src/components/**`·`src/*.css`·`src/menu.js`)
밖이므로, 여기만 고친 변경은 패키지를 새로 배포하지 않는다.

## 페이지에 붙이는 법

```jsx
const KNOBS = [VOLUME_KNOB, LABEL_KNOB];

export default function FooPage() {
  const { values: knobs, set: setKnob, reset: resetKnobs } = useKnobs(KNOBS);
  const rows = resize(FIXTURE, knobs.volume, { count: 30, clone: (r, i) => ({ ...r, id: `${r.id}-x${i}` }) });

  return (
    <>
      {/* 픽스처를 마운트 시점에 state 로 스냅샷하는 캔버스가 있어 key 로 리마운트한다 */}
      <FooCanvas key={knobKey(knobs)} rows={rows} />
      <StateSwitcher spec={KNOBS} values={knobs} onChange={setKnob} onReset={resetKnobs}
        note="이 페이지에서 무엇이 바뀌는지 한 줄" />
    </>
  );
}
```

**기본값에서 원본 참조를 그대로 돌려주는 것**이 중요하다. 매 렌더마다 새 배열을 만들면,
`initialGroups` 처럼 참조로 동기화하는 캔버스가 사용자 편집을 덮어쓴다.
`resize()`·`stressList()` 는 기본값에서 입력을 그대로 반환한다.
