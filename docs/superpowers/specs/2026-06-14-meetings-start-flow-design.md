# 회의록 Sub-flow A: 회의 시작 → 진행 중 — 설계

작성일: 2026-06-14
Figma: `PDS-V1.0` (file `TFJKOfs4npim6uGvoDrUeN`), 회의록 flow `node 16920-36389`

## 배경

design-page는 디자인 시안을 React 컴포넌트로 구현하는 쇼케이스이며, 여기 컴포넌트가
pivit-work의 UI 원본(Single Source of Truth)이다. 회의록 전체 flow를 Figma 디자인에
맞춰 구현하되, 분량이 커서 3개 하위 flow로 나눠 단계별로 진행한다.

| 하위 flow | 포함 | 상태 |
|---|---|---|
| **A. 회의 시작 → 진행 중** | 기록 방식 선택 → 마이크 선택/권한 → 회의 진행 중(개편) | 본 문서 |
| B. 종료 → 회의록 생성·검토 | 회의 종료 → 생성 중 → AI 회의록(회의록/스크립트 탭) | 다음 |
| C. 화자 분리 + 공유 정합성 | 화자 분리 팝오버 + 공유 모달 Figma 대조 | 마지막 |

본 문서는 **Sub-flow A** 만 다룬다. B, C 는 각각 별도 spec → plan → 구현 사이클로 진행한다.

## 목표 흐름

```
[회의 목록] 진행 중 회의 "시작" 클릭
   └→ 기록 방식 선택 모달
        ├─ "직접 녹음"  → 마이크 선택 모달 ─(권한 허용)→ 회의 진행 중
        └─ "메모만 작성" ──────────────────────────────→ 회의 진행 중(메모 전용)
```

진입점은 기존 `MeetingsCanvas` 의 `onStartMeeting(meeting)` 콜백. 현재는 곧장
`MeetingInProgressModal` 을 열지만, 그 사이에 기록 방식 선택 / 마이크 선택 단계를 넣는다.

## 아키텍처 — 재사용 오케스트레이터 (접근 1, 승인됨)

`MeetingStartFlow` 컴포넌트가 step 상태 머신(`method → mic → progress`)을 내부 소유하고
아래 순수 모달을 단계별로 렌더한다. 래퍼(`MeetingsPage`)와 pivit-work 의 페이지는
`MeetingStartFlow` 하나만 가져다 쓴다.

### 컴포넌트 (모두 `src/components/meetings/`)

| 컴포넌트 | 역할 | 입력(props) |
|---|---|---|
| `MeetingStartFlow.jsx` | step 시퀀싱 오케스트레이터 (신규) | `meeting`, `baseUrl`, `labels`, `participants`, `micDevices`, `recordData`, `shareData`, `onClose`, `onEnd`, 진행 모달 props 일체 |
| `RecordMethodModal.jsx` | 기록 방식 선택 (신규) | `meeting`, `participants`, `labels`, `onSelect(method)`, `onClose` |
| `MicSelectModal.jsx` | 마이크 선택/권한 (신규) | `devices`, `selectedDevice`, `status`('initial'\|'granted'\|'failed'), `volume`, `labels`, `onRequestPermission`, `onSelectDevice`, `onStart`, `onBack`, `onClose` |
| `MeetingInProgressModal.jsx` | 회의 진행 중 (Figma 신규 디자인으로 개편) | 기존 + `recorderName`, `recording`(bool), `memoOnly`(bool) |

- 모든 순수 컴포넌트는 **props 만** 입력으로 받는다. 내부 demo fallback / demo constants import 금지.
- 단계 시퀀싱·mock 마이크 상태 전환은 `MeetingStartFlow` 내부 state 로 처리.

### 오케스트레이터 step 머신

```
state: step ∈ {'method','mic','progress'}, method ∈ {null,'record','memo'},
       micStatus ∈ {'initial','granted','failed'}, micVolume:number

method 선택 'record' → step='mic', micStatus='initial', micVolume=0
method 선택 'memo'   → step='progress' (memoOnly=true)
mic onRequestPermission (mock) → micStatus='granted', micVolume=50
mic onStart → step='progress' (memoOnly=false, recording=true)
mic onBack  → step='method'
```

- 마이크는 **시각 상태만**: `onRequestPermission` 은 getUserMedia 미연동, mock 으로 granted 전환.
- `failed` 상태는 showcase 용으로 노출(예: `MeetingStartFlow` 의 `micDemoFail` prop 또는 데모 토글). 자동 경로로는 진입하지 않음.

## 화면 사양 (Figma 대조)

### 1. 기록 방식 선택 — `RecordMethodModal` (node 16920-36771)
- 중앙 정렬 흰 카드 모달. 헤더: 타이틀 "기록 방식 선택" + X 닫기.
- 서브타이틀: `{회의명} · {시작시각} 시작` (예: "스프린트 리뷰 · 10:00 시작").
- 참석자 pill 행 (David Kurt Ernest SH John).
- 2열 선택 카드:
  - **직접 녹음** (마이크 아이콘) — "이 디바이스 마이크로 녹음. 회의 참여한 인원의 녹음도 동작합니다." → `onSelect('record')`
  - **메모만 작성** (문서 아이콘) — "녹음 없이 주최자가 직접 기록합니다." → `onSelect('memo')`
