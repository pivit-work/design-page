import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OneOnOneRecordingWidget from './OneOnOneRecordingWidget.jsx';
import LiveGuideCard from './LiveGuideCard.jsx';

/**
 * "1on1 진행" 준비 뷰 — Figma 16817:39186(준비1) / 16972:15514(준비2).
 *
 * 이전에는 모든 데이터(브리핑·OKR·역량·아젠다·AI 초안)를 컴포넌트 내부 상수로
 * 하드코딩했지만, 실제 제품에서는 매니저-팀원 페어 별로 백엔드에서 가져와야 한다.
 * 0.1.127+ 부터는 컴포넌트가 prop 기반으로 동작:
 *   - `data`        : 멤버 사전 입력(브리핑/보고서/OKR/피드백/역량/아젠다/액션)
 *   - `aiDrafts`    : 매니저 관점 AI 초안 3개 (없으면 textarea 비어있음)
 *   - `onGenerateDrafts(section?)` : AI 초안 생성 콜백. section 미지정 = 전체,
 *     'strengths'|'sbi'|'support'|'caps' = 해당 섹션만.
 *   - `generatingSection` : 현재 생성 중인 섹션 ('all'|섹션키|null).
 *   - `aiFailures` : 초안 생성이 실패한 대상별 상태 (policy §7.5 · PW-321).
 *     `{ [key]: { reason, retryLeft } }`, key 는 'all'|'strengths'|'sbi'|'support'|'caps'.
 *     reason 은 'timeout'|'model_error'|'quota_exceeded' (판별 불가 시 'model_error').
 *     retryLeft 는 남은 `다시 시도` 횟수. 이 prop 을 주지 않으면 동작이 이전과 같다.
 *     상태 4종(idle/loading/success/failed)은 별도 prop 이 아니라 여기서 파생한다 —
 *     generatingSection → loading, aiDrafts → success, aiFailures → failed.
 *   - `initialPerspective` : 서버에 저장된 매니저 관점 (자동 저장 복원).
 *     { strengths, sbi, support, capabilities, confirmed, mgrAgendas }.
 *     주어지면 모든 초기 상태를 이 값으로 채우고 멤버 자가진단/initialMgrAgendas
 *     fallback 은 건너뛴다.
 *   - `onPerspectiveChange(perspective)` : 매니저 관점 4섹션/역량/확정/아젠다 중
 *     하나라도 바뀔 때마다 호출. Daily Snippet 패턴의 자동 저장 훅과 연결한다.
 *   - `onStartMeeting()` / `onEndMeeting()` : "시작하기" / "1on1 종료" 를 눌렀을 때
 *     호출. 이 컴포넌트는 녹음 타이머만 제어하므로, 미팅을 실제로 시작·완료(요약
 *     생성)하는 것은 소비처 몫이다. 콜백이 없으면 데모처럼 녹음 표시만 바뀐다.
 *   - `busy` / `busyLabel` : 소비처가 종료·요약 생성을 처리하는 동안 푸터 버튼을
 *     기존 비활성 스타일로 잠그고 문구를 바꾼다. busyLabel 미지정 시 문구는 그대로.
 *
 * design-page 데모 wrapper(OneOnOnePage.jsx) 가 이 props 를 채워 기존 데모 화면을
 * 유지하고, pivit-work 등 실제 사용처는 prepareSession 결과를 변환해 넣는다.
 *
 *   - `liveGuide` : LIVE 대화 내비게이터 카드의 props 묶음 (PW-429). 주면 멤버 블록
 *     아래·준비도 위에 카드를 그린다. 주지 않으면 아무 것도 그리지 않는다 — READY·DONE
 *     화면과 **멤버 화면에는 존재 자체가 노출되면 안 되므로**, 렌더 여부를 소비처가
 *     쥔다(정책 §5.2.1: `phase === live` AND 뷰어가 매니저). 값은 `LiveGuideCard` 의
 *     props 를 그대로 통과시킨다.
 *
 *   - `readyGuide` : READY 단계의 진행 스크립트 카드 props (PW-478 · policy §4.1.2-A).
 *     AI 브리핑 아래에 그린다. 입력이 전부 READY 산출물이라 LIVE 를 기다릴 이유가
 *     없었고, 그 대기가 ① 아이스브레이킹의 권장 구간을 미팅 시간으로 갉아먹었다.
 *   - `elapsedSec` : 세션 경과(초). 주면 자체 타이머를 돌리지 않는다. `null` = 녹음 전.
 *   - `onCollapseRecording` / `recordingCollapsed` : 녹음 바의 「접기」 (PW-578).
 *     콜백을 주지 않으면 버튼이 없고, `recordingCollapsed` 면 녹음 바 자체를 그리지
 *     않는다 — 접은 모습은 소비처가 그린다.
 *   - `startBlocked` / `onStartBlocked` : 「시작하기」를 가로채 소비처가 안내를 띄운다.
 *     버튼을 잠그는 것이 **아니다** — 잠그는 안은 기획에서 미채택이다(policy §5.1).
 *
 * member shape: { name, role, avatar, badge? }
 */

/** t0(녹음 시작) 이전의 경과 표시 (PW-478 · policy §5.0 T2). */
const NO_CLOCK = '--:--';

