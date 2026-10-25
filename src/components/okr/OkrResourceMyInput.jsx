import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import { RsStatCard, RsAiLabel, RsCommentThread } from './OkrResourcePieces.jsx';
import rowKey from './rowKey.js';
import { OKR_RESOURCE_DEFAULT_LABELS, statusLabel } from './okrResourceLabels.js';
import { entryProjectId } from './okrResourceEntries.js';
import { isEnterKey } from '../shared/enterKey.js';

/**
 * OkrResourceMyInput — 내 리소스 '내 입력' 뷰.
 * Figma 17478:21448 (기본) / 17478:22296 (내 KR 불러오기 펼침).
 *
 * 스탯 4 → AI 스니핏 기반 추정 배너 → 프로젝트 슬라이더 카드들 → Total →
 * 투입 항목 추가(스쿼드 칩·내 KR 불러오기·직접 입력) → [저장] → 매니저 코멘트.
 *
 * 슬라이더 값은 UI 상태(데모) — 저장은 onSave(entries) 로 위임한다.
 * 추정치 마커는 entry.estimate 위치 위에 다크 툴팁으로 뜬다.
 *
 * `data.aiEstimate` 가 없으면 추정 배너를 통째로 내린다. 근거가 될 스니핏이 모자란
 * 달에도 배너를 그리면 항목 0개짜리 목록과 눌러도 아무 일이 없는 [추정치 적용] 이
 * 남아, 고장으로 읽힌다.
 *
 * `readOnly`(끝난 달 · PW-1173)면 값은 보이되 고치는 길을 전부 내린다 — 추정 배너·슬라이더·
 * 숫자 입력·✕·경고·투입 항목 추가·저장. 매니저 코멘트와 답글은 남긴다.
 *
 * 새로 담은 항목은 어디서 왔는지(`source`: 'suggestion' | 'project' | 'kr' | 'custom')와
 * 고른 후보의 `ref`(후보 항목의 `ref` 값 그대로)를 함께 들고 onSave 로 돌아간다. 저장된 항목도
 * `data.entries` 에 `source`·`ref` 를 실어 주면 후보 칩을 그 `ref` 로 가린다. 이름만으로
 * 되짚으면 직접 적은 이름이 같은 이름의 프로젝트로 바뀐다(리소스 정책서 §9).
 *
 * 수동 % 와 추정 % 가 `ESTIMATE_GAP_PP` 이상 벌어지면 추정 라벨에 `M.estimateGap` 을 붙인다
 * (정책서 §5-3.4) — 슬라이더를 움직이는 즉시 붙고 풀린다. `entry.warn` 을 주면 그것이 우선이다.
 *
 * onReply(text) 가 false 를 돌려주거나 실패하면 쓴 글과 입력바를 그대로 둔다(정책서 §9 —
 * 다시 누를 수 있게). 그 밖의 결과(true·undefined)면 스레드에 붙이고 입력바를 닫는다.
 *
 * `onOpenProject(projectId, { unsaved })` 를 주면 프로젝트 투입 행의 이름이 눌린다 — 프로젝트 원장
 * 상세로 가는 길이다(리소스 정책서 §7 「프로젝트 칩 클릭」 · 원장 정책서 §3, PW-1436). KR·직접 입력 행은
 * 원장이 없어 글자 그대로다. 아래 「투입 항목 추가」 칩은 그대로 «행에 더하기» 다. `unsaved` 는 화면에서
 * 고쳐 놓고 아직 저장하지 않은 값이 있는지 — 호스트가 이동 방식(같은 탭/새 탭)을 가르는 데 쓴다.
 * 끝난 달(`readOnly`)에도 눌린다 — 조회 목적이다.
 *
 * `maxTotal` 을 주면 지금 화면의 합계가 그 값을 넘는 동안 [저장] 이 눌리지 않는다(리소스 흐름도
 * 「합계 200% 초과 → 저장 불가」 · PW-1587). 합계가 슬라이더와 함께 움직이므로 판정도 여기서 한다.
 * 생략하면 늘 눌린다. 막힌 동안에는 [저장] 왼쪽에 `M.overLimit(maxTotal)` 이유를 띄운다(PW-1657) —
 * 모양은 디자이너가 그린 Total 아래 경고 줄(`.rsx-total-warn`) 그대로다.
 *
 * 「목록에 없는 프로젝트」 직접 추가는 리소스 정책서 §5-4.2 대로 검사한다(PW-1498) — 빈 이름·20자 초과·
 * 이름 중복이면 입력칸 아래에 이유를 띄우고 쓴 글을 남긴다. Enter 로도 추가된다. 중복은 프로젝트·직접 항목
 * 사이에서만 본다(KR 제목과 같은 이름은 §9 허용). 칩에 안 보이는 프로젝트(스쿼드에 안 붙은 것)까지 세려면
 * 호스트가 `data.projectNames` 로 활성 프로젝트 이름 전부를 넘긴다. 「내 KR 불러오기」를 펼쳤는데 KR 이
 * 없으면 `M.krEmpty(연도, 분기)` 를 보인다(§5-5.3) — 분기는 `data.period`(YYYY-MM)에서 센다.
 */
