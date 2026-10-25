import { useAiDraftLifecycle } from '../shared/useAiDraftLifecycle.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import AiMark from '../shared/AiMark.jsx';
import { AlertTriangleGlyph } from '../shared/lineIcons.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';
import Button from '../shared/Button.jsx';
import TextInput from '../shared/TextInput.jsx';
import OkrMemberPicker from './OkrMemberPicker.jsx';

/**
 * OkrSetupWizardModal — OKR 설정 마법사 (Backward Looking).
 *
 * 시안 pivit-specs okr-setup-wizard.jsx 를 정본에 포팅.
 * 단계: ① 미래 구술 → ② AI Objective 도출·확인 → ③ AI KR 추출·검토 → ④ 정합성 확인(조직 단위) → 저장.
 * (정책서 v2.1 · PW-734 — 구술에서 Objective 를 먼저 확정하고, 그 문장을 재료로 KR 을 뽑는다.)
 *
 * 🔴 단위는 마법사 안에서 고르지 않는다 — **연 화면이 단위다** (정책서
 * screen-okr-setup-wizard §2A · 시안 okr-app.jsx `ScopeContext`/`BlockedBody`).
 *  - scope      — 진입 단위(고정). 구술 예시·저장 level 에 쓴다.
 *  - scopeCard  — 1단계 「단위 고정」 카드 문구 { label, desc, badge } (§2A.3).
 *  - targets    — 같은 계층 안의 대상 조직 [{ id, name }]. 1개면 이름만, 2개 이상이면 셀렉트.
 *  - blocked    — 쓸 수 없는 진입이면 { title, desc } — 본문 대신 사유 카드 + [닫기] (§2A.4).
 *  - showAlignment — 정합성 단계를 그릴지. 개인 단위·구성원은 3단계다(§2 · §7).
 *
 * AI/저장은 소비자 콜백으로 배선한다 — 전부 고른 대상 조직(targetId)을 함께 받는다:
 *  - onDeriveObjective(scope, narrative, targetId) → Promise<{ objective: { title } }>
 *  - onExtractKrs(scope, narrative, objective, targetId) → Promise<{ keyResults: [{title,type,targetValue,unit}] }>
 *  - onFetchAlignment(scope, targetId) → Promise<{ members, emptyMessage? }>
 *      members[].note — 미정렬 사유 문구(소비자가 번역·조합해 넘긴다. 예: 「상위 OKR 미연결 · 플랫폼팀」)
 *      members[].canBookOneOnOne — false 면 그 사람에게 [1:1 예약] 을 두지 않는다. 조치할 사람이
 *        본인이 아닌 사유(「상위 OKR 미연결」)가 그렇다 (pivit-specs 마법사 정책서 §3-4 · PW-729).
 *      members[].alignedLabel — 「정렬 n / N KR」 보조 표시(소비자가 번역해 넘긴다). 없으면 그 줄을 그리지 않는다
 *        (정책서 §3-4 구성원 정렬도 카드 · 시안 okr-app.jsx `StepAlignment` · PW-1506).
 *      emptyMessage — 판정할 수 없을 때(그 단위에 저장된 KR 이 없음) 사람 목록 대신 보일 문구.
 *  - onSubmit({ level, objective, krs, targetId }) → OKR 생성. krs[].ownerId — 고른 KR 담당자(없으면 '').
 *
 * KR 담당자 (선택 · 정책서 §3-3 KR 행 「지표명/현재/목표/단위/담당자/삭제」 · PW-1506):
 *  - members — [{ id, name, role?, avatar?, color? }]. 일반 작성 창(OkrComposeFullModal)과 같은 목록·같은 고르기 부품.
 *      비어 있으면 담당자 칸을 그리지 않는다 — 고를 사람이 없는 빈 칸을 남기지 않는다.
 *  - selfId — 새 KR(직접 추가·AI 추출)의 담당자 기본값. 일반 작성 창과 같다.
 *
 * 제목·되돌리기 (선택):
 *  - title — 창 제목. 기본 「OKR 설정」. 소비자가 단위를 넣어 준다(`OKR 설정 마법사 · 팀 OKR` · okr-policy §1.4.1).
 *  - initialState — 마지막으로 알린 상태로 다시 연다 { step, narrative, objective, objConfirmed, krs, krsConfirmed, visionImage }.
 *  - onStateChange(state) — 위 모양이 바뀔 때마다 알린다. 4단계 [1:1 예약]으로 화면을 떠났다가
 *      뒤로 돌아왔을 때 진행도를 되살리는 데 쓴다(마법사 정책서 §8 「Step 4 1on1 예약 후 뒤로가기」).
 *
 * 회사 컨텍스트 (선택 · 마법사 정책서 §3-0, 시안 okr-app.jsx `WizardScreen`):
 *  - contextEntry — { title, badge, desc, action }. 단계 칩 위 진입 배너. 소비자가 어드민에게만 넘긴다.
 *  - contextNotice — { text, hint, action? }. 1단계 맨 위 «컨텍스트 미설정» 안내(경고 아님). 소비자가
 *      미설정일 때만 넘기고, 어드민에게만 action(버튼 문구)을 싣는다.
 *  - onOpenContext() — 위 둘의 버튼을 누르면 부른다(컨텍스트 설정 화면으로 보낸다).
 *  - contextAppliedLabel — onExtractKrs 결과에 `contextApplied: true` 가 오면 KR 초안 머리에 붙일 배지 문구.
 *  막지 않는다 — 컨텍스트가 없어도 마법사는 그대로 진행된다.
 *
 * 문구 (선택 · pivit-work 영어 화면):
 *  - labels — 창 안 글자 묶음. 넘긴 키만 덮고 나머지는 아래 DEFAULT_LABELS(종전 한국어) 그대로다.
 *      `{{name}}` 자리는 부품이 채운다(남은 글자 수·합계 등). ✓·✦·+ 글리프는 부품이 붙이고 라벨에는 글자만 들어온다
 *      (소비자 번역 번들의 글리프 금지 검사 때문 · OkrComposeFullModal 과 같은 약속).
 *
 * AI 버튼 자리 안내 (선택 · 마법사 정책서 §5 · okr-policy §5.5A · 체험 AI 소진):
 *  - onAiError(at, error) — AI 콜백이 실패하면 먼저 부른다(at = 'vision' | 'objective' | 'krs').
 *      `true` 를 돌려주면 소비자가 그 실패를 안내로 대신한 것이라 아래 빨간 실패 문구를 띄우지 않는다.
 *  - aiNotice — { at, content } | null. 그 버튼 바로 아래에 content(노드)를 그린다. 한 번에 하나다.
 *  버튼은 숨기지도 잠그지도 않는다 — 직접 입력·저장은 그대로다.
 */
