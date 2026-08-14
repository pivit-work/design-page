import { useRef, useState } from 'react';

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
 *   sources: [{ id, type, title, url, body, fileName, fileSize, createdAt, status, statusMessage }]
 *   labels: 모든 사용자 노출 문자열(호스트가 i18n 으로 해소해 주입)
 *   canEdit: 편집 권한(어드민). 미지정이면 편집 핸들러 유무로 추정한다(구버전 호환).
 *   onAddUrl / onAddText / onAddFile / onRemove — 미주입이면 열람 전용.
 *   onStartOkr — 다음 퍼널(OKR 설정 마법사)로 나가는 액션. 주면 인라인 「다음 단계」
 *     블록(§3-2A)과 하단 스티키 CTA(§6)가 함께 렌더된다 — 정책상 둘 중 하나만 두지 않는다.
 *   onAnalyze — AI 분석(§3-3) 트리거. AI 분석 섹션이 있는 호스트만 주입한다.
 *   maxFileSize — 파일 소스 업로드 상한(bytes). 서버 상한과 같은 값을 넘긴다.
 *     넘으면 `onAddFile` 을 부르지 않고 인라인 에러로 막는다(PW-163).
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
  okBg: '#ECFDF5',
  okBd: '#A7F3D0',
  okText: '#047857',
  accentFaint: '#F5F7FF',
  accentSoft: '#C7D2FE',
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
function UploadIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M12 4v12" />
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

function ClockIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function CheckIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function AlertIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
function SparkIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z" />
    </svg>
  );
}
function ArrowRightIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}
function LibraryIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

const TYPE_ICON = { file: FileIcon, url: LinkIcon, text: TextIcon };

/**
 * 소스 추출 상태(§3-2 · 데이터 모델 `ContextSource.status`).
 * 등록만으로는 "끝났다" 를 알 수 없으므로 행이 상태를 말해 준다.
 * 알 수 없는 값(구버전 응답 등)은 `ready` 로 본다 — 코드값이 화면에 새지 않게.
 */
const STATUS_META = {
  processing: { tone: 'muted', Icon: ClockIcon, labelKey: 'statusProcessing' },
  ready: { tone: 'ok', Icon: CheckIcon, labelKey: 'statusReady' },
  failed: { tone: 'err', Icon: AlertIcon, labelKey: 'statusFailed' },
};
const normalizeStatus = (status) => (STATUS_META[status] ? status : 'ready');
const countBy = (sources, status) =>
  sources.filter((s) => normalizeStatus(s.status) === status).length;

function Badge({ children, tone = 'default' }) {
  const tones = {
    default: { bg: '#EEF2FF', bd: '#C7D2FE', color: '#3730A3' },
    muted: { bg: '#F1F5F9', bd: '#E2E8F0', color: '#64748B' },
    ok: { bg: T.okBg, bd: T.okBd, color: T.okText },
    err: { bg: T.errBg, bd: T.errBd, color: T.errText },
  };
  const t = tones[tone] || tones.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 99,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
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
  const status = normalizeStatus(source.status);
  const meta = STATUS_META[status];
  const failed = status === 'failed';
  // 처리 중이면 "문서를 읽고 있어요…", 실패면 서버가 준 사유 — 둘 다 없으면 평소 부가정보.
  const caption =
    (status === 'processing' && labels.statusProcessingHint) ||
    (failed && source.statusMessage) ||
    sourceSubtitle(source, labels);
  return (
    <div
      data-testid={`okr-context-source-${source.id}`}
      data-status={status}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 10,
        border: `1px solid ${failed ? T.errBd : T.border}`,
        background: failed ? T.errBg : T.card,
      }}
    >
      <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}>
        <Icon size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.text, wordBreak: 'break-word' }}>
            {source.title}
          </span>
          <span data-testid={`okr-context-status-${source.id}`}>
            <Badge tone={meta.tone}>
              <meta.Icon />
              {labels[meta.labelKey]}
            </Badge>
          </span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: failed ? T.errText : T.muted,
            marginTop: 3,
            wordBreak: 'break-all',
          }}
        >
          {caption}
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

/**
 * 드롭존 문구 폴백 — 호스트가 라벨을 아직 안 넘기는 구버전에서도 빈칸이 보이지 않게.
 * 용량 상한은 `maxFileSize` 로 정해지므로 폴백 문구에 숫자를 박지 않는다.
 */
const DROPZONE_FALLBACK = {
  dropzoneHint: '클릭하거나 파일을 끌어다 놓으세요',
  dropzoneHere: '여기에 놓으세요',
  dropzoneFormats: '파일 형식 제한 없음',
  removeFile: '제거',
  errorFileTooLarge: '파일은 최대 {{size}} 까지 올릴 수 있어요.',
};

