import { Fragment, useEffect, useRef, useState } from 'react';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import Icon from '../shared/Icon.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import SearchSelect from '../shared/SearchSelect.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { ChevronDownGlyph } from '../shared/lineIcons.jsx';
import { isKoreanLocale } from '../shared/uiLocale.js';
import { isEnterKey } from '../shared/enterKey.js';
import OkrMemberPicker from './OkrMemberPicker.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';
import rowKey from './rowKey.js';
import stripListMarker from '../shared/stripListMarker.js';
import Spinner from '../shared/Spinner.jsx';

/**
 * OkrComposeFullModal — 개인 OKR 작성 풀스크린 모달.
 *
 * 좌측: 팀 OKR 미니맵. KR 의 + 버튼을 누르면 해당 팀 KR 에 연결된 개인 KR 이
 * (마지막/신규 Objective 에) 추가된다. 우측: Objective/KR 편집 폼.
 * 가중치는 Objective 합계 100%, 각 Objective 의 KR 합계 100% 여야 저장 가능.
 * 저장 시 onSubmit(objectives) 로 소비자에 전달한다.
 *
 * 시안: pivit-specs okr-individual.jsx(IndividualOKRWriter/ObjectiveWriteCard).
 * KR 담당자는 검색 드롭다운(OkrMemberPicker, okr-spec §3.8A).
 * KR 마다 실행 항목(Initiative) 편집 블록을 둔다 — okr-policy §4A · okr-spec §3.7 (PW-501).
 *
 * onSubmit(objectives): objectives = [{ id?, title, weight, comOkr?, krs: [{ id?,
 *   title, target, unit, inputType('percent'|'binary'|'count'), weight, parentKrIds? }] }]
 *
 * 상위 KR 참조는 **`parentKrIds: string[]`** 다 (0~다, N:M). 한 KR 이 상위 성과
 * 여러 곳에 기여하는 것이 정상이라 단일값으로 두면 그중 하나를 임의로 버린다.
 * 미니맵 항목은 표시용 번호(`id`, 예: `KR 1`)와 **실제 참조 id**(`krId`)를 따로 갖는다 —
 * 표시 번호는 그룹마다 겹쳐서 참조로 쓸 수 없다. 구 단일 필드 `teamKrId` 는
 * `initialObjectives` 읽기에서만 하위호환으로 승격해 받는다(쓰기는 신 필드로만 한다).
 *
 * `initialObjectives` 를 주면 **같은 폼이 편집기로도 쓰인다** — 이미 등록된
 * Objective/KR 을 채운 채로 열리고, 저장 payload 는 원본 `id` 를 그대로 실어 보낸다.
 * 소비 측은 그 id 로 수정/추가/삭제를 가른다(PW-160: 등록 후 정정 수단이 없었다).
 * 주지 않으면 지금까지와 동일하게 빈 폼으로 열린다 — 작성 경로 동작은 그대로다.
 *
 * `labels` 로 계층 문구를 바꿔 끼울 수 있다(PW-268). 이 모달은 개인 OKR 기준 문구가
 * 박혀 있어, 조직 단위(본부·부서·팀) 탭에서 열면 "개인 OKR을 시작해보세요" 처럼
 * 화면과 어긋난 안내가 떴다. 미주입 시 아래 기본값 그대로라 기존 화면은 불변이다.
 */
const DEFAULT_LABELS = {
  eyebrow: '팀 OKR 미니맵',
  hint: '좌측 팀 OKR 미니맵에서 + 를 클릭하면 해당 팀 KR에 연결된 개인 KR이 자동 추가됩니다.',
  emptyTitle: '개인 OKR을 시작해보세요',
  emptyDesc: '우측 팀 OKR 미니맵에서 + 를 클릭하거나\n직접 추가로 시작하세요',
  parentKrAdd: '+ 상위 KR 연결 (복수 가능)',
  parentKrRemove: '연결 해제',
  // 걸려 있지만 미니맵에 없는 상위 KR(미니맵 밖 그룹·지워진 KR)의 배지 문구.
  parentKrUnknown: '연결된 상위 KR',
  // AI 가 KR 을 만드는 사이 Objective 제목을 고쳤다 — 옛 제목에 맞춘 KR 을 넣지 않고 다시 누르게 한다(PW-2215).
  krGenStale: '제목이 바뀌어 AI KR 을 넣지 않았습니다. 다시 눌러 주세요.',
  // ✦ 개선을 기다리는 사이 그 KR 내용을 고쳤다 — 고친 글을 옛 글 기준 결과로 덮지 않는다(PW-2215).
  krRefineStale: 'KR 내용이 바뀌어 AI 개선을 넣지 않았습니다. 다시 눌러 주세요.',
  // ── 아래는 창 안 나머지 문구 전부 (pivit-work PW-2216) — 영어 화면에서도 이 창이 한국어로 남아
  // 소비자가 전부 덮을 수 있게 열었다. 미주입 시 시안 그대로.
  initStatusTodo: '예정',
  initStatusInProgress: '진행 중',
  initStatusDone: '완료',
  methodPercent: '% 달성률',
  methodPercentDesc: '0~100% 직접 입력',
  methodBinary: '완료 여부',
  methodBinaryDesc: '달성/미달성',
  methodCount: '개수 달성',
  methodCountDesc: 'n / 목표 개수',
  // 측정 방식을 고르면 단위 칸에 미리 넣는 값 — 소비자 언어를 따른다(칸은 고칠 수 있다).
  unitCount: '개',
  unitDone: '완료',
  weightTooltip: 'Objective 가중치 합과 각 Objective의 KR 가중치 합이 모두 100%가 되어야 저장할 수 있습니다.',
  krWeightReason: 'KR 가중치 합이 100% 여야 저장할 수 있습니다.',
  genObjectivesFailed: 'AI Objective 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  genKrsFailed: 'AI KR 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  refineKrFailed: 'KR 개선에 실패했습니다. 잠시 후 다시 시도해주세요.',
  saveFailed: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
  objectiveTitleRequired: 'Objective 내용을 입력해주세요.',
  krRequired: 'Objective 마다 KR 을 1개 이상 추가해야 저장할 수 있습니다.',
  krTitleRequired: 'KR 내용을 입력해주세요.',
  // ✓·✦ 글리프는 부품이 붙인다 — 번역 값에는 글자만 들어온다.
  objectiveSumOk: 'Objective 100%',
  // `{{total}}` 자리에 지금 합계(숫자)가 들어간다.
  objectiveSum: 'Objective 현재 합계: {{total}}% (100%가 되어야 합니다)',
  krSumOk: '100%',
  krSum: '현재 합계: {{total}}% (100%가 되어야 합니다)',
  cancel: '취소',
  save: '저장',
  saving: '저장 중…',
  generating: '생성 중…',
  generateObjectives: 'AI로 Objective 생성',
  addObjective: 'Objective 추가',
  addFirst: '직접추가',
  objectiveTitlePlaceholder: 'Objective 내용',
  weightPlaceholder: '가중치',
  objectiveWeight: 'Objective 가중치',
  parentOkr: '상위 OKR 연결',
  parentOkrPlaceholder: '상위 OKR 연결 (선택)',
  krTitlePlaceholder: 'KR 내용',
  refineKr: 'AI로 KR 개선',
  refining: '개선 중…',
  refine: '개선',
  targetPlaceholder: '목표',
  krTarget: 'KR 목표값',
  unitPlaceholder: '단위',
  krUnit: 'KR 단위',
  krWeight: 'KR 가중치',
  krOwner: 'KR 담당자',
  // 담당자 고르기(OkrMemberPicker) 칸 — 비었을 때 글자·검색칸·결과 없음
  ownerPlaceholder: '담당자',
  ownerSearchPlaceholder: '이름 검색...',
  // 검색칸 접근성 이름은 「{칸 이름} {ownerSearchSuffix}」 — 종전 「KR 담당자 검색」 그대로
  ownerSearchSuffix: '검색',
  ownerNoResult: '검색 결과 없음',
  initStatus: '실행 항목 상태',
  initTitlePlaceholder: '실행 항목 내용',
  initOwner: '실행 항목 담당자',
  initRemove: '실행 항목 삭제',
  initEmpty: '아직 실행 항목이 없습니다. 아래에서 추가하세요.',
  // 앞의 + 는 아이콘이 그린다 — 글에는 넣지 않는다 (PW-2219).
  initAdd: 'Initiative 추가',
  addKr: 'KR 직접추가',
  generateKrs: 'AI로 KR 생성',
};
/** `{{total}}` 자리표시자를 숫자로 바꾼다 — 소비자가 i18n 문구를 그대로 넘길 수 있게 같은 모양을 쓴다. */
const fill = (text, total) => String(text).replace('{{total}}', String(total));
/**
 * 실행 항목 상태 3단 — 서버 `kr_initiatives.status` 와 같은 값이다
 * (okr-policy §9.2A v8.2). 2상태(체크박스)로는 `in_progress` 를 만들 수 없어
 * 종전 완료 체크박스를 select 로 바꿨다.
 */
