# 회의록 Sub-flow A (회의 시작 → 진행 중) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 회의 목록의 "시작" 클릭 후 기록 방식 선택 → 마이크 선택/권한 → 회의 진행 중(직접 녹음/메모 전용)까지 Figma 디자인대로 동작하는 시작 flow를 구현한다.

**Architecture:** 재사용 오케스트레이터 `MeetingStartFlow` 가 step 상태 머신(`method → mic → progress`)을 내부 소유하고, 순수 모달 3종(`RecordMethodModal`, `MicSelectModal`, 개편된 `MeetingInProgressModal`)을 단계별로 렌더한다. 데모 데이터·라벨은 `MeetingsPage.jsx` 래퍼가 소유해 props 로 주입하며(컴포넌트 내부 fallback 금지), 스타일은 `meetings.css` 에 디자인 시스템 토큰 변수로 추가한다.

**Tech Stack:** React 19, Vite, createPortal, gsap(기존 패턴), 디자인 시스템 CSS 토큰. 테스트 프레임워크 없음 → 검증은 `npm run lint` + `npm run build` + 브라우저 시각 확인.

**검증 규약 (이 프로젝트엔 단위 테스트가 없음):** 각 컴포넌트 Task는 "구현 → `npm run build` 통과 → 브라우저 시각 확인 → commit" 으로 검증한다. dev 서버는 이미 백그라운드 실행 중(http://localhost:5173/).

**Figma 참조 (file `TFJKOfs4npim6uGvoDrUeN`):**
- 기록 방식 선택: `16920-36771`
- 마이크 선택: `16920-36805`(initial 0%) / `16920-36849`(granted 50%) / `16920-36985`(failed)
- 회의 진행 중 — 직접 녹음: `16920-37072` (파란 타이머+녹음자+파형+버튼2)
- 회의 진행 중 — 메모 전용: `16930-40120` (메모만+버튼1)

**아이콘 경로 (Icon 컴포넌트 `src` 값, baseUrl 기준):**
- 마이크: `/icons-solid/microphone-01.svg`
- 문서: `/icons-solid/file-02.svg`
- 뒤로가기: `/icons-solid/arrow-left.svg`
- 드롭다운 화살표: `/icons-solid/chevron-down.svg`
- 경고: `/icons-solid/alert-triangle.svg`

**디자인 토큰 매핑 (Figma → CSS):**
- 모달 흰 배경: `var(--colors-background-bgQuaternary, #ffffff)`
- 본문 보조 텍스트: `var(--text-secondary)` / 제목: `var(--text-primary)`
- 파란 타이머 카드 배경: `var(--utility-blue-50)` · 타이머/파형 색: `var(--utility-blue-500)` (#2e90fa)
- 빨강 버튼: `var(--colors-background-bgErrorSolid, #f04438)`
- pill 배경: `var(--colors-background-bgTertiary, #fcfcfd)` (기존 `.mtg-progress-pill` 재사용)
- 카드/필드 테두리: `var(--colors-border-borderTertiary, #e6e8ea)`

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|---|---|---|
| `src/components/meetings/RecordMethodModal.jsx` | 기록 방식 선택 모달 (순수) | 신규 |
| `src/components/meetings/MicSelectModal.jsx` | 마이크 선택/권한 모달 (순수, status 상태) | 신규 |
| `src/components/meetings/MeetingStartFlow.jsx` | step 시퀀싱 오케스트레이터 | 신규 |
| `src/components/meetings/MeetingInProgressModal.jsx` | 진행 중 모달 progress phase 개편 (record/share phase 유지) | 수정 |
| `src/components/meetings/index.js` | barrel export 추가 | 수정 |
| `src/components/index.js` | 전체 barrel export 추가 | 수정 |
| `src/MeetingsPage.jsx` | 데모 데이터/라벨 소유 + MeetingStartFlow 렌더 | 수정 |
| `src/meetings.css` | 신규 컴포넌트 스타일 + progress phase 스타일 개편 | 수정 |

---

## Task 1: `RecordMethodModal` (기록 방식 선택)

**Files:**
- Create: `src/components/meetings/RecordMethodModal.jsx`
- Modify: `src/meetings.css` (append)

- [ ] **Step 1: 컴포넌트 작성**

`src/components/meetings/RecordMethodModal.jsx`:

```jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * RecordMethodModal — "시작" 클릭 직후 뜨는 기록 방식 선택 모달.
 *
 * Figma node-id=16920-36771. 중앙 정렬 카드. 직접 녹음 / 메모만 작성 2-카드.
 * 모든 데이터/라벨은 caller 주입. 내부 fallback 없음.
 *
 * meeting.participants: "David · Kurt" 문자열 또는 배열 둘 다 지원.
 */
function normalizeParticipants(participants) {
  if (!participants) return [];
  if (Array.isArray(participants)) return participants;
  return String(participants).split(/[·,]/).map((s) => s.trim()).filter(Boolean);
}

export default function RecordMethodModal({ meeting, baseUrl = '', labels, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const participants = normalizeParticipants(meeting?.participants);
  const subtitle = `${meeting.title} · ${meeting.time} ${labels.subtitleSuffix}`;

  return createPortal(
    <div className="mtg-overlay" onClick={onClose}>
      <div
        className="mtg-method-modal"
        role="dialog"
        aria-labelledby="mtg-method-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mtg-method-head">
          <h2 id="mtg-method-title" className="mtg-method-title">{labels.title}</h2>
          <button type="button" className="mtg-modal-close" aria-label={labels.close} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--colors-foreground-fgQuaternary, #98a1b2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="mtg-method-subtitle">{subtitle}</p>

        <div className="mtg-method-participants">
          {participants.map((p) => (
            <span key={p} className="mtg-progress-pill">{p}</span>
          ))}
        </div>

        <div className="mtg-method-cards">
          <button type="button" className="mtg-method-card" onClick={() => onSelect('record')}>
            <Icon src="/icons-solid/microphone-01.svg" size={28} color="var(--text-primary)" baseUrl={baseUrl} />
            <span className="mtg-method-card-title">{labels.record.title}</span>
            <span className="mtg-method-card-desc">{labels.record.desc}</span>
          </button>
          <button type="button" className="mtg-method-card" onClick={() => onSelect('memo')}>
            <Icon src="/icons-solid/file-02.svg" size={28} color="var(--text-primary)" baseUrl={baseUrl} />
            <span className="mtg-method-card-title">{labels.memo.title}</span>
            <span className="mtg-method-card-desc">{labels.memo.desc}</span>
          </button>
        </div>

        <p className="mtg-method-footnote">{labels.footnote}</p>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: CSS 추가**

`src/meetings.css` 끝에 append:

```css
/* ─── 공용 중앙 정렬 오버레이 (기록 방식/마이크 선택 모달) ─── */
.mtg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 25, 39, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  z-index: 9000;
}
.mtg-modal-close {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}
.mtg-modal-close:hover {
  background: var(--colors-background-bgSecondary, #f5f5f5);
}

/* ─── 기록 방식 선택 모달 ─── */
.mtg-method-modal {
  position: relative;
  width: 560px;
  max-width: 100%;
  background: var(--colors-background-bgQuaternary, #ffffff);
  border-radius: 16px;
  box-shadow:
    0 21px 120px -12px rgba(10, 13, 18, 0.14),
    0 14px 60px -2.5px rgba(10, 13, 18, 0.04);
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.mtg-method-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.mtg-method-title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--text-primary);
}
.mtg-method-subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-secondary);
}
.mtg-method-participants {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mtg-method-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 8px;
}
.mtg-method-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 24px 16px;
  background: var(--colors-background-bgQuaternary, #ffffff);
  border: 1px solid var(--colors-border-borderTertiary, #e6e8ea);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
  font-family: inherit;
}
.mtg-method-card:hover {
  border-color: var(--bg-brand-solid, #21a67a);
  background: var(--colors-background-bgSecondary, #f9fafb);
}
.mtg-method-card-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  color: var(--text-primary);
}
.mtg-method-card-desc {
  font-size: 13px;
  line-height: 18px;
  font-weight: 400;
  color: var(--text-tertiary, #b1b6be);
}
.mtg-method-footnote {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 18px;
  font-weight: 400;
  color: var(--text-tertiary, #b1b6be);
}
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공 (RecordMethodModal 은 아직 어디서도 import 되지 않으므로 트리쉐이킹됨, 에러 없음).

- [ ] **Step 4: Commit**

```bash
git add src/components/meetings/RecordMethodModal.jsx src/meetings.css
git commit -m "feat(meetings): 기록 방식 선택 모달(RecordMethodModal) 추가"
```

---

## Task 2: `MicSelectModal` (마이크 선택/권한)

**Files:**
- Create: `src/components/meetings/MicSelectModal.jsx`
- Modify: `src/meetings.css` (append)

- [ ] **Step 1: 컴포넌트 작성**

`src/components/meetings/MicSelectModal.jsx`:

```jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * MicSelectModal — 마이크 선택/권한 모달.
 *
 * Figma node-id=16920-36805(initial) / 36849(granted) / 36985(failed).
 * status: 'initial' | 'granted' | 'failed'.  volume: 0~100 (입력 음량 %).
 * 마이크 권한은 시각 상태만 — getUserMedia 미연동. 상태 전환은 caller(오케스트레이터)가 처리.
 * 모든 데이터/라벨은 caller 주입. 내부 fallback 없음.
 */
export default function MicSelectModal({
  devices,
  selectedDevice,
  status = 'initial',
  volume = 0,
  baseUrl = '',
  labels,
  onRequestPermission,
  onSelectDevice,
  onStart,
  onBack,
  onClose,
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="mtg-overlay" onClick={onClose}>
      <div
        className="mtg-mic-modal"
        role="dialog"
        aria-labelledby="mtg-mic-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mtg-mic-topbar">
          <button type="button" className="mtg-mic-back" onClick={onBack}>
            <Icon src="/icons-solid/arrow-left.svg" size={18} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>{labels.back}</span>
          </button>
          <button type="button" className="mtg-modal-close" aria-label={labels.close} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--colors-foreground-fgQuaternary, #98a1b2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <h2 id="mtg-mic-title" className="mtg-mic-title">{labels.title}</h2>
        <p className="mtg-mic-subtitle">{labels.subtitle}</p>

        <div className="mtg-mic-field">
          <span className="mtg-mic-field-label">{labels.deviceLabel}</span>
          <div className="mtg-mic-select">
            <select
              value={selectedDevice}
              onChange={(e) => onSelectDevice?.(e.target.value)}
            >
              {devices.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <Icon src="/icons-solid/chevron-down.svg" size={18} color="var(--text-tertiary, #b1b6be)" baseUrl={baseUrl} />
          </div>
        </div>

        <div className="mtg-mic-field">
          <div className="mtg-mic-volume-head">
            <span className="mtg-mic-field-label">{labels.volumeLabel}</span>
            <span className="mtg-mic-volume-pct">{volume}%</span>
          </div>
          <div className="mtg-mic-volume-track">
            <div className="mtg-mic-volume-fill" style={{ width: `${volume}%` }} />
          </div>
        </div>

        {status === 'initial' && (
          <>
            <button type="button" className="mtg-mic-request-btn" onClick={onRequestPermission}>
              {labels.requestButton}
            </button>
            <p className="mtg-mic-footnote">{labels.requestFootnote}</p>
          </>
        )}

        {status === 'granted' && (
          <>
            <p className="mtg-mic-granted">{labels.grantedText}</p>
            <button type="button" className="mtg-mic-start-btn" onClick={onStart}>
              {labels.startButton}
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="mtg-mic-error">
              <Icon src="/icons-solid/alert-triangle.svg" size={18} color="var(--colors-background-bgErrorSolid, #f04438)" baseUrl={baseUrl} />
              <span>{labels.failedText}</span>
            </div>
            <p className="mtg-mic-footnote">{labels.failedFootnote}</p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: CSS 추가**

`src/meetings.css` 끝에 append:

```css
/* ─── 마이크 선택 모달 ─── */
.mtg-mic-modal {
  position: relative;
  width: 480px;
  max-width: 100%;
  background: var(--colors-background-bgQuaternary, #ffffff);
  border-radius: 16px;
  box-shadow:
    0 21px 120px -12px rgba(10, 13, 18, 0.14),
    0 14px 60px -2.5px rgba(10, 13, 18, 0.04);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.mtg-mic-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mtg-mic-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-secondary);
}
.mtg-mic-title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--text-primary);
}
.mtg-mic-subtitle {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-secondary);
}
.mtg-mic-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mtg-mic-field-label {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: var(--text-primary);
}
.mtg-mic-select {
  position: relative;
  display: flex;
  align-items: center;
}
.mtg-mic-select select {
  width: 100%;
  appearance: none;
  padding: 10px 36px 10px 12px;
  border: 1px solid var(--colors-border-borderTertiary, #e6e8ea);
  border-radius: 10px;
  background: var(--colors-background-bgQuaternary, #ffffff);
  font-family: inherit;
  font-size: 16px;
  line-height: 24px;
  color: var(--text-primary);
  cursor: pointer;
}
.mtg-mic-select .icon {
  position: absolute;
  right: 12px;
  pointer-events: none;
}
.mtg-mic-volume-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mtg-mic-volume-pct {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: var(--utility-blue-500, #2e90fa);
}
.mtg-mic-volume-track {
  height: 6px;
  border-radius: 9999px;
  background: var(--colors-background-bgSecondary, #f9fafb);
  border: 1px solid var(--colors-border-borderTertiary, #e6e8ea);
  overflow: hidden;
}
.mtg-mic-volume-fill {
  height: 100%;
  background: var(--utility-blue-500, #2e90fa);
  transition: width 0.2s ease;
}
.mtg-mic-request-btn {
  margin-top: 8px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--bg-brand-solid, #21a67a);
  border-radius: 10px;
  background: var(--colors-background-bgQuaternary, #ffffff);
  color: var(--bg-brand-solid, #21a67a);
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.mtg-mic-request-btn:hover {
  background: var(--utility-brand-50, #f1fffa);
}
.mtg-mic-granted {
  margin: 8px 0 0;
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--text-tertiary, #b1b6be);
}
.mtg-mic-start-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: var(--colors-background-bgErrorSolid, #f04438);
  color: #ffffff;
  font-family: inherit;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.mtg-mic-start-btn:hover {
  filter: brightness(0.96);
}
.mtg-mic-error {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--componentColors-utility-error-utilityError50, #fef3f2);
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--colors-background-bgErrorSolid, #f04438);
}
.mtg-mic-footnote {
  margin: 0;
  font-size: 13px;
  line-height: 18px;
  font-weight: 400;
  color: var(--text-tertiary, #b1b6be);
}
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공, 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add src/components/meetings/MicSelectModal.jsx src/meetings.css
git commit -m "feat(meetings): 마이크 선택/권한 모달(MicSelectModal) 추가"
```

---

## Task 3: `MeetingInProgressModal` progress phase 개편

기존 progress phase(빨강 타이머 배지 + 타이머 + 메모 + 전사 + 단일 종료 버튼)를 Figma 신규 디자인으로 교체한다.
- `mode='record'`: 파란 타이머 카드(녹음자 + 타이머 + 파형) + 실시간 메모 + 버튼 2개(`녹음 종료만 하기` / `회의 종료`)
- `mode='memo'`: 실시간 메모(크게) + 버튼 1개(`회의 종료`)
- 실시간 전사 섹션은 progress 에서 제거(Sub-flow B 스크립트 탭으로 이동). record/share phase 분기는 손대지 않는다.

**Files:**
- Modify: `src/components/meetings/MeetingInProgressModal.jsx`
- Modify: `src/meetings.css` (progress 관련 클래스 추가/조정)

- [ ] **Step 1: 컴포넌트 props 시그니처 수정**

`MeetingInProgressModal.jsx` 의 함수 파라미터에 `mode`, `recorderName`, `onStopRecording` 추가. 기존 파라미터 블록을 아래로 교체:

```jsx
export default function MeetingInProgressModal({
  meeting,
  baseUrl = '',
  onClose,
  // 진행 phase props — 모두 caller 주입
  mode = 'record',          // 'record' = 직접 녹음, 'memo' = 메모만 작성
  recorderName,             // 'record' 모드에서 "{recorderName}님이 녹음 중입니다."
  timer,
  memo: memoProp,
  onMemoChange,
  onStopRecording,          // "녹음 종료만 하기" 클릭
  // record/share phase 에 그대로 forward (caller 주입)
  recordData,
  shareData,
  // 라벨 (caller 주입)
  labels,
  // 시작 phase: 'progress' (기본) | 'record' — completed 회의의 기록 보기용.
  initialPhase = 'progress',
  // 회의 "종료" 확정 콜백 — status=completed 등 서버 반영을 caller 에서 처리.
  onEnd,
}) {
```

(기존 `timer, transcript, memo, ...` 블록 제거. `transcript` prop 은 더 이상 쓰지 않으므로 제거.)

- [ ] **Step 2: progress 뷰(else 분기) 마크업 교체**

`MeetingInProgressModal.jsx` 의 progress 뷰 — 즉 `isShare`/`isRecord` 가 아닌 `else` 분기 전체(`<> ... 헤더 + 타이머 + 메모 + 전사 ... </>`)를 아래로 교체:

```jsx
              <>
                <div className="mtg-progress-header-block">
                  <div className="mtg-progress-titlewrap">
                    <h2 id="mtg-progress-title" className="mtg-progress-title">
                      {labels.title}
                    </h2>
                    <p className="mtg-progress-subtitle">{subtitle}</p>
                  </div>
                  <div className="mtg-progress-participants">
                    {participants.map((p) => (
                      <span key={p} className="mtg-progress-pill">{p}</span>
                    ))}
                  </div>
                </div>

                {mode === 'record' && (
                  <div className="mtg-progress-rec-card">
                    <div className="mtg-progress-rec-who">
                      <span className="mtg-progress-rec-avatar" aria-hidden="true" />
                      <span className="mtg-progress-rec-name">
                        {recorderName}{labels.recordingSuffix}
                      </span>
                    </div>
                    <span className="mtg-progress-rec-time">{timer}</span>
                    <div className="mtg-progress-rec-wave" aria-hidden="true">
                      {[10, 18, 8, 22, 14, 26, 12, 20, 9].map((h, i) => (
                        <span key={i} style={{ height: `${h}px` }} />
                      ))}
                    </div>
                  </div>
                )}

                <section className={`mtg-progress-section ${mode === 'memo' ? 'is-memo-only' : ''}`}>
                  <label htmlFor="mtg-memo" className="mtg-progress-section-label">
                    {labels.memoLabel}
                  </label>
                  <textarea
                    id="mtg-memo"
                    className="tl-snippet-textarea mtg-progress-field"
                    placeholder={labels.memoPlaceholder}
                    value={memo}
                    onChange={(e) => handleMemoChange(e.target.value)}
                  />
                </section>
              </>
```

- [ ] **Step 3: progress 하단 버튼 분기 수정**

`MeetingInProgressModal.jsx` 하단 `.mtg-progress-actions` 내부에서, `isShare`/`isRecord` 가 아닌 마지막 `else`(현재 단일 `mtg-progress-end-btn` 버튼)를 아래로 교체:

```jsx
            ) : (
              <div className="mtg-progress-btn-row">
                {mode === 'record' && (
                  <button
                    type="button"
                    className="mtg-progress-stoprec-btn"
                    onClick={onStopRecording}
                  >
                    {labels.endRecordingOnly}
                  </button>
                )}
                <button
                  type="button"
                  className="mtg-progress-end-btn"
                  onClick={() => setConfirmOpen(true)}
                >
                  {labels.endButton}
                </button>
              </div>
            )}
```

- [ ] **Step 4: CSS — 빨강 타이머 → 파란 카드/파형 + 버튼 row 추가**

`src/meetings.css`: 기존 `.mtg-progress-timer`, `.mtg-progress-rec-badge`, `.mtg-progress-time` (라인 ~320-349) 블록을 아래 신규 파란 카드 스타일로 교체. (기존 클래스명은 더 이상 progress 뷰에서 사용하지 않음.)

```css
/* 녹음 중 파란 타이머 카드 (Figma 16920-37072) */
.mtg-progress-rec-card {
  padding: 24px 16px;
  background: var(--utility-blue-50, #eff8ff);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.mtg-progress-rec-who {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.mtg-progress-rec-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--utility-blue-500, #2e90fa);
  flex-shrink: 0;
}
.mtg-progress-rec-name {
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;
  color: var(--utility-blue-600, #1849a9);
}
.mtg-progress-rec-time {
  font-family: var(--font-family-display);
  font-size: 64px;
  line-height: 76px;
  font-weight: 600;
  letter-spacing: -1.28px;
  color: var(--utility-blue-500, #2e90fa);
}
.mtg-progress-rec-wave {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 28px;
}
.mtg-progress-rec-wave span {
  width: 3px;
  border-radius: 9999px;
  background: var(--utility-blue-500, #2e90fa);
}

/* progress 하단 버튼 row (record 모드: 2버튼, memo 모드: 1버튼) */
.mtg-progress-btn-row {
  display: flex;
  gap: 12px;
}
.mtg-progress-btn-row .mtg-progress-end-btn {
  flex: 1;
}
.mtg-progress-stoprec-btn {
  flex: 1;
  padding: 10px 12px;
  background: var(--colors-background-bgQuaternary, #ffffff);
  border: 1px solid var(--colors-border-borderTertiary, #e6e8ea);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.mtg-progress-stoprec-btn:hover {
  background: var(--colors-background-bgSecondary, #f9fafb);
}

/* memo-only 모드: 메모 영역을 크게 (전사 섹션 제거분 흡수) */
.mtg-progress-section.is-memo-only {
  height: 480px;
}
```

- [ ] **Step 5: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공. (이 컴포넌트는 MeetingsCanvas/MeetingsPage 에서 import 되지만 시그니처 변경은 Task 6 에서 호출부를 맞추므로, 이 시점 빌드는 미사용 prop 경고 없이 통과해야 함.)

- [ ] **Step 6: Commit**

```bash
git add src/components/meetings/MeetingInProgressModal.jsx src/meetings.css
git commit -m "feat(meetings): 진행 중 모달 progress phase Figma 신규 디자인으로 개편(파란 타이머/메모 전용 모드)"
```

---

## Task 4: `MeetingStartFlow` 오케스트레이터

**Files:**
- Create: `src/components/meetings/MeetingStartFlow.jsx`

- [ ] **Step 1: 컴포넌트 작성**

`src/components/meetings/MeetingStartFlow.jsx`:

```jsx
import { useState } from 'react';
import RecordMethodModal from './RecordMethodModal.jsx';
import MicSelectModal from './MicSelectModal.jsx';
import MeetingInProgressModal from './MeetingInProgressModal.jsx';

/**
 * MeetingStartFlow — 회의 "시작" 클릭 후 시작 flow 오케스트레이터.
 *
 * step 머신: 'method' → ('record' → 'mic') → 'progress'.
 *   - 직접 녹음: method → mic → progress(mode='record')
 *   - 메모만 작성: method → progress(mode='memo')
 * 마이크는 시각 상태만(getUserMedia 미연동). simulateMicFailure=true 면
 * 첫 권한 요청은 실패 화면, 재시도 시 성공(showcase 용).
 *
 * 데이터/라벨은 caller(MeetingsPage / pivit-work 페이지) 주입. 내부 fallback 없음.
 */
export default function MeetingStartFlow({
  meeting,
  baseUrl = '',
  labels,                 // { recordMethod, micSelect, progress }
  micDevices,
  timer,
  recorderName,
  recordData,
  shareData,
  simulateMicFailure = false,
  onClose,
  onEnd,
}) {
  const [step, setStep] = useState('method');   // 'method' | 'mic' | 'progress'
  const [mode, setMode] = useState('record');   // 'record' | 'memo'
  const [micStatus, setMicStatus] = useState('initial'); // 'initial'|'granted'|'failed'
  const [micVolume, setMicVolume] = useState(0);
  const [micAttempts, setMicAttempts] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState(micDevices?.[0] ?? '');
  const [memo, setMemo] = useState('');

  const handleSelectMethod = (m) => {
    if (m === 'record') {
      setMicStatus('initial');
      setMicVolume(0);
      setMicAttempts(0);
      setStep('mic');
    } else {
      setMode('memo');
      setStep('progress');
    }
  };

  const handleRequestPermission = () => {
    const next = micAttempts + 1;
    setMicAttempts(next);
    if (simulateMicFailure && next === 1) {
      setMicStatus('failed');
      setMicVolume(0);
    } else {
      setMicStatus('granted');
      setMicVolume(50);
    }
  };

  const handleStart = () => {
    setMode('record');
    setStep('progress');
  };

  if (step === 'method') {
    return (
      <RecordMethodModal
        meeting={meeting}
        baseUrl={baseUrl}
        labels={labels.recordMethod}
        onSelect={handleSelectMethod}
        onClose={onClose}
      />
    );
  }

  if (step === 'mic') {
    return (
      <MicSelectModal
        devices={micDevices}
        selectedDevice={selectedDevice}
        status={micStatus}
        volume={micVolume}
        baseUrl={baseUrl}
        labels={labels.micSelect}
        onRequestPermission={handleRequestPermission}
        onSelectDevice={setSelectedDevice}
        onStart={handleStart}
        onBack={() => setStep('method')}
        onClose={onClose}
      />
    );
  }

  return (
    <MeetingInProgressModal
      meeting={meeting}
      baseUrl={baseUrl}
      mode={mode}
      recorderName={recorderName}
      timer={timer}
      memo={memo}
      onMemoChange={setMemo}
      onStopRecording={() => setMode('memo')}
      recordData={recordData}
      shareData={shareData}
      labels={labels.progress}
      onClose={onClose}
      onEnd={onEnd}
    />
  );
}
```

- [ ] **Step 2: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공, 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/components/meetings/MeetingStartFlow.jsx
git commit -m "feat(meetings): 시작 flow 오케스트레이터(MeetingStartFlow) 추가"
```

---

## Task 5: Barrel exports

**Files:**
- Modify: `src/components/meetings/index.js`
- Modify: `src/components/index.js`

- [ ] **Step 1: `src/components/meetings/index.js` 에 export 추가**

기존 5줄 아래에 추가:

```js
export { default as RecordMethodModal } from './RecordMethodModal.jsx';
export { default as MicSelectModal } from './MicSelectModal.jsx';
export { default as MeetingStartFlow } from './MeetingStartFlow.jsx';
```

- [ ] **Step 2: `src/components/index.js` 의 Meetings 블록에 추가**

기존 `// Meetings (회의록)` export 블록을 아래로 교체:

```js
// Meetings (회의록)
export {
  MeetingsCanvas,
  MeetingInProgressModal,
  MeetingEndConfirmModal,
  MeetingRecordContent,
  MeetingShareContent,
  RecordMethodModal,
  MicSelectModal,
  MeetingStartFlow,
} from './meetings/index.js';
```

- [ ] **Step 3: 빌드 통과 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add src/components/meetings/index.js src/components/index.js
git commit -m "feat(meetings): 시작 flow 컴포넌트 barrel export 추가"
```

---

## Task 6: `MeetingsPage` 래퍼 배선

**Files:**
- Modify: `src/MeetingsPage.jsx`

- [ ] **Step 1: import 교체 + 시작 flow 데모 데이터/라벨 추가**

`src/MeetingsPage.jsx` 상단 import 를 교체:

```jsx
import { useMemo, useState } from 'react';
import { MeetingsCanvas, MeetingStartFlow } from './components';
```

`MODAL_LABELS` 객체에 진행 모달용 신규 라벨 2개 추가 (기존 객체 내부에 추가):

```jsx
  recordingSuffix: '님이 녹음 중입니다.',
  endRecordingOnly: '녹음 종료만 하기',
```

기존 `MODAL_LABELS`, `RECORD_DATA`, `SHARE_DATA` 정의 뒤에 시작 flow 라벨/데이터 추가:

```jsx
const START_LABELS = {
  recordMethod: {
    title: '기록 방식 선택',
    subtitleSuffix: '시작',
    record: { title: '직접 녹음', desc: '이 디바이스 마이크로 녹음. 회의 참여한 인원의 녹음도 동작합니다.' },
    memo: { title: '메모만 작성', desc: '녹음 없이 주최자가 직접 기록합니다.' },
    footnote: '발제(회의 주최자) 만 녹음을 시작·정지할 수 있습니다. 비주최자는 본 화면을 보지 않고 곧장 회의방으로 입장합니다.',
    close: '닫기',
  },
  micSelect: {
    back: '뒤로가기',
    title: '마이크 선택',
    subtitle: '어떤 마이크로 녹음할지 골라주세요.',
    deviceLabel: '마이크',
    volumeLabel: '입력 음량',
    requestButton: '최초 이 버튼을 눌러 브라우저 마이크 권한 허용해주세요',
    requestFootnote: '브라우저 마이크 사용 권한 허용하지 않으면 회의록 녹음 기능을 사용하실 수 없습니다.',
    grantedText: '마이크 권한 허용 됨.',
    startButton: '회의 시작하기',
    failedText: '브라우저 마이크 권한 허용이 실패했습니다. 다시 시도해 주세요.',
    failedFootnote: '브라우저 주소창 좌측 설정 아이콘 클릭하여 마이크 권한 허용하시면 됩니다.',
    close: '닫기',
  },
  progress: MODAL_LABELS,
};

const MIC_DEVICES = ['MacBook Pro 내장마이크', 'AirPods Pro', '외부 USB 마이크'];
const RECORDER_NAME = 'John Lee';
```

- [ ] **Step 2: 컴포넌트 본문에서 MeetingInProgressModal → MeetingStartFlow 로 교체**

`MeetingsPage` 함수의 `return (...)` 을 아래로 교체:

```jsx
  return (
    <>
      <MeetingsCanvas
        baseUrl={baseUrl}
        todayMeetings={TODAY_MEETINGS}
        pastMeetings={PAST_MEETINGS}
        todayDateLabel={todayDateLabel}
        todayCountLabel={todayCountLabel}
        labels={LABELS}
        onStartMeeting={setActiveMeeting}
      />
      {activeMeeting && (
        <MeetingStartFlow
          baseUrl={baseUrl}
          meeting={activeMeeting}
          labels={START_LABELS}
          micDevices={MIC_DEVICES}
          recorderName={RECORDER_NAME}
          timer="00:27:07"
          recordData={RECORD_DATA}
          shareData={SHARE_DATA}
          simulateMicFailure
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </>
  );
```

- [ ] **Step 3: 빌드 + lint 통과 확인**

Run: `npm run build && npm run lint`
Expected: 둘 다 성공, 에러 0건.

- [ ] **Step 4: Commit**

```bash
git add src/MeetingsPage.jsx
git commit -m "feat(meetings): MeetingsPage 를 MeetingStartFlow 시작 flow 로 배선"
```

---

## Task 7: 시각 검증 (브라우저)

**Files:** 없음 (확인만)

- [ ] **Step 1: dev 서버 확인**

dev 서버는 백그라운드 실행 중. 미실행이면 `npm run dev`.
브라우저에서 http://localhost:5173/ → 사이드바 "회의록" 메뉴 클릭.

- [ ] **Step 2: 직접 녹음 경로 확인**

진행 중(`진행 중` 태그) 회의의 "시작" 클릭 →
1. **기록 방식 선택** 모달: 타이틀/서브타이틀/참석자 pill/2-카드/하단 안내문 표시 확인.
2. "직접 녹음" 클릭 → **마이크 선택**(initial): 드롭다운, 입력 음량 0%, 권한 요청 버튼, 안내문.
3. 권한 요청 버튼 클릭 → **failed**: 빨강 경고 박스 + 안내문 (simulateMicFailure).
4. 다시 권한 요청 버튼 클릭 → **granted**: 입력 음량 50%(파란 바), "마이크 권한 허용 됨." + 빨강 "회의 시작하기".
5. "회의 시작하기" 클릭 → **회의 진행 중(record)**: 파란 타이머 카드(녹음자명+00:27:07+파형) + 실시간 메모 + [녹음 종료만 하기][회의 종료].
6. "녹음 종료만 하기" 클릭 → 파란 카드 사라지고 메모 전용 + [회의 종료] 단일 버튼.

- [ ] **Step 3: 메모만 작성 경로 확인**

회의록 메뉴 재진입 → "시작" → 기록 방식 선택 → "메모만 작성" 클릭 →
**회의 진행 중(memo)**: 파란 타이머 카드 없음, 큰 실시간 메모 textarea + [회의 종료] 단일 버튼.

- [ ] **Step 4: 뒤로가기 / 닫기 확인**

마이크 선택에서 "← 뒤로가기" → 기록 방식 선택으로 복귀. 각 모달 X / 오버레이 클릭 / Esc → 닫힘.
브라우저 콘솔 에러 0건 확인.

- [ ] **Step 5: 회의 종료 → 기록/공유 phase 회귀 확인 (기존 기능 보존)**

진행 중(record 또는 memo)에서 "회의 종료" → 종료 확인 alert → "종료" → 기존 record(생성된 회의록) phase 정상 표시 → "공유하기" → share phase 정상 표시.

---

## Self-Review 결과

- **Spec coverage:** 기록 방식 선택(Task 1) / 마이크 선택 3상태(Task 2) / 진행 중 record·memo 개편(Task 3) / step 오케스트레이션(Task 4) / export·배선(Task 5,6) / flow 검증(Task 7) — spec 의 모든 화면·흐름이 task 에 매핑됨.
- **마이크 시각 상태만:** getUserMedia 미연동, `simulateMicFailure` 로 실패→재시도 성공 showcase (spec 의 "failed showcase 노출" 해소).
- **memoOnly 디테일:** Figma `16930-40120` 확정 반영 (메모 크게 + 단일 종료 버튼).
- **타입/이름 일관성:** `mode`('record'|'memo'), `micStatus`('initial'|'granted'|'failed'), 라벨 키(`recordMethod`/`micSelect`/`progress`) 가 Task 3·4·6 에서 일치. `recordingSuffix`/`endRecordingOnly` 라벨 키가 Task 3(사용) 과 Task 6(정의) 에서 일치.
- **토큰 사용:** 색상 하드코딩 없음 — 모두 `var(--...)` (fallback hex 포함). 신규 alias 불필요(`--utility-blue-50/500/600` 는 index.css 에 기존 존재).

## 범위 밖 (Sub-flow B/C)
- 회의 종료 후 "생성 중" 리스트 상태, AI 회의록 회의록/스크립트 탭 → B.
- 화자 분리 팝오버, 공유 모달 Figma 정합성 → C.