/** 수동 % 와 추정 % 의 차이가 이만큼(%p) 이상이면 «차이 큼» — 리소스 정책서 §5-3.4. */
export const ESTIMATE_GAP_PP = 15;
/** 직접 추가하는 프로젝트 이름 길이 상한 — 리소스 정책서 §5-4.2. 입력칸의 maxLength 와 같은 값이다. */
export const CUSTOM_NAME_MAX = 20;

/** 'YYYY-MM' → 그 달이 속한 달력 분기. 못 읽으면 null. */
const quarterOf = (period) => {
  const [year, month] = String(period ?? '').split('-').map(Number);
  if (!year || !month) return null;
  return { year, quarter: Math.ceil(month / 3) };
};


// 저장한 뒤 서버가 돌려준 행은 id 가 다르고(추정 제안으로 담은 행은 출처도 'project' 로 바뀐다) —
// 무엇에 몇 % 인지로만 비교한다.
const entryKey = (e) => `${entryProjectId(e) ? `p:${entryProjectId(e)}` : `n:${e.name}`}=${e.value}`;
const sameEntries = (a, b) => {
  if (a.length !== b.length) return false;
  const rest = b.map(entryKey);
  return a.every((e) => {
    const i = rest.indexOf(entryKey(e));
    if (i < 0) return false;
    rest.splice(i, 1);
    return true;
  });
};

