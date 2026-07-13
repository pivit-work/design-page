# OKR 대시보드 페이지 설계

날짜: 2026-07-13
Figma: PDS-V1.0 — 대시보드 `17103:18244`, 상세 모달 `17329:17489`

## 목표

사이드바 OKR 메뉴(현재 비활성)를 활성화하고, 첫 번째 탭인 **대시보드**를 구현한다.
조직도와 동일한 pan/zoom 캔버스 UI 위에 Company OKR → 팀 → 구성원 트리를 그리고,
각 블록(그룹 카드) 클릭 시 분기별 Objective/KR 상세 모달을 띄운다.

탭은 총 5개(대시보드·전사 OKR·팀 OKR·개인 OKR·내 리소스)로 구조를 잡되,
이번 작업에서는 대시보드만 실제 콘텐츠를 구현한다. 나머지 탭은 이후 시안이
나오면 탭별로 추가한다(빈 캔버스 placeholder).

## 아키텍처

Page wrapper 패턴 준수: `src/OkrPage.jsx`가 데모 데이터·탭 상태·모달 상태를
소유하고 순수 컴포넌트에 props로 내린다. 컴포넌트 내부 fallback 금지.

```
src/OkrPage.jsx                  wrapper: 데모 데이터 + 탭/모달 상태
src/okr.css                      페이지 전용 스타일 (토큰 변수만 사용)
src/components/shared/usePanZoom.js   pan/zoom 공용 훅 (OrgChartCanvas 에서 추출)
src/components/okr/
  index.js                       barrel export
  OkrTabNav.jsx                  5개 탭 헤더 + 연도∙분기 서브타이틀
  OkrToolbar.jsx                 연도/분기 드롭다운 버튼 + 우측 정렬 버튼 (데모: 정적)
  OkrDashboardCanvas.jsx         pan/zoom 캔버스 (드래그 힌트 + 줌 컨트롤)
  OkrGroupCard.jsx               Company/팀 요약 카드 (클릭 → 모달)
  ObjectiveRow.jsx               Q# 뱃지 + 목표 제목 + 진행바 + %
  OkrProgressBar.jsx             진행바 (success/error/blue/warning/brand variant)
  OkrMemberChip.jsx              아바타 + 이름 칩
  OkrConnectors.jsx              노드 연결선 (DOM 측정 SVG, BezierConnectors 방식)
  OkrDetailModal.jsx             상세 모달 (AI 위험 신호 + 분기별 KR 테이블)
```

## 주요 결정

- **usePanZoom 훅 추출**: `OrgChartCanvas`의 휠 줌·드래그 패닝·중심 기준 줌 버튼
  로직을 `shared/usePanZoom.js`로 추출, 조직도와 OKR 캔버스가 공유한다.
  `ignoreSelector` 옵션으로 팬 시작을 무시할 요소를 지정한다.
  조직도의 `resetView`는 포지션 리셋을 함께 수행하므로 훅의 reset 뒤에
  caller 가 이어서 호출한다.
- **연결선**: 절대좌표 벡터 대신 `BezierConnectors`처럼 rAF 루프에서 DOM을
  측정해 SVG path를 그린다. 루트 그룹 하단 → 각 팀 카드 상단 베지어,
  팀 objective 목록 하단 → 구성원 칩 상단 수직선. 파란 점선
  (`--utility-blue-300`).
- **탭 동작**: `OkrPage`가 activeTab 소유. 대시보드 외 탭은 빈 캔버스.
- **모달 데이터**: 그룹 id → 상세 데이터 맵. 클릭한 블록(그룹 카드·objective
  행·구성원이 속한 그룹)의 상세를 연다. ESC/오버레이/X 닫기.
- **라우팅**: `routing.js` PAGE_SLUGS 와 App `DEMO_PAGES`에 `okr` 추가.
- **토큰**: 전부 기존 토큰으로 매핑. `index.css`에 부족한 alias만 추가
  (blue-200/300/400, success-400/500, error-400, warning-400, fg-tertiary,
  fg-primary, fg-brand-primary, bg-tertiary, bg-overlay, border-secondary,
  alpha-black-3). 하드코딩 없음.

## 데이터 모델 (demo, wrapper 소유)

```js
OKR_TREE = {
  id, type: 'company', name, subtitle, quarter, progress, progressVariant,
  summary, objectives: [{ q, badge: 'gray'|'blue', title, progress }],
  teams: [{ id, name, lead, progress, progressVariant, summary,
            objectives: [...], members?: [{ name, avatar }] }],
}
OKR_DETAILS = {
  [groupId]: { title, aiSignals: [string],
    quarters: [{ q, title, progressLabel, weight,
      krs: [{ id, title, percent, variant, valueLabel, weight }] }] }
}
```

## 검증

- `npm run dev` → OKR 메뉴 클릭 → 콘솔 에러 0건
- pan/zoom/리셋 동작, 블록 클릭 → 모달 열림/닫힘
- 조직도 페이지 회귀 확인 (훅 추출 후 동일 동작)
- `npm run build` 통과
