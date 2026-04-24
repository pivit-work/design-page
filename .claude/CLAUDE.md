# Design Page - Project Instructions

## 이 프로젝트가 하는 일

design-page는 **디자인 시안을 React 컴포넌트로 구현한 쇼케이스**이다.
여기서 만든 컴포넌트를 pivit-work(실제 프로덕트)에서 npm 패키지로 import해서 사용한다.
따라서 이 프로젝트의 컴포넌트는 **pivit-work의 UI 원본(Single Source of Truth)**이다.

## 🔴 필수 규칙: 컴포넌트 구조 유지

컴포넌트는 `src/components/` 아래에 분리되어 있다. **절대 하나의 파일로 합치지 마라.**

```
src/
  components/
    shared/Icon.jsx           ← 공용 SVG 아이콘
    layout/Sidebar.jsx        ← 사이드바
    layout/TopNav.jsx         ← 상단 네비
    orgchart/...              ← 조직도 컴포넌트 (props 만 받음, fallback 금지)
    timeline/...              ← 타임라인 컴포넌트
    meetings/...              ← 회의록 컴포넌트
    oneonone/...              ← 1on1 컴포넌트
    index.js                  ← 전체 re-export (패키지 진입점)
  App.jsx                     ← 얇은 라우터 (Sidebar/TopNav + currentPage 분기만)
  OrgChartPage.jsx            ← 조직도 page wrapper (demo 데이터 + 조합)
  TimelinePage.jsx            ← 타임라인 page wrapper
  MeetingsPage.jsx            ← 회의록 page wrapper
  OneOnOnePage.jsx            ← 1on1 page wrapper
  timeline-demo-data.js       ← Timeline 데모 데이터 (페이지 wrapper 가 import)
  App.css                     ← 앱 전역 스타일 (레이아웃/Sidebar/TopNav)
  org_chart.css               ← 조직도 페이지 전용 스타일
  one_on_one.css              ← 1on1 페이지 전용 스타일
```

### 새 컴포넌트 추가 시
- `src/components/` 아래 적절한 디렉토리에 파일 생성
- 데이터는 **props로 받도록** 설계 (하드코딩 금지)
- `components/index.js`에서 export 추가
- 데모 데이터는 **page wrapper** 에 작성 (아래 규칙 참조)

### 기존 컴포넌트 수정 시
- 해당 컴포넌트 파일만 수정
- CSS 클래스명 변경 시 해당 페이지 CSS(`org_chart.css`, `one_on_one.css` 등) 또는 앱 전역 CSS(`App.css`)도 함께 수정
- `App.jsx`(thin router)는 라우팅만 담당, 데이터/UI 로직은 넣지 않기

## 🔴 필수 규칙: Page wrapper 패턴

**모든 페이지는 `src/<Foo>Page.jsx` wrapper 로 구성한다.** `App.jsx` 는
thin router 이며, wrapper 가 데모 데이터와 라벨·모달 상태 등을 소유하고
순수 컴포넌트(`<FooCanvas>`) 에 props 로 내린다.

pivit-work(실 프로덕트) 는 이 wrapper 를 import 하지 않고, 자신의 Page
컴포넌트에서 동일한 `<FooCanvas>` 를 실 데이터로 렌더한다.

### 페이지 wrapper 목록

| 페이지 | wrapper | 순수 컴포넌트 |
|---|---|---|
| 조직도 | `src/OrgChartPage.jsx` | `OrgChartCanvas`, `ProjectCanvas` |
| 타임라인 | `src/TimelinePage.jsx` | `TimelineCanvas` |
| 회의록 | `src/MeetingsPage.jsx` | `MeetingsCanvas`, `MeetingInProgressModal` |
| 1on1 | `src/OneOnOnePage.jsx` | `OneOnOneDashboardCanvas` |

### ❌ 절대 하지 않는 것

**컴포넌트 내부에 demo fallback 을 넣지 마라.** 과거 `TimelineDataProvider`
에 `members ?? DEFAULT_MEMBERS` fallback 이 있어서 데이터를 안 넘겨도
동작했는데, 이후 같은 패턴을 따르지 않은 `MeetingsCanvas` 는 크래시했고
버그를 숨기는 원인이 됐다. 모든 컴포넌트는 **props 가 유일한 입력** 이다.

```jsx
// ❌ 나쁨 — 컴포넌트 안에서 demo 데이터로 fallback
export function TimelineDataProvider({ members, ...}) {
  const value = { members: members ?? DEFAULT_MEMBERS }; // ← 금지
  ...
}

// ❌ 나쁨 — 컴포넌트가 demo constants 를 직접 import
import { MEMBERS } from './constants.js';
export default function EventAddModal() {
  return <div>{MEMBERS.map(...)}</div>; // ← 금지
}
```