const SOURCE_BADGES = ['Daily Snippet', '회의록', '피드백', '기존1on1'];
const MGR_SECTIONS = [
  { key: 'strengths', title: '관찰한 강점', badges: SOURCE_BADGES, kind: 'textarea' },
  { key: 'sbi', title: '개선 피드백 (SBI 형식)', badges: SOURCE_BADGES, hint: ['Situation', 'Behavior', 'Impact'], kind: 'textarea' },
  { key: 'support', title: '지원 계획', badges: SOURCE_BADGES, kind: 'textarea' },
  { key: 'caps', title: '역량 매니저 평가', badges: SOURCE_BADGES, kind: 'caps' },
];
const TEXTAREA_PLACEHOLDER = 'AI 초안 생성 또는 직접 입력';
// ── AI 초안 실패 (policy §7.5 · PW-321) ─────────────────────────────────────
// AI 호출은 반드시 실패한다 — 타임아웃·모델 오류·한도 초과는 장애가 아니라 정상
// 범위 안의 결과다. 실패를 그릴 자리가 없어서 지금까지 침묵으로 끝났다.
const AI_FAIL_TARGETS = {
  all: 'AI 브리핑 및 매니저 관점 초안',
  strengths: '관찰한 강점',
  sbi: '개선 피드백',
  support: '지원 계획',
  caps: '역량 매니저 평가',
};
// 사유는 3분류, 행동은 2가지 — 한도 초과만 `다시 시도` 가 잠긴다 (§7.5.5).
const AI_FAIL_MESSAGES = {
  timeout: '생성이 30초를 넘겨 중단됐습니다. 잠시 후 다시 시도해 주세요.',
  model_error: 'AI 응답을 받지 못했습니다. 잠시 후 다시 시도해 주세요.',
  quota_exceeded:
    '이번 달 조직 AI 사용 한도를 모두 썼습니다. 워크스페이스 관리자에게 문의해 주세요.',
};
const AI_FAIL_DEFAULT_REASON = 'model_error';
const AI_FAIL_EXHAUSTED =
  '여러 번 시도했지만 생성하지 못했습니다. 직접 입력해 주세요.';
const AI_FAIL_HINT = '직접 입력해도 됩니다 — AI 없이 저장·제출할 수 있습니다.';
const AI_FAIL_QUOTA_TOOLTIP = 'AI 사용 한도가 복구되면 다시 시도할 수 있습니다';

/**
 * 인라인 실패 박스 — 실패한 대상 **안**, 입력 바로 위 (policy §7.5.3).
 *
 * 전역 오류 페이지로 보내지 않는 이유는 소비처 몫이지만, 그렇게 흡수한 실패를
 * **말할 자리**가 여기다. 침묵은 실패 표시가 아니다 — 눌렀는데 아무 변화가 없으면
 * 버튼이 고장난 것으로 읽힌다(§7.5.4 「조용히 빈 초안」 기각 사유).
 *
 * 박스의 구조·색은 사유와 무관하게 같다. 달라지는 것은 본문 문구와 버튼 활성뿐.
 */
function AiFailBox({ targetKey, failure, onRetry, busy }) {
  const reason = AI_FAIL_MESSAGES[failure?.reason]
    ? failure.reason
    : AI_FAIL_DEFAULT_REASON;
  const quota = reason === 'quota_exceeded';
  // 한도 초과는 재시도 카운트를 쓰지 않으므로 소진 문구로 넘어가지 않는다.
  const exhausted = !quota && (failure?.retryLeft ?? 0) <= 0;
  const disabled = quota || exhausted || busy;
  const message = exhausted ? AI_FAIL_EXHAUSTED : AI_FAIL_MESSAGES[reason];
  return (
    <div
      className="ono-start-failbox"
      role="alert"
      data-testid={`ono-start-failbox-${targetKey}`}
      data-reason={reason}
    >
      <span className="ono-start-failbox-title">
        ⚠ {AI_FAIL_TARGETS[targetKey] ?? targetKey} 생성에 실패했습니다
      </span>
      <p className="ono-start-failbox-msg">{message}</p>
      <div className="ono-start-failbox-actions">
        <button
          type="button"
          className="ono-start-failbox-retry"
          onClick={() => onRetry?.(targetKey)}
          disabled={disabled}
          title={quota ? AI_FAIL_QUOTA_TOOLTIP : undefined}
        >
          다시 시도
        </button>
        <span className="ono-start-failbox-hint">{AI_FAIL_HINT}</span>
      </div>
    </div>
  );
}
const AI_WARN =
  'AI 초안 — 반드시 검토 후 확정해주세요. 미확정 내용은 DONE 피드백에 반영되지 않습니다.';
const EMPTY_HINT = '아직 수집된 데이터가 없습니다.';

// 역량 매니저 평가 5개 항목 — 매니저가 직접 1-5 클릭으로 입력하는 고정 항목.
// 멤버 자가진단 값은 data.capabilities 로 override (없으면 0 = 미입력).
const DEFAULT_CAPABILITIES = [
  { key: 'expertise', label: '업무 전문성' },
  { key: 'communication', label: '커뮤니케이션' },
  { key: 'problemSolving', label: '문제 해결력' },
  { key: 'teamwork', label: '협업 / 팀워크' },
  { key: 'selfDriven', label: '자가주도성' },
];

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ProgressBar({ pct, color }) {
  const safePct = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="ono-start-progress-track">
      <div
        className="ono-start-progress-fill"
        style={{ width: `${safePct}%`, background: color }}
      />
    </div>
  );
}

// 매니저 평가 점수 색상: 3 주의(warning), 2↓ 위험(error), 그 외(4·5)는 기본 색.
const ratingTone = (v) => (v === 3 ? 'is-warn' : v <= 2 ? 'is-bad' : '');

