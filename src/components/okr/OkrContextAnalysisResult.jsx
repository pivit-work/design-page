import { CheckGlyph } from '../shared/lineIcons.jsx';
import AiMark from '../shared/AiMark.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * OkrContextAnalysisResult — OKR 컨텍스트 AI 분석 결과 카드 (정책 §3-3·§5).
 *
 * 정본 시안: pivit-specs `기획서-UX-UI-UserFlow/F. OKR/okr-app.jsx` `AnalysisSection` 의 결과 블록.
 * 컨텍스트 설정 화면(OkrContextSetupCanvas)과 안내 띠의 설정 창(OkrContextSetupModal)이
 * 같은 카드를 쓴다 — 두 곳의 결과가 다르게 보이지 않게.
 *
 *   analysis: { summary, themes[], keywords[], status: 'draft'|'confirmed', sourceCount }
 *   readOnly: 열람자 — [확인] 버튼을 그리지 않는다.
 *   onConfirm / confirming: [확인 — OKR 마법사에서 사용].
 *   labels: 사용자 노출 문구(호스트가 i18n 으로 해소해 주입). 빠진 키는 아래 기본값.
 *
 * 생김새 (PW-2219) — 디자이너 부품만 쓴다. 바깥 연회색 카드(.okr-wz-vision-card)는 부르는 쪽이 두른다
 * (디자이너 컨텍스트 창이 이미 그 카드 안에 결과를 놓는다). 안쪽은 보라 AI 띠(.okr-ai-banner +
 * .okr-ai-banner-label · 수치 .okr-wz-desc), 요약 .okr-ctx-intro-note, 테마 보라 칩(.okr-ai-chips/.okr-ai-chip),
 * 확인 버튼 .okr-btn.is-brand.is-sm. 확인 뒤는 초록 상자 대신 띠 안 초록 글자 「확인됨」(.okr-status-text.is-success).
 * 키워드 칩과 「+ N개」는 디자이너에 작은 칩 부품이 없어 지금 모양을 공용 딱지(StatusBadge + .okr-ctx-kw-chip)로 옮겨 유지한다.
 * 키워드는 10개까지 보이고 나머지는 「+ N개」.
 */

const KEYWORD_VISIBLE = 10;

const ANALYSIS_RESULT_LABELS = {
  badgeDraft: 'AI 분석 결과 (미확인)',
  badgeConfirmed: '확인됨',
  counts: '소스 {{sources}}건 · 키워드 {{keywords}}개 · 테마 {{themes}}개',
  themes: '전략 테마',
  keywords: '추출된 핵심 키워드',
  moreKeywords: '+ {{count}}개',
  noKeywords: '의미 있는 키워드를 찾지 못했습니다',
  confirm: '확인 — OKR 마법사에서 사용',
};

const fill = (tpl, vars) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, String(v)), tpl || '');

export default function OkrContextAnalysisResult({
  analysis,
  readOnly = false,
  onConfirm,
  confirming = false,
  labels,
}) {
  const L = { ...ANALYSIS_RESULT_LABELS, ...(labels || {}) };
  const confirmed = analysis.status === 'confirmed';
  const themes = analysis.themes || [];
  const keywords = analysis.keywords || [];
  return (
    <div
      className="okr-p-ai"
      data-testid="okr-context-analysis-result"
      data-status={confirmed ? 'confirmed' : 'draft'}
    >
      <div className="okr-ai-banner">
        <div className="okr-ai-banner-label" data-testid="okr-context-analysis-badge">
          <AiMark />
          {confirmed ? (
            <span className="okr-status-text is-success" data-testid="okr-context-analysis-confirmed">
              <CheckGlyph size={12} /> {L.badgeConfirmed}
            </span>
          ) : (
            L.badgeDraft
          )}
        </div>
        <span className="okr-wz-desc">
          {fill(L.counts, {
            sources: analysis.sourceCount ?? 0,
            keywords: keywords.length,
            themes: themes.length,
          })}
        </span>
      </div>

      <p className="okr-ctx-intro-note okr-ctx-analysis-summary">{analysis.summary}</p>

      <p className="okr-wz-desc">{L.themes}</p>
      <div className="okr-ai-chips">
        {themes.map((th, i) => (
          <div key={i} className="okr-ai-chip">
            {th}
          </div>
        ))}
      </div>

      <p className="okr-wz-desc">{L.keywords}</p>
      <div className="okr-ctx-kw">
        {keywords.length === 0 ? (
          <span className="okr-wz-desc">{L.noKeywords}</span>
        ) : (
          keywords.slice(0, KEYWORD_VISIBLE).map((kw, i) => (
            <StatusBadge key={i} className="okr-ctx-kw-chip">
              #{kw}
            </StatusBadge>
          ))
        )}
        {keywords.length > KEYWORD_VISIBLE && (
          <StatusBadge className="okr-ctx-kw-chip is-more">
            {fill(L.moreKeywords, { count: keywords.length - KEYWORD_VISIBLE })}
          </StatusBadge>
        )}
      </div>

      {!confirmed && !readOnly && onConfirm && (
        <div>
          <button
            type="button"
            data-testid="okr-context-analysis-confirm"
            onClick={onConfirm}
            disabled={confirming}
            className="okr-btn is-brand is-sm"
          >
            {L.confirm}
          </button>
        </div>
      )}
    </div>
  );
}
