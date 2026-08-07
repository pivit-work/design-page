import { useState } from 'react';

/**
 * OkrContextSetupCanvas — OKR 컨텍스트 설정(관리자 전용) 지식 소스 단일 페이지.
 *
 * 정본 시안: pivit-specs `기획서-UX-UI-UserFlow/F. OKR/okr-context-setup.jsx` v2.0.
 * 카테고리·탭 없이 하나의 평면 리스트에 소스(문서·링크·메모)를 등록한다.
 * 컨텍스트는 **선택 사항** 이라 0건이어도 OKR 수립은 그대로 진행된다.
 *
 * 아이콘은 이모지가 아니라 인라인 SVG 로 그린다(프로젝트 규약) — 시안의 📎🔗✏️ 를
 * 같은 의미의 라인 아이콘으로 대체했다. 색·여백·레이아웃은 시안을 따른다.
 *
 * 순수 표현 컴포넌트: 데이터·IO 는 전부 props 로 주입받는다.
 *   sources: [{ id, type, title, url, body, fileName, fileSize, createdAt }]
 *   labels: 모든 사용자 노출 문자열(호스트가 i18n 으로 해소해 주입)
 *   onAddUrl / onAddText / onAddFile / onRemove — 미주입이면 열람 전용.
 */

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  card: '#fff',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  accent: '#4F6AF5',
  warnBg: '#FFFBEB',
  warnBd: '#FDE68A',
  warnText: '#92400E',
  errBg: '#FEF2F2',
  errBd: '#FECACA',
  errText: '#B91C1C',
};

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function BrainIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M12 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V16a3 3 0 0 0 4 2.8" />
      <path d="M12 5a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V16a3 3 0 0 1-4 2.8" />
      <path d="M12 5v14" />
    </svg>
  );
}
function FileIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function LinkIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}
function TextIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
function TrashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const TYPE_ICON = { file: FileIcon, url: LinkIcon, text: TextIcon };

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: '#EEF2FF', bd: '#C7D2FE', color: '#3730A3' },
    muted: { bg: '#F1F5F9', bd: '#E2E8F0', color: '#64748B' },
  };
  const t = tones[tone] || tones.default;
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: 99,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.color,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function sourceSubtitle(s, labels) {
  if (s.type === 'file') return [s.fileName, formatSize(s.fileSize)].filter(Boolean).join(' · ');
  if (s.type === 'url') return s.url || '';
  const len = (s.body || '').length;
  return labels.charCount ? labels.charCount.replace('{{count}}', String(len)) : `${len}`;
}

function SourceRow({ source, labels, onRemove }) {
  const Icon = TYPE_ICON[source.type] || TextIcon;
  return (
    <div
      data-testid={`okr-context-source-${source.id}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${T.border}`,
        background: T.card,
      }}
    >
      <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}>
        <Icon size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, wordBreak: 'break-word' }}>
          {source.title}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 3, wordBreak: 'break-all' }}>
          {sourceSubtitle(source, labels)}
        </div>
        {source.type === 'text' && source.body ? (
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 12,
              color: T.sub,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {source.body}
          </p>
        ) : null}
      </div>
      {onRemove && (
        <button
          type="button"
          aria-label={`${source.title} ${labels.remove}`}
          data-testid={`okr-context-remove-${source.id}`}
          onClick={() => onRemove(source.id)}
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.card,
            color: T.sub,
            cursor: 'pointer',
          }}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

