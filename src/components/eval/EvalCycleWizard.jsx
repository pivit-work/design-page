import { useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from '../shared/DatePicker.jsx';

// 고정 단계 자물쇠 아이콘 — design-page 정본 lock-keyhole-square (인라인 SVG).
function LockIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.8385 2H6.16146C5.63433 1.99998 5.17954 1.99997 4.80497 2.03057C4.40963 2.06287 4.01641 2.13419 3.63803 2.32698C3.07354 2.6146 2.6146 3.07354 2.32698 3.63803C2.13419 4.01641 2.06287 4.40963 2.03057 4.80497C1.99997 5.17954 1.99998 5.63429 2 6.16142V17.8385C1.99998 18.3657 1.99997 18.8205 2.03057 19.195C2.06287 19.5904 2.13419 19.9836 2.32698 20.362C2.6146 20.9265 3.07354 21.3854 3.63803 21.673C4.01641 21.8658 4.40963 21.9371 4.80497 21.9694C5.17954 22 5.6343 22 6.16144 22H17.8386C18.3657 22 18.8205 22 19.195 21.9694C19.5904 21.9371 19.9836 21.8658 20.362 21.673C20.9265 21.3854 21.3854 20.9265 21.673 20.362C21.8658 19.9836 21.9371 19.5904 21.9694 19.195C22 18.8205 22 18.3657 22 17.8386V6.16144C22 5.6343 22 5.17954 21.9694 4.80497C21.9371 4.40963 21.8658 4.01641 21.673 3.63803C21.3854 3.07354 20.9265 2.6146 20.362 2.32698C19.9836 2.13419 19.5904 2.06287 19.195 2.03057C18.8205 1.99997 18.3657 1.99998 17.8385 2ZM13.7316 13.1947L14.649 15.947C14.7675 16.3025 14.8268 16.4803 14.7912 16.6218C14.7601 16.7456 14.6828 16.8529 14.5752 16.9216C14.4522 17 14.2648 17 13.8901 17H10.1099C9.7352 17 9.54783 17 9.42484 16.9216C9.31718 16.8529 9.23987 16.7456 9.20877 16.6218C9.17324 16.4803 9.23249 16.3025 9.351 15.947L10.2684 13.1947C10.339 12.9831 10.3743 12.8772 10.3724 12.7907C10.3705 12.6996 10.3583 12.6519 10.3164 12.5711C10.2765 12.4942 10.17 12.395 9.95681 12.1967C9.36819 11.649 9 10.8675 9 10C9 8.34315 10.3431 7 12 7C13.6569 7 15 8.34315 15 10C15 10.8675 14.6318 11.649 14.0432 12.1967C13.83 12.395 13.7235 12.4942 13.6836 12.5711C13.6417 12.6519 13.6295 12.6996 13.6276 12.7907C13.6257 12.8772 13.661 12.9831 13.7316 13.1947Z"
        fill="currentColor"
      />
    </svg>
  );
}

// 드래그 핸들 그립 아이콘 — 6점 그립(표준 유틸리티 글리프, 인라인 SVG).
function GripIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="4" r="1.3" />
      <circle cx="10" cy="4" r="1.3" />
      <circle cx="6" cy="8" r="1.3" />
      <circle cx="10" cy="8" r="1.3" />
      <circle cx="6" cy="12" r="1.3" />
      <circle cx="10" cy="12" r="1.3" />
    </svg>
  );
}

// 'YYYY-MM-DD' 문자열 ↔ Date 변환 (DatePicker 는 Date 를 주고받는다).
const dateToIso = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const isoToDate = (iso) => {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
};

/**
 * EvalCycleWizard — 새 평가 사이클 생성 마법사.
 *
 * 이번 슬라이스: 3 스텝(기본 정보 / 단계별 일정 / 확인·생성). prop 으로 받은 labels(L)와
 * onSubmit/onCancel 로 동작하는 순수 컴포넌트. 생성은 draft 로만 만들고, 오픈은 목록에서
 * 별도 수행(생성/오픈 분리). 템플릿·등급·대상자 스텝은 후속 슬라이스에서 확장.
 */

const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

const REVIEW_TYPE_KEYS = {
  self: 'reviewSelf',
  peer: 'reviewPeer',
  upward: 'reviewUpward',
  leader: 'reviewLeader',
};

const PEER_MODES = [
  { key: 'ai_recommend', label: 'modeAiRecommend', badge: 'recommendedBadge' },
  { key: 'self_select', label: 'modeSelfSelect' },
  { key: 'leader_assign', label: 'modeLeaderAssign' },
  { key: 'hr_assign', label: 'modeHrAssign', badge: 'exceptionBadge' },
];