/**
 * 파일 소스용 드롭존(PW-163).
 *
 * 브라우저 기본 `<input type="file">` 은 내부 버튼을 스타일링할 수 없어, 같은 카드의
 * 다른 입력들과 폰트·높이·모서리가 전부 어긋났다. 그래서 input 은 숨기고 클릭 가능한
 * 점선 영역을 대신 그린다 — 이 저장소의 다른 업로드 화면(직원 CSV 임포트,
 * 조직 스냅샷)이 이미 쓰는 패턴이다.
 *
 * 고른 뒤에는 파일명·용량과 [제거] 를 함께 보여 준다. 등록된 소스 행에는 용량이 보이는데
 * 정작 고르는 시점엔 안 보여서, 잘못 골랐는지 확인할 방법이 없었다.
 */
function FileDropzone({ labels, file, onPick }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const L = labels;

  const pickFirst = (fileList) => {
    const next = fileList?.[0];
    if (next) onPick(next);
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      <div
        data-testid="okr-context-dropzone"
        data-dragging={dragging ? 'true' : 'false'}
        data-loaded={file ? 'true' : 'false'}
        role="button"
        tabIndex={0}
        aria-label={L.typeFile}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        // 기본 동작(파일을 새 탭으로 열기)을 막지 않으면 드롭이 화면을 통째로 갈아치운다.
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFirst(e.dataTransfer?.files);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: file ? '18px 16px' : '26px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          boxSizing: 'border-box',
          borderRadius: 10,
          border: `1.5px dashed ${dragging || file ? T.accent : T.border}`,
          background: dragging || file ? T.accentFaint : T.card,
          transition: 'border-color .15s, background .15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          aria-label={L.typeFile}
          data-testid="okr-context-file-input"
          onChange={(e) => pickFirst(e.target.files)}
          style={{ display: 'none' }}
        />
        <span style={{ color: dragging || file ? T.accent : T.muted }}>
          {file ? <FileIcon size={22} /> : <UploadIcon />}
        </span>
        {file ? (
          <div
            data-testid="okr-context-file-picked"
            style={{ fontSize: 13, fontWeight: 800, color: T.text, overflowWrap: 'anywhere' }}
          >
            {file.name}
            <span style={{ fontWeight: 600, color: T.sub }}>
              {' · '}
              {formatSize(file.size)}
            </span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              {dragging
                ? L.dropzoneHere || DROPZONE_FALLBACK.dropzoneHere
                : L.dropzoneHint || DROPZONE_FALLBACK.dropzoneHint}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>
              {L.dropzoneFormats || DROPZONE_FALLBACK.dropzoneFormats}
            </div>
          </>
        )}
      </div>
      {file && (
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          <button
            type="button"
            data-testid="okr-context-file-remove"
            onClick={() => onPick(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: T.font,
              fontSize: 12,
              fontWeight: 700,
              color: T.sub,
            }}
          >
            <TrashIcon size={13} />
            {L.removeFile || DROPZONE_FALLBACK.removeFile}
          </button>
        </div>
      )}
    </div>
  );
}

function AddSourceComposer({ labels, onAddUrl, onAddText, onAddFile, onCancel, busy, maxFileSize }) {
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
        // 상한 초과는 여기서 끊는다 — 안 그러면 20MB 를 다 올린 뒤에 서버가 거절한다.
        if (maxFileSize && file.size > maxFileSize) {
          return setError(
            (labels.errorFileTooLarge || DROPZONE_FALLBACK.errorFileTooLarge).replace(
              '{{size}}',
              formatSize(maxFileSize),
            ),
          );
        }
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
        <FileDropzone
          labels={labels}
          file={file}
          onPick={(next) => {
            setFile(next);
            setError('');
          }}
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

/** `OKR 설정 시작 →` — 인라인 블록과 스티키 푸터가 같은 모양·같은 목적지로 쓴다. */
function StartOkrButton({ labels, onClick, disabled, testId }) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? labels.startOkrAdminOnly : undefined}
      style={{
        ...primaryBtn,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {labels.startOkr}
      <ArrowRightIcon />
    </button>
  );
}

/**
 * 다음 단계 블록 (§3-2A · PW-46) — 등록 직후 시선이 머무는 자리(리스트 바로 아래)에
 * 다음 행동을 붙인다. 소스를 넣고 나면 "이제 뭘 하지?" 가 남던 것이 이 이슈였다.
 *
 * `OKR 설정 시작 →` 은 소스 추출 상태와 무관하게 **항상 활성** 이다 — 추출을 기다리느라
 * 퍼널이 막히면 안 된다. AI 분석 버튼은 `onAnalyze` 를 주는 호스트에서만 노출한다
 * (AI 분석 섹션이 없는 화면에 버튼만 두면 그 자체로 또 하나의 막다른 길이 된다).
 */