// 글자는 `DEFAULT_LABELS` 의 키로 가리킨다 — 소비자가 언어에 맞춰 덮는다 (PW-2216).
const INIT_STATUS = [
  { key: 'todo', labelKey: 'initStatusTodo' },
  { key: 'in_progress', labelKey: 'initStatusInProgress' },
  { key: 'done', labelKey: 'initStatusDone' },
];
const METHODS = [
  { key: 'percent', labelKey: 'methodPercent', descKey: 'methodPercentDesc', unitKey: null },
  { key: 'binary', labelKey: 'methodBinary', descKey: 'methodBinaryDesc', unitKey: 'unitDone' },
  { key: 'count', labelKey: 'methodCount', descKey: 'methodCountDesc', unitKey: 'unitCount' },
];
// 가중치 문구 — okr-spec §8 · okr-policy §10 (PW-1503). 글자는 `L.weightTooltip`·`L.krWeightReason`.

/**
 * AI 가 준 가중치를 그대로 쓰되, 정수가 아니거나 합이 100 이 아니면 균등 배분(합 100)으로
 * 바꾼다 — 합이 어긋난 초안은 저장이 막혀, 받자마자 숫자를 다시 맞춰야 한다.
 */
function weightsOf(list) {
  const given = list.map((x) => Number(x?.weight));
  if (given.every((w) => Number.isInteger(w) && w >= 0) && given.reduce((a, w) => a + w, 0) === 100) {
    return given;
  }
  const n = list.length || 1;
  const base = Math.floor(100 / n);
  return list.map((_, i) => (i === n - 1 ? 100 - base * (n - 1) : base));
}

let seq = 0;
const nextId = () => { seq += 1; return `cf-${seq}`; };

function emptyKr(linked, selfId) {
  // 참조는 표시 번호(`id`)가 아니라 실제 KR id(`krId`)로 잡는다 — `KR 1` 은 그룹마다
  // 겹쳐서 소비 측이 어느 상위인지 되찾을 수 없다.
  const parentId = linked?.krId ?? null;
  return {
    key: nextId(),
    title: '',
    target: linked?.target ?? 100,
    unit: linked?.unit ?? '%',
    inputType: linked?.inputType ?? 'percent',
    weight: '',
    // 개인 OKR 이므로 담당자 기본값은 본인 — 시안 okr-individual.jsx 의 pic=ME.name.
    ownerId: selfId ?? '',
    parentKrIds: parentId ? [parentId] : [],
    initiatives: [],
  };
}

/** 새 실행 항목 행. 기본 상태는 서버 DB 기본값과 같은 `todo` 다 (okr-policy §4A.4). */
function emptyInitiative() {
  return { key: nextId(), title: '', status: 'todo', ownerId: '' };
}
function emptyObjective(linkedKr, selfId) {
  return {
    key: nextId(),
    title: '',
    weight: '',
    parentId: '',
    krs: linkedKr ? [emptyKr(linkedKr, selfId)] : [],
  };
}

/**
 * 편집 진입 시 채워 넣을 폼 상태. 숫자는 문자열로 눕힌다 — 폼 입력이 문자열을
 * 다루고, 0 을 숫자로 두면 `value={0}` 이 '0' 으로 보이는 것까지는 같지만 이후
 * 사용자가 지웠을 때 타입이 갈려 비교가 어긋난다.
 */
function seedObjective(o) {
  return {
    key: nextId(),
    id: o.id,
    title: o.title ?? '',
    weight: o.weight == null ? '' : String(o.weight),
    parentId: o.parentOkrId ?? '',
    krs: (o.krs ?? []).map((k) => ({
      key: nextId(),
      id: k.id,
      title: k.title ?? '',
      target: k.target == null ? '' : String(k.target),
      unit: k.unit ?? '',
      inputType: k.inputType ?? 'percent',
      weight: k.weight == null ? '' : String(k.weight),
      ownerId: k.ownerId ?? '',
      // 하위호환 읽기 — 구 단일 필드는 원소 1개짜리 배열로 승격한다.
      parentKrIds: k.parentKrIds ?? (k.teamKrId ? [k.teamKrId] : []),
      initiatives: (k.initiatives ?? []).map((i) => ({
        key: nextId(),
        id: i.id,
        title: i.title ?? '',
        status: i.status ?? 'todo',
        ownerId: i.ownerId ?? '',
      })),
    })),
  };
}

/**
 * 상위 KR 연결 칸 (PW-1383 · PW-2219).
 * 닫힌 모양은 디자이너 원본 창(07-13)의 「팀 KR 연결 ⌄」 회색 pill(`.okr-cf-select`), 펼치면 연도/분기
 * 드롭다운(`.okr-select-menu` · `-item` · `-inner`)이고, 묶음 머리는 미니맵 머리띠(`.okr-cf-group-head`),
 * 검색칸은 같은 창 입력 칸(`.okr-cf-input`)이다. 작성 창 본문이 스크롤 칸이라 펼침은 AnchoredLayer 로 띄운다.
 *
 * groups: [{ title, items: [{ value, label }] }] — 이미 건 KR 은 호출부가 빼고 준다.
 */