// 단계별 일정 모델(시안 WizardStep2 ALL_PHASES). 선택 리뷰종류로 활성 단계 도출.
//  - self·share 는 앵커(양끝 고정, DnD 불가). 중간 단계만 재배열.
//  - required 단계(self·calibration·share)는 항상 ON. dependsOn 은 해당 유형 선택 시 활성.
//  - 하향 단계 id 는 'leader'(리뷰종류 id 와 1:1; manager 개명은 별도 마이그레이션).
const ALL_PHASES = [
  { id: 'self', nameKey: 'phaseSelf', targetKey: 'ownerEvaluatee', required: true, anchor: true },
  { id: 'peer_confirm', nameKey: 'phasePeerConfirm', targetKey: 'ownerLeader', dependsOn: 'peer' },
  { id: 'peer', nameKey: 'phasePeer', targetKey: 'ownerPeer' },
  { id: 'upward', nameKey: 'phaseUpward', targetKey: 'ownerEvaluatee' },
  { id: 'leader', nameKey: 'phaseLeader', targetKey: 'ownerLeader' },
  { id: 'calibration', nameKey: 'phaseCalibration', targetKey: 'ownerHrExec', required: true },
  { id: 'share', nameKey: 'phaseShare', targetKey: 'ownerHr', required: true, anchor: true },
];
// 단계 → 평가 유형(적용 템플릿 매핑용). 이 유형 템플릿만 해당 단계에 매핑 가능.
const PHASE_TO_REVIEW_TYPE = { self: 'self', peer: 'peer', upward: 'upward', leader: 'leader' };
const REMINDER_OPTIONS = [
  { value: 'end_d3_d1', labelKey: 'reminderD3D1' },
  { value: 'end_d1', labelKey: 'reminderD1' },
  { value: 'none', labelKey: 'reminderNone' },
];

