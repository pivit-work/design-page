import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import assetUrl from '../shared/assetUrl.js';
import { healthTier, healthLabel } from './snippetHealth.js';

/**
 * SnippetModal — "스니펫 작성" 모달.
 * Figma "content_modal" (node 16626:54036): 650x920 고정, r=16.
 *
 * 구조:
 *   Top bar (pad 20/48/0/48) — 닫기 X
 *   Body (scroll, gap 48):
 *     - 날짜 타이틀 (YYYY.MM.DD)
 *     - Progress bar: What / Why / Value / Highlights / Lowlights
 *       (섹션을 채우면 active bar 가 그라디언트로 오른쪽으로 확장)
 *     - What / Why / Value / Highlights / Lowlights — 각각 textarea
 *     - Health Check — 1~10 점수 버튼 + 영향 요인 textarea (Figma 16627:58459)
 *     - Summary — textarea + AI 요약 생성 버튼 + helper
 *     - Tags — input + AI 태그 추출 버튼 + 추천 tag chips
 *   Footer (pad 24/48/48/48, gap 12) — 초기화 / 등록
 */
const HEALTH_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// What 등 텍스트 필드 글자수 제한. 90% 근접 시 카운터를 빨강으로 경고.
const SNIPPET_MAX_LEN = 500;
const SNIPPET_NEAR_LIMIT = SNIPPET_MAX_LEN * 0.9;
const SECTIONS = [
  {
    key: 'what',
    label: 'What',
    hint: '오늘 무엇을 하셨나요?',
    placeholder:
      '오늘 작업하신 일들을 구체적으로 기록해주세요.\n(예: CMS 기능 보강 인력구조 개선 및 영향 분석, 이슈 확인 등)',
  },
  {
    key: 'why',
    label: 'Why',
    hint: '왜 그 일을 하셨나요?',
    placeholder:
      '이 일을 진행한 배경이나 이유를 적어주세요.\n(예: 신규 기능 요청사항 반영, 고객 피드백 기반 개선 등)',
  },
  {
    key: 'value',
    label: 'Value I added',
    progressLabel: 'Value',
    hint: '어떤 가치를 만들었나요?',
    placeholder:
      '스스로 만들어낸 가치, 실적, 결과물을 정리해주세요.\n(예: 생산성 지표 개선, 사용자 경험 향상, 팀 내 지식 공유 등)',
  },
  {
    key: 'highlights',
    label: 'Highlights',
    hint: '오늘의 하이라이트는 무엇이었나요?',
    placeholder: '오늘의 가장 좋았던 순간, 성취, 배운 점을 기록해주세요.',
  },
  {
    key: 'lowlights',
    label: 'Lowlights',
    hint: '오늘의 아쉬웠던 점은 무엇이었나요?',
    placeholder: '막히거나 아쉬웠던 점, 내일 개선할 부분을 기록해주세요.',
  },
];

// `suggestedTags` prop 이 없을 때 사용하는 fallback 시드 — 호스트 앱이 추천 풀을
// 주입하지 않아도 스니핏 모달은 빈 상태로 보이지 않도록 한다.
const DEFAULT_SUGGESTED_TAGS = [
  '기획', '회의', '개발', '디자인', '리뷰', '문서', '외부미팅', 'TaV', '번역', '산출물', '참석자',
];

