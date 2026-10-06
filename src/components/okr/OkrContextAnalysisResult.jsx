import { CheckGlyph } from '../shared/lineIcons.jsx';

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
 * 미확인은 노랑, 확인은 초록(§5). 키워드는 10개까지 보이고 나머지는 「+ N개」.
 */
const C = {
  font: 'var(--font-family-body)',
  mono: 'var(--font-family-mono)',
  card: '#fff',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  warnBg: '#FFFBEB',
  warnBd: '#FDE68A',
  warnText: '#92400E',
  okBg: '#ECFDF5',
  okBd: '#A7F3D0',
  okText: '#047857',
};

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
  const chip = {
    background: C.card,
    border: `1px solid ${C.border}`,
    fontSize: 11,
    color: C.text,
  };
  return (
    <div
      data-testid="okr-context-analysis-result"
      data-status={confirmed ? 'confirmed' : 'draft'}
      style={{
        padding: 16,
        borderRadius: 12,
        background: confirmed ? C.okBg : C.warnBg,
        border: `1.5px solid ${confirmed ? C.okBd : C.warnBd}`,
        fontFamily: C.font,
        textAlign: 'left',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 99,
            background: C.card,
            border: `1px solid ${confirmed ? C.okBd : C.warnBd}`,
            color: confirmed ? C.okText : C.warnText,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {confirmed && <CheckGlyph size={12} />}
          {confirmed ? L.badgeConfirmed : L.badgeDraft}
        </span>
        <span style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
          {fill(L.counts, {
            sources: analysis.sourceCount ?? 0,
            keywords: keywords.length,
            themes: themes.length,
          })}
        </span>
      </div>

      <div
        style={{
          fontSize: 13,
          color: C.text,
          lineHeight: 1.7,
          marginBottom: 14,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {analysis.summary}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 6 }}>{L.themes}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {themes.map((th, i) => (
          <span key={i} style={{ ...chip, padding: '5px 10px', borderRadius: 99, fontWeight: 700 }}>
            {th}
          </span>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 6 }}>{L.keywords}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
        {keywords.length === 0 ? (
          <span style={{ fontSize: 11, color: C.warnText }}>{L.noKeywords}</span>
        ) : (
          keywords.slice(0, KEYWORD_VISIBLE).map((kw, i) => (
            <span key={i} style={{ ...chip, padding: '4px 9px', borderRadius: 6, fontFamily: C.mono }}>
              #{kw}
            </span>
          ))
        )}
        {keywords.length > KEYWORD_VISIBLE && (
          <span
            style={{
              ...chip,
              padding: '4px 9px',
              borderRadius: 6,
              background: 'transparent',
              border: `1px dashed ${C.border}`,
              color: C.sub,
            }}
          >
            {fill(L.moreKeywords, { count: keywords.length - KEYWORD_VISIBLE })}
          </span>
        )}
      </div>

      {!confirmed && !readOnly && onConfirm && (
        <button
          type="button"
          data-testid="okr-context-analysis-confirm"
          onClick={onConfirm}
          disabled={confirming}
          style={{
            padding: '7px 16px',
            borderRadius: 7,
            border: 'none',
            background: C.okText,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: C.font,
            cursor: confirming ? 'wait' : 'pointer',
            opacity: confirming ? 0.7 : 1,
          }}
        >
          {L.confirm}
        </button>
      )}
    </div>
  );
}