/** 검색칸·「결과 없음」 글 — 종전 SearchSelect 기본 문구와 같다(화면 언어 ko/en). */
const PARENT_MENU_WORDS = {
  ko: { search: '검색', noResult: '일치하는 항목이 없습니다' },
  en: { search: 'Search', noResult: 'No matches' },
};
function ParentKrAdd({ label, groups, onPick }) {
  const words = PARENT_MENU_WORDS[isKoreanLocale() ? 'ko' : 'en'];
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = () => { setOpen(false); setQ(''); };
  useDismissLayer(close, panelRef, triggerRef, open);

  const ql = q.trim().toLowerCase();
  const shown = groups
    .map((g) => ({ ...g, items: ql ? g.items.filter((it) => it.label.toLowerCase().includes(ql)) : g.items }))
    .filter((g) => g.items.length > 0);
  const pick = (value) => {
    onPick(value);
    close();
    triggerRef.current?.focus();
  };
  // ↓·↑ 로 후보 사이를 옮긴다(종전 SearchSelect 와 같은 손놀림). 검색칸에서 ↓ 는 첫 후보로, 첫 후보에서 ↑ 는 검색칸으로.
  const moveFocus = (from, step) => {
    const opts = Array.from(panelRef.current?.querySelectorAll('[role="option"]') ?? []);
    const at = opts.indexOf(from);
    const next = at + step;
    if (next < 0) panelRef.current?.querySelector('input')?.focus();
    else opts[Math.min(next, opts.length - 1)]?.focus();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="okr-cf-select okr-cf-select-btn"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
        <ChevronDownGlyph className="okr-cf-select-caret" size={14} />
      </button>
      {open && (
        <AnchoredLayer
          anchorRef={triggerRef}
          panelRef={panelRef}
          // .okr-select-menu 의 min-width: 100% 는 화면 고정(fixed) 자리에서 화면 폭이 된다 — 폭과 같게 묶는다.
          width={320}
          minWidth={320}
          maxHeight={256}
          className="okr-select-menu okr-cf-parent-menu"
          // 작성 창(1000) 위에 — 담당자 드롭다운 패널(.okr-cf-pick-panel)과 같은 층.
          style={{ zIndex: 1100 }}
        >
          <div className="okr-select-item">
            <input
              autoFocus
              className="okr-cf-input"
              placeholder={words.search}
              aria-label={words.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  moveFocus(null, 1);
                  return;
                }
                // 거른 결과의 맨 위를 Enter 로 바로 건다(종전 SearchSelect 와 같은 손놀림).
                if (isEnterKey(e) && shown[0]) {
                  e.preventDefault();
                  pick(shown[0].items[0].value);
                }
              }}
            />
          </div>
          <div role="listbox" aria-label={label}>
            {shown.length === 0 ? (
              <div className="okr-select-item">
                <p className="okr-cf-hint" role="status">{words.noResult}</p>
              </div>
            ) : shown.map((g, gi) => (
              <div role="presentation" key={rowKey(g, gi, 'title')}>
                <div className="okr-select-item" role="presentation">
                  <div className="okr-cf-group-head">
                    <span>{g.title}</span>
                  </div>
                </div>
                {g.items.map((it) => (
                  <div className="okr-select-item" key={it.value}>
                    {/* 디자이너 항목은 div 다 — 키보드로도 고를 수 있게 초점·Enter·Space 를 받는다. */}
                    <div
                      role="option"
                      tabIndex={0}
                      aria-selected={false}
                      className="okr-select-item-inner"
                      title={it.label}
                      onClick={() => pick(it.value)}
                      onKeyDown={(e) => {
                        if (isEnterKey(e) || e.key === ' ') {
                          e.preventDefault();
                          pick(it.value);
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.preventDefault();
                          moveFocus(e.currentTarget, e.key === 'ArrowDown' ? 1 : -1);
                        }
                      }}
                    >
                      <span>{it.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </AnchoredLayer>
      )}
    </>
  );
}

export default function OkrComposeFullModal({
  minimap,
  icons,
  baseUrl = '',
  onClose,
  readOnly = false,
  readOnlyLabel = '',
  onSubmit,
  onGenerate,
  onGenerateKrs,
  onRefineKr,
  strategySummary,
  members = [],
  parentOptions = [],
  selfId = '',
  initialObjectives,
  labels,
  showCompanyCard = true,
  // 제목 칸 길이 한도 — 서버 INPUT_LIMITS 와 같은 값을 앱이 넘긴다(저장 컬럼 255 · PW-1505). 안 주면 안 막는다(데모).
  objectiveTitleMaxLength,
  krTitleMaxLength,
  initiativeTitleMaxLength,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  // 미니맵은 **나보다 위** 를 보여주는 자리다. 전사 OKR 처럼 위가 없는 작성 경로에서는
  // 회사 카드가 곧 "지금 쓰고 있는 것" 이라, 고를 수 없는 상위 후보처럼 보인다.
  // 기본값은 지금 동작(그린다)이라 다른 화면의 시안은 그대로다.
  //
  // 회사 카드도 상위 그룹도 없으면 미니맵 열 자체를 접는다 — 안 접으면 좌측에
  // 300px 짜리 빈 자리가 남아, 편집 영역이 이유 없이 안쪽으로 밀린 것처럼 보인다.
  // 전략 캔버스 요약(전사 작성 · okr-spec §4.5)도 같은 열에 선다 — 전사에는 위 그룹이 없다.
  // 목록 행은 번호·글머리를 뗀 뒤에도 남는 줄이 있을 때만 그린다 — 「①」만 친 행은 이름표만 남는다.
  const listLines = (value) => String(value ?? '').split('\n').map(stripListMarker).filter((line) => line.trim());
  const summaryRows = (strategySummary?.rows ?? []).filter((r) =>
    r.list ? listLines(r.value).length > 0 : String(r.value ?? '').trim(),
  );
  const hasMinimap = showCompanyCard || (minimap.groups ?? []).length > 0 || summaryRows.length > 0;
  // seed 는 마운트 시 1회만 — 저장 후 소비 측이 재조회해 prop 이 바뀌어도 폼을
  // 다시 덮어쓰지 않는다(입력 중 갱신이 사용자 타이핑을 날린다). 모달은 열 때마다
  // 마운트되므로 다음 진입에는 최신 값으로 채워진다.
  const [objectives, setObjectives] = useState(() =>
    (initialObjectives ?? []).map(seedObjective),
  );
  // AI KR 결과가 늦게 올 때 그 순간의 제목과 견주려고 둔다(generateKrs · PW-2215).
  const objectivesRef = useRef(objectives);
  useEffect(() => {
    objectivesRef.current = objectives;
  }, [objectives]);
  const [linkedIds, setLinkedIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);
  // KR 행 리파인(✦ 개선) — 로딩·오류를 **행 단위**로 잡는다. 한 번에 한 행만
  // 도는 것이 규칙이라(okr-policy §5.3 R-E5) 키 하나면 충분하고, 오류도 그 행
  // 안에 그려야 해서(INV-R2) 어느 행 것인지 함께 들고 있어야 한다.
  const [refiningKey, setRefiningKey] = useState(null);
  const [refineError, setRefineError] = useState(null); // { key, message }
  // Objective 카드의 ✦ AI로 KR 생성 — 리파인과 같이 한 번에 한 카드만, 오류는 그 카드 안에.
  const [genKrKey, setGenKrKey] = useState(null);
  const [genKrError, setGenKrError] = useState(null); // { key, message }

  const TYPE_UNIT = { number: L.unitCount, percentage: '%', boolean: L.unitDone };
  const TYPE_INPUT = { number: 'count', percentage: 'percent', boolean: 'binary' };
  /**
   * ✦ AI로 Objective 생성 (okr-spec §4.5 · okr-policy §5.2 · PW-1503).
   *
   * 받은 Objective 들로 폼을 **통째로 바꾼다** — 기획 JSX `generateObjectives` 의
   * `setObjectives(parsed.map(o => ({ ...o, krs: [] })))` 와 같다. KR 은 비워 두고 각
   * Objective 카드의 ✦ AI로 KR 생성(또는 직접 추가)으로 채운다. 쓰인 Objective 가 없는
   * 응답은 폼을 건드리지 않고 실패로 본다.
   */
  const generate = async () => {
    if (!onGenerate) return;
    setGenLoading(true); setGenError(null);
    try {
      const res = await onGenerate();
      const draft = res?.draft ?? res;
      const raw = (draft?.objectives ?? []).filter((o) => typeof o?.title === 'string' && o.title.trim());
      if (raw.length === 0) throw new Error('empty-objectives');
      const weights = weightsOf(raw);
      setLinkedIds({});
      setGenKrError(null);
      setObjectives(raw.map((o, i) => ({
        ...emptyObjective(null, selfId),
        title: o.title.trim(),
        weight: String(weights[i]),
      })));
    } catch {
      setGenError(L.genObjectivesFailed);
    } finally { setGenLoading(false); }
  };

  /**
   * ✦ AI로 KR 생성 — 그 Objective 의 KR 을 받은 KR 로 **통째로 바꾼다** (okr-policy §5.2 ·
   * 기획 JSX `generateKrs` 의 `krs: parsed`). 손으로 쓴 KR·상위 KR 연결도 함께 바뀐다는
   * 것이 정책서 §5.3 「세트 생성」의 성격이다 — 한 줄만 고치려면 ✦ 개선을 쓴다.
   * 기다리는 사이 그 Objective 를 지웠으면 patchObjective 가 아무것도 바꾸지 않는다.
   */
  const generateKrs = async (objective) => {
    if (!onGenerateKrs || genKrKey || !objective.title.trim()) return;
    setGenKrKey(objective.key);
    setGenKrError(null);
    const askedTitle = objective.title.trim();
    try {
      const res = await onGenerateKrs({ objectiveTitle: askedTitle });
      // 기다리는 사이 제목을 고쳤으면 옛 제목에 맞춘 KR 이다 — 넣지 않고 알린다(PW-2215).
      // 지금 제목은 렌더마다 갱신하는 ref 로 읽는다 — 이 함수가 잡은 objective 는 누른 순간의 것이다.
      const current = objectivesRef.current.find((o) => o.key === objective.key);
      if (current && current.title.trim() !== askedTitle) {
        setGenKrError({ key: objective.key, message: L.krGenStale });
        return;
      }
      const raw = (res?.keyResults ?? []).filter((k) => typeof k?.title === 'string' && k.title.trim());
      if (raw.length === 0) throw new Error('empty-krs');
      const weights = weightsOf(raw);
      patchObjective(objective.key, {
        krs: raw.map((k, i) => {
          const inputType = TYPE_INPUT[k.type] ?? 'count';
          return {
            ...emptyKr(null, selfId),
            title: k.title.trim(),
            // «완료 여부»는 목표 1 고정이다(okr-spec §3.1B) — 칸이 감춰져 고칠 수 없다.
            target: inputType === 'binary' ? 1 : (k.targetValue ?? 100),
            unit: k.unit || TYPE_UNIT[k.type] || '',
            inputType,
            weight: String(weights[i]),
          };
        }),
      });
    } catch {
      setGenKrError({ key: objective.key, message: L.genKrsFailed });
    } finally {
      setGenKrKey(null);
    }
  };

  const addObjective = () => setObjectives((p) => [...p, emptyObjective(null, selfId)]);
  const removeObjective = (key) => setObjectives((p) => p.filter((o) => o.key !== key));
  const patchObjective = (key, patch) => setObjectives((p) => p.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const addKr = (objKey) => setObjectives((p) => p.map((o) => (o.key === objKey ? { ...o, krs: [...o.krs, emptyKr(null, selfId)] } : o)));
  const removeKr = (objKey, krKey) => setObjectives((p) => p.map((o) => (
    o.key === objKey ? { ...o, krs: o.krs.filter((k) => k.key !== krKey) } : o
  )));
  const patchKr = (objKey, krKey, patch) => setObjectives((p) => p.map((o) => (
    o.key === objKey ? { ...o, krs: o.krs.map((k) => (k.key === krKey ? { ...k, ...patch } : k)) } : o
  )));

  // 실행 항목(Initiative) — 새 배열을 만들어 갈아끼운다. 원본을 변형하면 같은 KR 의
  // 다른 행이나 이웃 KR 이 함께 바뀐다(okr-policy §4A.4 · TC-OKR-142).
  const initsOf = (kr) => kr.initiatives ?? [];
  const addInitiative = (objKey, kr) =>
    patchKr(objKey, kr.key, { initiatives: [...initsOf(kr), emptyInitiative()] });
  const removeInitiative = (objKey, kr, initKey) =>
    patchKr(objKey, kr.key, { initiatives: initsOf(kr).filter((i) => i.key !== initKey) });
  const patchInitiative = (objKey, kr, initKey, patch) =>
    patchKr(objKey, kr.key, {
      initiatives: initsOf(kr).map((i) => (i.key === initKey ? { ...i, ...patch } : i)),
    });

  /**
   * KR 한 줄을 AI 로 다듬는다 (okr-policy §5.3 · PW-523).
   *
   * 세트 생성(onGenerate·onGenerateKrs)과 갈리는 지점은 **무엇을 남기는가** 다. 세트 생성은
   * Objective·KR 을 통째로 바꿔 KR 이 새 key 를 받으므로, 손으로 매어 둔
   * 상위 KR 연결(parentKrIds)과 고른 달성 방식(inputType)이 그 줄에 남지 않는다.
   * 리파인은 title·target·unit 만 갈아끼우고 나머지는 건드리지 않는다.
   *
   * 확인 단계를 두지 않는다 — 응답이 오면 바로 그 줄에 들어간다(§5.3 R-E6 ·
   * 2026-09-01 확정). 되돌림 비용이 「한 줄 다시 쓰기」라 확인 단계가 더 비싸다.
   */
  const refineKr = async (objKey, kr) => {
    if (!onRefineKr || refiningKey || !kr.title.trim()) return;
    const objective = objectives.find((o) => o.key === objKey);
    setRefiningKey(kr.key);
    setRefineError(null);
    try {
      const res = await onRefineKr({
        objectiveTitle: objective?.title ?? '',
        title: kr.title,
        target: kr.target,
        unit: kr.unit,
      });
      const next = res?.refined ?? res;
      const title = typeof next?.title === 'string' ? next.title.trim() : '';
      // 빈 title 로 덮으면 멀쩡한 줄이 빈 KR 이 된다 — 부분 덮어쓰기를 통째로
      // 포기한다(§5.3 R-E3). target·unit 만 오는 응답도 마찬가지로 버린다.
      if (!title) throw new Error('empty-title');
      const patch = { title };
      if (next.target !== undefined && next.target !== null && next.target !== '') {
        patch.target = next.target;
      }
      if (typeof next.unit === 'string' && next.unit.trim()) patch.unit = next.unit.trim();
      // 기다리는 사이 그 KR 내용을 고쳤으면 고친 글을 덮지 않는다 — AI KR 생성과 같은 규칙(PW-2215).
      const currentKr = objectivesRef.current
        .find((o) => o.key === objKey)
        ?.krs.find((k) => k.key === kr.key);
      if (currentKr && currentKr.title.trim() !== kr.title.trim()) {
        setRefineError({ key: kr.key, message: L.krRefineStale });
        return;
      }
      // 기다리는 사이 그 행을 지웠으면 key 가 없어 아무 행도 안 바뀐다(§5.3 R-E4).
      patchKr(objKey, kr.key, patch);
    } catch {
      // 실패는 상태를 만들지 않는다(INV-R1) — 위 patchKr 에 닿지 못하므로 어떤
      // 필드도 바뀌지 않는다. 알림은 그 KR 블록 안에서만 한다(INV-R2).
      setRefineError({ key: kr.key, message: L.refineKrFailed });
    } finally {
      setRefiningKey(null);
    }
  };

  // 미니맵 + → 마지막 Objective(없으면 신규)에 연결 KR 추가.
  const linkTeamKr = (gi, ki, kr) => {
    setLinkedIds((prev) => ({ ...prev, [`${gi}-${ki}`]: true }));
    setObjectives((prev) => {
      if (prev.length === 0) return [emptyObjective(kr, selfId)];
      const last = prev[prev.length - 1];
      return prev.map((o) => (o.key === last.key ? { ...o, krs: [...o.krs, emptyKr(kr, selfId)] } : o));
    });
  };

  /**
   * KR 줄의 상위 KR 칸 — 연결 배지 + 추가 전용 드롭다운 (okr-policy v4.0 §1.2.4 · PW-1383).
   *
   * 미니맵 + 는 「새 KR 을 만들며 건다」 뿐이라, [KR 직접추가]로 만든 KR 이나 이미 저장된
   * KR 에는 상위를 걸 방법이 없었다. 후보는 미니맵이 이미 들고 있는 상위 KR 이다 — 소비 측이
   * 넘기는 데이터를 늘리지 않는다. 표시 번호(`KR 1`)는 그룹마다 겹쳐서, 드롭다운은 그룹으로
   * 묶고 배지는 제목까지 붙인다.
   */
  const parentCandidates = (minimap.groups ?? []).flatMap((group, gi) =>
    (group.krs ?? [])
      .filter((k) => k.krId)
      .map((k) => ({ krId: k.krId, no: k.id, title: k.title, group: group.title, gi })),
  );
  const parentById = new Map(parentCandidates.map((c) => [c.krId, c]));
  const parentIdsOf = (kr) => kr.parentKrIds ?? [];
  const addParentKr = (objKey, kr, id) => {
    // 같은 KR 을 두 번 걸지 않는다 — 목록에서도 빠지지만 소비 측 값이 이미 겹쳐 있을 수 있다.
    if (!id || parentIdsOf(kr).includes(id)) return;
    patchKr(objKey, kr.key, { parentKrIds: [...parentIdsOf(kr), id] });
  };
  const removeParentKr = (objKey, kr, id) =>
    patchKr(objKey, kr.key, { parentKrIds: parentIdsOf(kr).filter((x) => x !== id) });

  // 미니맵 연결 표시(okr-policy §6.4 · PW-1502) — 이 창에서 + 를 누른 줄만이 아니라, 이미 저장된
  // 연결(소비 측이 kr.linked 로 넘긴다)과 창 안 KR 이 상위 KR 칸으로 건 연결도 칠한다.
  const formLinkedKrIds = new Set(objectives.flatMap((o) => o.krs.flatMap(parentIdsOf)));
  const isLinkedKr = (gi, ki, kr) =>
    Boolean(linkedIds[`${gi}-${ki}`] || kr.linked || (kr.krId && formLinkedKrIds.has(kr.krId)));

  const totalW = objectives.reduce((a, o) => a + (Number(o.weight) || 0), 0);
  const krWeightOk = (o) => o.krs.length === 0 || o.krs.reduce((a, k) => a + (Number(k.weight) || 0), 0) === 100;
  // 편집으로 들어와 **전부 지운** 상태. 작성이면 저장할 게 없지만, 편집이면
  // "이 Objective 를 지운다" 는 뜻이라 저장할 수 있어야 한다 — 아니면 하나뿐인
  // Objective 는 영영 못 지운다(빈 폼이 되는 순간 푸터가 사라졌다).
  const emptiedFromEdit = (initialObjectives ?? []).length > 0 && objectives.length === 0;
  const canSave =
    emptiedFromEdit ||
    (objectives.length > 0 &&
      totalW === 100 &&
      objectives.every((o) => o.title.trim() && o.krs.length > 0 && o.krs.every((k) => k.title.trim()) && krWeightOk(o)));

  /**
   * 저장을 막고 있는 **지금 그 이유** (PW-268 ③).
   *
   * 예전엔 푸터가 Objective 가중치 합계만 말했다. 그래서 KR 을 하나도 안 넣으면
   * `가중치 합계 100% ✓` 라는 **초록 통과 표시를 띄운 채 저장 버튼이 죽어 있었다** —
   * 요청도 콘솔 에러도 없어서 사용자에겐 "저장 버튼이 안 먹는다" 로만 보였다.
   * 버튼 tooltip 도 가중치 이야기만 해서 어디서도 진짜 이유를 말하지 않았다.
   */
  const blockReason = (() => {
    if (canSave || objectives.length === 0) return null;
    if (objectives.some((o) => !o.title.trim())) return L.objectiveTitleRequired;
    if (objectives.some((o) => o.krs.length === 0)) {
      return L.krRequired;
    }
    if (objectives.some((o) => o.krs.some((k) => !k.title.trim()))) return L.krTitleRequired;
    if (objectives.some((o) => !krWeightOk(o))) return L.krWeightReason;
    return null; // 남은 건 Objective 가중치 — 아래 합계 배지가 이미 말한다.
  })();

  const handleSave = () => {
    if (readOnly) return;
    if (!canSave || saving) return;
    // id 는 편집 진입(initialObjectives)에서만 붙는다 — 소비 측이 이 값으로
    // "고칠 것 / 새로 만들 것" 을 가르고, payload 에서 사라진 id 를 삭제로 읽는다.
    const payload = objectives.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      title: o.title.trim(),
      weight: Number(o.weight) || 0,
      parentOkrId: o.parentId || undefined,
      krs: o.krs.map((k) => ({
        ...(k.id ? { id: k.id } : {}),
        title: k.title.trim(),
        target: Number(k.target) || 0,
        unit: k.unit,
        inputType: k.inputType,
        weight: Number(k.weight) || 0,
        ownerId: k.ownerId || undefined,
        // 빈 배열도 그대로 보낸다 — 「마지막 상위를 끊었다」는 의미 있는 값이라
        // undefined 로 접으면 소비 측이 "안 바뀜" 으로 읽어 연결이 살아남는다.
        parentKrIds: k.parentKrIds ?? [],
        // 실행 항목은 **빈 행까지 그대로** 싣는다. 「내용이 빈 행은 저장하지 않는다」는
        // 규정(okr-policy §4A I-E1)은 소비 측이 판정한다 — 여기서 걸러 버리면 이미
        // 저장돼 있던 항목의 내용을 지운 것이 payload 에서 «사라진 것»과 구별되지 않아
        // 소비 측이 삭제로 읽는다.
        initiatives: (k.initiatives ?? []).map((i) => ({
          ...(i.id ? { id: i.id } : {}),
          title: i.title.trim(),
          status: i.status,
          ownerId: i.ownerId || undefined,
        })),
      })),
    }));
    setSaving(true);
    setSaveError(null);
    // 성공 시에만 닫는다 — 실패 시 폼을 유지하고 인라인 에러 노출(작성 데이터 보존).
    // onSubmit 이 false 를 돌려주면 **소비 측이 저장을 중단한 것**이다(예: 삭제
    // 확인창에서 취소). 실패가 아니므로 에러를 띄우지 않고 폼만 그대로 둔다.
    Promise.resolve(onSubmit?.(payload))
      .then((result) => { if (result === false) setSaving(false); else onClose(); })
      .catch((error) => {
        // 권한 거절(403)은 소비자가 토스트로 알리고 이 창을 readOnly 로 내린다 — 창 안 실패 문구를 겹쳐 띄우지 않는다.
        if (error?.response?.status !== 403) setSaveError(L.saveFailed);
        setSaving(false);
      });
  };

  // 아래 버튼 줄 — 목표를 하나라도 쓰기 시작했을 때(또는 편집 중 전부 지웠을 때)만 그린다.
  const footer = (objectives.length > 0 || emptiedFromEdit) ? (
    <>
      {/* 전부 지운 편집 상태에서는 가중치 합계 안내가 뜻이 없다(합계 0% 는
          "덜 채웠다" 로 읽혀 오히려 오해를 준다) — 저장 실패만 알린다. */}
      {/* 통과 표시(✓)는 **정말 저장 가능할 때만** 초록으로 켠다 — 막혀 있는데
          초록이면 사용자는 버튼 고장으로 읽는다(PW-268 ③). */}
      {/* 자리는 디자이너 발 안내 자리(.okr-wz-footer-hint), 글은 디자이너 상태 글자색(.okr-status-text) —
          알약·바탕 없이 빨강/초록 글자만 (PW-2219). */}
      <span className="okr-wz-footer-hint">
      <span
        className={`okr-status-text ${!readOnly && !saveError && !blockReason && totalW === 100 ? 'is-success' : 'is-error'}`}
        data-testid="okr-cf-total"
        role={readOnly ? 'alert' : undefined}
      >
        {/* 권한이 거둬져 읽기 전용으로 내려왔으면 그 이유가 먼저다 — 저장 버튼이 왜 꺼졌는지 (pivit-work PW-1508). */}
        {readOnly
          ? readOnlyLabel
          : saveError
          ? saveError
          : blockReason
            ? blockReason
            : emptiedFromEdit
              ? ''
              : totalW === 100
                ? `✓ ${L.objectiveSumOk}`
                : fill(L.objectiveSum, totalW)}
      </span>
      </span>
      <button type="button" className="okr-btn is-outline" onClick={onClose}>{L.cancel}</button>
      <Tooltip
        content={
          !canSave
            // 가중치로 막혔으면 기획 문구 하나로(okr-spec §8), 다른 이유면 그 이유를 말한다(PW-268 ③).
            ? (!blockReason || blockReason === L.krWeightReason ? L.weightTooltip : blockReason)
            : ''
        }
      >
        <button
          type="button"
          className="okr-btn is-brand"
          disabled={readOnly || !canSave || saving}
          onClick={handleSave}
        >
          {saving ? L.saving : L.save}
        </button>
      </Tooltip>
    </>
  ) : null;

  // 공용 창 틀(ModalShell)로 그린다 (PW-836). 긴 작성 폼이라 막을 눌러도 닫지 않는다
  // (onOverlayClick=null) — 막 한 번에 쓰던 글을 잃으면 안 된다. Esc·닫기 X 는 onClose.
  // 머리(미니맵 표시 + 제목)는 본문 안에 직접 그려 틀의 제목 줄은 비운다.
  return (
    <ModalShell
      ariaLabel={minimap.title}
      closeLabel={L.close}
      onClose={() => onClose()}
      onOverlayClick={null}
      zIndex={1000}
      className="okr-cf-shell"
      contentClassName="okr-cf-shell-content"
      bodyClassName="okr-cf-shell-body"
      footer={footer}
    >
      <div className="okr-cf-header">
        <p className="okr-cf-eyebrow">{L.eyebrow}</p>
        <p className="okr-cf-title">{minimap.title}</p>
      </div>

      <div className="okr-cf-body">
        {hasMinimap && (
          <div className="okr-cf-minimap">
            {/* 전략 캔버스 요약 — 전사 작성에서 AI 생성의 근거를 보여 주는 읽기 전용 카드(okr-spec §4.5).
                제목은 창 머리의 작은 회색 글(.okr-cf-eyebrow), 줄마다 미니맵 회사 카드(.okr-cf-company ·
                -label · -title) 한 장 (PW-2219). `list` 행 번호 목록 글자(.okr-cf-strategy-list)는 지금 크기 유지. */}
            {summaryRows.length > 0 && (
              <div className="okr-cf-strategy" data-testid="okr-cf-strategy-summary">
                {strategySummary.title && <p className="okr-cf-eyebrow">{strategySummary.title}</p>}
                {summaryRows.map((row, i) => (
                  <div className="okr-cf-company" key={rowKey(row, i, 'label')}>
                    <p className="okr-cf-company-label">{row.label}</p>
                    {row.list ? (
                      <ol className="okr-cf-strategy-list">
                        {listLines(row.value).map((line, j) => (
                          <li key={rowKey(line, j)}>{line}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="okr-cf-company-title">
                        {String(row.value).split('\n').map((line, j) => (
                          <span key={rowKey(line, j)}>{j > 0 && <br />}{line}</span>
                        ))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {showCompanyCard && (
              <div className="okr-cf-company">
                <p className="okr-cf-company-label">{minimap.company.label}</p>
                <p className="okr-cf-company-title">{minimap.company.title}</p>
              </div>
            )}
            {minimap.groups.map((group, gi) => (
              <div className="okr-cf-group" key={rowKey(group, gi, 'title')}>
                <div className="okr-cf-group-head">
                  <span className="okr-cf-group-q">{group.q}</span>
                  <span>{group.title}</span>
                </div>
                {group.krs.map((kr, ki) => (
                  <div className={`okr-cf-kr${isLinkedKr(gi, ki, kr) ? ' is-linked' : ''}`} key={rowKey(kr, ki, 'title')}>
                    <button disabled={readOnly} type="button" className="okr-cf-kr-add" onClick={() => linkTeamKr(gi, ki, kr)}>
                      <Icon src={icons.plus} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
                    </button>
                    <div className="okr-cf-kr-main">
                      <p className="okr-cf-kr-title"><b>{kr.id}</b> {kr.title}</p>
                      <div className="okr-cf-kr-progress">
                        <OkrProgressBar percent={kr.percent} variant="success" />
                        <span>{kr.percent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="okr-cf-editor">
          <div className="okr-cf-editor-head">
            <p className="okr-cf-hint">{L.hint}</p>
            <div className="okr-cf-head-actions">
              {onGenerate && (
                <button type="button" className="okr-wz-ai-btn" onClick={generate} disabled={readOnly || genLoading} aria-busy={genLoading || undefined}>
                  {genLoading ? <span className="dp-busy-inline"><Spinner size={12} />{L.generating}</span> : `✦ ${L.generateObjectives}`}
                </button>
              )}
              <button disabled={readOnly} type="button" className="okr-cf-add-btn" onClick={addObjective}>
                <Icon src={icons.plus} size={18} color="var(--text-white)" baseUrl={baseUrl} />
                <span>{objectives.length ? L.addObjective : L.addFirst}</span>
              </button>
            </div>
          </div>
          {genError && <p className="okr-status-text is-error" role="alert">{genError}</p>}

          {objectives.length === 0 ? (
            <div className="okr-cf-empty">
              <p className="okr-cf-empty-title">{L.emptyTitle}</p>
              {/* 줄바꿈은 문구의 일부다 — '\n' 을 <br/> 로 편다(시안 2줄 유지). */}
              <p className="okr-cf-empty-desc">
                {String(L.emptyDesc).split('\n').map((line, i) => (
                  <span key={rowKey(line, i)}>{i > 0 && <br />}{line}</span>
                ))}
              </p>
            </div>
          ) : (
            objectives.map((objective) => {
              const krSum = objective.krs.reduce((a, k) => a + (Number(k.weight) || 0), 0);
              return (
                <div className="okr-cf-objective" key={objective.key}>
                  <div className="okr-cf-obj-head">
                    <span className="okr-p-caret is-open">
                      <Icon src={icons.chevronDown} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                    </span>
                    <span className="okr-cf-obj-label">Objective</span>
                    <input readOnly={readOnly}
                      className="okr-cf-input"
                      placeholder={L.objectiveTitlePlaceholder}
                      aria-label={L.objectiveTitlePlaceholder}
                      maxLength={objectiveTitleMaxLength}
                      value={objective.title}
                      onChange={(e) => patchObjective(objective.key, { title: e.target.value })}
                    />
                    <button disabled={readOnly} type="button" className="okr-cf-x" onClick={() => removeObjective(objective.key)}>
                      <Icon src={icons.xClose} size={18} color="var(--text-tertiary)" baseUrl={baseUrl} />
                    </button>
                  </div>
                  <div className="okr-cf-obj-meta">
                    <input readOnly={readOnly}
                      className="okr-cf-input is-sm"
                      placeholder={L.weightPlaceholder}
                      aria-label={L.objectiveWeight}
                      type="number"
                      value={objective.weight}
                      onChange={(e) => patchObjective(objective.key, { weight: e.target.value })}
                    />
                    <span className="okr-cf-unit">%</span>
                    {parentOptions.length > 0 && (
                      // 이 창의 드롭다운 넷은 디자이너 펼친 목록(SearchSelect)이다 — 브라우저 기본 목록은
                      // 맥 회색 목록으로 뜨고 화면 녹화에 안 잡힌다(PW-1955). 닫힌 칸은 종전 클래스 그대로.
                      <SearchSelect disabled={readOnly}
                        className="okr-cf-select-real"
                        aria-label={L.parentOkr}
                        value={objective.parentId}
                        options={[
                          { value: '', label: L.parentOkrPlaceholder, keep: true },
                          ...parentOptions.map((p) => ({ value: String(p.id), label: p.label })),
                        ]}
                        onChange={(v) => patchObjective(objective.key, { parentId: v })}
                      />
                    )}
                  </div>

                  {objective.krs.map((kr) => (
                    <div className={`okr-cf-kr-card${refiningKey === kr.key ? ' is-refining' : ''}`} key={kr.key}>
                      <div className="okr-cf-kr-card-head">
                        <span className="okr-cf-bullet" />
                        <input readOnly={readOnly}
                          className="okr-cf-input"
                          placeholder={L.krTitlePlaceholder}
                          aria-label={L.krTitlePlaceholder}
                          maxLength={krTitleMaxLength}
                          value={kr.title}
                          onChange={(e) => patchKr(objective.key, kr.key, { title: e.target.value })}
                        />
                        {onRefineKr && (
                          <Tooltip content={L.refineKr}>
                            <button
                              type="button"
                              className="okr-wz-ai-btn"
                              disabled={readOnly || !kr.title.trim() || refiningKey !== null}
                              onClick={() => refineKr(objective.key, kr)}
                            >
                              {refiningKey === kr.key ? L.refining : `✦ ${L.refine}`}
                            </button>
                          </Tooltip>
                        )}
                        <button disabled={readOnly} type="button" className="okr-cf-x" onClick={() => removeKr(objective.key, kr.key)}>
                          <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                        </button>
                      </div>
                      {refineError?.key === kr.key && (
                        <p className="okr-status-text is-error" role="alert">{refineError.message}</p>
                      )}
                      <div className="okr-cf-methods">
                        {METHODS.map((method) => (
                          <button disabled={readOnly}
                            type="button"
                            className={`okr-cf-method${kr.inputType === method.key ? ' is-active' : ''}`}
                            key={method.key}
                            // «완료 여부»는 목표 1 고정이라 목표값 칸을 감춘다(okr-spec §3.1B).
                            onClick={() => patchKr(objective.key, kr.key, {
                              inputType: method.key,
                              unit: method.unitKey ? L[method.unitKey] : '%',
                              ...(method.key === 'binary' ? { target: 1 } : {}),
                            })}
                          >
                            <p className="okr-cf-method-label">{L[method.labelKey]}</p>
                            <p className="okr-cf-method-desc">{L[method.descKey]}</p>
                          </button>
                        ))}
                      </div>
                      <div className="okr-cf-kr-meta">
                        {kr.inputType !== 'binary' && (
                          <input readOnly={readOnly}
                            className="okr-cf-input is-sm"
                            placeholder={L.targetPlaceholder}
                            aria-label={L.krTarget}
                            type="number"
                            value={kr.target}
                            onChange={(e) => patchKr(objective.key, kr.key, { target: e.target.value })}
                          />
                        )}
                        <input readOnly={readOnly}
                          className="okr-cf-input is-sm"
                          placeholder={L.unitPlaceholder}
                          aria-label={L.krUnit}
                          value={kr.unit}
                          onChange={(e) => patchKr(objective.key, kr.key, { unit: e.target.value })}
                        />
                        <input readOnly={readOnly}
                          className="okr-cf-input is-sm"
                          placeholder={L.weightPlaceholder}
                          aria-label={L.krWeight}
                          type="number"
                          value={kr.weight}
                          onChange={(e) => patchKr(objective.key, kr.key, { weight: e.target.value })}
                        />
                        <span className="okr-cf-unit">%</span>
                        {members.length > 0 && (
                          <OkrMemberPicker
                            disabled={readOnly}
                            ariaLabel={L.krOwner}
                            placeholder={L.ownerPlaceholder}
                            searchPlaceholder={L.ownerSearchPlaceholder}
                            searchAriaLabel={`${L.krOwner} ${L.ownerSearchSuffix}`}
                            noResultLabel={L.ownerNoResult}
                            members={members}
                            value={kr.ownerId}
                            onChange={(id) => patchKr(objective.key, kr.key, { ownerId: id })}
                          />
                        )}
                      </div>

                      {(parentCandidates.length > 0 || parentIdsOf(kr).length > 0) && (
                        <div className="okr-cf-kr-parents" data-testid="okr-cf-kr-parents">
                          {parentIdsOf(kr).map((id) => {
                            const c = parentById.get(id);
                            // 미니맵에 없는 연결도 태그로 남긴다 — 숨기면 걸린 줄 모른 채 저장되고, 풀 방법도 없다.
                            // 태그는 개인 탭 「상위 OKR 태그」(.okr-p-linked-link.is-purple), 떼기는 디자이너 ×(.okr-cf-x) (PW-2219).
                            const text = c ? `${c.no} · ${c.title}` : L.parentKrUnknown;
                            return (
                              <Fragment key={id}>
                                <span className="okr-p-linked-link is-purple" title={c ? `${c.group} · ${text}` : text}>
                                  {text}
                                </span>
                                <button
                                  disabled={readOnly}
                                  type="button"
                                  className="okr-cf-x"
                                  aria-label={`${L.parentKrRemove}: ${text}`}
                                  onClick={() => removeParentKr(objective.key, kr, id)}
                                >
                                  <Icon src={icons.xClose} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                                </button>
                              </Fragment>
                            );
                          })}
                          {!readOnly && parentCandidates.some((c) => !parentIdsOf(kr).includes(c.krId)) && (
                            <ParentKrAdd
                              label={L.parentKrAdd}
                              // 미니맵 묶음(상위 조직)마다 머리를 두고 그 아래 아직 안 건 KR 만 — 종전 optgroup 과 같다.
                              groups={(minimap.groups ?? []).map((group, gi) => ({
                                title: group.title,
                                items: parentCandidates
                                  .filter((c) => c.gi === gi && !parentIdsOf(kr).includes(c.krId))
                                  .map((c) => ({ value: c.krId, label: `${c.no} · ${c.title}` })),
                              })).filter((g) => g.items.length > 0)}
                              onPick={(v) => addParentKr(objective.key, kr, v)}
                            />
                          )}
                        </div>
                      )}

                      {/* 실행 항목(Initiative) — okr-policy §4A · okr-spec §3.7 (PW-501).
                          🔴 **0건이어도 그린다.** 종전에는 이 블록을 「1건 이상일 때만」
                          그려서, 실행 항목이 없는 KR 에는 더할 자리 자체가 없었다 —
                          만들 수 없으니 0건이고 0건이니 만들 칸이 안 뜨는 닫힌 고리였고,
                          그것이 dev 조직 핵심결과가 전부 0건이던 화면 쪽 원인이다.
                          자리는 KR 카드 «안»이다 — Objective 단위로 올리면 「어느 KR 의
                          실행 항목인가」를 다시 물어야 한다(§4A.1 E1).
                          모양은 미니맵 묶음 카드(.okr-cf-group) + 머리띠(.okr-cf-group-head), 줄은 KR 줄
                          (.okr-cf-kr-card-head) 안에 상태 pill(.okr-cf-select) · 입력 칸 · 담당자 · × (PW-2219). */}
                      <div className="okr-cf-group" data-testid="okr-cf-init">
                        <div className="okr-cf-group-head"><span>Initiatives</span></div>
                        {initsOf(kr).map((init) => (
                          <div className="okr-cf-kr-card-head" key={init.key}>
                            {/* 셋 중 하나라 검색칸은 끈다. 닫힌 칸은 디자이너 회색 pill. */}
                            <SearchSelect
                              disabled={readOnly}
                              className="okr-cf-select okr-cf-select-btn"
                              chevronClassName="okr-cf-select-caret"
                              aria-label={L.initStatus}
                              searchable={false}
                              value={init.status}
                              options={INIT_STATUS.map((st) => ({ value: st.key, label: L[st.labelKey] }))}
                              onChange={(v) => patchInitiative(objective.key, kr, init.key, { status: v })}
                            />
                            <input readOnly={readOnly}
                              className={`okr-cf-input is-init${init.status === 'done' ? ' is-done' : ''}`}
                              placeholder={L.initTitlePlaceholder}
                              aria-label={L.initTitlePlaceholder}
                              maxLength={initiativeTitleMaxLength}
                              value={init.title}
                              onChange={(e) => patchInitiative(objective.key, kr, init.key, { title: e.target.value })}
                            />
                            {members.length > 0 && (
                              <OkrMemberPicker
                            disabled={readOnly}
                                ariaLabel={L.initOwner}
                                placeholder={L.ownerPlaceholder}
                                searchPlaceholder={L.ownerSearchPlaceholder}
                                searchAriaLabel={`${L.initOwner} ${L.ownerSearchSuffix}`}
                                noResultLabel={L.ownerNoResult}
                                members={members}
                                value={init.ownerId}
                                onChange={(id) => patchInitiative(objective.key, kr, init.key, { ownerId: id })}
                              />
                            )}
                            {/* 삭제 확인 창을 두지 않는다 — 저장 전 로컬 편집이고
                                되돌림 비용이 「한 줄 다시 쓰기」다(§4A.4). */}
                            <button disabled={readOnly}
                              type="button"
                              className="okr-cf-x"
                              aria-label={L.initRemove}
                              onClick={() => removeInitiative(objective.key, kr, init.key)}
                            >
                              <Icon src={icons.xClose} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                            </button>
                          </div>
                        ))}
                        {initsOf(kr).length === 0 && (
                          /* 버튼만 있으면 「실행 항목이라는 것이 있는지」가 안 읽힌다(§4A.2). */
                          <p className="okr-cf-hint">{L.initEmpty}</p>
                        )}
                        {/* 「KR 직접추가」와 같은 버튼(.okr-cf-kr-add-btn · 오른쪽 정렬). */}
                        <button
                          disabled={readOnly}
                          type="button"
                          className="okr-cf-kr-add-btn"
                          onClick={() => addInitiative(objective.key, kr)}
                        >
                          <Icon src={icons.plus} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
                          <span>{L.initAdd}</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {objective.krs.length > 0 && (
                    // 디자이너 상태 글자(.okr-status-text) — 알약 없이 글자색만. 오른쪽 자리는 .okr-cf-krsum (PW-2219).
                    <span
                      className={`okr-status-text okr-cf-krsum ${krSum === 100 ? 'is-success' : 'is-error'}`}
                      data-testid="okr-cf-krsum"
                    >
                      {krSum === 100 ? `✓ ${L.krSumOk}` : fill(L.krSum, krSum)}
                    </span>
                  )}
                  {/* KR 을 더하는 두 길 — 직접추가 옆에 AI 생성(기획 JSX 의 「+ KR 직접 추가」·「✦ AI로 KR 생성」 한 줄). */}
                  <div className="okr-cf-kr-actions">
                  <button disabled={readOnly} type="button" className="okr-cf-kr-add-btn" onClick={() => addKr(objective.key)}>
                    <Icon src={icons.plus} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
                    <span>{L.addKr}</span>
                  </button>
                  {onGenerateKrs && (
                    <button
                      type="button"
                      className="okr-wz-ai-btn"
                      disabled={readOnly || !objective.title.trim() || genKrKey !== null}
                      aria-busy={genKrKey === objective.key || undefined}
                      onClick={() => generateKrs(objective)}
                    >
                      {genKrKey === objective.key ? <span className="dp-busy-inline"><Spinner size={12} />{L.generating}</span> : `✦ ${L.generateKrs}`}
                    </button>
                  )}
                  </div>
                  {genKrError?.key === objective.key && (
                    <p className="okr-status-text is-error" role="alert">{genKrError.message}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModalShell>
  );
}