function AddSourceComposer({ labels, onAddUrl, onAddText, onAddFile, onCancel, busy }) {
  const [type, setType] = useState(null);
  const [urlVal, setUrlVal] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 11px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    fontFamily: T.font,
    fontSize: 13,
    color: T.text,
    outline: 'none',
  };

  const submit = async () => {
    setError('');
    try {
      if (type === 'url') {
        if (!urlVal.trim()) return setError(labels.errorUrlRequired);
        await onAddUrl({ url: urlVal.trim(), title: title.trim() });
      } else if (type === 'text') {
        if (!body.trim()) return setError(labels.errorTextRequired);
        await onAddText({ body: body.trim(), title: title.trim() });
      } else {
        if (!file) return setError(labels.errorFileRequired);
        await onAddFile({ file, title: title.trim() });
      }
      onCancel();
    } catch (e) {
      setError(e?.message || labels.errorGeneric);
    }
  };

  if (!type) {
    const TYPES = [
      { id: 'file', label: labels.typeFile, desc: labels.typeFileDesc, Icon: FileIcon },
      { id: 'url', label: labels.typeUrl, desc: labels.typeUrlDesc, Icon: LinkIcon },
      { id: 'text', label: labels.typeText, desc: labels.typeTextDesc, Icon: TextIcon },
    ];
    return (
      <div
        data-testid="okr-context-type-picker"
        style={{
          padding: 14,
          borderRadius: 12,
          border: `1.5px dashed ${T.accent}`,
          background: '#F8FAFF',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 800, color: T.text, marginBottom: 10 }}>
          {labels.pickType}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {TYPES.map((st) => (
            <button
              key={st.id}
              type="button"
              data-testid={`okr-context-type-${st.id}`}
              onClick={() => setType(st.id)}
              style={{
                padding: '14px 12px',
                borderRadius: 10,
                textAlign: 'left',
                border: `1px solid ${T.border}`,
                background: T.card,
                cursor: 'pointer',
                fontFamily: T.font,
              }}
            >
              <div style={{ color: T.accent, marginBottom: 6 }}>
                <st.Icon size={20} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2 }}>
                {st.label}
              </div>
              <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.4 }}>{st.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button type="button" onClick={onCancel} style={ghostBtn}>
            {labels.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="okr-context-composer"
      style={{
        padding: 14,
        borderRadius: 12,
        border: `1.5px dashed ${T.accent}`,
        background: '#F8FAFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {type === 'url' && (
        <input
          style={inputStyle}
          placeholder={labels.urlPlaceholder}
          aria-label={labels.typeUrl}
          value={urlVal}
          onChange={(e) => setUrlVal(e.target.value)}
        />
      )}
      {type === 'file' && (
        <input
          type="file"
          aria-label={labels.typeFile}
          data-testid="okr-context-file-input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: 12, color: T.sub }}
        />
      )}
      <input
        style={inputStyle}
        placeholder={labels.titlePlaceholder}
        aria-label={labels.titleLabel}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      {type === 'text' && (
        <textarea
          style={{ ...inputStyle, height: 132, resize: 'vertical', lineHeight: 1.6 }}
          placeholder={labels.textPlaceholder}
          aria-label={labels.typeText}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      )}
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: T.errBg,
            border: `1px solid ${T.errBd}`,
            color: T.errText,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>
          {labels.cancel}
        </button>
        <button
          type="button"
          data-testid="okr-context-submit"
          onClick={submit}
          disabled={busy}
          style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? labels.saving : labels.add}
        </button>
      </div>
    </div>
  );
}

const ghostBtn = {
  padding: '8px 14px',
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.card,
  color: T.sub,
  fontFamily: T.font,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

const primaryBtn = {
  padding: '8px 16px',
  borderRadius: 8,
  border: 'none',
  background: T.accent,
  color: '#fff',
  fontFamily: T.font,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
};

export default function OkrContextSetupCanvas({
  sources = [],
  labels = {},
  loading = false,
  error = null,
  busy = false,
  onAddUrl,
  onAddText,
  onAddFile,
  onRemove,
}) {
  const [adding, setAdding] = useState(false);
  const readOnly = !onAddUrl && !onAddText && !onAddFile;
  const L = labels;

  return (
    <div style={{ fontFamily: T.font, maxWidth: 880 }} data-testid="okr-context-setup">
      <div
        style={{
          background: 'linear-gradient(135deg,#EEF2FF 0%, #F5F3FF 100%)',
          border: '1px solid #C7D2FE',
          borderRadius: 14,
          padding: '22px 26px',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ color: T.accent }}>
            <BrainIcon />
          </span>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{L.title}</div>
          <Badge>{L.adminOnly}</Badge>
          <Badge tone="muted">{L.optional}</Badge>
        </div>
        <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>{L.description}</div>
        {readOnly && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 9,
              background: T.warnBg,
              border: `1px solid ${T.warnBd}`,
              color: T.warnText,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LockIcon />
            {L.readOnlyNotice}
          </div>
        )}
      </div>

      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{L.sourcesTitle}</div>
          <span style={{ fontSize: 12, color: T.muted }}>
            {(L.sourceCount || '{{count}}').replace('{{count}}', String(sources.length))}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              borderRadius: 9,
              background: T.errBg,
              border: `1px solid ${T.errBd}`,
              color: T.errText,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '28px 0', textAlign: 'center', fontSize: 13, color: T.muted }}>
            {L.loading}
          </div>
        ) : sources.length === 0 ? (
          <div
            style={{
              padding: '28px 0',
              textAlign: 'center',
              fontSize: 13,
              color: T.muted,
              lineHeight: 1.6,
            }}
          >
            {L.empty}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sources.map((s) => (
              <SourceRow key={s.id} source={s} labels={L} onRemove={onRemove} />
            ))}
          </div>
        )}

        {!readOnly &&
          (adding ? (
            <AddSourceComposer
              labels={L}
              busy={busy}
              onAddUrl={onAddUrl}
              onAddText={onAddText}
              onAddFile={onAddFile}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              type="button"
              data-testid="okr-context-add"
              onClick={() => setAdding(true)}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: `1.5px dashed ${T.border}`,
                background: '#F8FAFC',
                color: T.sub,
                fontFamily: T.font,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {L.addSource}
            </button>
          ))}
      </div>
    </div>
  );
}
