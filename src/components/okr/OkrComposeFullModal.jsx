import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrMemberPicker from './OkrMemberPicker.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';
import rowKey from './rowKey.js';

/**
 * OkrComposeFullModal — 개인 OKR 작성 풀스크린 모달.
 *
 * 좌측: 팀 OKR 미니맵. KR 의 + 버튼을 누르면 해당 팀 KR 에 연결된 개인 KR 이
 * (마지막/신규 Objective 에) 추가된다. 우측: Objective/KR 편집 폼.
 * 가중치는 Objective 합계 100%, 각 Objective 의 KR 합계 100% 여야 저장 가능.
 * 저장 시 onSubmit(objectives) 로 소비자에 전달한다.
 *
 * 시안: pivit-specs okr-individual.jsx(IndividualOKRWriter/ObjectiveWriteCard).
 * KR 담당자는 검색 드롭다운(OkrMemberPicker, okr-spec §3.8A). 이니셔티브는 후속.
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
};
const METHODS = [
  { key: 'percent', label: '% 달성률', desc: '0~100% 직접 입력', unit: '%' },
  { key: 'binary', label: '완료 여부', desc: '달성/미달성', unit: '완료' },
  { key: 'count', label: '개수 달성', desc: 'n / 목표 개수', unit: '개' },
];

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
  };
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
    })),
  };
}

export default function OkrComposeFullModal({
  minimap,
  icons,
  baseUrl = '',
  onClose,
  onSubmit,
  onGenerate,
  members = [],
  parentOptions = [],
  selfId = '',
  initialObjectives,
  labels,
  showCompanyCard = true,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  // 미니맵은 **나보다 위** 를 보여주는 자리다. 전사 OKR 처럼 위가 없는 작성 경로에서는
  // 회사 카드가 곧 "지금 쓰고 있는 것" 이라, 고를 수 없는 상위 후보처럼 보인다.
  // 기본값은 지금 동작(그린다)이라 다른 화면의 시안은 그대로다.
  //
  // 회사 카드도 상위 그룹도 없으면 미니맵 열 자체를 접는다 — 안 접으면 좌측에
  // 300px 짜리 빈 자리가 남아, 편집 영역이 이유 없이 안쪽으로 밀린 것처럼 보인다.
  const hasMinimap = showCompanyCard || (minimap.groups ?? []).length > 0;
  // seed 는 마운트 시 1회만 — 저장 후 소비 측이 재조회해 prop 이 바뀌어도 폼을
  // 다시 덮어쓰지 않는다(입력 중 갱신이 사용자 타이핑을 날린다). 모달은 열 때마다
  // 마운트되므로 다음 진입에는 최신 값으로 채워진다.
  const [objectives, setObjectives] = useState(() =>
    (initialObjectives ?? []).map(seedObjective),
  );
  const [linkedIds, setLinkedIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const TYPE_UNIT = { number: '개', percentage: '%', boolean: '완료' };
  const TYPE_INPUT = { number: 'count', percentage: 'percent', boolean: 'binary' };
  const generate = async () => {
    if (!onGenerate) return;
    setGenLoading(true); setGenError(null);
    try {
      const res = await onGenerate();
      const draft = res?.draft ?? res;
      // AI 는 가중치를 주지 않는다. 빈 값으로 두면 "합계 0% (100% 필요)" 가 떠
      // 초안을 그대로 저장할 수 없으므로 균등 배분(합 100)으로 채워 둔다.
      const raw = draft?.keyResults ?? [];
      const n = raw.length || 1;
      const base = Math.floor(100 / n);
      const krList = raw.map((k, i) => ({
        key: nextId(),
        title: k.title ?? '',
        target: k.targetValue ?? 100,
        unit: k.unit ?? TYPE_UNIT[k.type] ?? '',
        inputType: TYPE_INPUT[k.type] ?? 'count',
        weight: String(i === n - 1 ? 100 - base * (n - 1) : base),
        ownerId: selfId,
        parentKrIds: [],
      }));
      // Objective 가중치도 마찬가지 — 기존 Objective 가 없으면 100%.
      setObjectives((p) => [
        ...p,
        {
          key: nextId(),
          title: draft?.objective?.title ?? '',
          weight: p.length === 0 ? '100' : '',
          parentId: '',
          krs: krList,
        },
      ]);
    } catch {
      setGenError('AI 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setGenLoading(false); }
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

  // 미니맵 + → 마지막 Objective(없으면 신규)에 연결 KR 추가.
  const linkTeamKr = (gi, ki, kr) => {
    setLinkedIds((prev) => ({ ...prev, [`${gi}-${ki}`]: true }));
    setObjectives((prev) => {
      if (prev.length === 0) return [emptyObjective(kr, selfId)];
      const last = prev[prev.length - 1];
      return prev.map((o) => (o.key === last.key ? { ...o, krs: [...o.krs, emptyKr(kr, selfId)] } : o));
    });
  };

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
    if (objectives.some((o) => !o.title.trim())) return 'Objective 내용을 입력해주세요.';
    if (objectives.some((o) => o.krs.length === 0)) {
      return 'Objective 마다 KR 을 1개 이상 추가해야 저장할 수 있습니다.';
    }
    if (objectives.some((o) => o.krs.some((k) => !k.title.trim()))) return 'KR 내용을 입력해주세요.';
    if (objectives.some((o) => !krWeightOk(o))) return 'KR 가중치 합이 100% 여야 저장할 수 있습니다.';
    return null; // 남은 건 Objective 가중치 — 아래 합계 배지가 이미 말한다.
  })();

  const handleSave = () => {
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
      })),
    }));
    setSaving(true);
    setSaveError(null);
    // 성공 시에만 닫는다 — 실패 시 폼을 유지하고 인라인 에러 노출(작성 데이터 보존).
    // onSubmit 이 false 를 돌려주면 **소비 측이 저장을 중단한 것**이다(예: 삭제
    // 확인창에서 취소). 실패가 아니므로 에러를 띄우지 않고 폼만 그대로 둔다.
    Promise.resolve(onSubmit?.(payload))
      .then((result) => { if (result === false) setSaving(false); else onClose(); })
      .catch(() => { setSaveError('저장에 실패했습니다. 잠시 후 다시 시도해주세요.'); setSaving(false); });
  };

  return (
    <div className="okr-modal-overlay">
      <div className="okr-cf-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>

        <div className="okr-cf-header">
          <p className="okr-cf-eyebrow">{L.eyebrow}</p>
          <p className="okr-cf-title">{minimap.title}</p>
        </div>

        <div className="okr-cf-body">
          {hasMinimap && (
            <div className="okr-cf-minimap">
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
                    <span className="okr-cf-group-title">{group.title}</span>
                  </div>
                  {group.krs.map((kr, ki) => (
                    <div className={`okr-cf-kr${linkedIds[`${gi}-${ki}`] ? ' is-linked' : ''}`} key={rowKey(kr, ki, 'title')}>
                      <button className="okr-cf-kr-add" onClick={() => linkTeamKr(gi, ki, kr)}>
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
                  <button className="okr-wz-ai-btn" onClick={generate} disabled={genLoading}>
                    {genLoading ? '생성 중…' : '✦ AI로 초안 생성'}
                  </button>
                )}
                <button className="okr-cf-add-btn" onClick={addObjective}>
                  <Icon src={icons.plus} size={18} color="var(--text-white)" baseUrl={baseUrl} />
                  <span>{objectives.length ? 'Objective 추가' : '직접추가'}</span>
                </button>
              </div>
            </div>
            {genError && <p className="okr-wz-error" role="alert">{genError}</p>}

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
                      <input
                        className="okr-cf-input"
                        placeholder="Objective 내용"
                        aria-label="Objective 내용"
                        value={objective.title}
                        onChange={(e) => patchObjective(objective.key, { title: e.target.value })}
                      />
                      <button className="okr-cf-x" onClick={() => removeObjective(objective.key)}>
                        <Icon src={icons.xClose} size={18} color="var(--text-tertiary)" baseUrl={baseUrl} />
                      </button>
                    </div>
                    <div className="okr-cf-obj-meta">
                      <input
                        className="okr-cf-input is-sm"
                        placeholder="가중치"
                        aria-label="Objective 가중치"
                        type="number"
                        value={objective.weight}
                        onChange={(e) => patchObjective(objective.key, { weight: e.target.value })}
                      />
                      <span className="okr-cf-unit">%</span>
                      {parentOptions.length > 0 && (
                        <select
                          className="okr-cf-select-real"
                          aria-label="상위 OKR 연결"
                          value={objective.parentId}
                          onChange={(e) => patchObjective(objective.key, { parentId: e.target.value })}
                        >
                          <option value="">상위 OKR 연결 (선택)</option>
                          {parentOptions.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {objective.krs.map((kr) => (
                      <div className="okr-cf-kr-card" key={kr.key}>
                        <div className="okr-cf-kr-card-head">
                          <span className="okr-cf-bullet" />
                          <input
                            className="okr-cf-input"
                            placeholder="KR 내용"
                            aria-label="KR 내용"
                            value={kr.title}
                            onChange={(e) => patchKr(objective.key, kr.key, { title: e.target.value })}
                          />
                          <button className="okr-cf-x" onClick={() => removeKr(objective.key, kr.key)}>
                            <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                          </button>
                        </div>
                        <div className="okr-cf-methods">
                          {METHODS.map((method) => (
                            <button
                              type="button"
                              className={`okr-cf-method${kr.inputType === method.key ? ' is-active' : ''}`}
                              key={method.key}
                              onClick={() => patchKr(objective.key, kr.key, { inputType: method.key, unit: method.unit })}
                            >
                              <p className="okr-cf-method-label">{method.label}</p>
                              <p className="okr-cf-method-desc">{method.desc}</p>
                            </button>
                          ))}
                        </div>
                        <div className="okr-cf-kr-meta">
                          <input
                            className="okr-cf-input is-sm"
                            placeholder="목표"
                            aria-label="KR 목표값"
                            type="number"
                            value={kr.target}
                            onChange={(e) => patchKr(objective.key, kr.key, { target: e.target.value })}
                          />
                          <input
                            className="okr-cf-input is-sm"
                            placeholder="단위"
                            aria-label="KR 단위"
                            value={kr.unit}
                            onChange={(e) => patchKr(objective.key, kr.key, { unit: e.target.value })}
                          />
                          <input
                            className="okr-cf-input is-sm"
                            placeholder="가중치"
                            aria-label="KR 가중치"
                            type="number"
                            value={kr.weight}
                            onChange={(e) => patchKr(objective.key, kr.key, { weight: e.target.value })}
                          />
                          <span className="okr-cf-unit">%</span>
                          {members.length > 0 && (
                            <OkrMemberPicker
                              ariaLabel="KR 담당자"
                              members={members}
                              value={kr.ownerId}
                              onChange={(id) => patchKr(objective.key, kr.key, { ownerId: id })}
                            />
                          )}
                        </div>
                      </div>
                    ))}

                    {objective.krs.length > 0 && (
                      <div className={`okr-cf-krsum${krSum === 100 ? ' is-ok' : ''}`}>
                        {krSum === 100 ? '✓ KR 가중치 100%' : `KR 가중치 합계 ${krSum}% (100% 필요)`}
                      </div>
                    )}
                    <button className="okr-cf-kr-add-btn" onClick={() => addKr(objective.key)}>
                      <Icon src={icons.plus} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
                      <span>KR 직접추가</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {(objectives.length > 0 || emptiedFromEdit) && (
          <div className="okr-modal-footer">
            {/* 전부 지운 편집 상태에서는 가중치 합계 안내가 뜻이 없다(합계 0% 는
                "덜 채웠다" 로 읽혀 오히려 오해를 준다) — 저장 실패만 알린다. */}
            {/* 통과 표시(✓)는 **정말 저장 가능할 때만** 초록으로 켠다 — 막혀 있는데
                초록이면 사용자는 버튼 고장으로 읽는다(PW-268 ③). */}
            <span
              className={`okr-cf-total${!saveError && !blockReason && totalW === 100 ? ' is-ok' : ''}`}
              data-testid="okr-cf-total"
            >
              {saveError
                ? saveError
                : blockReason
                  ? blockReason
                  : emptiedFromEdit
                    ? ''
                    : `Objective 가중치 합계 ${totalW}% ${totalW === 100 ? '✓' : '(100% 필요)'}`}
            </span>
            <button className="okr-btn is-outline" onClick={onClose}>취소</button>
            <button
              className="okr-btn is-brand"
              disabled={!canSave || saving}
              title={
                !canSave
                  ? (blockReason ?? 'Objective 가중치 합이 100%여야 저장할 수 있습니다.')
                  : ''
              }
              onClick={handleSave}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