```jsx
// ✅ 좋음 — wrapper 가 데모 데이터 소유, 컴포넌트는 props 로만
// src/TimelinePage.jsx
import { MEMBERS, MEETINGS, ... } from './timeline-demo-data.js';
export default function TimelinePage({ icons, baseUrl }) {
  return <TimelineCanvas icons={icons} baseUrl={baseUrl} members={MEMBERS} ... />;
}

// ✅ 좋음 — 컴포넌트는 context/props 로 받아 씀
import useTimelineData from './useTimelineData.js';
export default function EventAddModal() {
  const { members } = useTimelineData();
  return <div>{members.map(...)}</div>;
}
```

### 새 페이지 추가 체크리스트

1. `src/components/<feature>/` 아래에 순수 컴포넌트 작성 (props 만 받음, 내부 fallback/demo import 금지)
2. `src/<Feature>Page.jsx` wrapper 작성: demo 데이터 + 라벨 + 모달 상태 소유
3. (데모 데이터가 크면) `src/<feature>-demo-data.js` 로 분리 — 현재는 Timeline 만 적용
4. `src/App.jsx` 에 `currentPage === 'xxx' && <FeaturePage ... />` 분기 한 줄 추가
5. 로컬에서 `npm run dev` → 해당 메뉴 클릭 → 콘솔 에러 0건 확인
6. `npm run build` 통과 확인

## 🔴 필수 규칙: design-system 토큰 사용

CSS에서 색상, 간격, 폰트 등의 값을 지정할 때 **하드코딩하지 말고 토큰 변수를 사용**한다.

### 토큰 체계

```
design-system/tokens.json → build → tokens.css (자동 생성)
                                        ↓
                                   index.css에서 alias로 매핑
                                        ↓
                                   App.css / org_chart.css / one_on_one.css 에서 사용
```

### index.css의 alias 매핑 (짧은 이름 → 토큰)

| 사용하는 변수 | 연결된 토큰 |
|---|---|
| `--bg-primary` | `--colors-background-bgPrimary` |
| `--bg-secondary` | `--colors-background-bgSecondary` |
| `--bg-active` | `--colors-background-bgActive` |
| `--bg-brand-solid` | `--colors-background-bgBrandSolid` |
| `--text-primary` | `--colors-text-textPrimary` |
| `--text-secondary` | `--colors-text-textSecondary` |
| `--text-tertiary` | `--colors-text-textTertiary` |
| `--text-quaternary` | `--colors-text-textQuaternary` |
| `--text-brand-secondary` | `--colors-text-textBrandSecondary` |
| `--text-brand-tertiary` | `--colors-text-textBrandTertiary` |
| `--text-white` | `--colors-text-textWhite` |
| `--border-primary` | `--colors-border-borderPrimary` |
| `--border-secondary-alt` | `--colors-border-borderSecondaryAlt` |
| `--utility-brand-50` | `--componentColors-utility-brand-utilityBrand50` |
| `--utility-blue-50` | `--componentColors-utility-blue-utilityBlue50` |
| `--utility-blue-500` | `--componentColors-utility-blue-utilityBlue500` |
| `--utility-blue-600` | `--componentColors-utility-blue-utilityBlue600` |
| `--utility-pink-50` | `--componentColors-utility-pink-utilityPink50` |
| `--utility-purple-50` | `--componentColors-utility-purple-utilityPurple50` |

### 올바른 예

```css
/* ✅ 좋음 — 토큰 변수 사용 */
.dept-card { background: var(--utility-brand-50); }
.member-name { color: var(--text-primary); }
.dept-card { border-radius: var(--radius-lg); }

/* ❌ 나쁨 — 하드코딩 */
.dept-card { background: #f1fffa; }
.member-name { color: #181d27; }
.dept-card { border-radius: 12px; }
```

### 새 토큰 변수가 필요할 때

1. 먼저 `tokens.css`에서 해당 값이 있는지 검색
2. 있으면 `index.css`에 alias 추가: `--my-alias: var(--colors-xxx-xxx);`
3. `App.css` (전역) 또는 해당 페이지 CSS(`org_chart.css`/`one_on_one.css`)에서 `var(--my-alias)` 사용
4. `tokens.css`에 없는 값이면 하드코딩해도 되지만, 주석으로 표시: `/* TODO: token 없음 */`

## 🔴 필수 규칙: CSS 클래스명 규칙

- 클래스명은 **prefix 없이** 직관적으로: `.dept-card`, `.member-node`, `.org-node`
- BEM이나 CSS Modules 사용하지 않음
- 새 페이지 추가 시 기존 네이밍 패턴 따르기
- 앱 전역 스타일(Sidebar/TopNav/레이아웃)은 `App.css`, 페이지별 스타일은 페이지 CSS 파일(`org_chart.css`, `one_on_one.css` 등)에 분리

## 프로젝트 실행

```bash
npm install
npm run dev     # 개발 서버 (http://localhost:5173)
npm run build   # 프로덕션 빌드 (dist/)
```

## 관련 프로젝트

| 프로젝트 | 경로 | 역할 |
|---|---|---|
| design-system | `../design-system` | 토큰 정의 (Figma → tokens.json → tokens.css) |
| design-page | 현재 프로젝트 | 디자인 시안 컴포넌트화 |
| pivit-work | `../pivit-work` | 실제 프로덕트 (이 프로젝트의 컴포넌트를 import) |
