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
    orgchart/DeptCard.jsx     ← 부서 카드
    orgchart/MemberCard.jsx   ← 멤버 카드
    orgchart/OrgNode.jsx      ← 재귀 트리 노드
    orgchart/BezierConnectors.jsx ← SVG 연결선
    orgchart/ProfileModal.jsx ← 프로필 모달
    orgchart/OrgChartCanvas.jsx ← 캔버스 (줌/팬/토글)
    orgchart/constants.js     ← 색상/상태 상수
    orgchart/contexts.js      ← React Context
    orgchart/hooks.js         ← useDrag, usePositions
    orgchart/index.js         ← re-export
    index.js                  ← 전체 re-export (패키지 진입점)
  org_chart.jsx               ← 데모 데이터 + 컴포넌트 조합 (thin wrapper)
  org_chart.css               ← 전체 스타일
```

### 새 컴포넌트 추가 시
- `src/components/` 아래 적절한 디렉토리에 파일 생성
- 데이터는 **props로 받도록** 설계 (하드코딩 금지)
- `components/index.js`에서 export 추가
- 데모 데이터는 `org_chart.jsx` 또는 해당 페이지 파일에 작성

### 기존 컴포넌트 수정 시
- 해당 컴포넌트 파일만 수정
- CSS 클래스명 변경 시 `org_chart.css`도 함께 수정
- `org_chart.jsx`(demo wrapper)는 데이터/조합만 담당, UI 로직은 넣지 않기

## 🔴 필수 규칙: design-system 토큰 사용

CSS에서 색상, 간격, 폰트 등의 값을 지정할 때 **하드코딩하지 말고 토큰 변수를 사용**한다.

### 토큰 체계

```
design-system/tokens.json → build → tokens.css (자동 생성)
                                        ↓
                                   index.css에서 alias로 매핑
                                        ↓
                                   org_chart.css에서 사용
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
3. `org_chart.css`에서 `var(--my-alias)` 사용
4. `tokens.css`에 없는 값이면 하드코딩해도 되지만, 주석으로 표시: `/* TODO: token 없음 */`

## 🔴 필수 규칙: CSS 클래스명 규칙

- 클래스명은 **prefix 없이** 직관적으로: `.dept-card`, `.member-node`, `.org-node`
- BEM이나 CSS Modules 사용하지 않음
- 새 페이지 추가 시 기존 네이밍 패턴 따르기
- 모든 스타일은 `org_chart.css` 한 파일에 (페이지가 늘면 페이지별 CSS 분리 가능)

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
