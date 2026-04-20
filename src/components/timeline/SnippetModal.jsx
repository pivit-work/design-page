import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

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
 *     - Summary — textarea + AI 요약 생성 버튼 + helper
 *     - Tags — input + AI 태그 추출 버튼 + 추천 tag chips
 *     - What / Why / Value / Highlights / Lowlights — 각각 textarea
 *   Footer (pad 24/48/48/48, gap 12) — 초기화 / 등록
 */
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

const TAG_SUGGESTIONS = [
  '기획', '회의', '개발', '디자인', '리뷰', '문서', '외부미팅', 'TaV', '번역', '산출물', '참석자',
];

export default function SnippetModal({ date, baseUrl, onClose, onSubmit }) {
  const [summary, setSummary] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [sectionTexts, setSectionTexts] = useState({
    what: '', why: '', value: '', highlights: '', lowlights: '',
  });
  const [scrolled, setScrolled] = useState(false);

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

  const handleReset = () => {
    setSummary('');
    setTagInput('');
    setTags([]);
    setSectionTexts({ what: '', why: '', value: '', highlights: '', lowlights: '' });
  };

  const setSectionText = (key, v) =>
    setSectionTexts((prev) => ({ ...prev, [key]: v }));

  const canSubmit = summary.trim() || Object.values(sectionTexts).some((v) => v.trim());
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      date: dateLabel,
      summary: summary.trim(),
      tags,
      sections: sectionTexts,
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
                  maxLength={500}
                />
                <div className="tl-snippet-count">{sectionTexts[s.key].length} / 500</div>
              </div>
            ))}

            {/* Summary */}
            <div className="tl-snippet-field">
              <div className="tl-snippet-field-head">
                <div className="tl-snippet-field-label">
                  Summary
                  <span className="tl-snippet-label-hint">AI 자동 생성 해줘요.</span>
                </div>
                <button type="button" className="tl-snippet-ai-btn">
                  <img
                    src={`${baseUrl || ''}icons-solid/ai-sparkle.png`}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-ai-gradient">AI</span>
                  <span>요약 생성</span>
                </button>
              </div>
              <textarea
                className="tl-snippet-textarea"
                placeholder="관련 내용 입력하면 AI 요약이 활성화됩니다"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
              <div className="tl-snippet-info">
                <img
                  src={`${baseUrl || ''}icons-solid/ai-sparkle.png`}
                  alt=""
                  width="14"
                  height="14"
                  aria-hidden="true"
                />
                <span className="tl-snippet-info-text">
                  What·Why·Values 항목을 채운 뒤 AI 요약 버튼을 누르면 자동으로 작성됩니다.
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
                <button type="button" className="tl-snippet-ai-btn">
                  <img
                    src={`${baseUrl || ''}icons-solid/ai-sparkle.png`}
                    alt=""
                    width="14"
                    height="14"
                    aria-hidden="true"
                  />
                  <span className="tl-snippet-ai-gradient">AI</span>
                  <span>태그 추출</span>
                </button>
              </div>
              {/* 필드 안에 선택된 태그 chip + 신규 입력 */}
              <div className="tl-snippet-tag-field">
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
                />
              </div>
              <div className="tl-snippet-suggest-tags">
                {TAG_SUGGESTIONS.map((t) => {
                  const already = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`tl-snippet-tag ${already ? 'is-dim' : ''}`}
                      onClick={() => addTag(t)}
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

        <div className="tl-group-modal-actions tl-snippet-modal-actions">
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={handleReset}
          >
            초기화
          </button>
          <button
            type="submit"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            disabled={!canSubmit}
          >
            등록
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