const DEFAULT_SCOPE_CARD = {
  individual: { label: '개인 OKR', desc: '내 OKR을 직접 설계', badge: '단위 고정' },
  team: { label: '팀 OKR', desc: '팀 단위 OKR — 팀장 권한', badge: '단위 고정' },
  company: { label: '전사 OKR', desc: '회사 전체 OKR — 어드민', badge: '단위 고정' },
};

/** 창 안 글자 기본값 — 시안 그대로의 한국어. 소비자가 `labels` 로 덮는다. */
const DEFAULT_LABELS = {
  // 단계 칩
  stepNarrative: '미래 구술',
  stepNarrativeDesc: '12/31 모습',
  stepObjective: 'Objective',
  stepObjectiveDesc: '한 문장 도출',
  stepKrs: 'KR 추출',
  stepKrsDesc: '측정 결과',
  stepAlignment: '정합성 확인',
  stepAlignmentDesc: '팀장',
  // 1단계 구술 칸 예시 — 진입 단위마다 다르다
  narrativePlaceholderIndividual: '12월 31일, 나는 피빗 프론트엔드의 메인 컨트리뷰터로 자리잡았고,\n주요 화면 12개의 성능 점수를 90점 이상으로 끌어올렸다.',
  narrativePlaceholderTeam: '12월 31일, 우리 팀은 고객 …개사·매출 …억을 달성했고, NRR …%를 유지한다.',
  narrativePlaceholderCompany: '12월 31일, 우리 회사는 ARR …억·고객 …개사를 확보하고 시리즈 A 를 마무리했다.',
  // 실패
  krsFailed: 'KR 추출에 실패했습니다. 잠시 후 다시 시도해주세요.',
  objectiveFailed: 'Objective 작성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  saveFailed: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
  visionFailed: '비전 이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  // 발 줄 — `{{remaining}}` 남은 글자 수, `{{check}}` 확인 표시(✓), `{{step}}`·`{{total}}` 단계
  hintNarrativeMore: '미래 모습을 {{remaining}}자 더 입력하세요 (최소 30자)',
  hintObjectiveGenerate: 'AI로 Objective 초안을 생성하세요',
  hintObjectiveConfirm: 'Objective 초안을 확인({{check}})해야 다음으로 진행됩니다',
  hintKrsGenerate: 'AI로 KR 초안을 생성하세요',
  hintKrsConfirm: 'KR 초안을 확인({{check}})해야 다음으로 진행됩니다',
  stepCounter: 'STEP {{step}} / {{total}}',
  prev: '이전',
  next: '다음',
  submit: 'OKR 확정 저장',
  saving: '저장 중…',
  generating: '생성 중…',
  // 1단계
  step1Eyebrow: 'STEP1 - Backward Looking',
  step1Question: '12월 31일, 어떤 모습이 되어 있을까요?',
  step1Desc: '숫자·고객·팀·매출 무엇이든 좋아요. 12월의 자신을 인터뷰한다고 생각하고 과거형으로 적어주세요. 이 문장이 KR 초안과 Objective 요약의 재료가 됩니다.',
  narrativeAria: '미래 구술',
  // `{{count}}` 지금 글자 수, `{{max}}` 한도
  narrativeTip: '팁: 과거형으로 작성할수록 KR 추출이 더 정확해집니다. ({{count}} / {{max}}자)',
  visionTitle: '비전 이미지 (선택)',
  visionDesc: '구술 내용을 시각화한 비전 이미지를 생성합니다.',
  visionGenerate: 'AI 비전 이미지 생성',
  visionAlt: 'AI 비전 이미지',
  // 2단계
  step2Eyebrow: 'STEP2 - Objective',
  step2Question: '구술을 한 문장 Objective로 정리합니다',
  objectiveGenerate: 'AI로 Objective 작성',
  objectiveRegenerate: '다시 작성',
  draftConfirmed: '확인됨',
  draftAi: 'AI 초안 (미확인)',
  // `{{count}}` KR 개수
  draftAiCount: 'AI 초안 (미확인) · {{count}}개',
  draftManual: '직접 입력',
  confirm: '확인',
  confirmAll: '전체 확인',
  objectiveAria: 'Objective',
  objectivePlaceholder: 'Objective 를 직접 입력하거나 위 버튼으로 AI 생성하세요.',
  narrativeSourceTitle: '근거가 된 미래 구술',
  narrativeEmpty: '(구술 미입력)',
  // 3단계
  step3Eyebrow: 'STEP3 - Key Results',
  step3Question: 'Objective를 무엇으로 측정할지 정합니다',
  krsGenerate: 'AI로 KR 추출',
  krsRegenerate: 'AI로 다시 추출',
  objectiveLabel: 'Objective',
  objectiveUnset: '(Objective 미확정)',
  krAdd: 'KR 직접 추가',
  krTitlePlaceholder: '지표명',
  krTitleAria: 'KR 지표명',
  krRemove: 'KR 삭제',
  current: '현재',
  currentAria: '현재값',
  target: '목표',
  targetAria: '목표값',
  unit: '단위',
  krOwner: 'KR 담당자',
  ownerPlaceholder: '담당자',
  ownerSearchPlaceholder: '이름 검색...',
  // 담당자 검색칸 접근성 이름. 비우면 고르기 부품 기본(「KR 담당자 검색」)
  ownerSearchAriaLabel: '',
  ownerNoResult: '검색 결과 없음',
  // 4단계
  step4Eyebrow: 'STEP4 - Alignment',
  step4Question: '팀원들의 OKR 정렬도를 확인합니다',
  step4Desc: '미정렬 팀원에게는 1:1을 예약할 수 있습니다. (정렬 = 팀 OKR 을 상위로 연결한 개인 OKR)',
  alignmentLoading: '정합성 조회 중…',
  alignmentFailed: '정합성 조회에 실패했습니다.',
  retry: '다시 시도',
  alignmentEmpty: '팀원이 없습니다.',
  alignedOk: '정합성 정상',
  aligned: '정렬됨',
  unaligned: '미정렬',
  bookOneOnOne: '1:1 예약',
};
/** `{{name}}` 자리를 값으로 바꾼다 — 소비자가 i18n 문구를 보간 없이 그대로 넘길 수 있게. */
const fill = (text, vars) =>
  Object.entries(vars).reduce((out, [k, v]) => out.split(`{{${k}}}`).join(String(v)), String(text));