// ── 평가 템플릿(WizardStep3) 모델 ─────────────────────────────
// 템플릿이 적용될 리뷰 종류 — 리뷰종류 id(self/peer/upward/leader)와 1:1.
const TEMPLATE_TYPES = [
  { id: 'self', nameKey: 'reviewSelf' },
  { id: 'peer', nameKey: 'reviewPeer' },
  { id: 'upward', nameKey: 'reviewUpward' },
  { id: 'leader', nameKey: 'reviewLeader' },
];
// 버전 프리셋(간소형/중간형/세분화형).
const TEMPLATE_VERSIONS = [
  { id: 'simple', labelKey: 'tplVersionSimple' },
  { id: 'standard', labelKey: 'tplVersionStandard' },
  { id: 'detailed', labelKey: 'tplVersionDetailed' },
];
// 상대비율 적용 범위.
const RATIO_SCOPES = [
  { id: 'dept', labelKey: 'ratioScopeDept' },
  { id: 'div', labelKey: 'ratioScopeDiv' },
  { id: 'company', labelKey: 'ratioScopeCompany' },
];
// 질문 유형(항목 응답 방식).
const QUESTION_TYPES = [
  { id: 'textarea', labelKey: 'qTypeTextarea' },
  { id: 'rating', labelKey: 'qTypeRating' },
  { id: 'grade', labelKey: 'qTypeGrade' },
  { id: 'checkbox', labelKey: 'qTypeCheckbox' },
];
// 프리셋별 질문 시드(편집 가능한 콘텐츠). section·text 는 HR 이 수정하는 데이터.
const TEMPLATE_PRESETS = {
  simple: [
    { id: 's1', section: '성과 (What)', text: '이번 기간 종합 코멘트를 작성해주세요.', type: 'textarea' },
    { id: 's2', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
  standard: [
    { id: 'q1', section: '성과 (What)', text: '이번 기간 주요 성과를 서술해주세요.', type: 'textarea' },
    { id: 'q2', section: '성과 (What)', text: 'OKR/KR 달성도', type: 'rating' },
    { id: 'q3', section: '역량 (How)', text: '주도성 · 오너십', type: 'rating' },
    { id: 'q4', section: '역량 (How)', text: '협업 · 커뮤니케이션', type: 'rating' },
    { id: 'q5', section: '성장 (Growth)', text: '강점', type: 'textarea' },
    { id: 'q6', section: '성장 (Growth)', text: '개선점 / 성장 영역', type: 'textarea' },
    { id: 'q7', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
  detailed: [
    { id: 'd1', section: '성과 (What)', text: '이번 기간 주요 성과를 서술해주세요.', type: 'textarea' },
    { id: 'd2', section: '성과 (What)', text: 'OKR/KR 달성도', type: 'rating' },
    { id: 'd3', section: '성과 (What)', text: '정량 목표 달성률', type: 'rating' },
    { id: 'd4', section: '역량 (How)', text: '주도성 / 오너십', type: 'rating' },
    { id: 'd5', section: '역량 (How)', text: '협업 · 커뮤니케이션', type: 'rating' },
    { id: 'd6', section: '역량 (How)', text: '실행력', type: 'rating' },
    { id: 'd7', section: '역량 (How)', text: '전문성 · 문제 해결', type: 'rating' },
    { id: 'd8', section: '역량 (How)', text: '리더십 · 영향력', type: 'rating' },
    { id: 'd9', section: '성장 (Growth)', text: '강점', type: 'textarea' },
    { id: 'd10', section: '성장 (Growth)', text: '개선점 / 성장 영역', type: 'textarea' },
    { id: 'd11', section: '성장 (Growth)', text: '성장 가능성', type: 'rating' },
    { id: 'd12', section: '최종 등급 결정', text: '승진 추천 여부', type: 'checkbox' },
    { id: 'd13', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
};
// 워크스페이스 기본 등급 체계(상대비율 포함).
const DEFAULT_GRADES = [
  { label: '탁월', desc: '기대를 초과하는 성과를 달성함', ratio: 15 },
  { label: '충족', desc: '기대에 부합하는 성과를 달성함', ratio: 70 },
  { label: '미흡', desc: '기대에 미달하는 성과를 보임', ratio: 15 },
];
const MAX_GRADES = 10;
const MIN_GRADES = 2;

// 현재 빌더 상태 → 템플릿 요약 문자열(항목 N · 등급 M단계).
const gradeSum = (grades) => grades.reduce((a, g) => a + (Number(g.ratio) || 0), 0);

/** 선택한 리뷰종류로 활성 단계 목록 도출. */
function activePhasesFor(reviewTypes) {
  return ALL_PHASES.filter(
    (p) =>
      p.required ||
      reviewTypes.includes(p.id) ||
      (p.dependsOn && reviewTypes.includes(p.dependsOn)),
  );
}

/** 겹치는(병렬 진행) 단계 쌍. 겹침은 오류가 아니라 허용. */
function getOverlapPairs(rows) {
  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (!a.start || !a.end || !b.start || !b.end) continue;
      if (a.start < b.end && b.start < a.end) {
        pairs.push({ key: [a.id, b.id].sort().join('|'), a: a.name, b: b.name });
      }
    }
  }
  return pairs;
}

/** 활성 단계에 7일 간격 초기 일정(시작·종료 날짜) 배치. */
function initSchedule(phases, baseDate) {
  const DAY = 86400000;
  const base = baseDate ? new Date(baseDate) : new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const s = {};
  phases.forEach((p, i) => {
    const st = new Date(base.getTime() + i * 7 * DAY);
    const en = new Date(st.getTime() + 6 * DAY);
    s[p.id] = { start: iso(st), end: iso(en) };
  });
  return s;
}

function StepBar({ steps, current, labels: L, onJump }) {
  return (
    <div className="evc-wiz-steps">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'future';
        return (
          <button
            type="button"
            key={s.titleKey}
            className={`evc-wiz-step is-${state}`}
            onClick={() => state === 'done' && onJump(i)}
            disabled={state === 'future'}
          >
            <span className="evc-wiz-step-num">{state === 'done' ? '✓' : i + 1}</span>
            <span className="evc-wiz-step-label">{L[s.titleKey]}</span>
          </button>
        );
      })}
    </div>
  );
}

// 평가 항목 추가 폼 — section·text·type 입력 후 추가.
function AddQuestionRow({ onAdd, labels: L }) {
  const [section, setSection] = useState('성과 (What)');
  const [text, setText] = useState('');
  const [type, setType] = useState('textarea');
  const submit = () => {
    if (!text.trim()) return;
    onAdd(section, text, type);
    setText('');
  };
  return (
    <div className="evc-tpl-additem">
      <input
        className="evc-input"
        value={section}
        onChange={(e) => setSection(e.target.value)}
        placeholder={L.templateSectionPlaceholder}
        data-testid="evc-tpl-add-section"
      />
      <input
        className="evc-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={L.templateItemPlaceholder}
        data-testid="evc-tpl-add-text"
      />
      <select className="evc-input" value={type} onChange={(e) => setType(e.target.value)}>
        {QUESTION_TYPES.map((t) => (
          <option key={t.id} value={t.id}>{L[t.labelKey]}</option>
        ))}
      </select>
      <button type="button" className="evc-btn is-ghost" onClick={submit} data-testid="evc-tpl-add-item">
        {L.templateAddItem}
      </button>
    </div>
  );
}

export default function EvalCycleWizard({
  labels: L,
  candidates = [],
  onCancel,
  onSubmit,
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // 날짜 picker 팝오버 상태: { field:'start'|'end', rect, el }
  const [picker, setPicker] = useState(null);
  const openPicker = (field) => (e) =>
    setPicker({ field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
  // 단계별 일정 date picker 팝오버: { phaseId, field:'start'|'end', rect, el }
  const [schedPicker, setSchedPicker] = useState(null);
  const openSchedPicker = (phaseId, field) => (e) =>
    setSchedPicker({ phaseId, field, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
  const [reviewTypes, setReviewTypes] = useState(['self', 'leader']);
  // v2: 동료 리뷰어 지정 방식 다중선택(시안 peerAssign[]) + 결과 본인 공개 기본값
  const [peerAssignModes, setPeerAssignModes] = useState(['ai_recommend']);
  const [peerVisibility, setPeerVisibility] = useState(false);
  // 단계별 일정(review_sequence) 상태
  const [schedule, setSchedule] = useState({}); // { phaseId: { start, end } } 사용자 오버라이드
  const [reminders, setReminders] = useState({}); // { phaseId: reminderValue }
  const [disabledPhases, setDisabledPhases] = useState(() => new Set());
  const [phaseOrder, setPhaseOrder] = useState([]); // 중간 단계 재배열 순서(id)
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [includeMode, setIncludeMode] = useState('bulk');
  const [selectedIds, setSelectedIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  // 평가 템플릿(step 1) — 워크스페이스 라이브러리 + 빌더 상태
  const [savedTemplates, setSavedTemplates] = useState([]); // 이 세션 라이브러리
  const [tplType, setTplType] = useState('self'); // 빌더가 편집중인 평가 유형
  const [tplName, setTplName] = useState('');
  const [tplVersion, setTplVersion] = useState('standard');
  const [tplQuestions, setTplQuestions] = useState(TEMPLATE_PRESETS.standard);
  const [tplGrades, setTplGrades] = useState(DEFAULT_GRADES);
  const [tplAbsolute, setTplAbsolute] = useState(false); // 절대평가(상대비율 없음)
  const [tplRatioScope, setTplRatioScope] = useState('div');
  const [phaseTemplateMap, setPhaseTemplateMap] = useState({}); // { phaseId: templateId }

  const steps = [
    { titleKey: 'wizardStep1' }, // 기본 정보
    { titleKey: 'wizardStepTemplate' }, // 평가 템플릿
    { titleKey: 'wizardStep2' }, // 단계별 일정
    { titleKey: 'wizardStepTargets' }, // 대상자
    { titleKey: 'wizardStep3' }, // 확인 및 생성
  ];

  const hasPeer = reviewTypes.includes('peer');
  const activePhases = activePhasesFor(reviewTypes);
  const defaultSchedule = initSchedule(activePhases, startDate);
  const scheduleOf = (id) => schedule[id] || defaultSchedule[id] || { start: '', end: '' };
  const reminderOf = (id) => reminders[id] ?? 'end_d3_d1';
  const middleIds = activePhases.filter((p) => !p.anchor).map((p) => p.id);
  const orderedMiddle = [
    ...phaseOrder.filter((id) => middleIds.includes(id)),
    ...middleIds.filter((id) => !phaseOrder.includes(id)),
  ];
  const displayPhases = [
    activePhases.find((p) => p.id === 'self'),
    ...orderedMiddle.map((id) => activePhases.find((p) => p.id === id)),
    activePhases.find((p) => p.id === 'share'),
  ].filter(Boolean);
  const enabledRows = displayPhases
    .filter((p) => !disabledPhases.has(p.id))
    .map((p) => ({ id: p.id, name: L[p.nameKey], ...scheduleOf(p.id) }));
  const overlapPairs = getOverlapPairs(enabledRows);
  const overlapIds = new Set(overlapPairs.flatMap((p) => p.key.split('|')));

  const updateSchedule = (id, field, value) =>
    setSchedule((s) => ({ ...s, [id]: { ...scheduleOf(id), [field]: value } }));
  const togglePhaseEnabled = (id) =>
    setDisabledPhases((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const movePhase = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const arr = [...orderedMiddle];
    const from = arr.indexOf(dragId);
    const to = arr.indexOf(targetId);
    if (from < 0 || to < 0) return;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    setPhaseOrder(arr);
  };

  const toggleType = (t) =>
    setReviewTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  // ── 평가 템플릿 빌더 헬퍼 ──
  const tplRatioSum = gradeSum(tplGrades);
  const tplRatioInvalid = !tplAbsolute && tplRatioSum !== 100;
  const tplGradesValid =
    tplGrades.length >= MIN_GRADES &&
    tplGrades.every((g) => g.label.trim()) &&
    !tplRatioInvalid;
  const selectTplPreset = (id) => {
    setTplVersion(id);
    setTplQuestions(TEMPLATE_PRESETS[id]);
  };
  const removeQuestion = (id) =>
    setTplQuestions((qs) => qs.filter((q) => q.id !== id));
  const addQuestion = (section, text, type) => {
    if (!text.trim()) return;
    setTplQuestions((qs) => [
      ...qs,
      { id: `c${qs.length}_${text.length}`, section, text: text.trim(), type },
    ]);
  };
  const updateGrade = (i, field, value) =>
    setTplGrades((gs) => gs.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)));
  const addGrade = () =>
    setTplGrades((gs) => (gs.length >= MAX_GRADES ? gs : [...gs, { label: '', desc: '', ratio: 0 }]));
  const removeGrade = (i) =>
    setTplGrades((gs) => (gs.length <= MIN_GRADES ? gs : gs.filter((_, idx) => idx !== i)));
  const saveTemplate = () => {
    const name = tplName.trim();
    if (!name || !tplGradesValid) return;
    const tpl = {
      id: `tpl${savedTemplates.length}_${name.length}`,
      name,
      reviewType: tplType,
      version: tplVersion,
      questions: tplQuestions,
      grades: tplGrades,
      absolute: tplAbsolute,
      ratioScope: tplRatioScope,
    };
    setSavedTemplates((prev) => [tpl, ...prev]);
    setTplName('');
  };
  const loadTemplate = (tpl) => {
    setTplType(tpl.reviewType);
    setTplName(tpl.name);
    setTplVersion(tpl.version);
    setTplQuestions(tpl.questions);
    setTplGrades(tpl.grades);
    setTplAbsolute(!!tpl.absolute);
    setTplRatioScope(tpl.ratioScope || 'div');
  };
  const deleteTemplate = (id) => {
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
    setPhaseTemplateMap((m) => {
      const n = { ...m };
      Object.keys(n).forEach((k) => {
        if (n[k] === id) delete n[k];
      });
      return n;
    });
  };

  const togglePeerMode = (key) =>
    setPeerAssignModes((prev) =>
      prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key],
    );

  const toggleMember = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const targetIds =
    includeMode === 'bulk' ? candidates.map((c) => c.id) : selectedIds;
  const targetCount = targetIds.length;

  const filteredCandidates = memberSearch.trim()
    ? candidates.filter((c) =>
        `${c.name} ${c.department ?? ''}`
          .toLowerCase()
          .includes(memberSearch.trim().toLowerCase()),
      )
    : candidates;

  const step1Valid =
    name.trim() &&
    startDate &&
    endDate &&
    reviewTypes.length > 0 &&
    (!hasPeer || peerAssignModes.length > 0);
  const targetsValid = targetCount > 0;
  const canAdvance =
    (step === 0 && step1Valid) ||
    step === 1 ||
    step === 2 ||
    (step === 3 && targetsValid);

  const submit = () => {
    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      reviewTypes,
      peerAssignMode: hasPeer ? peerAssignModes[0] : undefined,
      peerAssignModes: hasPeer ? peerAssignModes : undefined,
      peerVisibilityDefault: hasPeer ? peerVisibility : false,
      // v2 SSOT: 단계별 일정/순서/사용여부/리마인더를 review_sequence 로 전달.
      reviewSequence: {
        order: displayPhases.map((p) => p.id),
        enabled: Object.fromEntries(
          displayPhases.map((p) => [p.id, !disabledPhases.has(p.id)]),
        ),
        schedule: Object.fromEntries(
          displayPhases.map((p) => [p.id, scheduleOf(p.id)]),
        ),
        reminders: Object.fromEntries(
          displayPhases.map((p) => [p.id, reminderOf(p.id)]),
        ),
        templateMap: phaseTemplateMap,
      },
      // v2 슬라이스2: 단계에 매핑된 템플릿 정의를 백엔드로 전달(clientId 로 참조).
      evalTemplates: savedTemplates
        .filter((t) => Object.values(phaseTemplateMap).includes(t.id))
        .map((t) => ({
          clientId: t.id,
          name: t.name,
          reviewType: t.reviewType,
          version: t.version,
          absolute: t.absolute,
          ratioScope: t.ratioScope,
          questions: t.questions.map((q) => ({
            section: q.section,
            text: q.text,
            type: q.type,
          })),
          grades: t.grades.map((g) => ({
            label: g.label,
            desc: g.desc,
            ratio: g.ratio,
          })),
        })),
      // 구 flat due 컬럼은 review_sequence 로 대체 — back-compat 위해 null 전달.
      peerAssignDue: null,
      selfReviewDue: null,
      peerReviewDue: null,
      calibrationDue: null,
      includeMode,
      memberIds: targetIds,
    };
    onSubmit(payload);
  };

  return createPortal(
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="evc-wiz-header">
          <h3 className="evc-modal-title">{L.createTitle}</h3>
          <button type="button" className="evc-wiz-close" onClick={onCancel} aria-label={L.cancel}>
            ✕
          </button>
        </div>

        <StepBar steps={steps} current={step} labels={L} onJump={setStep} />

        <div className="evc-wiz-body">
          {step === 0 && (
            <div className="evc-wiz-panel">
              <label className="evc-field-label" htmlFor="evc-wiz-name">{L.cycleName}</label>
              <input
                id="evc-wiz-name"
                className="evc-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L.cycleNamePlaceholder}
                autoFocus
                data-testid="evc-wiz-name"
              />
              <div className="evc-field-grid">
                <div>
                  <label className="evc-field-label">{L.startDate}</label>
                  <button
                    type="button"
                    className={`evc-input evc-date-btn${picker?.field === 'start' ? ' is-open' : ''}`}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={openPicker('start')}
                    data-testid="evc-wiz-start"
                  >
                    {startDate || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                  </button>
                </div>
                <div>
                  <label className="evc-field-label">{L.endDate}</label>
                  <button
                    type="button"
                    className={`evc-input evc-date-btn${picker?.field === 'end' ? ' is-open' : ''}`}
                    style={{ textAlign: 'left', cursor: 'pointer' }}
                    onClick={openPicker('end')}
                    data-testid="evc-wiz-end"
                  >
                    {endDate || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                  </button>
                </div>
              </div>
              {picker && (
                <DatePicker
                  anchorRect={picker.rect}
                  anchorEl={picker.el}
                  selectedDate={isoToDate(picker.field === 'start' ? startDate : endDate)}
                  onSelect={(d) => {
                    const iso = dateToIso(d);
                    if (picker.field === 'start') setStartDate(iso);
                    else setEndDate(iso);
                    setPicker(null);
                  }}
                  onClose={() => setPicker(null)}
                />
              )}

              <span className="evc-field-label">{L.reviewTypes}</span>
              <div className="evc-type-row">
                {['self', 'peer', 'upward', 'leader'].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`evc-type-chip${reviewTypes.includes(t) ? ' is-on' : ''}`}
                    onClick={() => toggleType(t)}
                    data-testid={`evc-wiz-type-${t}`}
                  >
                    {L[REVIEW_TYPE_KEYS[t]]}
                  </button>
                ))}
              </div>

              {hasPeer && (
                <>
                  <span className="evc-field-label">{L.peerAssignModeLabel}</span>
                  <div className="evc-mode-list">
                    {PEER_MODES.map((m) => (
                      <button
                        type="button"
                        key={m.key}
                        className={`evc-mode-item${peerAssignModes.includes(m.key) ? ' is-on' : ''}`}
                        onClick={() => togglePeerMode(m.key)}
                        data-testid={`evc-wiz-mode-${m.key}`}
                      >
                        <span className="evc-member-check" />
                        <span className="evc-mode-name">{L[m.label]}</span>
                        {m.badge && (
                          <span className={`evc-mode-badge${m.badge === 'exceptionBadge' ? ' is-warn' : ''}`}>
                            {L[m.badge]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <label className="evl-promo-row" style={{ marginTop: 'var(--spacing-md, 8px)' }}>
                    <input
                      type="checkbox"
                      checked={peerVisibility}
                      onChange={(e) => setPeerVisibility(e.target.checked)}
                      data-testid="evc-wiz-peer-visibility"
                    />
                    <span>{L.peerVisibilityLabel}</span>
                  </label>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="evc-wiz-panel">
              <p className="evc-wiz-hint">{L.templateHint}</p>

              <span className="evc-field-label">{L.templateTypeLabel}</span>
              <div className="evc-type-row">
                {TEMPLATE_TYPES.map((rt) => (
                  <button
                    type="button"
                    key={rt.id}
                    className={`evc-type-chip${tplType === rt.id ? ' is-on' : ''}${reviewTypes.includes(rt.id) ? '' : ' is-dim'}`}
                    onClick={() => setTplType(rt.id)}
                    data-testid={`evc-tpl-type-${rt.id}`}
                  >
                    {L[rt.nameKey]}
                  </button>
                ))}
              </div>

              <span className="evc-field-label">{L.templateNameLabel}</span>
              <input
                className="evc-input"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder={L.templateNamePlaceholder}
                data-testid="evc-tpl-name"
              />

              <span className="evc-field-label">{L.templateVersionLabel}</span>
              <div className="evc-type-row">
                {TEMPLATE_VERSIONS.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    className={`evc-type-chip${tplVersion === v.id ? ' is-on' : ''}`}
                    onClick={() => selectTplPreset(v.id)}
                    data-testid={`evc-tpl-version-${v.id}`}
                  >
                    {L[v.labelKey]}
                  </button>
                ))}
              </div>

              <span className="evc-field-label">
                {L.templateItemsLabel} ({tplQuestions.length})
              </span>
              <div className="evc-tpl-items">
                {tplQuestions.map((q) => (
                  <div key={q.id} className="evc-tpl-item">
                    <span className="evc-tpl-item-section">{q.section}</span>
                    <span className="evc-tpl-item-text">{q.text}</span>
                    <span className="evc-tpl-item-type">
                      {L[QUESTION_TYPES.find((t) => t.id === q.type)?.labelKey] || q.type}
                    </span>
                    <button
                      type="button"
                      className="evc-tpl-x"
                      onClick={() => removeQuestion(q.id)}
                      aria-label={L.delete}
                      data-testid={`evc-tpl-item-del-${q.id}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <AddQuestionRow onAdd={addQuestion} labels={L} />

              <span className="evc-field-label">{L.templateGradesLabel}</span>
              <label className="evl-promo-row">
                <input
                  type="checkbox"
                  checked={tplAbsolute}
                  onChange={(e) => setTplAbsolute(e.target.checked)}
                  data-testid="evc-tpl-absolute"
                />
                <span>{L.templateAbsolute}</span>
              </label>
              {!tplAbsolute && (
                <select
                  className="evc-input"
                  value={tplRatioScope}
                  onChange={(e) => setTplRatioScope(e.target.value)}
                  data-testid="evc-tpl-ratioscope"
                >
                  {RATIO_SCOPES.map((r) => (
                    <option key={r.id} value={r.id}>{L[r.labelKey]}</option>
                  ))}
                </select>
              )}
              <div className="evc-tpl-grades">
                {tplGrades.map((g, i) => (
                  <div key={i} className="evc-tpl-grade">
                    <input
                      className="evc-input"
                      value={g.label}
                      placeholder={L.gradeLabelPlaceholder}
                      onChange={(e) => updateGrade(i, 'label', e.target.value)}
                      data-testid={`evc-tpl-grade-label-${i}`}
                    />
                    <input
                      className="evc-input"
                      value={g.desc}
                      placeholder={L.gradeDescPlaceholder}
                      onChange={(e) => updateGrade(i, 'desc', e.target.value)}
                    />
                    {!tplAbsolute && (
                      <input
                        type="number"
                        className="evc-input evc-tpl-grade-ratio"
                        value={g.ratio}
                        onChange={(e) => updateGrade(i, 'ratio', Number(e.target.value))}
                        data-testid={`evc-tpl-grade-ratio-${i}`}
                      />
                    )}
                    <button
                      type="button"
                      className="evc-tpl-x"
                      onClick={() => removeGrade(i)}
                      disabled={tplGrades.length <= MIN_GRADES}
                      aria-label={L.delete}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="evc-tpl-grade-foot">
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  onClick={addGrade}
                  disabled={tplGrades.length >= MAX_GRADES}
                  data-testid="evc-tpl-add-grade"
                >
                  {L.templateAddGrade}
                </button>
                {!tplAbsolute && (
                  <span className={`evc-tpl-ratiosum${tplRatioInvalid ? ' is-invalid' : ''}`}>
                    {fill(L.templateRatioSum, { sum: tplRatioSum })}
                  </span>
                )}
              </div>

              <div className="evc-tpl-lib">
                <button
                  type="button"
                  className="evc-btn is-primary"
                  onClick={saveTemplate}
                  disabled={!tplName.trim() || !tplGradesValid}
                  data-testid="evc-tpl-save"
                >
                  {L.templateSave}
                </button>
                {savedTemplates.length > 0 && (
                  <div className="evc-tpl-lib-list">
                    {savedTemplates.map((t) => (
                      <div key={t.id} className="evc-tpl-lib-item">
                        <span className="evc-mode-badge">
                          {L[TEMPLATE_TYPES.find((x) => x.id === t.reviewType)?.nameKey]}
                        </span>
                        <span className="evc-tpl-lib-name">{t.name}</span>
                        <span className="evc-tpl-lib-meta">
                          {fill(L.templateMeta, {
                            items: t.questions.length,
                            grades: t.grades.length,
                          })}
                        </span>
                        <button
                          type="button"
                          className="evc-btn is-ghost"
                          onClick={() => loadTemplate(t)}
                          data-testid={`evc-tpl-load-${t.id}`}
                        >
                          {L.templateLoad}
                        </button>
                        <button
                          type="button"
                          className="evc-tpl-x"
                          onClick={() => deleteTemplate(t.id)}
                          aria-label={L.delete}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="evc-wiz-panel">
              <p className="evc-wiz-hint">{L.scheduleHint}</p>
              {overlapPairs.length > 0 && (
                <div className="evc-sched-overlap-note" data-testid="evc-sched-overlap">
                  {L.scheduleOverlapNote}
                </div>
              )}
              {(() => {
                let n = 0;
                return displayPhases.map((ph) => {
                  const enabled = !disabledPhases.has(ph.id);
                  if (enabled) n += 1;
                  const isOver =
                    overId === ph.id && !ph.anchor && dragId && dragId !== ph.id;
                  const rtype = PHASE_TO_REVIEW_TYPE[ph.id];
                  const sc = scheduleOf(ph.id);
                  return (
                    <div
                      key={ph.id}
                      draggable={!ph.anchor}
                      onDragStart={() => { if (!ph.anchor) setDragId(ph.id); }}
                      onDragOver={(e) => { if (!ph.anchor && dragId) { e.preventDefault(); setOverId(ph.id); } }}
                      onDrop={() => { if (!ph.anchor) movePhase(ph.id); setDragId(null); setOverId(null); }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      className={`evc-sched-card${ph.required ? ' is-required' : ''}${enabled ? '' : ' is-off'}${isOver ? ' is-over' : ''}${enabled && overlapIds.has(ph.id) ? ' has-overlap' : ''}`}
                      data-testid={`evc-sched-card-${ph.id}`}
                    >
                      <div className="evc-sched-head">
                        <span
                          className="evc-sched-handle"
                          title={ph.anchor ? L.phaseFixedHint : L.phaseDragHint}
                        >
                          {ph.anchor ? <LockIcon /> : <GripIcon />}
                        </span>
                        <span className="evc-sched-num">{enabled ? n : '–'}</span>
                        <span className="evc-sched-name">{L[ph.nameKey]}</span>
                        <span className="evc-sched-owner">
                          {L.ownerLabel}: {L[ph.targetKey]}
                        </span>
                        {ph.required && <span className="evc-mode-badge">{L.badgeRequired}</span>}
                        {ph.anchor && <span className="evc-mode-badge is-muted">{L.badgeFixed}</span>}
                        {!enabled && <span className="evc-mode-badge is-muted">{L.badgeUnused}</span>}
                        {enabled && overlapIds.has(ph.id) && (
                          <span className="evc-mode-badge is-warn">{L.badgeParallel}</span>
                        )}
                        <button
                          type="button"
                          className={`evc-sched-toggle${enabled ? ' is-on' : ''}${ph.required ? ' is-locked' : ''}`}
                          onClick={() => { if (!ph.required) togglePhaseEnabled(ph.id); }}
                          disabled={ph.required}
                          aria-pressed={enabled}
                          data-testid={`evc-sched-toggle-${ph.id}`}
                        >
                          <span className="evc-sched-toggle-dot" />
                        </button>
                      </div>
                      {enabled && (
                        <div className="evc-sched-fields">
                          <div className="evc-sched-field">
                            <span className="evc-field-label">{L.startDate}</span>
                            <button
                              type="button"
                              className={`evc-input evc-date-btn${schedPicker?.phaseId === ph.id && schedPicker?.field === 'start' ? ' is-open' : ''}`}
                              style={{ textAlign: 'left', cursor: 'pointer' }}
                              onClick={openSchedPicker(ph.id, 'start')}
                              data-testid={`evc-sched-start-${ph.id}`}
                            >
                              {sc.start || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                            </button>
                          </div>
                          <div className="evc-sched-field">
                            <span className="evc-field-label">{L.endDate}</span>
                            <button
                              type="button"
                              className={`evc-input evc-date-btn${schedPicker?.phaseId === ph.id && schedPicker?.field === 'end' ? ' is-open' : ''}`}
                              style={{ textAlign: 'left', cursor: 'pointer' }}
                              onClick={openSchedPicker(ph.id, 'end')}
                              data-testid={`evc-sched-end-${ph.id}`}
                            >
                              {sc.end || <span style={{ opacity: 0.45 }}>YYYY-MM-DD</span>}
                            </button>
                          </div>
                          <label className="evc-sched-field">
                            <span className="evc-field-label">{L.reminderLabel}</span>
                            <select
                              className="evc-input"
                              value={reminderOf(ph.id)}
                              onChange={(e) => setReminders((r) => ({ ...r, [ph.id]: e.target.value }))}
                              data-testid={`evc-sched-reminder-${ph.id}`}
                            >
                              {REMINDER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{L[o.labelKey]}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                      {enabled && rtype && (() => {
                        const opts = savedTemplates.filter((t) => t.reviewType === rtype);
                        return (
                          <div className="evc-sched-tpl">
                            <span className="evc-field-label">
                              {L.appliedTemplate}{' '}
                              <span className="evc-mode-badge">{L[REVIEW_TYPE_KEYS[rtype]]}</span>
                            </span>
                            {opts.length === 0 ? (
                              <div className="evc-sched-tpl-empty">{L.templateEmptyHint}</div>
                            ) : (
                              <select
                                className="evc-input"
                                value={phaseTemplateMap[ph.id] || ''}
                                onChange={(e) =>
                                  setPhaseTemplateMap((m) => ({ ...m, [ph.id]: e.target.value }))
                                }
                                data-testid={`evc-sched-tpl-${ph.id}`}
                              >
                                <option value="">{L.templateSelectPlaceholder}</option>
                                {opts.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                });
              })()}
              {schedPicker && (
                <DatePicker
                  anchorRect={schedPicker.rect}
                  anchorEl={schedPicker.el}
                  selectedDate={isoToDate(scheduleOf(schedPicker.phaseId)[schedPicker.field])}
                  onSelect={(d) => {
                    updateSchedule(schedPicker.phaseId, schedPicker.field, dateToIso(d));
                    setSchedPicker(null);
                  }}
                  onClose={() => setSchedPicker(null)}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="evc-wiz-panel">
              <div className="evc-type-row">
                <button
                  type="button"
                  className={`evc-type-chip${includeMode === 'bulk' ? ' is-on' : ''}`}
                  onClick={() => setIncludeMode('bulk')}
                  data-testid="evc-wiz-mode-bulk"
                >
                  {L.targetModeAll}
                </button>
                <button
                  type="button"
                  className={`evc-type-chip${includeMode === 'individual_select' ? ' is-on' : ''}`}
                  onClick={() => setIncludeMode('individual_select')}
                  data-testid="evc-wiz-mode-individual"
                >
                  {L.targetModeIndividual}
                </button>
              </div>

              {includeMode === 'bulk' ? (
                <p className="evc-wiz-hint" data-testid="evc-wiz-bulk-note">
                  {fill(L.targetAllNote, { count: candidates.length })}
                </p>
              ) : (
                <>
                  <input
                    className="evc-input"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder={L.searchMember}
                    data-testid="evc-wiz-member-search"
                  />
                  <p className="evc-wiz-hint">
                    {fill(L.selectedCount, { count: targetCount })}
                  </p>
                  <div className="evc-member-list">
                    {filteredCandidates.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className={`evc-member-item${selectedIds.includes(c.id) ? ' is-on' : ''}`}
                        onClick={() => toggleMember(c.id)}
                        data-testid={`evc-wiz-member-${c.id}`}
                      >
                        <span className="evc-member-check" />
                        <span className="evc-member-name">{c.name}</span>
                        {c.department && (
                          <span className="evc-member-dept">{c.department}</span>
                        )}
                      </button>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <p className="evc-wiz-hint">{L.noMembers}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="evc-wiz-panel">
              <div className="evc-summary-card">
                <div className="evc-summary-row"><span>{L.cycleName}</span><b>{name}</b></div>
                <div className="evc-summary-row"><span>{L.period}</span><b>{startDate} ~ {endDate}</b></div>
                <div className="evc-summary-row">
                  <span>{L.reviewTypes}</span>
                  <b>{reviewTypes.map((t) => L[REVIEW_TYPE_KEYS[t]]).join(' · ')}</b>
                </div>
                {hasPeer && (
                  <div className="evc-summary-row">
                    <span>{L.peerAssignModeLabel}</span>
                    <b>
                      {peerAssignModes
                        .map((k) => L[PEER_MODES.find((m) => m.key === k)?.label])
                        .join(' · ')}
                    </b>
                  </div>
                )}
                {hasPeer && (
                  <div className="evc-summary-row">
                    <span>{L.peerVisibilityLabel}</span>
                    <b>{peerVisibility ? L.peerVisibilityOn : L.peerVisibilityOff}</b>
                  </div>
                )}
                <div className="evc-summary-row">
                  <span>{L.targetSummaryLabel}</span>
                  <b>{fill(L.targetSummaryValue, { count: targetCount })}</b>
                </div>
                <div className="evc-summary-row">
                  <span>{L.scheduleSummaryLabel}</span>
                  <b>
                    {displayPhases
                      .filter((p) => !disabledPhases.has(p.id))
                      .map((p) => L[p.nameKey])
                      .join(' · ')}
                  </b>
                </div>
              </div>
              <p className="evc-wiz-hint">{L.createDraftHint}</p>
            </div>
          )}
        </div>

        <div className="evc-wiz-footer">
          <button type="button" className="evc-btn is-ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
            {step === 0 ? L.cancel : L.prev}
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={!canAdvance}
              onClick={() => setStep(step + 1)}
              data-testid="evc-wiz-next"
            >
              {L.next}
            </button>
          ) : (
            <button type="button" className="evc-btn is-primary" onClick={submit} data-testid="evc-wiz-submit">
              {L.create}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