- 하단 안내문: "발제(회의 주최자) 만 녹음을 시작·정지할 수 있습니다. 비주최자는 본 화면을 보지 않고 곧장 회의방으로 입장합니다."

### 2. 마이크 선택 — `MicSelectModal` (node 16920-36805 / 36849 / 36985)
- 중앙 정렬 흰 카드 모달. 헤더: "← 뒤로가기" + 타이틀 "마이크 선택" + X 닫기.
- 서브타이틀: "어떤 마이크로 녹음할지 골라주세요."
- "마이크" 라벨 + 드롭다운 (예: "MacBook Pro 내장마이크").
- "입력 음량" 라벨 + `{volume}%` + 진행 바 (volume>0 일 때 파란 채움).
- 상태별 하단:
  - `initial` (volume 0%): 풀폭 버튼 "최초 이 버튼을 눌러 브라우저 마이크 권한 허용해주세요" → `onRequestPermission`. 안내문: "브라우저 마이크 사용 권한 허용하지 않으면 회의록 녹음 기능을 사용하실 수 없습니다."
  - `granted` (volume 50%): 중앙 텍스트 "마이크 권한 허용 됨." + 빨강 풀폭 버튼 "회의 시작하기" → `onStart`.
  - `failed`: 빨강 경고 박스 "⚠ 브라우저 마이크 권한 허용이 실패했습니다. 다시 시도해 주세요." + 안내문: "브라우저 주소창 좌측 설정 아이콘 클릭하여 마이크 권한 허용하시면 됩니다."

### 3. 회의 진행 중 — `MeetingInProgressModal` 개편 (node 16920-37072)
현재 디자인(녹음 배지 + 타이머 + 메모 + 전사 + 단일 "회의 종료 - AI 회의록 생성" 버튼)을
Figma 신규 디자인으로 교체:
- 헤더: 타이틀 "회의 진행 중" + 서브타이틀 `{회의명} · {시작시각} 시작` + 참석자 pill 행 + X 닫기.
- **파란 타이머 카드**: 상단 아바타 + "{recorderName}님이 녹음 중입니다." + 큰 파란 타이머 "00:27:07" + 오디오 파형(시각 표현).
- "실시간 메모" 라벨 + textarea (placeholder "회의 중 중요한 내용을 메모하세요 (선택)").
- 하단 버튼 2개: `녹음 종료만 하기` (아웃라인) + `회의 종료` (빨강 채움).
- **memoOnly** 변형: 파란 타이머 카드 / 녹음자 표시 숨김, 실시간 메모만 노출. (정확한 디테일은 구현 시 해당 Figma 프레임 재확인.)
- 기존 record/share phase 전환 로직은 Sub-flow B/C 에서 다루므로 **본 단계에서는 유지만** 하고 손대지 않는다. "회의 종료" 클릭 → 기존 `MeetingEndConfirmModal` → `onEnd` 흐름 보존.

## 데이터 / 스타일 (CLAUDE.md 준수)

- 데모 데이터(참석자 목록, 마이크 디바이스 목록, 모든 라벨 텍스트)는 **`MeetingsPage.jsx` 래퍼**가 소유하고 props 로 주입. 컴포넌트 내부 fallback / demo constants import 금지.
- 스타일은 **`src/meetings.css`** 에 추가. 색상·간격·radius 는 디자인 시스템 토큰 변수(`var(--...)`) 사용, 하드코딩 금지. 진행 중 모달의 파란 타이머/파형 색은 `tokens.css` 에서 해당 토큰(blue 계열) 확인 후 사용. 토큰이 없으면 `index.css` 에 alias 추가.
- CSS 클래스명은 prefix 없는 기존 패턴 따름 (`mtg-` 접두 기존 회의록 클래스와 일관).

## index.js / 진입 배선

- `src/components/meetings/index.js` 에 `MeetingStartFlow`, `RecordMethodModal`, `MicSelectModal` export 추가.
- `src/components/index.js` 전체 barrel 에도 반영.
- `MeetingsCanvas` 의 `onStartMeeting` → `MeetingsPage` 가 `<MeetingStartFlow>` 를 열도록 변경 (기존 `MeetingInProgressModal` 직접 렌더 → `MeetingStartFlow` 로 대체).

## 검증

- `npm run dev` → 회의록 메뉴 → 진행 중 회의 "시작" → 기록 방식 선택 → (직접 녹음) 마이크 선택 → 권한 허용 → 회의 진행 중 까지 콘솔 에러 0건으로 도달.
- "메모만 작성" → 회의 진행 중(메모 전용) 도달 확인.
- 마이크 `failed` showcase 상태 렌더 확인.
- `npm run build` 통과.

## 범위 밖 (이번 단계 제외)

- 회의 종료 후 회의록 "생성 중" 상태, AI 회의록 회의록/스크립트 탭 → Sub-flow B.
- 화자 분리 팝오버, 공유 모달 Figma 정합성 → Sub-flow C.
- 실제 getUserMedia 마이크 연동.