export default function OkrResourceMyInput({
  data, icons, baseUrl = '', onSave, onApplyEstimates, onReply, labels: L = OKR_RESOURCE_DEFAULT_LABELS,
  readOnly = false, monthLabel = '', onOpenProject, maxTotal,
}) {
  const M = L.my;
  const [entries, setEntries] = useState(data.entries);
  const [krOpen, setKrOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customError, setCustomError] = useState(null);
  // [답글 달기] — 누르면 입력바가 열리고, 등록하면 답글(들여쓰기)로 스레드에 달린다.
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [extraComments, setExtraComments] = useState([]);
  // 서버 목록이 늘면(저장 뒤 재조회) 방금 단 답글이 그 안에 들어 있다 — 화면에만 들던 것을 비운다.
  // 안 비우면 같은 답글이 두 번 보인다. 개수로 보는 것은 앱이 같은 목록을 새 배열로 다시 만들 때
  // 방금 단 답글을 지우지 않으려고다(PW-1499).
  const [extraBase, setExtraBase] = useState(data.comments.length);
  if (extraBase !== data.comments.length) {
    setExtraBase(data.comments.length);
    setExtraComments([]);
  }
  const [replying, setReplying] = useState(false);

  // 코멘트는 새 원 코멘트가 위다(정책서 §6 「리스트 prepend」). 방금 단 답글은 맨 위 스레드 끝에
  // 넣는다 — 화면이 답글을 다는 대상이 가장 최근 원 코멘트이고, 답글은 스레드 안에서 시간순이다(PW-1499).
  const firstRoot = data.comments.findIndex((c) => !c.reply);
  const nextRoot = firstRoot < 0 ? -1 : data.comments.findIndex((c, i) => i > firstRoot && !c.reply);
  const threadEnd = nextRoot < 0 ? data.comments.length : nextRoot;
  const comments = [...data.comments.slice(0, threadEnd), ...extraComments, ...data.comments.slice(threadEnd)];
  const submitReply = async () => {
    const text = replyText.trim();
    if (!text || replying) return;
    setReplying(true);
    let ok;
    try {
      ok = await onReply?.(text);
    } catch {
      ok = false;
    } finally {
      setReplying(false);
    }
    if (ok === false) return;
    setExtraComments((p) => [...p, {
      author: data.commentAuthor?.name ?? M.me,
      avatar: data.commentAuthor?.avatar,
      date: data.commentDate ?? '',
      reply: true,
      text,
    }]);
    setReplyText('');
    setReplyOpen(false);
  };

  const patch = (id, value) => {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, value: v } : e)));
  };
  const remove = (id) => setEntries((p) => p.filter((e) => e.id !== id));
  // 추가되는 항목도 기본 퍼센트를 갖고 시작한다 — 0% 로 들어오면 "반영 안 된 항목"
  // 으로 읽혀서, 스니핏 추정값(없으면 10%)을 초기값으로 쓴다.
  //
  // 🔴 추정치 **마커**는 추정값이 실제로 있을 때만 단다. 없는데 10% 자리에 세우면
  // 근거 없는 위치에 "추정 10%" 가 서서, 사람이 그 눈금에 맞춰 값을 정하게 된다.
  // (KR·직접 입력 항목은 스니핏 태그 대상이 아니라 추정 자체가 없다.)
  const addEntry = (name, extra = {}) => {
    if (!name || taken(name, extra.ref)) return;
    const estimate = extra.estimate ?? null;
    setEntries((p) => [...p, {
      id: `rs-${extra.source ?? 'x'}-${extra.ref ?? name}`,
      name,
      tag: extra.tag ?? null,
      value: extra.value ?? estimate ?? 10,
      estimate,
      source: extra.source ?? null,
      ref: extra.ref ?? null,
    }]);
  };
  const gapNote = (entry) => {
    if (entry.warn) return entry.warn;
    if (entry.estimate == null || !M.estimateGap) return null;
    return Math.abs(entry.value - entry.estimate) >= ESTIMATE_GAP_PP ? M.estimateGap : null;
  };
  const total = entries.reduce((a, e) => a + e.value, 0);
  const overLimit = maxTotal != null && total > maxTotal;
  // 100% 초과 경고는 입력 중인 합계로 정한다 — 저장한 값으로 정하면 160% 로 바꿔도 저장 전엔 안 뜬다(PW-2214).
  // 문구를 안 준 앱은 예전처럼 data.redFlag 를 쓴다.
  const overTotal = M.overTotal ? (total > 100 ? M.overTotal(total) : null) : data.redFlag;
  // 이미 투입 목록에 있는 항목의 추가 버튼은 숨긴다 — 눌러도 무시되는 버튼을
  // 남겨두면 고장으로 읽힌다. 항목을 삭제(X)하면 버튼이 다시 나타난다.
  // 'PIVIT v2.0'(KR 연결명) vs 'PIVIT V2.0'(항목명)처럼 표기만 다른 같은
  // 프로젝트가 있어 대소문자·공백을 정규화해 비교한다.
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const has = (name) => entries.some((e) => norm(e.name) === norm(name));
  // 후보(프로젝트·KR)가 이미 담겼나는 **어느 후보인가**(`ref`)로 본다 — 이름으로 보면 같은 이름의
  // 직접 항목이 그 프로젝트 칩을 가려, 정책서 §9 «둘 다 존재»가 깨진다. `ref` 가 없는 옛 데이터만 이름으로.
  const taken = (name, ref) => (ref ? entries.some((e) => e.ref === ref) : has(name));
  // 직접 추가 검사(정책서 §5-4.2). 활성 프로젝트는 호스트가 넘긴 이름 전부 + 아직 안 담은 후보(칩·추정 제안)로,
  // 담긴 항목은 KR 행을 뺀 나머지로 센다 — KR 제목과 같은 이름은 허용(§9).
  const customNameError = (name) => {
    if (!name) return M.customEmpty;
    if (name.length > CUSTOM_NAME_MAX) return M.customTooLong;
    const known = [
      ...(data.projectNames ?? []),
      ...data.suggestions.map((s) => s.name),
      ...data.squads.flatMap((squad) => squad.items.map((item) => item.name)),
      ...entries.filter((e) => e.source !== 'kr').map((e) => e.name),
    ];
    return known.some((n) => norm(n) === norm(name)) ? M.customDuplicate : null;
  };
  const addCustom = () => {
    const name = customName.trim();
    const error = customNameError(name);
    setCustomError(error);
    if (error) return;
    addEntry(name, { source: 'custom' });
    setCustomName('');
  };
  const krQuarter = quarterOf(data.period);

  return (
    <div className="rsx-my">
      {readOnly && <p className="rsx-add-note" role="note">{M.readOnlyNotice(monthLabel)}</p>}
      <div className="rsx-stats">
        <RsStatCard label={M.total} value={`${data.stats.total}%`} tone="brand" bar={data.stats.total} />
        <RsStatCard label={M.items} value={data.stats.items} />
        <RsStatCard label={M.kr} value={<>{data.stats.kr[0]} <small>/ {data.stats.kr[1]}</small></>} />
        <RsStatCard label={M.status} value={statusLabel(data.stats.status, L)} tone={data.stats.status === '과부하' ? 'bad' : ''} />
      </div>

      {!readOnly && data.aiEstimate && (
        <div className="rsx-ai-banner">
          <div className="rsx-ai-banner-bar">
            <div className="rsx-ai-banner-info">
              <RsAiLabel>{M.aiEstimate}</RsAiLabel>
              <span>{data.aiEstimate.period}</span>
              <span>{data.aiEstimate.tagged}</span>
            </div>
            <button
              type="button"
              className="rsx-purple-btn"
              onClick={() => {
                // 기본 동작(데모): 추정치를 각 항목 값으로 반영. 호스트 콜백이 있으면 위임.
                if (onApplyEstimates) { onApplyEstimates(data.aiEstimate.items); return; }
                setEntries((p) => p.map((e) => {
                  const est = data.aiEstimate.items.find((it) => it.name === e.name);
                  return est ? { ...e, value: est.pct } : e;
                }));
              }}
            >
              {M.applyEstimates}
            </button>
          </div>
          <ul className="rsx-ai-banner-list">
            {data.aiEstimate.items.map((item, i) => (
              <li key={rowKey(item, i)}>{item.name} {item.pct}%</li>
            ))}
          </ul>
          <p className="rsx-ai-banner-note">{M.estimateNote}</p>
        </div>
      )}

      {entries.map((entry) => (
        <div className="rsx-entry" key={entry.id}>
          <div className="rsx-entry-main">
            <div className="rsx-entry-head">
              <div className="rsx-entry-title">
                {onOpenProject && entryProjectId(entry) ? (
                  <button
                    type="button"
                    className="rsx-entry-name is-link"
                    data-testid={`rsx-entry-open-${entryProjectId(entry)}`}
                    title={M.openProject}
                    onClick={() => onOpenProject(entryProjectId(entry), {
                      unsaved: !sameEntries(entries, data.entries),
                    })}
                  >{entry.name}</button>
                ) : (
                  <span className="rsx-entry-name">{entry.name}</span>
                )}
                {entry.tag && <StatusBadge className="rsx-tag">{entry.tag}</StatusBadge>}
              </div>
              <span className="rsx-entry-pct">{entry.value}%</span>
            </div>
            {!readOnly && (
              <div className="rsx-entry-slider">
                <div className="rsx-slider">
                  <div className="rsx-slider-track">
                    <i style={{ width: `${entry.value}%` }} />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={entry.value}
                    aria-label={M.sliderAria(entry.name)}
                    onChange={(e) => patch(entry.id, e.target.value)}
                  />
                  <span className="rsx-slider-ball" style={{ left: `${entry.value}%` }} />
                  {entry.estimate != null && (
                    <span className="rsx-slider-marker" style={{ left: `${entry.estimate}%` }}>
                      <b>{M.marker}</b>
                      <i />
                    </span>
                  )}
                </div>
                <div className="rsx-entry-input">
                  <input
                    type="number"
                    value={entry.value}
                    aria-label={M.inputAria(entry.name)}
                    onChange={(e) => patch(entry.id, e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            )}
            {!readOnly && entry.estimate != null && (() => {
              const warn = gapNote(entry);
              return (
                <p className={`rsx-entry-note${warn ? ' is-warn' : ''}`}>
                  {M.estimate(entry.estimate)}{warn ? `  •  ${warn}` : ''}
                </p>
              );
            })()}
          </div>
          {!readOnly && (
            <button type="button" className="rsx-close-btn" onClick={() => remove(entry.id)} aria-label={M.removeAria(entry.name)}>
              <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
            </button>
          )}
        </div>
      ))}

      {entries.length === 0 && <p className="rsx-add-note">{readOnly ? M.readOnlyEmpty : M.emptyNotice}</p>}

      <div className="rsx-total">
        <p className="rsx-total-label">Total</p>
        <p className={`rsx-total-value${total > 100 || overTotal ? ' is-bad' : ''}`}>{total}%</p>
        {!readOnly && overTotal && (
          <div className="rsx-total-warn">
            <Icon src={icons.alertTriangle} size={12} color="var(--text-error-primary)" baseUrl={baseUrl} />
            <span>{overTotal}</span>
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="rsx-add">
          <div className="rsx-add-head">
            <span className="rsx-add-title">{M.addTitle}</span>
            <StatusBadge className="rsx-badge is-brand">{M.confirmed}</StatusBadge>
          </div>
          <div className="rsx-add-suggest">
            <RsAiLabel>{M.suggestTitle}</RsAiLabel>
            {data.suggestions.filter((s) => !taken(s.name, s.ref)).map((s, i) => (
              <button
                type="button"
                className="rsx-suggest-chip"
                key={rowKey(s, i)}
                onClick={() => addEntry(s.name, { estimate: s.pct, source: 'suggestion', ref: s.ref })}
              >
                {M.suggestChip(s.name, s.pct)}
              </button>
            ))}
          </div>
          <div className="rsx-add-group">
            <p className="rsx-add-eyebrow">{M.squadProjects}</p>
            <div className="rsx-squads">
              {data.squads
                .map((squad) => ({ ...squad, items: squad.items.filter((item) => !taken(item.name, item.ref)) }))
                .filter((squad) => squad.items.length > 0)
                .map((squad, si) => (
                  <div className="rsx-squad" key={rowKey(squad, si)}>
                    <p className="rsx-squad-name">{squad.name}</p>
                    <div className="rsx-squad-items">
                      {squad.items.map((item, ii) => (
                        <button
                          type="button"
                          className="rsx-chip-btn"
                          key={rowKey(item, ii)}
                          onClick={() => addEntry(item.name, { estimate: item.pct, tag: squad.name, source: 'project', ref: item.ref })}
                        >
                          <Icon src={icons.plus} size={14} color="var(--text-primary)" baseUrl={baseUrl} />
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div className="rsx-add-group">
            <p className="rsx-add-eyebrow">{M.personalOkr}</p>
            <button type="button" className="rsx-kr-btn" onClick={() => setKrOpen((v) => !v)}>
              <span>{M.loadKrs}</span>
              {krOpen ? (
                <span className="rsx-kr-caret">
                  <Icon src={icons.chevronDown} size={16} color="var(--utility-blue-500)" baseUrl={baseUrl} />
                </span>
              ) : (
                <b>{data.krs.length}</b>
              )}
            </button>
            {krOpen && (
              <div className="rsx-kr-list">
                {data.krs.length === 0 && (
                  <p className="rsx-add-note">{M.krEmpty(krQuarter?.year ?? '', krQuarter?.quarter ?? '')}</p>
                )}
                {data.krs.map((kr) => (
                  <div className="rsx-kr-row" key={kr.id}>
                    <span className="rsx-kr-id">{kr.id}</span>
                    <div className="rsx-kr-main">
                      <p className="rsx-kr-title">{kr.title}</p>
                      <p className="rsx-kr-sub">{kr.sub}</p>
                    </div>
                    {/* KR 은 연결 프로젝트가 이미 있어도 KR 자체를 별도 항목으로 추가한다
                        (시안 17478:22428 — PIVIT V2.0 항목이 있는 상태에서도 [추가] 노출).
                        같은 KR 을 이미 추가한 경우에만 버튼을 숨긴다. */}
                    {!taken(kr.title, kr.ref) && (
                      <button
                        type="button"
                        className="rsx-gray-btn"
                        onClick={() => addEntry(kr.title, { estimate: kr.pct, tag: M.personalOkr, source: 'kr', ref: kr.ref })}
                      >
                        {M.add}
                      </button>
                    )}
                  </div>
                ))}
                <p className="rsx-kr-note">{M.krNote}</p>
              </div>
            )}
          </div>
          <div className="rsx-add-group">
            <p className="rsx-add-eyebrow">{M.customTitle}</p>
            <div className="rsx-add-custom">
              <input
                value={customName}
                maxLength={CUSTOM_NAME_MAX}
                placeholder={M.customPlaceholder}
                aria-label={M.customAria}
                aria-invalid={customError ? true : undefined}
                onChange={(e) => { setCustomName(e.target.value); setCustomError(null); }}
                onKeyDown={(e) => { if (isEnterKey(e)) { e.preventDefault(); addCustom(); } }}
              />
              <button type="button" className="rsx-gray-btn is-md" onClick={addCustom}>
                {M.customAdd}
              </button>
            </div>
            {customError && (
              <div className="rsx-total-warn" role="alert">
                <Icon src={icons.alertTriangle} size={12} color="var(--text-error-primary)" baseUrl={baseUrl} />
                <span>{customError}</span>
              </div>
            )}
            <p className="rsx-add-note">{M.customNote}</p>
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="rsx-save-row">
          {overLimit && (
            <div className="rsx-total-warn" role="status">
              <Icon src={icons.alertTriangle} size={12} color="var(--text-error-primary)" baseUrl={baseUrl} />
              <span>{M.overLimit(maxTotal)}</span>
            </div>
          )}
          <button
            type="button"
            className="rsx-save-btn"
            disabled={overLimit}
            onClick={() => onSave?.(entries)}
          >
            {M.save}
          </button>
        </div>
      )}

      <div className="rsx-comments-section">
        <p className="rsx-section-title">{L.managerComments}</p>
        <RsCommentThread comments={comments} />
        {replyOpen ? (
          <div className="rsx-comment-input-row">
            <input
              autoFocus
              placeholder={M.replyPlaceholder}
              aria-label={M.replyAria}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (isEnterKey(e)) submitReply();
                if (e.key === 'Escape') { setReplyOpen(false); setReplyText(''); }
              }}
            />
            <button type="button" className="rsx-gray-btn is-md" disabled={replying} onClick={submitReply}>{M.replySubmit}</button>
          </div>
        ) : (
          <button type="button" className="rsx-reply-btn" onClick={() => setReplyOpen(true)}>
            <Icon src={icons.messageText} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>{M.reply}</span>
          </button>
        )}
      </div>
    </div>
  );
}