// 기존 스니핏을 수정할 때 prefill 하려면 initial 에 { summary, tags,
// sections:{what,why,value,highlights,lowlights} } 모양으로 넘긴다.
// (partial 허용 — 없는 필드는 빈 문자열/빈 배열로 초기화)
//
// AI 통합 props (모두 optional):
//   onAiSummarize(input) → Promise<{summary: string}>
//     "AI 요약 생성" 버튼 클릭 시 호출. summary 만 채워준다.
//   onAiExtractTags(input) → Promise<{tags: string[]}>
//     "AI 태그 추출" 버튼 클릭 시 호출. tags 만 채워준다 (기존 선택과 dedupe merge).
//   suggestedTags?: string[] — 추천 칩 풀. 누락 시 DEFAULT_SUGGESTED_TAGS.
//   onTagSelect?: (name: string) => void — 추천 칩 클릭 시 호스트에 알림.
//     선택된 태그의 모달 내부 상태 추가는 모달이 직접 처리하므로 호스트는 보통
//     analytics/카운트 갱신용으로만 쓴다.
//
//   input 형태: {whatDidYouDo, whyDidYouDoIt, valuesAdded, highlights, lowlights,
//                healthScore, healthNote}
//     healthScore: 1~10 또는 null (미선택). 호스트는 null 이면 prompt 에서 제외.
//     healthNote:  영향 요인 자유 입력. summary 톤·컨텍스트 보강용.
//
//   각 콜백이 누락되면 해당 버튼은 disabled. 두 콜백을 분리한 이유는 사용자가
//   UI 상 각각의 버튼을 누르므로 LLM 호출/대기/에러도 분리되어야 자연스럽기
//   때문이다.
//
// 자동 저장 통지:
//   onDraftChange?: (draft, meta) => void
//     summary/tags/sectionTexts 가 바뀌거나 textarea/input 의 blur 시점에
//     호출된다. 호스트가 받아서 debounce 후 서버 저장 / localStorage 캐시 등
//     원하는 채널로 보낸다. meta.source 는 'change' | 'blur'.
//     한글 IME 조합 중에는 자모 단위 중간 상태가 호스트로 전달되지 않도록
//     compositionStart~compositionEnd 사이의 change/blur 호출을 보류한다.
export default function SnippetModal({
  date,
  baseUrl,
  onClose,
  onSubmit,
  initial,
  onAiSummarize,
  onAiExtractTags,
  suggestedTags,
  onTagSelect,
  onDraftChange,
  savedAt,
}) {
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState(initial?.tags ? [...initial.tags] : []);
  const [sectionTexts, setSectionTexts] = useState({
    what: initial?.sections?.what ?? '',
    why: initial?.sections?.why ?? '',
    value: initial?.sections?.value ?? '',
    highlights: initial?.sections?.highlights ?? '',
    lowlights: initial?.sections?.lowlights ?? '',
  });
  const [healthScore, setHealthScore] = useState(
    typeof initial?.health?.score === 'number' ? initial.health.score : null,
  );
  const [healthNote, setHealthNote] = useState(initial?.health?.note ?? '');
  const [scrolled, setScrolled] = useState(false);
  // 푸터 "자동 등록됨 HH:MM" 라벨 — 실제 서버 저장 성공 시각(savedAt, host 제공)을 표시한다.
  // savedAt 은 저장 성공 시에만 갱신되므로 저장 실패 시 시각이 앞서가지 않는다.
  // 아직 한 번도 저장 안 됐으면(savedAt 없음) 모달 마운트 시각을 fallback 으로 보여준다.
  const [mountLabel] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const savedAtLabel =
    savedAt == null
      ? mountLabel
      : (() => {
          const d = new Date(savedAt);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })();
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [tagsError, setTagsError] = useState(null);
  // IME 조합 중 — 'change' 통지 보류 플래그. state 로 두면 compositionEnd 직후
  // useEffect 가 자연스럽게 재실행되어 최종 결과가 호스트로 전달된다.
  const [isComposing, setIsComposing] = useState(false);
  const onDraftChangeRef = useRef(onDraftChange);
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  const tagSuggestionPool =
    Array.isArray(suggestedTags) && suggestedTags.length > 0
      ? suggestedTags
      : DEFAULT_SUGGESTED_TAGS;

  const panelRef = useRef(null);
  const contentRef = useRef(null);

  // Progress: 채워진 섹션 수 / 전체 섹션 수 → active bar width %
  const filledCount = SECTIONS.filter((s) => sectionTexts[s.key].trim()).length;
  const progressPct = (filledCount / SECTIONS.length) * 100;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Body scrollTop >= 40 → top bar 에 "데일리 스니펫 · {date}" 타이틀 노출
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop >= 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleOverlayMouseDown = (e) => {
    if (panelRef.current && panelRef.current.contains(e.target)) return;
    onClose();
  };

  const dateLabel = (() => {
    const d = date ?? new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  })();

  const addTag = (t) => {
    const v = t.trim();
    if (!v || tags.includes(v)) return;
    setTags((prev) => [...prev, v]);
  };
  const onTagKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };
  const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));

  const buildAiInput = useCallback(
    () => ({
      whatDidYouDo: sectionTexts.what,
      whyDidYouDoIt: sectionTexts.why,
      valuesAdded: sectionTexts.value,
      highlights: sectionTexts.highlights,
      lowlights: sectionTexts.lowlights,
      healthScore,
      healthNote,
    }),
    [sectionTexts, healthScore, healthNote],
  );

  const handleSummarize = useCallback(async () => {
    if (!onAiSummarize || summaryLoading) return;
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const result = await onAiSummarize(buildAiInput());
      if (result?.summary) setSummary(result.summary);
    } catch (err) {
      setSummaryError(err?.message || 'AI 요약 생성에 실패했습니다.');
    } finally {
      setSummaryLoading(false);
    }
  }, [onAiSummarize, summaryLoading, buildAiInput]);

  // tags 는 기존 선택과 합쳐 dedupe 한다 — AI 가 사용자가 고른 태그를
  // 지우면 안 되므로.
  const handleExtractTags = useCallback(async () => {
    if (!onAiExtractTags || tagsLoading) return;
    setTagsError(null);
    setTagsLoading(true);
    try {
      const result = await onAiExtractTags(buildAiInput());
      if (Array.isArray(result?.tags)) {
        setTags((prev) => {
          const seen = new Set(prev);
          const merged = [...prev];
          for (const t of result.tags) {
            const v = (t ?? '').trim();
            if (v && !seen.has(v)) {
              merged.push(v);
              seen.add(v);
            }
          }
          return merged;
        });
      }
    } catch (err) {
      setTagsError(err?.message || 'AI 태그 추출에 실패했습니다.');
    } finally {
      setTagsLoading(false);
    }
  }, [onAiExtractTags, tagsLoading, buildAiInput]);

  const handleSuggestedTagClick = (t) => {
    addTag(t);
    if (onTagSelect) onTagSelect(t);
  };

  const handleReset = () => {
    setSummary('');
    setTagInput('');
    setTags([]);
    setSectionTexts({ what: '', why: '', value: '', highlights: '', lowlights: '' });
    setHealthScore(null);
    setHealthNote('');
  };

  const setSectionText = (key, v) =>
    setSectionTexts((prev) => ({ ...prev, [key]: v }));

  // 자동 저장 통지 — summary/tags/sectionTexts 변경 시 호스트로 'change' 발화.
  // IME 조합 중에는 보류. compositionEnd 로 isComposing 이 false 가 되는 순간
  // useEffect 가 재실행되어 최종 결과가 한 번 통지된다.
  useEffect(() => {
    if (!onDraftChangeRef.current) return;
    if (isComposing) return;
    onDraftChangeRef.current(
      {
        summary,
        tags,
        sections: sectionTexts,
        health: { score: healthScore, note: healthNote },
      },
      { source: 'change' },
    );
  }, [summary, tags, sectionTexts, healthScore, healthNote, isComposing]);

  const handleFieldBlur = useCallback(() => {
    if (!onDraftChangeRef.current) return;
    if (isComposing) return;
    onDraftChangeRef.current(
      {
        summary,
        tags,
        sections: sectionTexts,
        health: { score: healthScore, note: healthNote },
      },
      { source: 'blur' },
    );
  }, [summary, tags, sectionTexts, healthScore, healthNote, isComposing]);

  const handleCompositionStart = useCallback(() => setIsComposing(true), []);
  const handleCompositionEnd = useCallback(() => setIsComposing(false), []);

  const canSubmit = summary.trim() || Object.values(sectionTexts).some((v) => v.trim());
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      date: dateLabel,
      summary: summary.trim(),
      tags,
      sections: sectionTexts,
      health: { score: healthScore, note: healthNote.trim() },
    });
  };

  return createPortal(
    <div className="tl-modal-overlay" onMouseDown={handleOverlayMouseDown} role="presentation">
      <form
        ref={panelRef}
        className={`tl-group-modal tl-snippet-modal ${scrolled ? 'is-scrolled' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-snippet-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tl-group-modal-top tl-snippet-top">
          <span className="tl-snippet-top-title" aria-hidden={!scrolled}>
            데일리 스니펫  ·  {dateLabel}
          </span>
          <button
            type="button"
            className="tl-group-modal-close"
            aria-label="닫기"
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div ref={contentRef} className="tl-group-modal-content tl-snippet-modal-content">
          <h2 id="tl-snippet-modal-title" className="tl-snippet-date">{dateLabel}</h2>

          {/* Progress bar — 섹션 채움 수만큼 active bar 가 그라디언트로 확장.
              Figma Frame 205, r=6, active bar r=6, 5등분. */}
          <div
            className="tl-snippet-progress"
            role="progressbar"
            aria-valuenow={filledCount}
            aria-valuemax={SECTIONS.length}
          >
            <span
              className="tl-snippet-progress-fill"
              style={{ width: `${progressPct}%` }}
              aria-hidden="true"
            />
            {SECTIONS.map((s, i) => {
              const thresholdPct = ((i + 1) / SECTIONS.length) * 100;
              const isActive = progressPct >= thresholdPct - 0.01;
              return (
                <span
                  key={s.key}
                  className={`tl-snippet-progress-segment ${isActive ? 'is-active' : ''}`}
                >
                  {s.progressLabel || s.label}
                </span>
              );
            })}
          </div>

          <div className="tl-snippet-body">
            {/* Figma 순서: 5 섹션 (What/Why/Value/Highlights/Lowlights) → Summary → Tags */}

            {/* What / Why / Value / Highlights / Lowlights */}
            {SECTIONS.map((s) => (
              <div className="tl-snippet-field" key={s.key}>
                <div className="tl-snippet-field-head">
                  <div className="tl-snippet-field-label">
                    {s.label}
                    <span className="tl-snippet-label-hint">{s.hint}</span>
                  </div>
                </div>
                <textarea
                  className="tl-snippet-textarea"
                  placeholder={s.placeholder}
                  value={sectionTexts[s.key]}
                  onChange={(e) => setSectionText(s.key, e.target.value)}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onBlur={handleFieldBlur}
                  maxLength={SNIPPET_MAX_LEN}
                />
                <div
                  className={`tl-snippet-count${
                    sectionTexts[s.key].length > SNIPPET_NEAR_LIMIT ? ' is-near-limit' : ''
                  }`}
                >
                  {sectionTexts[s.key].length} / {SNIPPET_MAX_LEN}
                </div>
              </div>
            ))}

            {/* Health Check — 1~10 점수 + 영향 요인 textarea (Figma 16627:58459) */}
            <div className="tl-snippet-field">
              <div className="tl-snippet-field-head tl-snippet-health-head">
                <div className="tl-snippet-field-label">
                  Health Check
                  {healthScore != null && (
                    <span
                      className={`tl-snippet-health-label tl-snippet-health-label--${healthTier(healthScore)}`}
                    >
                      {healthLabel(healthScore)}
                    </span>
                  )}
                </div>
                <div className="tl-snippet-health-scores" role="radiogroup" aria-label="Health Check 점수">
                  {HEALTH_SCORES.map((n) => {
                    const selected = healthScore === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`tl-snippet-health-score tl-snippet-health-score--${healthTier(
                          n,
                        )} ${selected ? 'is-selected' : ''}`}
                        onClick={() => setHealthScore(selected ? null : n)}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                className="tl-snippet-textarea"
                placeholder="무엇이 영향을 주었나요? (선택)"
                value={healthNote}
                onChange={(e) => setHealthNote(e.target.value)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onBlur={handleFieldBlur}
              />
            </div>

            {/* Summary */}
            <div className="tl-snippet-field">
              <div className="tl-snippet-field-head">
                <div className="tl-snippet-field-label">
                  Summary
                  <span className="tl-snippet-label-hint">AI 자동 생성 해줘요.</span>
                </div>
                <button
                  type="button"
                  className="tl-snippet-ai-btn"
                  onClick={handleSummarize}
                  disabled={!onAiSummarize || summaryLoading}
                  aria-busy={summaryLoading || undefined}
                >
                  <img
                    src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-ai-gradient">AI</span>
                  <span>{summaryLoading ? '생성 중…' : '요약 생성'}</span>
                </button>
              </div>
              <textarea
                className={`tl-snippet-textarea ${summary.trim() ? 'is-ai-filled' : ''}`}
                placeholder="관련 내용 입력하면 AI 요약이 활성화됩니다"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onBlur={handleFieldBlur}
              />
              <div className="tl-snippet-info">
                <img
                  src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                  alt=""
                  width="14"
                  height="14"
                  aria-hidden="true"
                />
                <span className="tl-snippet-info-text">
                  {summaryError
                    ? summaryError
                    : 'What·Why·Values 항목을 채운 뒤 AI 요약 버튼을 누르면 자동으로 작성됩니다.'}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div className="tl-snippet-field">
              <div className="tl-snippet-field-head">
                <div className="tl-snippet-field-label">
                  Tags
                  <span className="tl-snippet-label-hint">AI 자동 추출 해줘요</span>
                </div>
                <button
                  type="button"
                  className="tl-snippet-ai-btn"
                  onClick={handleExtractTags}
                  disabled={!onAiExtractTags || tagsLoading}
                  aria-busy={tagsLoading || undefined}
                >
                  <img
                    src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-ai-gradient">AI</span>
                  <span>{tagsLoading ? '추출 중…' : '태그 추출'}</span>
                </button>
              </div>
              {/* 필드 안에 선택된 태그 chip + 신규 입력 */}
              <div className={`tl-snippet-tag-field ${tags.length ? 'is-ai-filled' : ''}`}>
                {tags.map((t) => (
                  <span key={t} className="tl-snippet-tag tl-snippet-tag-selected">
                    {t}
                    <button
                      type="button"
                      className="tl-snippet-tag-x"
                      aria-label="삭제"
                      onClick={() => removeTag(t)}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="9" y1="3" x2="3" y2="9" />
                        <line x1="3" y1="3" x2="9" y2="9" />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tl-snippet-tag-inline-input"
                  placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKey}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onBlur={handleFieldBlur}
                />
              </div>
              {/* AI 태그 추출 실패 시에만 인라인 에러 노출 — Summary 의 summaryError 와 동일
                  패턴(tl-snippet-info). 정상 상태에서는 렌더되지 않아 시각 변화 없음.
                  추천 chip(.tl-snippet-suggest-tags, padding-bottom:80px) 앞에 두어
                  에러가 트리거 버튼 가까이 노출되도록 한다(80px 스페이서 아래로 밀리지 않게). */}
              {tagsError && (
                <div className="tl-snippet-info" role="alert">
                  <img
                    src={assetUrl(baseUrl, 'icons-solid/ai-sparkle.png')}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-info-text">{tagsError}</span>
                </div>
              )}
              <div className="tl-snippet-suggest-tags">
                {tagSuggestionPool.map((t) => {
                  const already = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`tl-snippet-tag ${already ? 'is-dim' : ''}`}
                      onClick={() => handleSuggestedTagClick(t)}
                      disabled={already}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="tl-snippet-modal-actions">
          <button
            type="button"
            className="tl-snippet-reset-btn"
            onClick={handleReset}
          >
            초기화
          </button>
          <span className="tl-snippet-autosave">자동 등록됨    {savedAtLabel}</span>
        </div>
      </form>
    </div>,
    document.body
  );
}