const NARRATIVE_PLACEHOLDER_KEY = {
  individual: 'narrativePlaceholderIndividual',
  team: 'narrativePlaceholderTeam',
  company: 'narrativePlaceholderCompany',
};

const NARRATIVE_MAX = 2000;

// 순서는 정책서 v2.1 §1 — 미래 구술 → Objective → KR 추출 (PW-734). 글자는 labels 의 `step*` 키.
const BASE_STEPS = [
  { key: 'narrative', label: 'stepNarrative', desc: 'stepNarrativeDesc' },
  { key: 'objective', label: 'stepObjective', desc: 'stepObjectiveDesc' },
  { key: 'krs', label: 'stepKrs', desc: 'stepKrsDesc' },
];
const ALIGNMENT_STEP = { key: 'alignment', label: 'stepAlignment', desc: 'stepAlignmentDesc' };

let seq = 0;
const nextId = () => { seq += 1; return `wz-${seq}`; };

export default function OkrSetupWizardModal({
  icons,
  baseUrl = '',
  onClose,
  scope = 'individual',
  scopeCard,
  targets = [],
  targetId,
  onTargetChange,
  targetLabel = '대상 조직',
  blocked = null,
  closeLabel = '닫기',
  showAlignment = scope !== 'individual',
  onExtractKrs,
  onDeriveObjective,
  onSubmit,
  onFetchAlignment,
  onBookOneOnOne,
  // 비전 이미지 생성 (선택): (scope, narrative) → Promise<{ imageUrl }>.
  // 안 넘기면 «비전 이미지» 상자를 통째로 그리지 않는다 — 눌러도 아무 일 없는 버튼을 남기지 않는다 (PW-1552).
  onGenerateVision,
  title = 'OKR 설정',
  initialState,
  onStateChange,
  contextEntry = null,
  contextNotice = null,
  onOpenContext,
  contextAppliedLabel = '',
  onAiError,
  aiNotice = null,
  // 제목 칸 길이 한도 — 서버 INPUT_LIMITS 와 같은 값을 앱이 넘긴다(저장 컬럼 255 · PW-1505). 안 주면 안 막는다(데모).
  objectiveTitleMaxLength,
  krTitleMaxLength,
  members = [],
  selfId = '',
  // 3단계 KR 0건 안내 — 앱이 화면 언어로 넘긴다(pivit-work PW-1510).
  krsEmptyHint = '위 버튼을 눌러 AI 추천 KR을 받아보세요. Objective가 구체적일수록 더 정확한 KR이 추출됩니다.',
  // 2단계 「근거가 된 미래 구술」 제목 아래 설명 — 앱이 화면 언어로 넘긴다(PW-2219).
  narrativeSourceDesc = '이 문장에서 Objective 를 뽑았습니다.',
  // 창 안 나머지 글자 — 위 DEFAULT_LABELS 를 키별로 덮는다(pivit-work 영어 화면).
  labels,
}) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const init = initialState ?? {};
  const [step, setStep] = useState(init.step ?? 1);
  const card = scopeCard ?? DEFAULT_SCOPE_CARD[scope] ?? DEFAULT_SCOPE_CARD.team;
  const [narrative, setNarrative] = useState(init.narrative ?? '');
  const [krs, setKrs] = useState(() => {
    const restored = init.krs ?? [];
    // 되살린 KR 의 id 와 새로 더할 KR 의 id 가 겹치지 않게 번호를 그 뒤로 민다.
    for (const k of restored) {
      const n = Number(String(k.id).replace(/^wz-/, ''));
      if (Number.isFinite(n) && n > seq) seq = n;
    }
    return restored;
  });
  const [krsConfirmed, setKrsConfirmed] = useState(init.krsConfirmed ?? false);
  // 마지막 KR 추출에 확인한 회사 컨텍스트가 실렸나 — 배지 근거(정책서 §3-3 표).
  const [krsContextApplied, setKrsContextApplied] = useState(init.krsContextApplied ?? false);
  const [krsLoading, setKrsLoading] = useState(false);
  const [objective, setObjective] = useState(init.objective ?? '');
  const [objConfirmed, setObjConfirmed] = useState(init.objConfirmed ?? false);
  const [aiObjective, setAiObjective] = useState(init.aiObjective ?? null);
  const [aiKrs, setAiKrs] = useState(init.aiKrs ?? null);
  const [aiObjectiveRevision, setAiObjectiveRevision] = useState(init.aiObjectiveRevision ?? 0);
  const [aiKrsRevision, setAiKrsRevision] = useState(init.aiKrsRevision ?? 0);
  useAiDraftLifecycle('okr_wizard_objective', aiObjective ? [{ key: 'objective', revision: aiObjectiveRevision, original: aiObjective, text: objective, confirmed: objConfirmed }] : []);
  useAiDraftLifecycle('okr_wizard_krs', aiKrs ? [{ key: 'krs', revision: aiKrsRevision, original: aiKrs, text: krs.length ? JSON.stringify(krs.map(({ title, type, target, unit }) => ({ title, type, target, unit }))) : '', confirmed: krsConfirmed }] : []);
  const [objLoading, setObjLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [alignment, setAlignment] = useState(null);
  // 정합성 조회 실패 — 4단계 안에서 말하고 [다시 시도]로 다시 묻는다(pivit-work PW-1792).
  // 앞 단계 초안은 그대로다.
  const [alignmentFailed, setAlignmentFailed] = useState(false);
  const [alignmentNonce, setAlignmentNonce] = useState(0);
  const [visionImage, setVisionImage] = useState(init.visionImage ?? null);
  const [visionLoading, setVisionLoading] = useState(false);

  // 정합성 확인은 조직 단위 전용 — 개인 단위·구성원은 스텝 칩 자체를 그리지 않는다(§2).
  const steps = useMemo(
    () => (showAlignment ? [...BASE_STEPS, ALIGNMENT_STEP] : BASE_STEPS),
    [showAlignment],
  );
  const stepKey = steps[step - 1]?.key;

  // 알림 함수가 바뀌었다고 다시 알리지 않는다 — 상태가 바뀔 때만 알린다.
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => {
    onStateChangeRef.current?.({ step, narrative, objective, objConfirmed, krs, krsConfirmed, krsContextApplied, visionImage, aiObjective, aiKrs, aiObjectiveRevision, aiKrsRevision });
  }, [step, narrative, objective, objConfirmed, krs, krsConfirmed, krsContextApplied, visionImage, aiObjective, aiKrs, aiObjectiveRevision, aiKrsRevision]);

  // 정합성 단계 진입 시 팀 정렬도 조회 (동기 setState 회피 — 콜백에서만 갱신).
  useEffect(() => {
    if (stepKey !== 'alignment' || !onFetchAlignment || blocked) return;
    let alive = true;
    onFetchAlignment(scope, targetId)
      .then((res) => { if (alive) { setAlignment(res); setAlignmentFailed(false); } })
      .catch(() => { if (alive) setAlignmentFailed(true); });
    return () => { alive = false; };
  }, [stepKey, scope, targetId, onFetchAlignment, blocked, alignmentNonce]);

  const retryAlignment = () => {
    setAlignmentFailed(false);
    setAlignmentNonce((n) => n + 1);
  };

  // 대상 조직을 바꾸면 그 조직 기준으로 다시 확인해야 한다 — 초안은 남기되 미확인으로
  // 되돌리고, 앞 조직의 정렬도는 버린다(정책서 §8 「대상 조직 변경 후」).
  const changeTarget = (id) => {
    setKrsConfirmed(false);
    setObjConfirmed(false);
    setAlignment(null);
    onTargetChange?.(id);
  };
  // 콜백이 없으면(데모) '조회 중' 에 갇히지 않게 빈 목록을 파생값으로 쓴다 —
  // effect 안 동기 setState 는 캐스케이드 렌더라 lint 가 막는다.
  const alignmentView = alignment ?? (!onFetchAlignment ? { members: [] } : null);

  const genKrs = async () => {
    setKrsLoading(true); setError(null);
    try {
      // KR 은 확정 Objective 를 재는 것이다 — 구술과 함께 싣는다(§6 · PW-734).
      const res = await onExtractKrs?.(scope, narrative, objective.trim(), targetId);
      const list = (res?.keyResults ?? []).map((k) => ({
        id: nextId(), title: k.title, type: k.type ?? 'number',
        target: k.targetValue ?? 0, current: 0, unit: k.unit ?? '', ownerId: selfId,
      }));
      setAiKrsRevision((n) => n + 1);
      setAiKrs(list.length ? JSON.stringify(list.map(({ title, type, target, unit }) => ({ title, type, target, unit }))) : null);
      setKrs(list); setKrsConfirmed(false);
      setKrsContextApplied(res?.contextApplied === true);
    } catch (err) {
      if (!onAiError?.('krs', err)) setError(L.krsFailed);
    } finally { setKrsLoading(false); }
  };

  // Objective 가 바뀌면 미확인으로 되돌린다. 이미 뽑은 KR 은 남기되 옛 Objective 를
  // 기준으로 확인한 것이므로 함께 미확인으로 되돌린다(정책서 §8 · PW-734).
  const changeObjective = (text) => {
    setObjective(text);
    setObjConfirmed(false);
    setKrsConfirmed(false);
  };

  const genObjective = async () => {
    setObjLoading(true); setError(null);
    try {
      // 이 시점엔 KR 이 없다 — 재료는 구술뿐이다(§6 · PW-734).
      const res = await onDeriveObjective?.(scope, narrative, targetId);
      setAiObjectiveRevision((n) => n + 1);
      setAiObjective(res?.objective?.title || null);
      changeObjective(res?.objective?.title ?? '');
    } catch (err) {
      if (!onAiError?.('objective', err)) setError(L.objectiveFailed);
    } finally { setObjLoading(false); }
  };

  const patchKr = (id, patch) => { setKrs((p) => p.map((k) => (k.id === id ? { ...k, ...patch } : k))); setKrsConfirmed(false); };
  const removeKr = (id) => { setKrs((p) => p.filter((k) => k.id !== id)); setKrsConfirmed(false); };
  const addKr = () => { setKrs((p) => [...p, { id: nextId(), title: '', type: 'number', target: 0, current: 0, unit: '', ownerId: selfId }]); setKrsConfirmed(false); };

  const stepDone = (key) =>
    key === 'narrative' ? narrative.trim().length >= 30
      : key === 'krs' ? krs.length > 0 && krs.every((k) => k.title.trim()) && krsConfirmed
        : key === 'objective' ? !!objective.trim() && objConfirmed
          : true;
  const canNext = stepDone(stepKey);
  // 위쪽 단계 이름으로는 앞 단계가 모두 채워진 데까지만 간다. 건너뛰면 제목 없는 Objective 가
  // KR 없이 저장됐다(PW-2026). 되돌아가는 것은 언제나 된다.
  const canJumpTo = (n) => n <= step || steps.slice(0, n - 1).every((s) => stepDone(s.key));

  const nextHint =
    canNext ? ''
      : stepKey === 'narrative' ? fill(L.hintNarrativeMore, { remaining: Math.max(0, 30 - narrative.trim().length) })
        : stepKey === 'objective' ? (!objective.trim() ? L.hintObjectiveGenerate : fill(L.hintObjectiveConfirm, { check: '✓' }))
          : (krs.length === 0 ? L.hintKrsGenerate : fill(L.hintKrsConfirm, { check: '✓' }));

  const isLast = step === steps.length;

  const handleNext = async () => {
    if (!canNext) return;
    if (!isLast) { setStep(step + 1); return; }
    setSaving(true); setError(null);
    try {
      await onSubmit?.({
        level: scope,
        targetId,
        objective: objective.trim(),
        krs: krs.map((k) => ({
          title: k.title.trim(), type: k.type,
          target: Number(k.target) || 0, current: Number(k.current) || 0, unit: k.unit,
          ownerId: k.ownerId ?? '',
        })),
      });
      onClose();
    } catch {
      setError(L.saveFailed);
      setSaving(false);
    }
  };

  // 상태 글자 딱지 (PW-2219) — 직접 입력 = 회색 글자(.okr-ctx-optional), AI 초안 = 보라 AI 글자
  // (.okr-ai-banner-label, OkrDetailModal 과 같은 그림), 확인됨 = 초록 상태 글자(.okr-status-text.is-success).
  const draftLabel = (state, text) =>
    state === 'confirmed' ? (
      <span className="okr-status-text is-success">{text}</span>
    ) : state === 'ai' ? (
      <span className="okr-ai-banner-label">
        {icons?.aiChat && <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />}
        <span>{text}</span>
      </span>
    ) : (
      <span className="okr-ctx-optional">{text}</span>
    );

  const aiBtn = (label, onClick, loading) => (
    <button type="button" className="okr-wz-ai-btn" onClick={onClick} disabled={loading}>
      {loading ? L.generating : `✦ ${label}`}
    </button>
  );
  // 체험 AI 소진 등 소비자가 넘긴 안내 — 누른 버튼 바로 아래 한 자리에만 그린다.
  const aiNoticeAt = (at) =>
    aiNotice && aiNotice.at === at ? (
      <div className="okr-wz-ai-notice" data-testid={`okr-wz-ai-notice-${at}`}>{aiNotice.content}</div>
    ) : null;

  const genVision = async () => {
    if (!onGenerateVision || visionLoading) return;
    setVisionLoading(true); setError(null);
    try {
      const res = await onGenerateVision(scope, narrative);
      setVisionImage(res?.imageUrl ?? null);
    } catch (err) {
      if (!onAiError?.('vision', err)) setError(L.visionFailed);
    } finally { setVisionLoading(false); }
  };

  const footer = blocked ? (
    <>
      <span className="okr-wz-footer-hint" />
      <button type="button" className="okr-btn is-outline" onClick={onClose}>{closeLabel}</button>
    </>
  ) : (
    <>
      <span className="okr-wz-footer-hint">
        {nextHint || fill(L.stepCounter, { step, total: steps.length })}
      </span>
      {step > 1 && (
        <button type="button" className="okr-btn is-outline is-sm" onClick={() => setStep(step - 1)}>{L.prev}</button>
      )}
      <button type="button" className="okr-btn is-brand" disabled={!canNext || saving} onClick={handleNext}>
        {saving ? L.saving : isLast ? L.submit : L.next}
      </button>
    </>
  );

  return (
    // 껍데기는 공용 창 틀(ModalShell · PW-836) — 막·Esc·닫기 X 는 틀이, 단계 이동 줄은 발(footer)로 넘긴다.
    <ModalShell
      title={title}
      titleId="okr-wz-title"
      closeLabel={closeLabel}
      onClose={onClose}
      zIndex={1000}
      className="okr-shell okr-wz-modal"
      bodyClassName="okr-shell-body"
      footer={footer}
    >
      {blocked ? (
        // 디자이너 빈 상태(.okr-s-placeholder) + 마법사 질문·설명 글자 (PW-2219).
        <div className="okr-s-placeholder" role="alert" data-testid="okr-wz-blocked">
          <div className="okr-wz-section">
            <p className="okr-wz-question">{blocked.title}</p>
            {blocked.desc && <p className="okr-wz-desc">{blocked.desc}</p>}
          </div>
        </div>
      ) : (<>
      {contextEntry && (
        // 디자이너 컨텍스트 띠(.okr-ctx-banner, OkrContextBanner) 그대로 — 창 안에 두는 자리만 okr.css 가 푼다.
        // 「관리자 전용」 배지는 설명 앞 글자로 싣는다(PW-2219).
        <div className="okr-ctx-banner" data-testid="okr-wz-ctx-entry">
          <div className="okr-ctx-banner-inner">
            <div className="okr-ctx-banner-texts">
              <p className="okr-ctx-banner-title">{contextEntry.title}</p>
              {(contextEntry.badge || contextEntry.desc) && (
                <p className="okr-ctx-banner-desc">
                  {[contextEntry.badge, contextEntry.desc].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            {contextEntry.action && (
              <div className="okr-ctx-banner-actions">
                <button type="button" className="okr-ctx-banner-btn" onClick={() => onOpenContext?.()}>
                  {contextEntry.action}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="okr-wz-steps">
        {steps.map((s, i) => (
          <div
            className={`okr-wz-step${i + 1 === step ? ' is-active' : ''}`}
            key={s.key}
            onClick={() => { if (canJumpTo(i + 1)) setStep(i + 1); }}
            aria-disabled={canJumpTo(i + 1) ? undefined : true}
          >
            <p className="okr-wz-step-label">{L[s.label]}</p>
            <p className="okr-wz-step-desc">{L[s.desc]}</p>
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          {contextNotice && (
            // 막지 않는 안내 = 디자이너 연회색 카드(.okr-wz-vision-card) + 안내 글자, 버튼은 회색(.okr-ghost-btn) —
            // 초록 주 버튼은 이 단계의 [다음] 하나다 (PW-2219).
            <div className="okr-wz-vision-card okr-wz-ctx-notice" role="note" data-testid="okr-wz-ctx-notice">
              <p className="okr-ctx-intro-desc">
                {contextNotice.text}
                {contextNotice.hint && <> <span className="okr-ctx-optional">{contextNotice.hint}</span></>}
              </p>
              {contextNotice.action && (
                <button type="button" className="okr-ghost-btn" onClick={() => onOpenContext?.()}>
                  {contextNotice.action}
                </button>
              )}
            </div>
          )}
          <div className="okr-wz-stepblock">
            <div className="okr-wz-section">
              <p className="okr-wz-step-eyebrow">{L.step1Eyebrow}</p>
              <p className="okr-wz-question">{L.step1Question}</p>
              <p className="okr-wz-desc">{L.step1Desc}</p>
            </div>
            {/* 단위 고정 카드 — 구 3택 자리. 클릭 대상이 아니다(§2A.3). */}
            {/* 디자이너 범위 카드(.okr-wz-scope.is-active) — 「단위 고정」은 회색 글자(.okr-ctx-optional) (PW-2219). */}
            <div className="okr-wz-scope is-active okr-wz-scope-fixed" data-testid="okr-wz-scope-fixed">
              <div className="okr-wz-scope-fixed-text">
                <p className="okr-wz-scope-label">
                  {card.label}
                  {card.badge && <> <span className="okr-ctx-optional">{card.badge}</span></>}
                </p>
                <p className="okr-wz-scope-desc">{card.desc}</p>
              </div>
              {targets.length > 1 ? (
                // 브라우저 기본 목록은 맥 회색 목록으로 뜨고 화면 녹화에 안 잡힌다 — 디자이너 펼친 목록으로 (PW-1955).
                <SearchSelect
                  className="okr-wz-target-select"
                  value={targetId ?? ''}
                  aria-label={targetLabel}
                  options={targets.map((o) => ({ value: String(o.id), label: o.name }))}
                  onChange={changeTarget}
                />
              ) : targets.length === 1 ? (
                <span className="okr-wz-step-eyebrow okr-wz-target-name">{targets[0].name}</span>
              ) : null}
            </div>
            <textarea
              className="okr-textarea okr-wz-textarea"
              value={narrative}
              maxLength={NARRATIVE_MAX}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder={L[NARRATIVE_PLACEHOLDER_KEY[scope] ?? NARRATIVE_PLACEHOLDER_KEY.team]}
              aria-label={L.narrativeAria}
            />
            <p className="okr-wz-tip">
              {fill(L.narrativeTip, { count: narrative.length, max: NARRATIVE_MAX })}
            </p>
          </div>

          {onGenerateVision && (
          <div className="okr-wz-vision">
            <div className="okr-wz-vision-head">
              <div className="okr-wz-section">
                <p className="okr-wz-vision-title">{L.visionTitle}</p>
                <p className="okr-wz-desc">{L.visionDesc}</p>
              </div>
              <button type="button" className="okr-wz-ai-btn" onClick={genVision} disabled={visionLoading}>
                {visionLoading ? L.generating : L.visionGenerate}
              </button>
            </div>
            {aiNoticeAt('vision')}
            <div className="okr-wz-vision-card">
              {visionImage ? (
                <img className="okr-wz-vision-img" src={visionImage} alt={L.visionAlt} />
              ) : (
                <div className="okr-wz-vision-box" />
              )}
            </div>
          </div>
          )}
        </>
      )}

      {stepKey === 'objective' && (
        <>
        <div className="okr-wz-vision">
          <div className="okr-wz-vision-head">
            <div className="okr-wz-section">
              <p className="okr-wz-step-eyebrow">{L.step2Eyebrow}</p>
              <p className="okr-wz-question">{L.step2Question}</p>
            </div>
            {aiBtn(objective ? L.objectiveRegenerate : L.objectiveGenerate, genObjective, objLoading)}
          </div>
          {aiNoticeAt('objective')}
          {/* 초안 상자 = 디자이너 작성 창 Objective 카드(.okr-cf-objective) + 머리(.okr-wz-vision-head) + 글자 딱지 (PW-2219). */}
          <div className="okr-cf-objective" data-testid="okr-wz-objective-draft">
            <div className="okr-wz-vision-head">
              {draftLabel(
                objConfirmed ? 'confirmed' : objective ? 'ai' : 'manual',
                objConfirmed ? `✓ ${L.draftConfirmed}` : objective ? L.draftAi : L.draftManual,
              )}
              {!objConfirmed && objective.trim() && (
                <Button type="button" className="okr-btn is-brand is-sm" onClick={() => setObjConfirmed(true)}>{L.confirm}</Button>
              )}
            </div>
            <textarea
              className="okr-textarea is-compact"
              value={objective}
              rows={2}
              maxLength={objectiveTitleMaxLength}
              aria-label={L.objectiveAria}
              placeholder={L.objectivePlaceholder}
              onChange={(e) => changeObjective(e.target.value)}
            />
          </div>
        </div>
        {/* 근거가 된 미래 구술 — 이 문장에서 Objective 를 뽑았다는 근거(§3-2 · PW-734).
            디자이너 «제목 + 연회색 카드» 블록(.okr-wz-vision) (PW-2219). */}
        <div className="okr-wz-vision" data-testid="okr-wz-narrative-source">
          <div className="okr-wz-vision-head">
            <div className="okr-wz-section">
              <p className="okr-wz-vision-title">{L.narrativeSourceTitle}</p>
              {narrativeSourceDesc && <p className="okr-wz-desc">{narrativeSourceDesc}</p>}
            </div>
          </div>
          <div className="okr-wz-vision-card">
            <p className="okr-wz-scope-desc okr-wz-source-body">{narrative.trim() || L.narrativeEmpty}</p>
          </div>
        </div>
        </>
      )}

      {stepKey === 'krs' && (
        <div className="okr-wz-vision">
          <div className="okr-wz-vision-head">
            <div className="okr-wz-section">
              <p className="okr-wz-step-eyebrow">{L.step3Eyebrow}</p>
              <p className="okr-wz-question">{L.step3Question}</p>
            </div>
            {aiBtn(krs.length ? L.krsRegenerate : L.krsGenerate, genKrs, krsLoading)}
          </div>
          {aiNoticeAt('krs')}
          {/* 확정 Objective — KR 이 무엇을 재는지 늘 보이게 둔다(§3-3 · PW-734). 디자이너 Objective 카드 그대로. */}
          <div className="okr-cf-objective" data-testid="okr-wz-objective-banner">
            <span className="okr-wz-desc">{L.objectiveLabel}</span>
            <span className="okr-cf-obj-label okr-wz-reference-title">{objective.trim() || L.objectiveUnset}</span>
          </div>
          {krs.length === 0 && !krsLoading && (
            <div className="okr-cf-objective" data-testid="okr-wz-krs-empty">
              {/* 정책서 §3-3 「KR 0건 & 미생성」 — 추천을 받았는데 0건이면 안내를 내린다(pivit-work PW-1510).
                  aiKrsRevision 은 추출이 성공할 때만 오르고 되살리기에도 실린다. 디자이너 빈 상태(.okr-s-placeholder). */}
              {aiKrsRevision === 0 && (
                <div className="okr-s-placeholder">
                  <p className="okr-wz-desc">{krsEmptyHint}</p>
                </div>
              )}
              <Button type="button" className="okr-cf-kr-add-btn" onClick={addKr}>+ {L.krAdd}</Button>
            </div>
          )}
          {krs.length > 0 && (
            // KR 초안 = 디자이너 작성 창 KR 묶음: 묶음 .okr-cf-objective, KR 하나 .okr-cf-kr-card(머리 「KR1」 + 지표명 + ×,
            // 아래 줄 현재·목표·단위·담당자), 추가 .okr-cf-kr-add-btn (PW-2219).
            <div className="okr-cf-objective" data-testid="okr-wz-krs-draft">
              <div className="okr-wz-vision-head">
                <span className="okr-wz-draft-badges">
                  {draftLabel(
                    krsConfirmed ? 'confirmed' : 'ai',
                    krsConfirmed ? `✓ ${L.draftConfirmed}` : fill(L.draftAiCount, { count: krs.length }),
                  )}
                  {krsContextApplied && contextAppliedLabel && (
                    <StatusBadge className="okr-ai-tag" data-testid="okr-wz-ctx-applied"><AiMark />{contextAppliedLabel}</StatusBadge>
                  )}
                </span>
                {!krsConfirmed && (
                  <Button type="button" className="okr-btn is-brand is-sm" onClick={() => setKrsConfirmed(true)}>{L.confirmAll}</Button>
                )}
              </div>
              {krs.map((k, i) => (
                <div className="okr-cf-kr-card" key={k.id} data-testid="okr-wz-kr-card">
                  <div className="okr-cf-kr-card-head">
                    <span className="okr-kr-id">KR{i + 1}</span>
                    <TextInput className="okr-cf-input" value={k.title} placeholder={L.krTitlePlaceholder} aria-label={L.krTitleAria} maxLength={krTitleMaxLength}
                      onChange={(e) => patchKr(k.id, { title: e.target.value })} />
                    <Button type="button" className="okr-cf-x" onClick={() => removeKr(k.id)} aria-label={L.krRemove}>
                      <Icon src={icons.xClose} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                    </Button>
                  </div>
                  <div className="okr-cf-kr-meta">
                    <span className="okr-cf-unit">{L.current}</span>
                    <TextInput className="okr-cf-input is-sm" type="number" value={k.current} placeholder={L.current} aria-label={L.currentAria}
                      onChange={(e) => patchKr(k.id, { current: e.target.value })} />
                    {/* «완료 여부»는 목표 1 고정이라 칸을 감춘다(okr-spec §3.1B). */}
                    {k.type !== 'boolean' && (
                      <>
                        <span className="okr-cf-unit">{L.target}</span>
                        <TextInput className="okr-cf-input is-sm" type="number" value={k.target} placeholder={L.target} aria-label={L.targetAria}
                          onChange={(e) => patchKr(k.id, { target: e.target.value })} />
                      </>
                    )}
                    <TextInput className="okr-cf-input is-sm" value={k.unit} placeholder={L.unit} aria-label={L.unit}
                      onChange={(e) => patchKr(k.id, { unit: e.target.value })} />
                    {members.length > 0 && (
                      <OkrMemberPicker ariaLabel={L.krOwner} placeholder={L.ownerPlaceholder}
                        searchPlaceholder={L.ownerSearchPlaceholder} noResultLabel={L.ownerNoResult}
                        searchAriaLabel={L.ownerSearchAriaLabel || undefined}
                        members={members} value={k.ownerId ?? ''}
                        onChange={(id) => patchKr(k.id, { ownerId: id })} />
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" className="okr-cf-kr-add-btn" onClick={addKr}>+ {L.krAdd}</Button>
            </div>
          )}
        </div>
      )}

      {stepKey === 'alignment' && (
        <div className="okr-wz-vision">
          <div className="okr-wz-section">
            <p className="okr-wz-step-eyebrow">{L.step4Eyebrow}</p>
            <p className="okr-wz-question">{L.step4Question}</p>
            <p className="okr-wz-desc">{L.step4Desc}</p>
          </div>
          {!alignmentView && !error && !alignmentFailed && (
            <div className="okr-s-placeholder"><p className="okr-wz-desc">{L.alignmentLoading}</p></div>
          )}
          {!alignmentView && alignmentFailed && (
            <div className="okr-wz-align">
              <p className="okr-wz-error" role="alert">{L.alignmentFailed}</p>
              <button type="button" className="okr-btn is-outline is-sm" onClick={retryAlignment}>{L.retry}</button>
            </div>
          )}
          {alignmentView && (alignmentView.emptyMessage || alignmentView.members.length === 0) && (
            <div className="okr-s-placeholder" data-testid="okr-wz-align-empty">
              <p className="okr-wz-desc">{alignmentView.emptyMessage || L.alignmentEmpty}</p>
            </div>
          )}
          {alignmentView && !alignmentView.emptyMessage && alignmentView.members.length > 0 && (
            // 사람 줄 = 디자이너 «연결된 OKR» 카드(.okr-p-linked-card) + 사람 칩(.okr-member-chip) + 직책(.okr-p-role)
            // + 설명(.okr-p-linked-sub) + 상태 글자색(.okr-status-text). 미정렬 노란 바탕·경고 그림은 지금 모양 유지 (PW-2219).
            <div className="okr-p-linked-cards">
              {alignmentView.members.map((m) => (
                <div className={`okr-p-linked-card okr-wz-align-row${m.aligned ? '' : ' is-warn'}`} key={m.userId}>
                  <div className="okr-p-linked-head okr-wz-align-head">
                    <span className="okr-member-chip">
                      {/* 사진이 없으면 그림 칸을 빼고 이름만 — 깨진 그림을 두지 않는다. */}
                      {m.avatar && (
                        <span className="okr-member-avatar"><img src={m.avatar} alt="" /></span>
                      )}
                      <span className="okr-member-name">{m.name}</span>
                    </span>
                    {m.role && <span className="okr-p-role">{m.role}</span>}
                    <span className="okr-p-linked-sub">{m.alignedLabel && `${m.alignedLabel} · `}{m.aligned ? L.alignedOk : m.note}</span>
                    <span className={`okr-status-text okr-wz-align-status ${m.aligned ? 'is-success' : 'is-warning'}`}>
                      {!m.aligned && <AlertTriangleGlyph size={14} />}{m.aligned ? L.aligned : L.unaligned}
                    </span>
                    {!m.aligned && m.canBookOneOnOne !== false && onBookOneOnOne && (
                      <button type="button" className="okr-btn is-brand is-sm" onClick={() => onBookOneOnOne(m.userId)}>{L.bookOneOnOne}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="okr-wz-error" role="alert">{error}</p>}
      </>)}
    </ModalShell>
  );
}