// ai=true(AI 초안 생성됨)이면 막대 색이 green → purple 로 바뀐다.
// onChange 가 주어지면 매니저가 1-5 막대를 클릭해 직접 평가 입력 (spec §4.1.5).
function RatingBar({ value, ai = false, onChange }) {
  return (
    <div className="ono-start-rating">
      <div className={`ono-start-rating-segs ${ai ? 'is-ai' : ''}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`ono-start-rating-seg ${n <= value ? 'is-on' : ''} ${onChange ? 'is-clickable' : ''}`}
            onClick={onChange ? () => onChange(n) : undefined}
            role={onChange ? 'button' : undefined}
            aria-label={onChange ? `${n}점` : undefined}
          />
        ))}
      </div>
      <span className={`ono-start-rating-num ${ratingTone(value)}`}>{value}</span>
    </div>
  );
}

export default function StartOneOnOneView({
  member,
  data,
  aiDrafts,
  onGenerateDrafts,
  generatingSection = null,
  aiFailures = null,
  initialPerspective = null,
  onPerspectiveChange,
  onBack,
  baseUrl = '',
  // ── 녹음 상태 외부 제어 (PiP 등) ──
  // recording prop 이 주어지면 controlled, 없으면 컴포넌트 자체 state 사용.
  recording: recordingProp,
  onRecordingChange,
  onStartRecording,
  // ── 녹음 일시정지 (선택) ──
  // paused prop 이 주어지면 controlled. 콜백을 하나도 주지 않으면 녹음 위젯은
  // 일시정지 버튼을 그리지 않는다 (일시정지를 지원하지 않는 소비처의 기존 화면).
  paused = false,
  onPause,
  onResume,
  // 녹음 위젯 바로 아래 한 줄로 붙는 안내 (선택). 문구·노출 조건은 소비처가 쥔다 —
  // 「이 녹음은 업로드 전까지 이 브라우저에만 있다」처럼 소비처만 아는 사실이다.
  recordingNotice = null,
  // 녹음 바를 손으로 접는다 (PW-578 · policy §5.7.3). 콜백이 없으면 버튼도 없다 —
  // 접은 뒤의 모습(앱 안 최소화 위젯)을 그리는 것은 소비처 몫이라, 소비처가
  // 준비되지 않았는데 버튼만 있으면 눌러도 아무 일이 없다.
  onCollapseRecording,
  collapseRecordingLabel,
  // 접힌 상태 (PW-578). 접히면 녹음 바를 그리지 않는다 — 접은 모습(앱 안 최소화
  // 위젯)은 소비처가 그리므로, 여기까지 남으면 같은 회차의 위젯이 둘이 된다.
  recordingCollapsed = false,
  // ── 미팅 시작·종료를 소비처가 서버에 반영하기 위한 콜백 ──
  onStartMeeting,
  onEndMeeting,
  // ── LIVE 대화 내비게이터 (PW-429). null 이면 카드를 그리지 않는다 ──
  liveGuide = null,
  // ── READY 진행 스크립트 카드 (PW-478 · policy §4.1.2-A) ──
  // 같은 `LiveGuideCard` 를 AI 브리핑 **아래**에 한 번 더 그린다. null 이면 안 그린다 —
  // LIVE 카드와 마찬가지로 단계·역할 판정은 소비처가 쥔다.
  readyGuide = null,
  // ── 세션 경과 (PW-478 · policy §5.0) ──
  // 주면 controlled — 이 컴포넌트가 자기 타이머를 돌리지 않고 이 값을 그대로 쓴다.
  // `null` 이면 아직 t0 가 없다는 뜻이라 녹음 위젯이 `--:--` 를 보인다.
  elapsedSec: elapsedSecProp,
  // ── 시작 전 확인 (PW-478 · policy §5.1) ──
  // `startBlocked` 면 「시작하기」가 미팅을 시작하는 대신 `onStartBlocked()` 만 부른다.
  // 소비처가 안내를 띄우고, 사용자가 「그대로 시작」을 고르면 소비처가 직접 시작한다.
  // 🔴 버튼을 `disabled` 로 잠그지 않는다 — 상대가 앞에 앉은 화면에서 「AI 가 준비될
  // 때까지 시작할 수 없음」은 도구가 대화를 막는 것이다(미채택안).
  startBlocked = false,
  onStartBlocked,
  busy = false,
  busyLabel = null,
}) {
  const briefing = data?.briefing ?? null;
  const memberReport = data?.memberReport ?? null;
  const okrSelf = data?.okrSelf ?? [];
  const upwardFeedback = data?.upwardFeedback ?? null;
  // 역량 5개 항목은 고정. data.capabilities 는 멤버 자가진단 value 만 override.
  const capabilities = useMemo(() => {
    const overrides = new Map(
      (data?.capabilities ?? []).map((c) => [c.key, c.value]),
    );
    return DEFAULT_CAPABILITIES.map((c) => ({
      ...c,
      value: overrides.get(c.key) ?? 0,
    }));
  }, [data?.capabilities]);
  const memberAgendas = data?.memberAgendas ?? [];
  const initialMgrAgendas = useMemo(() => data?.initialMgrAgendas ?? [], [data?.initialMgrAgendas]);
  // 멤버 준비도: 멤버 READY 화면(별도) 의 7 섹션 진행도. 백엔드에서 계산해 props 로
  // 전달. null/undefined 면 "—" 로 표시. (spec §4.1.1 / §4.2.3)
  const memberReadyPct = data?.memberReadyPct ?? null;
  const expectedActions = data?.expectedActions ?? [];
  const meetingTime = data?.meetingTime ?? '';
  const meetingTitle = data?.meetingTitle ?? '1on1';

  // aiGenerated: 섹션별로 AI 초안이 채워졌는지. 색/버튼 분기를 섹션 단위로
  // 독립시킨다 — 한 섹션 생성해도 다른 섹션이 보라색으로 변하지 않게.
  const aiGenerated = {
    strengths: !!aiDrafts?.strengths,
    sbi: !!aiDrafts?.sbi,
    support: !!aiDrafts?.support,
    caps: !!aiDrafts?.capabilities,
  };
  const anyAiGenerated =
    aiGenerated.strengths ||
    aiGenerated.sbi ||
    aiGenerated.support ||
    aiGenerated.caps;
  // briefingOpen: 브리핑 카드 펼침 토글. briefing 데이터가 있거나 어느 섹션이든
  // AI 초안이 있으면 기본 펼친 상태로 시작.
  const [briefingOpen, setBriefingOpen] = useState(anyAiGenerated || !!briefing);
  // 🔴 effect 가 아니라 **렌더 중 조정**이다 (react.dev "You Might Not Need an Effect"
  // 의 prop 변경 시 state 리셋 패턴). 판정과 dep 비교는 예전 effect 와 같다 —
  // `[anyAiGenerated, briefing]` 중 하나라도 바뀐 렌더에서만 다시 펼친다.
  // effect 로 두면 접힌 상태가 한 프레임 그려졌다 펼쳐져 카드가 깜빡인다.
  const [prevBriefingDeps, setPrevBriefingDeps] = useState({
    anyAiGenerated,
    briefing,
  });
  if (
    prevBriefingDeps.anyAiGenerated !== anyAiGenerated ||
    prevBriefingDeps.briefing !== briefing
  ) {
    setPrevBriefingDeps({ anyAiGenerated, briefing });
    if (anyAiGenerated || briefing) setBriefingOpen(true);
  }

  // initialPerspective 가 주어지면 모든 입력 상태를 그 값으로 복원.
  // fallback 효과(멤버 자가진단으로 caps 리셋, initialMgrAgendas → mgrAgendas)는
  // 복원 모드에서는 건너뛴다 — 자동 저장된 값을 멤버 초기값으로 덮어쓰면 안 되므로.
  const hasInitialPerspective = !!initialPerspective;

  const [strengths, setStrengths] = useState(initialPerspective?.strengths ?? '');
  const [sbi, setSbi] = useState(initialPerspective?.sbi ?? '');
  const [support, setSupport] = useState(initialPerspective?.support ?? '');

  // caps: 복원 우선 → 없으면 멤버 자가진단(data.capabilities) → AI 초안으로 덮어쓰기.
  const [caps, setCaps] = useState(() =>
    initialPerspective?.capabilities ??
      Object.fromEntries(DEFAULT_CAPABILITIES.map((c) => [c.key, 0])),
  );
  // 위와 같은 이유로 렌더 중 조정. dep 비교도 `[capabilities, hasInitialPerspective]`
  // 그대로다 — `capabilities` 는 useMemo 라 data 가 바뀔 때만 identity 가 바뀐다.
  // `null` 초기값은 「아직 한 번도 안 맞췄다」는 뜻이다 — 예전 effect 가 **마운트에서도**
  // 돌았으므로 첫 렌더에서 한 번은 반드시 맞춰야 한다. 현재 값으로 초기화하면 첫 렌더가
  // 통째로 건너뛰어져 초기 동기화가 사라진다.
  const [prevCapsDeps, setPrevCapsDeps] = useState(null);
  if (
    prevCapsDeps === null ||
    prevCapsDeps.capabilities !== capabilities ||
    prevCapsDeps.hasInitialPerspective !== hasInitialPerspective
  ) {
    setPrevCapsDeps({ capabilities, hasInitialPerspective });
    if (!hasInitialPerspective) {
      setCaps(Object.fromEntries(capabilities.map((c) => [c.key, c.value])));
    }
  }

  // 새 초안이 도착한 렌더에서만 입력을 덮어쓴다 (dep 은 `[aiDrafts]` 그대로).
  // 부분 생성은 소비처가 누적 머지해 새 객체로 주므로 identity 비교로 충분하다.
  // 마운트 시점에 이미 초안이 주어질 수 있다(복원·재렌더). `undefined` 센티널로
  // 첫 렌더에서 반드시 한 번 맞춘다 — `aiDrafts` 자체는 `null` 일 수 있어 `null` 은
  // 센티널로 못 쓴다.
  const [prevAiDrafts, setPrevAiDrafts] = useState(undefined);
  if (prevAiDrafts !== aiDrafts) {
    setPrevAiDrafts(aiDrafts);
    if (aiDrafts) {
      if (aiDrafts.strengths != null) setStrengths(aiDrafts.strengths);
      if (aiDrafts.sbi != null) setSbi(aiDrafts.sbi);
      if (aiDrafts.support != null) setSupport(aiDrafts.support);
      if (aiDrafts.capabilities) {
        setCaps((prev) => ({ ...prev, ...aiDrafts.capabilities }));
      }
    }
  }

  // 매니저 관점 4개 항목 확정 상태.
  const [confirmed, setConfirmed] = useState(
    initialPerspective?.confirmed ?? {
      strengths: false,
      sbi: false,
      support: false,
      caps: false,
    },
  );
  // 아젠다: 매니저만 추가/삭제할 수 있다.
  const [mgrAgendas, setMgrAgendas] = useState(
    initialPerspective?.mgrAgendas ?? [],
  );
  const [prevAgendaDeps, setPrevAgendaDeps] = useState(null);
  if (
    prevAgendaDeps === null ||
    prevAgendaDeps.initialMgrAgendas !== initialMgrAgendas ||
    prevAgendaDeps.hasInitialPerspective !== hasInitialPerspective
  ) {
    setPrevAgendaDeps({ initialMgrAgendas, hasInitialPerspective });
    if (!hasInitialPerspective) setMgrAgendas(initialMgrAgendas);
  }
  const [agendaInput, setAgendaInput] = useState('');

  // 자동 저장: 매니저 관점 4섹션/역량/확정/아젠다 중 하나라도 바뀌면 부모에게 통지.
  // 최초 마운트는 skip — 복원/초기값을 다시 PATCH 로 보내지 않기 위함.
  // (useManagerPerspectiveAutoSave 훅이 페이로드 dedupe 도 하지만, 마운트 직후
  // 한 번을 건너뛰면 불필요한 호출이 더 줄어든다.)
  const perspectiveChangeRef = useRef(onPerspectiveChange);
  useEffect(() => {
    perspectiveChangeRef.current = onPerspectiveChange;
  }, [onPerspectiveChange]);
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (!perspectiveChangeRef.current) return;
    perspectiveChangeRef.current({
      strengths,
      sbi,
      support,
      capabilities: {
        expertise: caps.expertise ?? 0,
        communication: caps.communication ?? 0,
        problemSolving: caps.problemSolving ?? 0,
        teamwork: caps.teamwork ?? 0,
        selfDriven: caps.selfDriven ?? 0,
      },
      confirmed,
      mgrAgendas,
    });
  }, [strengths, sbi, support, caps, confirmed, mgrAgendas]);

  // ── 녹음 상태 ──
  // recording prop 이 있으면 controlled, 없으면 내부 state. "시작하기" → 녹음 시작:
  // 페이지 최상단 스크롤 + sticky 미니 녹음 위젯 + 경과 타이머.
  const [recordingState, setRecordingState] = useState(false);
  const recording = recordingProp ?? recordingState;
  const setRecording = (next) => {
    setRecordingState(next);
    onRecordingChange?.(next);
  };
  // 🔴 `elapsedSec` 을 주면 **자체 타이머를 돌리지 않는다** (PW-478 · policy §5.0 T1).
  // 예전에는 여기서 1초씩 더했는데, 소비처의 헤더 타이머는 서버 시각에서 파생해서
  // 같은 클릭에서 출발하고도 왕복 지연만큼 벌어졌다 — dev 에서 `00:27` ↔ `00:26`.
  // 자리마다 따로 세는 한 한 자리를 고쳐도 나머지가 남는다.
  const controlledElapsed = elapsedSecProp !== undefined;
  const [ownElapsedSec, setOwnElapsedSec] = useState(0);
  // 일시정지 동안에는 세지 않는다 — 화면 경과 시간이 실제 녹음 길이보다 앞서면
  // 전사 발화 시각(HH:MM:SS)을 앵커로 쓰는 근거 발췌와 어긋난다.
  useEffect(() => {
    if (controlledElapsed || !recording || paused) return undefined;
    const id = setInterval(() => setOwnElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [controlledElapsed, recording, paused]);
  const elapsedSec = controlledElapsed ? elapsedSecProp : ownElapsedSec;

  const startMeeting = () => {
    // 스크립트를 안 만든 채 시작하려는 경우 — 소비처가 안내를 띄운다 (policy §5.1).
    // 여기서 녹음 상태를 먼저 켜면 안내 뒤에 녹음 위젯이 이미 떠 있게 된다.
    if (startBlocked) {
      onStartBlocked?.();
      return;
    }
    setOwnElapsedSec(0);
    setRecording(true);
    onStartRecording?.();
    // 녹음 표시는 로컬 상태지만, 미팅을 실제로 "진행 중" 으로 만드는 건 소비처다.
    onStartMeeting?.();
    document.querySelector('.ono-page')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const endMeeting = () => {
    setRecording(false);
    // 종료·AI 요약 생성은 소비처가 처리한다(콜백 없으면 녹음만 멈추는 데모 동작).
    onEndMeeting?.();
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  // 매니저 관점 4개 섹션 모두 확정해야 "시작하기" 활성화. caps 섹션은 항상 렌더.
  const activeKeys = MGR_SECTIONS.map((s) => s.key);
  const activeTotal = activeKeys.length;
  const confirmedCount = activeKeys.filter((k) => confirmed[k]).length;
  const allConfirmed = confirmedCount === activeTotal;

  // section 미지정 = 전체 생성, 지정 = 해당 섹션만. 무언가 생성 중이면 무시.
  const handleGenerate = (section) => {
    if (!onGenerateDrafts || generatingSection) return;
    onGenerateDrafts(section);
  };
  const isGenerating = !!generatingSection;
  // 실패 박스의 `다시 시도` — 'all' 은 섹션 미지정 호출로 되돌린다.
  const retryGenerate = (key) => handleGenerate(key === 'all' ? undefined : key);
  const failureOf = (key) => aiFailures?.[key] ?? null;
  const toggleConfirm = (key) => setConfirmed((p) => ({ ...p, [key]: !p[key] }));

  const removeMgrAgenda = (a) => setMgrAgendas((prev) => prev.filter((x) => x !== a));
  const addMgrAgenda = () => {
    const v = agendaInput.trim();
    if (!v) return;
    setMgrAgendas((prev) => [...prev, v]);
    setAgendaInput('');
  };

  const sectionValue = (key) => ({ strengths, sbi, support }[key] ?? '');
  const setSectionValue = (key, v) => {
    if (key === 'strengths') setStrengths(v);
    else if (key === 'sbi') setSbi(v);
    else if (key === 'support') setSupport(v);
  };

  return (
    <div className="ono-start-view">
      <div className="ono-start-view-card">
        {recording && !recordingCollapsed && (
          <OneOnOneRecordingWidget
            member={member}
            meetingTime={meetingTime}
            elapsed={
              elapsedSec === null ? NO_CLOCK : formatElapsed(elapsedSec)
            }
            paused={paused}
            onPause={onPause}
            onResume={onResume}
            onStop={endMeeting}
            notice={recordingNotice}
            onCollapse={onCollapseRecording}
            collapseLabel={collapseRecordingLabel}
          />
        )}
        <div className="ono-start-view-body">
          <p className="ono-start-modal-title">{meetingTitle}</p>

          {/* 멤버 */}
          <div className="ono-add-modal-member">
            <div className="ono-add-modal-member-avatar">
              {member?.avatar && <img src={member.avatar} alt="" />}
            </div>
            <div className="ono-add-modal-member-info">
              <div className="ono-add-modal-member-name-row">
                <span className="ono-add-modal-member-name">{member?.name ?? ''}</span>
                {member?.badge && (
                  <span className="ono-add-modal-member-badge">{member.badge}</span>
                )}
              </div>
              {meetingTime && (
                <span className="ono-add-modal-member-role">{meetingTime}</span>
              )}
            </div>
          </div>

          {/* LIVE 대화 내비게이터 — 매니저 전용, LIVE 최상단 (policy §5.2.1).
              렌더 판정(단계·역할)은 소비처가 한다: 이 컴포넌트는 READY·LIVE·DONE 을
              구분하지 않으므로, 여기서 그리기로 정하면 READY 화면에도 새어 나온다. */}
          {liveGuide && <LiveGuideCard {...liveGuide} baseUrl={liveGuide.baseUrl ?? baseUrl} />}

          {/* 준비도 — spec §4.1.1
              · 멤버: 멤버 READY view 7섹션 완료율 (외부 prop)
              · 매니저: 매니저 관점 4섹션 확정 비율 (내부 confirmedCount 자동) */}
          {(() => {
            const managerReadyPct = Math.round((confirmedCount / activeTotal) * 100);
            const managerColor =
              managerReadyPct === 100
                ? 'var(--utility-green-600, #16A34A)'
                : managerReadyPct > 0
                  ? 'var(--colors-text-textWarningPrimary, #d97706)'
                  : 'var(--text-tertiary, #888)';
            const memberColor = 'var(--text-brand-primary, #2563EB)';
            const rows = [
              {
                who: member?.name ?? '팀원',
                pct: memberReadyPct,
                color: memberColor,
              },
              {
                who: '나 (매니저)',
                pct: managerReadyPct,
                color: managerColor,
              },
            ];
            return (
              <div className="ono-start-section">
                <span className="ono-start-section-title">준비도</span>
                <div className="ono-start-prep">
                  {rows.map((b) => (
                    <div key={b.who} className="ono-start-prep-row">
                      <div className="ono-start-prep-meta">
                        <span className="ono-start-prep-who">{b.who}</span>
                        <span
                          className="ono-start-prep-pct"
                          style={{ color: b.color }}
                        >
                          {b.pct == null ? '—' : `${b.pct}%`}
                        </span>
                      </div>
                      <ProgressBar pct={b.pct} color={b.color} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* CTA bar — 한 섹션이라도 AI 초안 받았으면 "생성 완료" 상태로 전환. */}
          {anyAiGenerated ? (
            <div className="ono-start-cta is-done">
              <span className="ono-start-cta-left">
                <Icon src="/icons-solid/check-circle.svg" size={20} color="var(--utility-purple-500, #7a5af8)" baseUrl={baseUrl} />
                AI 초안 생성 완료 — {confirmedCount}/{activeTotal} 항목 확정됨
              </span>
              <span className="ono-start-cta-hint">검토 후 확정하세요</span>
            </div>
          ) : (
            <button
              type="button"
              className="ono-start-cta is-cta"
              onClick={() => handleGenerate()}
              disabled={!onGenerateDrafts || isGenerating}
            >
              <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="var(--text-white)" baseUrl={baseUrl} />
              {generatingSection === 'all'
                ? 'AI 초안 생성 중...'
                : 'AI 브리핑 및 매니저 관점 초안 전체 생성'}
            </button>
          )}

          {/* 전체 생성 실패 — 눌린 버튼 바로 아래에서 말한다 (policy §7.5.3). */}
          {failureOf('all') && (
            <AiFailBox
              targetKey="all"
              failure={failureOf('all')}
              onRetry={retryGenerate}
              busy={isGenerating}
            />
          )}

          {/* AI 브리핑 카드 */}
          <div className="ono-start-briefing-card">
            <div className="ono-start-briefing-head">
              <span className="ono-start-briefing-title">
                <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="#ad00fe" baseUrl={baseUrl} />
                AI 브리핑
              </span>
              {briefingOpen ? (
                <button type="button" className="ono-start-briefing-toggle" onClick={() => setBriefingOpen(false)}>접기</button>
              ) : briefing ? (
                <button type="button" className="ono-start-briefing-toggle" onClick={() => setBriefingOpen(true)}>펼치기</button>
              ) : (
                <span className="ono-start-briefing-toggle is-disabled" aria-disabled="true">
                  브리핑 없음
                </span>
              )}
            </div>

            {briefingOpen && briefing && (
              <>
                <div className="ono-start-briefing-block">
                  <div className="ono-start-briefing-text-box">
                    <p className="ono-start-briefing-text">{briefing.summary}</p>
                  </div>
                  {(briefing.flags ?? []).length > 0 && (
                    <div className="ono-start-briefing-badges">
                      {briefing.flags.map((f) => (
                        <span key={f.label} className={`ono-start-flag ono-start-flag-${f.tone ?? 'warning'}`}>
                          {f.icon && (
                            <Icon src={f.icon} size={12} color="currentColor" baseUrl={baseUrl} />
                          )}
                          {f.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {(briefing.coachingGuide ?? []).length > 0 && (
                  <div className="ono-start-briefing-block">
                    <span className="ono-start-briefing-subtitle">코칭 가이드</span>
                    {briefing.coachingGuide.map((g) => (
                      <div key={g.title} className="ono-start-coaching-card">
                        <p className="ono-start-coaching-title">{g.title}</p>
                        <p className="ono-start-coaching-body">{g.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 진행 스크립트 (READY 생성 — policy §4.1.2-A · PW-478).
                AI 브리핑 **아래**다: 브리핑이 이 스크립트의 입력이라 읽는 순서가 생성
                순서와 같다. 준비도 카운터에는 들어가지 않는다 — 조력 콘텐츠이지 준비
                항목이 아니라서, 세면 「AI 를 눌러야 준비가 끝난다」가 된다. */}
            {readyGuide && (
              <div className="ono-start-briefing-block" data-testid="ono-ready-guide-slot">
                <LiveGuideCard
                  {...readyGuide}
                  baseUrl={readyGuide.baseUrl ?? baseUrl}
                />
              </div>
            )}

            <div className="ono-start-briefing-block">
              <span className="ono-start-briefing-subtitle">멤버 AI 보고서 · 읽기 전용</span>
              {memberReport ? (
                <div className="ono-start-report">
                  <p className="ono-start-report-text">{memberReport.text}</p>
                  {memberReport.source && (
                    <p className="ono-start-report-source">{memberReport.source}</p>
                  )}
                </div>
              ) : (
                <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
              )}
            </div>

            <div className="ono-start-briefing-block">
              <span className="ono-start-briefing-subtitle">OKR 자가 평가</span>
              {okrSelf.length > 0 ? (
                <div className="ono-start-okr">
                  {okrSelf.map((k) => (
                    <div key={k.kr} className="ono-start-okr-row">
                      <p className="ono-start-okr-kr">{k.kr}</p>
                      <div className="ono-start-okr-bars">
                        <div className="ono-start-okr-bar">
                          <span className="ono-start-okr-bar-label">실제</span>
                          <div className="ono-start-okr-bar-line">
                            <ProgressBar pct={k.actual ?? 0} />
                            <span className="ono-start-okr-bar-pct">{k.actual ?? 0}%</span>
                          </div>
                        </div>
                        {k.self != null && (
                          <div className="ono-start-okr-bar">
                            <span className="ono-start-okr-bar-label">자가 평가</span>
                            <div className="ono-start-okr-bar-line">
                              <ProgressBar pct={k.self} />
                              <span className="ono-start-okr-bar-pct">{k.self}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {k.alert && (
                        <p className="ono-start-okr-alert">
                          <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textErrorPrimary, #d92d20)" baseUrl={baseUrl} />
                          {k.alert}
                        </p>
                      )}
                    </div>
                  ))}
                  {upwardFeedback && (
                    <div className="ono-start-upward">
                      <span className="ono-start-upward-label">Upward Feedback</span>
                      <p className="ono-start-upward-text">{upwardFeedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
              )}
            </div>
          </div>

          {/* 매니저 관점 */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">
              매니저 관점{anyAiGenerated ? ' (DONE 전까지 멤버 비공개)' : ''}
            </span>
            <div className="ono-start-mgr">
              {MGR_SECTIONS.map((sec) => {
                return (
                  <div key={sec.key} className="ono-start-field">
                    <div className="ono-start-field-head">
                      <div className="ono-start-field-label-row">
                        <span className="ono-start-field-label">{sec.title}</span>
                        {sec.badges.map((b) => (
                          <span key={b} className="ono-start-source-badge">{b}</span>
                        ))}
                      </div>
                      <div className="ono-start-field-actions">
                        {!aiGenerated[sec.key] ? (
                          <button
                            type="button"
                            className="ono-start-ai-draft-btn"
                            onClick={() => handleGenerate(sec.key)}
                            disabled={!onGenerateDrafts || isGenerating}
                          >
                            <Icon src="/icons-solid/ai-chat-01.svg" size={14} color="currentColor" baseUrl={baseUrl} />
                            <span>
                              {generatingSection === sec.key ? '생성 중' : 'AI 초안'}
                            </span>
                          </button>
                        ) : confirmed[sec.key] ? (
                          <button type="button" className="ono-start-edit-btn" onClick={() => toggleConfirm(sec.key)}>수정</button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="ono-start-regen-btn"
                              onClick={() => handleGenerate(sec.key)}
                              disabled={isGenerating}
                            >
                              {generatingSection === sec.key ? '생성 중' : '재생성'}
                            </button>
                            <button type="button" className="ono-start-confirm-btn" onClick={() => toggleConfirm(sec.key)}>확정</button>
                          </>
                        )}
                      </div>
                    </div>
                    {sec.hint && (
                      <div className="ono-start-hint-badges">
                        {sec.hint.map((h) => (
                          <span key={h} className="ono-start-topic-badge">{h}</span>
                        ))}
                      </div>
                    )}
                    {aiGenerated[sec.key] && confirmed[sec.key] && (
                      <span className="ono-start-confirmed-label">✓ 확정됨</span>
                    )}
                    {/* 실패는 해당 필드 안, 입력 바로 위에 붙는다. 이미 받은 초안이
                        있으면 지우지 않고 그 위에 얹는다 (재생성 실패 · §7.5.2). */}
                    {failureOf(sec.key) && (
                      <AiFailBox
                        targetKey={sec.key}
                        failure={failureOf(sec.key)}
                        onRetry={retryGenerate}
                        busy={isGenerating}
                      />
                    )}
                    {sec.kind === 'textarea' ? (
                      <textarea
                        className={`ono-start-textarea ${aiGenerated[sec.key] && !confirmed[sec.key] ? 'is-ai' : ''}`}
                        placeholder={TEXTAREA_PLACEHOLDER}
                        value={sectionValue(sec.key)}
                        onChange={(e) => setSectionValue(sec.key, e.target.value)}
                      />
                    ) : (
                      <>
                        <div className="ono-start-caps">
                          {capabilities.map((c) => (
                            <div key={c.key} className="ono-start-cap-row">
                              <span className="ono-start-cap-label">{c.label}</span>
                              <RatingBar
                                value={caps[c.key] ?? 0}
                                ai={aiGenerated.caps}
                                onChange={(v) =>
                                  setCaps((prev) => ({ ...prev, [c.key]: v }))
                                }
                              />
                            </div>
                          ))}
                        </div>
                        <p className="ono-start-cap-hint">멤버 자가진단 대비 차이가 표시됩니다. 클릭해서 수정 가능합니다.</p>
                      </>
                    )}
                    {aiGenerated[sec.key] && (
                      <p className="ono-start-ai-warn">
                        <Icon src="/icons-solid/alert-triangle.svg" size={12} color="var(--colors-text-textWarningPrimary, #dc6803)" baseUrl={baseUrl} />
                        {AI_WARN}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 아젠다 & 액션아이템 — 매니저 모드 전용 뷰. 멤버 제안·예상 액션은
              읽기 전용이며, 매니저는 "매니저 추가 아젠다"만 추가/삭제할 수 있다. */}
          <div className="ono-start-section">
            <span className="ono-start-section-title">아젠다 &amp; 액션아이템</span>
            <div className="ono-start-mgr">
              {/* 멤버 제안 아젠다 — 읽기 전용 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">멤버 제안 아젠다</span>
                {memberAgendas.length > 0 ? (
                  <div className="ono-start-agenda-list">
                    {memberAgendas.map((a) => (
                      <div key={a} className="ono-start-agenda-item">
                        <span className="ono-start-agenda-role is-member">멤버</span>
                        <span className="ono-start-agenda-text">{a}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
                )}
              </div>
              {/* 매니저 추가 아젠다 — 매니저만 추가/삭제 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">매니저 추가 아젠다</span>
                <div className="ono-start-agenda-list">
                  {mgrAgendas.map((a) => (
                    <div key={a} className="ono-start-agenda-item is-mgr">
                      <span className="ono-start-agenda-role is-manager">매니저</span>
                      <span className="ono-start-agenda-text">{a}</span>
                      <button type="button" className="ono-start-agenda-x" aria-label="삭제" onClick={() => removeMgrAgenda(a)}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="4" x2="4" y2="12" />
                          <line x1="4" y1="4" x2="12" y2="12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="ono-start-agenda-add">
                  <input
                    type="text"
                    placeholder="논의 주제 추가 (Enter)"
                    value={agendaInput}
                    onChange={(e) => setAgendaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMgrAgenda(); } }}
                  />
                  <button type="button" className="ono-start-agenda-add-btn" onClick={addMgrAgenda}>추가</button>
                </div>
              </div>
              {/* 확정 예상 액션아이템 */}
              <div className="ono-start-field">
                <span className="ono-start-field-label">이번 미팅에서 확정할 액션아이템 (예상)</span>
                {expectedActions.length > 0 ? (
                  <div className="ono-start-agenda-list">
                    {expectedActions.map((a) => (
                      <div key={a.text} className="ono-start-action-item">
                        <span className="ono-start-action-text">• {a.text}</span>
                        <span className="ono-start-action-meta">
                          {a.owner && (
                            <span className="ono-start-action-owner">{a.owner}</span>
                          )}
                          {a.due && (
                            <span className="ono-start-action-badge">{a.due}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ono-start-empty-hint">{EMPTY_HINT}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="ono-start-view-footer">
          <button type="button" className="ono-add-modal-btn ono-add-modal-btn-secondary" onClick={onBack}>저장</button>
          {busy ? (
            <button type="button" className="ono-add-modal-btn ono-start-footer-disabled" disabled>
              {busyLabel ?? (recording ? '1on1 종료' : '시작하기')}
            </button>
          ) : recording ? (
            <button type="button" className="ono-add-modal-btn ono-start-footer-end" onClick={endMeeting}>1on1 종료</button>
          ) : allConfirmed ? (
            <button type="button" className="ono-add-modal-btn ono-add-modal-btn-primary" onClick={startMeeting}>시작하기</button>
          ) : (
            <button type="button" className="ono-add-modal-btn ono-start-footer-disabled" disabled>
              매니저 관점 확정 후 시작 가능({confirmedCount}/{activeTotal})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