function NextStepBlock({ sources, labels, onStartOkr, onAnalyze }) {
  const ready = countBy(sources, 'ready');
  const processing = countBy(sources, 'processing');
  const allFailed = ready === 0 && processing === 0;
  const fill = (key, count) => (labels[key] || '').replace('{{count}}', String(count));

  return (
    <div
      data-testid="okr-context-next-step"
      style={{
        marginTop: 4,
        padding: '14px 16px',
        borderRadius: 12,
        background: allFailed ? T.errBg : T.accentFaint,
        border: `1px solid ${allFailed ? T.errBd : T.accentSoft}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 800,
          marginBottom: 4,
          color: allFailed ? T.errText : T.text,
        }}
      >
        {allFailed ? <AlertIcon size={14} /> : <CheckIcon size={14} />}
        {allFailed ? labels.nextStepFailedTitle : fill('nextStepTitle', sources.length)}
      </div>
      <div
        style={{
          fontSize: 11,
          color: allFailed ? T.errText : T.sub,
          marginBottom: 12,
          lineHeight: 1.6,
        }}
      >
        {allFailed
          ? labels.nextStepFailedDesc
          : ready === 0
            ? labels.nextStepProcessingDesc
            : processing > 0
              ? fill('nextStepPartialDesc', processing)
              : labels.nextStepDesc}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onAnalyze && !allFailed && (
          <button
            type="button"
            data-testid="okr-context-analyze"
            onClick={onAnalyze}
            disabled={ready === 0}
            title={ready === 0 ? labels.analyzeProcessingHint : undefined}
            style={{
              ...ghostBtn,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: ready === 0 ? T.muted : T.accent,
              opacity: ready === 0 ? 0.6 : 1,
              cursor: ready === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <SparkIcon />
            {labels.analyze}
          </button>
        )}
        <StartOkrButton
          labels={labels}
          onClick={onStartOkr}
          testId="okr-context-next-step-start"
        />
      </div>
    </div>
  );
}

/**
 * 하단 스티키 CTA (§6) — 화면 어디에 있든 다음 퍼널로 나갈 수 있는 전역 앵커.
 * 인라인 블록(문맥 앵커)과 **함께** 둔다. 소스 0건이어도 활성 — 컨텍스트는 선택 사항이다.
 */
function StickyFooterCta({ sources, labels, canEdit, onStartOkr }) {
  return (
    <div
      data-testid="okr-context-footer"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 10,
        marginTop: 14,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: '14px 18px',
        boxShadow: '0 -4px 16px rgba(15,23,42,.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <Badge tone={sources.length > 0 ? 'ok' : 'muted'}>
        <LibraryIcon />
        {(labels.footerSourceCount || '').replace('{{count}}', String(sources.length))}
      </Badge>
      <div style={{ flex: 1, minWidth: 200, fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
        {sources.length === 0 ? labels.footerHintEmpty : labels.footerHintSources}
      </div>
      <StartOkrButton
        labels={labels}
        onClick={onStartOkr}
        disabled={!canEdit}
        testId="okr-context-footer-start"
      />
    </div>
  );
}

export default function OkrContextSetupCanvas({
  sources = [],
  labels = {},
  loading = false,
  error = null,
  busy = false,
  canEdit,
  onAddUrl,
  onAddText,
  onAddFile,
  onRemove,
  onStartOkr,
  onAnalyze,
  maxFileSize,
}) {
  const [adding, setAdding] = useState(false);
  const hasEditHandlers = !!(onAddUrl || onAddText || onAddFile);
  // 권한은 호스트가 말해 주는 게 정본이다. `canEdit` 미지정은 구버전 호출부 호환.
  const editable = canEdit === undefined ? hasEditHandlers : canEdit;
  const readOnly = !editable;
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
              maxFileSize={maxFileSize}
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

        {/* 문맥 앵커 — 소스가 1건이라도 있고 편집 권한이 있을 때만(§3-2A) */}
        {!readOnly && !loading && sources.length > 0 && onStartOkr && (
          <NextStepBlock
            sources={sources}
            labels={L}
            onStartOkr={onStartOkr}
            onAnalyze={onAnalyze}
          />
        )}
      </div>

      {/* 전역 앵커 — 소스 0건이어도 항상 보인다(§6). 열람자는 비활성 + 툴팁 */}
      {onStartOkr && (
        <StickyFooterCta
          sources={sources}
          labels={L}
          canEdit={editable}
          onStartOkr={onStartOkr}
        />
      )}
    </div>
  );
}
