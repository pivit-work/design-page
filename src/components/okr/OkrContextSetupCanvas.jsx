import { useEffect, useRef, useState } from 'react';
import { ArrowRightGlyph, CheckGlyph, LockGlyph, TrashGlyph, UploadCloudGlyph } from '../shared/lineIcons.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import AiMark from '../shared/AiMark.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Switch from '../shared/Switch.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import OkrContextAnalysisResult from './OkrContextAnalysisResult.jsx';
import { isEnterKey } from '../shared/enterKey.js';

/**
 * OkrContextSetupCanvas — OKR 컨텍스트 설정(관리자 전용) 지식 소스 단일 페이지.
 *
 * 정본 시안: pivit-specs `기획서-UX-UI-UserFlow/F. OKR/okr-context-setup.jsx` v2.0.
 * 카테고리·탭 없이 하나의 평면 리스트에 소스(문서·링크·메모)를 등록한다.
 * 컨텍스트는 **선택 사항** 이라 0건이어도 OKR 수립은 그대로 진행된다.
 *
 * 생김새 (PW-2219): 디자이너(stesslee)가 같은 내용으로 그린 «창» `OkrContextSetupModal`
 * (.okr-ctx-* · .okr-wz-*, 2026-08-16)을 페이지에 펼친 모양이다. 창에 없는 부분은 같은 OKR 화면의
 * 디자이너 부품을 원래 뜻대로 빌렸다 — 운영 단위 = 마법사 범위 카드(.okr-wz-scope),
 * 소스 줄 = 개인 OKR 「연결된 상위 OKR」 카드(.okr-p-linked-card), 입력 칸 = .okr-textarea,
 * 상태 = .okr-status-text 글자색, 막지 않는 안내 = 연회색(.okr-wz-vision-card).
 * 소스 추가는 창처럼 드롭존이 늘 보이고 링크·텍스트는 회색 버튼(.okr-ghost-btn)으로 연다.
 * 디자이너 부품이 없는 자리(하단 고정 바·빨간 실패 상자)는 지금 모양을 개발 클래스로 옮겨 유지한다.
 *
 * 순수 표현 컴포넌트: 데이터·IO 는 전부 props 로 주입받는다.
 *   sources: [{ id, type, title, url, body, fileName, fileSize, pageCount, createdAt, status, statusMessage }]
 *   labels: 모든 사용자 노출 문자열(호스트가 i18n 으로 해소해 주입)
 *     description / descriptionNote — 머리 아래 안내 두 줄(회색 · 검정). note 가 없으면 한 줄.
 *   canEdit: 편집 권한(어드민). 미지정이면 편집 핸들러 유무로 추정한다(구버전 호환).
 *   onAddUrl / onAddText / onAddFile / onRemove — 미주입이면 열람 전용.
 *   onStartOkr — 다음 퍼널(OKR 설정 마법사)로 나가는 액션. 주면 카드 맨 아래 인라인 푸터
 *     (§3-2A — 안내 + [OKR 설정 시작])와 하단 스티키 CTA(§6)가 함께 렌더된다 — 정책상 둘 중 하나만 두지 않는다.
 *     다만 **동시에 보이지는 않는다**: 인라인 푸터의 시작 버튼이 화면 안에 있는 동안 하단 바를 접어
 *     같은 버튼이 두 번 보이지 않게 한다(PW-46 피드백). 스크롤로 그 버튼이 화면을
 *     벗어나면 하단 바가 다시 나온다 — 전역 앵커 자체를 없애는 게 아니다.
 *   headerAction — 제목 줄 오른쪽 끝에 놓을 요소(예: [OKR 작성 ▾] 단위 메뉴 · okr-policy §2C.2). 없으면 자리도 없다.
 *   onAnalyze — AI 분석(§3-3) 트리거. 어드민 호스트만 주입한다. 버튼은 분석 절에 하나뿐이다.
 *   analysis — 최신 AI 분석 { summary, themes, keywords, status, sourceCount } 또는 null(분석 전).
 *     `analysis` 나 `onAnalyze` 중 하나라도 주면 「AI 분석 (선택)」 절이 그려진다 — 열람자는
 *     결과만 보고 버튼은 꺼진다. 둘 다 없으면 절이 없다(구버전 호스트).
 *   analyzing / analyzeFailed — 분석 중 · 실패(빨간 상자 + [다시 시도]).
 *   onConfirmAnalysis / confirmingAnalysis — [확인 — OKR 마법사에서 사용].
 *   analysisNotice — 분석 절 머리 아래에 그릴 호스트 노드(체험 AI 소진 안내 등, §3-3).
 *   processingDelayed / onRefresh — 다시 묻기를 60초 넘게 해도 `processing` 이 남았을 때
 *     처리 중 행 캡션을 「처리가 지연되고 있습니다」 + [새로고침] 으로 바꾼다(§3-2).
 *   loadFailed — 목록을 불러오지 못했다. 그때는 0건이어도 빈 상태 안내를 그리지 않는다 — 「없습니다」로
 *     보이면 실제로 없는 줄 안다(PW-1507). 실패 문구는 `error` 로 준다.
 *   maxTextLength — 텍스트 소스 본문 상한(글자). 서버 상한과 같은 값을 넘긴다. 주면 입력 칸 아래에
 *     「N / 상한」을 보이고, 넘으면 빨갛게 바꾸며 `onAddText` 를 부르지 않는다(§4·§9 · PW-1507).
 *   maxFileSize — 파일 소스 업로드 상한(bytes). 서버 상한과 같은 값을 넘긴다.
 *     넘으면 `onAddFile` 을 부르지 않고 인라인 에러로 막는다(PW-163).
 *   unitPolicy — 카드 맨 위 «OKR 운영 단위» 칸(정책 §3-1A · okr-policy §2B.5 · PW-1364).
 *     `{ levels: [{ id, name, count }], minUnitLevelId, individualOkr }`. `levels` 는 라벨 사전
 *     순서대로(전사는 넣지 않는다 — 칸이 맨 앞에 고정으로 그린다). `minUnitLevelId` 가 비면
 *     가장 깊은 라벨까지 운영으로 본다. 이 prop·`unitPolicyLoading`·`unitPolicyError` 셋 다
 *     안 주면 칸을 그리지 않는다(구버전 호출부 호환).
 *   unitPolicyLoading / unitPolicyError — 칸 안에 «불러오는 중» / 실패 문구.
 *   onUnitPolicyChange(next) — 카드·스위치를 누르면 바뀐 정책 전체로 부른다. 편집 권한이 없거나
 *     미주입이면 칸은 보기만 한다. 저장·실패 되돌리기는 호스트 몫이다.
 */

/** 표시할 종류 이름 — 소스 줄 부가 정보 앞·추가 칸 머리가 같은 라벨을 쓴다(§3-2 · PW-1507). */
const TYPE_LABEL_KEY = { file: 'typeFile', url: 'typeUrl', text: 'typeText' };
/** 추가 버튼 이름 — 종류마다 다르다(시안 [링크 등록]·[텍스트 추가]). 없으면 공통 `add`. */
const SUBMIT_LABEL_KEY = { file: 'submitFile', url: 'submitUrl', text: 'submitText' };
/** 기획 §3-2 입력 검증 — 서버 `okr-context.service.ts` 와 같은 식. */
const URL_PATTERN = /^https?:\/\/.+/i;

/**
 * 소스 추출 상태(§3-2 · 데이터 모델 `ContextSource.status`).
 * 등록만으로는 "끝났다" 를 알 수 없으므로 행이 상태를 말해 준다.
 * 알 수 없는 값(구버전 응답 등)은 `ready` 로 본다 — 코드값이 화면에 새지 않게.
 * 글자색은 디자이너 상태 글자(.okr-status-text) — 준비됨 초록 · 실패 빨강 · 처리 중 기본 글자색.
 */
const STATUS_META = {
  processing: { labelKey: 'statusProcessing', tone: '' },
  ready: { labelKey: 'statusReady', tone: 'is-success' },
  failed: { labelKey: 'statusFailed', tone: 'is-error' },
};
const normalizeStatus = (status) => (STATUS_META[status] ? status : 'ready');
const countBy = (sources, status) =>
  sources.filter((s) => normalizeStatus(s.status) === status).length;

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function sourceSubtitle(s, labels) {
  if (s.type === 'file') {
    // PDF 는 쪽 수를 크기 앞에 적는다(§3-2 「파일=페이지 수」). 모르면(Word·옛 파일) 크기만.
    const pages = s.pageCount ? (labels.pageCount || '{{count}}p').replace('{{count}}', String(s.pageCount)) : null;
    return [s.fileName, pages, formatSize(s.fileSize)].filter(Boolean).join(' · ');
  }
  if (s.type === 'url') return s.url || '';
  const len = (s.body || '').length;
  return labels.charCount ? labels.charCount.replace('{{count}}', String(len)) : `${len}`;
}

/** 소스 한 줄 — 디자이너 «연결된 상위 OKR» 카드(.okr-p-linked-card). */
function SourceRow({ source, labels, onRemove, delayed, onRefresh }) {
  const status = normalizeStatus(source.status);
  const meta = STATUS_META[status];
  const failed = status === 'failed';
  const stalled = status === 'processing' && delayed;
  // 처리 중이면 "문서를 읽고 있어요…"(지연이면 지연 안내), 실패면 서버가 준 사유를 따로 빨간 글자로.
  const note = (stalled && labels.statusDelayed) || (status === 'processing' && labels.statusProcessingHint) || null;
  const typeLabel = labels[TYPE_LABEL_KEY[source.type]];
  return (
    <div
      className="okr-p-linked-card"
      data-testid={`okr-context-source-${source.id}`}
      data-status={status}
    >
      <div className="okr-p-linked-head">
        <div className="okr-ctx-source-main">
          <span className="okr-p-linked-name">{source.title}</span>
          <span
            className={['okr-status-text', meta.tone].filter(Boolean).join(' ')}
            data-testid={`okr-context-status-${source.id}`}
          >
            {labels[meta.labelKey]}
          </span>
        </div>
        {onRemove && (
          <button
            type="button"
            className="okr-icon-btn"
            aria-label={`${source.title} ${labels.remove}`}
            data-testid={`okr-context-remove-${source.id}`}
            onClick={() => onRemove(source.id)}
          >
            <TrashGlyph size={16} />
          </button>
        )}
      </div>
      <div>
        <p className="okr-p-linked-sub">
          {/* 종류 이름은 부가 정보 앞에 — 「텍스트 · 67자」(§3-2 · PW-1507) */}
          {typeLabel && (
            <span data-testid={`okr-context-type-badge-${source.id}`}>
              {typeLabel}
              {' · '}
            </span>
          )}
          {sourceSubtitle(source, labels)}
        </p>
        {note && (
          <p className="okr-p-linked-sub" data-testid={`okr-context-note-${source.id}`}>
            {note}
            {stalled && onRefresh && (
              <>
                {' '}
                <button
                  type="button"
                  className="okr-ghost-btn"
                  data-testid={`okr-context-refresh-${source.id}`}
                  onClick={onRefresh}
                >
                  {labels.refresh}
                </button>
              </>
            )}
          </p>
        )}
        {failed && source.statusMessage && (
          <p className="okr-status-badge is-error" data-testid={`okr-context-reason-${source.id}`}>
            {source.statusMessage}
          </p>
        )}
        {source.type === 'text' && source.body ? (
          // 미리보기는 두 줄까지(§3-2) — 긴 메모가 목록을 밀어내지 않게.
          <p className="okr-p-linked-sub okr-ctx-source-preview">{source.body}</p>
        ) : null}
      </div>
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
 * 파일 소스용 드롭존(PW-163) — 디자이너 컨텍스트 창의 드롭존(.okr-ctx-dropzone) 그대로, 늘 보인다.
 *
 * 브라우저 기본 `<input type="file">` 은 숨기고 클릭·끌어 놓기 영역을 대신 그린다.
 * 고른 뒤에는 파일명·용량을 같은 자리에 보여 준다 — 잘못 골랐는지 확인할 수 있게.
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
    <div
      className={`okr-ctx-dropzone${dragging ? ' is-dragover' : ''}`}
      data-testid="okr-context-dropzone"
      data-dragging={dragging ? 'true' : 'false'}
      data-loaded={file ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-label={L.typeFile}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (isEnterKey(e) || e.key === ' ') {
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
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        aria-label={L.typeFile}
        data-testid="okr-context-file-input"
        onChange={(e) => {
          pickFirst(e.target.files);
          e.target.value = '';
        }}
      />
      <span className="okr-ctx-dropzone-icon" aria-hidden>
        <UploadCloudGlyph size={20} strokeWidth={1.67} />
      </span>
      <div className="okr-ctx-dropzone-texts">
        {file ? (
          <p className="okr-ctx-dropzone-action" data-testid="okr-context-file-picked">
            <b>{file.name}</b>
            <span className="okr-ctx-dropzone-or">{formatSize(file.size)}</span>
          </p>
        ) : (
          <p className="okr-ctx-dropzone-action">
            <b>
              {dragging
                ? L.dropzoneHere || DROPZONE_FALLBACK.dropzoneHere
                : L.dropzoneHint || DROPZONE_FALLBACK.dropzoneHint}
            </b>
          </p>
        )}
        <p className="okr-ctx-dropzone-hint">{L.dropzoneFormats || DROPZONE_FALLBACK.dropzoneFormats}</p>
      </div>
    </div>
  );
}

/**
 * 소스 추가 — 드롭존이 늘 보이고, 그 아래 [링크 등록]·[텍스트 추가] 회색 버튼(.okr-ghost-btn).
 * 파일을 고르거나 버튼을 누르면 그 종류의 입력 칸이 버튼 자리에 열린다(종류 고르기 단계 없음 · PW-2219).
 */
function SourceAdder({ labels, onAddUrl, onAddText, onAddFile, busy, maxFileSize, maxTextLength }) {
  const [type, setType] = useState(null);
  const [urlVal, setUrlVal] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  // 서버는 앞뒤 공백을 뗀 본문을 센다 — 같은 기준으로 센다.
  const textLength = body.trim().length;
  const textTooLong = !!maxTextLength && textLength > maxTextLength;
  const urlInvalid = type === 'url' && !!error && error === labels.errorUrlInvalid;

  // 닫으면 쓰던 입력은 버린다 — 다른 종류 칸에 남은 값이 섞이지 않게.
  const reset = () => {
    setType(null);
    setUrlVal('');
    setTitle('');
    setBody('');
    setFile(null);
    setError('');
  };
  const open = (next) => {
    reset();
    setType(next);
  };

  const submit = async () => {
    setError('');
    try {
      if (type === 'url') {
        if (!urlVal.trim()) return setError(labels.errorUrlRequired);
        // 서버도 같은 식으로 거절하지만, 보내기 전에 칸 안에서 막는다(§3-2·§9).
        if (labels.errorUrlInvalid && !URL_PATTERN.test(urlVal.trim())) return setError(labels.errorUrlInvalid);
        await onAddUrl({ url: urlVal.trim(), title: title.trim() });
      } else if (type === 'text') {
        if (!body.trim()) return setError(labels.errorTextRequired);
        if (textTooLong) return setError(labels.errorTextTooLong || labels.errorGeneric);
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
      reset();
    } catch (e) {
      setError(e?.message || labels.errorGeneric);
    }
  };

  return (
    <>
      {onAddFile && (
        <FileDropzone
          labels={labels}
          file={type === 'file' ? file : null}
          onPick={(next) => {
            if (next) {
              if (type !== 'file') open('file');
              setFile(next);
            } else {
              // 제거해도 파일 칸은 열어 둔다 — 다른 파일을 바로 고를 수 있게.
              setFile(null);
            }
            setError('');
          }}
        />
      )}

      {!type ? (
        (onAddUrl || onAddText) && (
          <div className="okr-ctx-add-row" data-testid="okr-context-add-row">
            {onAddUrl && (
              <button type="button" className="okr-ghost-btn" data-testid="okr-context-type-url" onClick={() => open('url')}>
                {labels.submitUrl || labels.typeUrl}
              </button>
            )}
            {onAddText && (
              <button type="button" className="okr-ghost-btn" data-testid="okr-context-type-text" onClick={() => open('text')}>
                {labels.submitText || labels.typeText}
              </button>
            )}
          </div>
        )
      ) : (
        <div className="okr-ctx-composer" data-testid="okr-context-composer">
          <div className="okr-ctx-composer-head">
            <p className="okr-wz-question" data-testid="okr-context-composer-type">
              {(labels.composerTitle || '{{type}}').replace('{{type}}', labels[TYPE_LABEL_KEY[type]] || '')}
            </p>
            <div className="okr-ctx-add-row">
              {type === 'file' && file && (
                <button type="button" className="okr-ghost-btn" data-testid="okr-context-file-remove" onClick={() => setFile(null)}>
                  {labels.removeFile || DROPZONE_FALLBACK.removeFile}
                </button>
              )}
              {/* [타입 변경] — 입력을 버리고 드롭존·[링크 등록]·[텍스트 추가] 로 돌아간다(§3-2 · PW-1507). */}
              {labels.changeType && (
                <button type="button" className="okr-ghost-btn" data-testid="okr-context-change-type" onClick={reset}>
                  {labels.changeType}
                </button>
              )}
            </div>
          </div>
          {type === 'url' && (
            <input
              // 형식 오류면 칸 테두리도 빨갛게(§4·§9 「인라인 빨강 보더」)
              className="okr-textarea is-compact"
              aria-invalid={urlInvalid || undefined}
              placeholder={labels.urlPlaceholder}
              aria-label={labels.typeUrl}
              value={urlVal}
              onChange={(e) => setUrlVal(e.target.value)}
            />
          )}
          <input
            className="okr-textarea is-compact"
            placeholder={labels.titlePlaceholder}
            aria-label={labels.titleLabel}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {type === 'text' && (
            <textarea
              className="okr-textarea"
              placeholder={labels.textPlaceholder}
              aria-label={labels.typeText}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          )}
          {type === 'text' && maxTextLength && labels.textCounter && (
            <p
              className={textTooLong ? 'okr-status-badge is-error' : 'okr-wz-tip'}
              data-testid="okr-context-text-counter"
              data-over={textTooLong ? 'true' : 'false'}
            >
              {labels.textCounter
                .replace('{{count}}', textLength.toLocaleString('en-US'))
                .replace('{{max}}', maxTextLength.toLocaleString('en-US'))}
            </p>
          )}
          {error && (
            <div role="alert" className="okr-ctx-alert">
              {error}
            </div>
          )}
          <div className="okr-ctx-composer-actions">
            <button type="button" className="okr-btn is-outline is-sm" onClick={reset}>
              {labels.cancel}
            </button>
            <button
              type="button"
              className="okr-btn is-brand is-sm"
              data-testid="okr-context-submit"
              onClick={submit}
              disabled={busy}
            >
              {busy ? labels.saving : labels[SUBMIT_LABEL_KEY[type]] || labels.add}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** `OKR 설정 시작` — 인라인 푸터와 스티키 바가 같은 목적지로 쓴다. */
function StartOkrButton({ labels, onClick, disabled, testId, btnRef, small = false }) {
  return (
    <Tooltip content={disabled ? labels.startOkrAdminOnly : undefined}>
      <button
        ref={btnRef}
        type="button"
        className={`okr-btn is-brand${small ? ' is-sm' : ''}`}
        data-testid={testId}
        onClick={onClick}
        disabled={disabled}
      >
        {labels.startOkr}
        {small && <ArrowRightGlyph size={14} />}
      </button>
    </Tooltip>
  );
}

/**
 * 인라인 푸터 (§3-2A · PW-46) — 디자이너 창 푸터 모양(.okr-wz-footer-hint + .okr-btn.is-brand).
 * 등록 상태 안내와 [OKR 설정 시작] 하나. AI 분석 버튼은 분석 절에 하나만 둔다(PW-2219).
 *
 * `OKR 설정 시작` 은 소스 추출 상태와 무관하게 **항상 활성** 이다 — 추출을 기다리느라
 * 퍼널이 막히면 안 된다.
 *
 * `startBtnRef` 는 하단 스티키 CTA 가 **이 푸터의 시작 버튼**이 화면에 보이는지 관측하는
 * 데 쓴다(같은 버튼이 동시에 둘 보이지 않게 — `useOnScreen`).
 */
function NextStepFooter({ sources, labels, onStartOkr, startBtnRef }) {
  const ready = countBy(sources, 'ready');
  const processing = countBy(sources, 'processing');
  const allFailed = ready === 0 && processing === 0;
  const fill = (key, count) => (labels[key] || '').replace('{{count}}', String(count));
  const desc = allFailed
    ? labels.nextStepFailedDesc
    : ready === 0
      ? labels.nextStepProcessingDesc
      : processing > 0
        ? fill('nextStepPartialDesc', processing)
        : labels.nextStepDesc;

  return (
    <div className="okr-ctx-page-foot" data-testid="okr-context-next-step" data-failed={allFailed ? 'true' : 'false'}>
      <span className="okr-wz-footer-hint">
        {allFailed ? (
          <span className="okr-status-badge is-error">{labels.nextStepFailedTitle}</span>
        ) : (
          fill('nextStepTitle', sources.length)
        )}{' '}
        {desc}
      </span>
      <StartOkrButton
        labels={labels}
        onClick={onStartOkr}
        testId="okr-context-next-step-start"
        btnRef={startBtnRef}
      />
    </div>
  );
}

/**
 * 「AI 분석 (선택)」 절(§3-3) — 디자이너 컨텍스트 창의 AI 분석 절(.okr-wz-vision) 그대로.
 * 분석 대상은 다 읽은(ready) 소스뿐이다. 결과 카드는 설정 창과 같은 부품을 쓴다.
 */
function AnalysisSection({
  sources,
  labels,
  readOnly,
  analysis,
  analyzing,
  analyzeFailed,
  onAnalyze,
  onConfirm,
  confirming,
  notice,
}) {
  const ready = countBy(sources, 'ready');
  const processing = countBy(sources, 'processing');
  const canRun = !readOnly && !!onAnalyze && ready > 0 && !analyzing;
  const fill = (key, count) => (labels[key] || '').replace('{{count}}', String(count));
  const hint = readOnly
    ? labels.analysisAdminOnly
    : ready === 0
      ? processing > 0
        ? labels.analyzeProcessingHint
        : labels.analysisNeedSource
      : undefined;

  return (
    <div id="okr-context-analysis" className="okr-wz-vision" data-testid="okr-context-analysis">
      <div className="okr-wz-vision-head">
        <div className="okr-wz-section">
          <p className="okr-wz-vision-title">{labels.analysisTitle}</p>
          <p className="okr-wz-desc">
            {labels.analysisDesc}
            {processing > 0 && ready > 0 && ` ${fill('analysisExcluded', processing)}`}
          </p>
        </div>
        <Tooltip content={canRun || analyzing ? undefined : hint}>
          <button
            type="button"
            className="okr-wz-ai-btn"
            data-testid="okr-context-analysis-run"
            onClick={canRun ? onAnalyze : undefined}
            disabled={!canRun}
          >
            <AiMark size={12} color="currentColor" />
            {analysis ? labels.analysisRerun : labels.analysisRun}
          </button>
        </Tooltip>
      </div>
      {notice}

      {analyzing && (
        <div className="okr-wz-vision-card" data-testid="okr-context-analysis-running">
          <p className="okr-wz-desc">{fill('analysisRunning', ready)}</p>
        </div>
      )}

      {analyzeFailed && !analyzing && (
        <div role="alert" className="okr-ctx-alert is-row">
          {labels.analysisFailed}
          {canRun && (
            <button
              type="button"
              className="okr-btn is-brand is-sm"
              data-testid="okr-context-analysis-retry"
              onClick={onAnalyze}
            >
              {labels.analysisRetry}
            </button>
          )}
        </div>
      )}

      {analysis && !analyzing && (
        <div className="okr-wz-vision-card">
          <OkrContextAnalysisResult
            analysis={analysis}
            readOnly={readOnly}
            onConfirm={onConfirm}
            confirming={confirming}
            labels={labels.analysisResult}
          />
        </div>
      )}

      {!analysis && !analyzing && !analyzeFailed && (
        <div className="okr-wz-vision-card" data-testid="okr-context-analysis-idle">
          <p className="okr-wz-tip">
            {sources.length === 0
              ? labels.analysisEmpty
              : ready === 0 && processing > 0
                ? labels.analysisIdleProcessing
                : labels.analysisIdle}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * 요소가 지금 화면(뷰포트) 안에 있는지 관측한다.
 *
 * 초기값과 폴백은 **false(=안 보임)** 다. 모르는 동안에는 전역 앵커를 살려 두는 쪽이
 * 안전하다 — 반대로 두면 IntersectionObserver 가 없는 환경(구형 브라우저·jsdom·SSR)에서
 * 다음 퍼널로 나가는 버튼이 통째로 사라진다.
 */
function useOnScreen(ref, enabled) {
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = enabled ? ref.current : null;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setOnScreen(false);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => setOnScreen(entries.some((e) => e.isIntersecting)),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);

  return onScreen;
}

/**
 * 하단 스티키 CTA (§6) — 화면 어디에 있든 다음 퍼널로 나갈 수 있는 전역 앵커.
 * 인라인 푸터(문맥 앵커)와 **함께** 둔다. 소스 0건이어도 활성 — 컨텍스트는 선택 사항이다.
 * 디자이너 원본이 없어 지금 모양(흰 바·위 그림자·작은 상태 알약)을 개발 클래스로 옮겨 유지한다.
 *
 * 다만 **동시에 둘 다 보이지는 않는다**(PW-46 피드백). 인라인 푸터의 시작 버튼이 화면에
 * 들어와 있는 동안에는 이 바를 접고, 스크롤로 그 버튼이 화면 밖으로 나가면 다시 편다.
 */
/** 하단 바 「소스 N건」 알약 머리 아이콘 — 지금 모양 유지(PW-2219 전과 같은 선 그림). */
function LibraryIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function StickyFooterCta({ sources, labels, canEdit, onStartOkr, analysisShown, analysisConfirmed }) {
  return (
    <div className="okr-ctx-sticky" data-testid="okr-context-footer">
      <StatusBadge tone={sources.length > 0 ? 'success' : 'neutral'} className="okr-ctx-sticky-pill">
        <LibraryIcon />
        {(labels.footerSourceCount || '').replace('{{count}}', String(sources.length))}
      </StatusBadge>
      {analysisShown && (
        <StatusBadge
          tone={analysisConfirmed ? 'success' : 'neutral'}
          className="okr-ctx-sticky-pill"
          data-testid="okr-context-footer-analysis"
        >
          {analysisConfirmed ? <CheckGlyph size={12} /> : null}
          {analysisConfirmed ? labels.footerAnalysisConfirmed : labels.footerAnalysisNone}
        </StatusBadge>
      )}
      <span className="okr-ctx-sticky-hint">
        {sources.length === 0
          ? labels.footerHintEmpty
          : !analysisShown
            ? labels.footerHintSources
            : analysisConfirmed
              ? labels.footerHintConfirmed
              : labels.footerHintUnconfirmed}
      </span>
      <StartOkrButton
        labels={labels}
        onClick={onStartOkr}
        disabled={!canEdit}
        testId="okr-context-footer-start"
        small
      />
    </div>
  );
}

/** 운영 단위 카드 사이 화살표(›) — 디자이너 범위 카드를 «단계 사슬»로 잇는 표시만. */
function ChainChevron() {
  return (
    <span className="okr-ctx-levels-chev" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </span>
  );
}

/**
 * «OKR 운영 단위» 칸 (정책 §3-1A · PW-1364) — 정본 시안 `okr-app.jsx` 의 `UnitPolicySection`.
 * 생김새는 디자이너 마법사 «범위 고르기» 카드(.okr-wz-scopes / .okr-wz-scope, 최소 단위만 .is-active).
 *
 * 전사는 늘 운영(고정)이고, 그 아래 라벨을 «최소 운영 단위»까지 **사전 순서로 이어서** 운영한다
 * (okr-policy §2B.2 규칙 2 — 중간 건너뛰기는 표현 자체가 없다: 값은 `minUnitLevelId` 하나다).
 * 개인 OKR 은 따로 켜고 끈다. 같은 값은 어드민 조직단위 설정의 라벨 관리 창에서도 바꾼다
 * (§2B.2 규칙 3 — 편집하는 곳이 둘이다).
 */
function UnitPolicySection({ policy, loading, error, readOnly, onChange, labels: L }) {
  const levels = policy?.levels ?? [];
  const minId =
    policy && levels.some((l) => l.id === policy.minUnitLevelId)
      ? policy.minUnitLevelId
      : levels[levels.length - 1]?.id ?? null;
  const minIndex = levels.findIndex((l) => l.id === minId);
  const editable = !readOnly && !!onChange && !!policy;
  const individualOn = policy?.individualOkr ?? true;

  return (
    <div className="okr-wz-stepblock" data-testid="okr-unit-policy">
      <div className="okr-wz-section">
        <div className="okr-ctx-head-left">
          <p className="okr-wz-question">{L.unitTitle}</p>
          {L.unitDerived && <span className="okr-ctx-optional">{L.unitDerived}</span>}
        </div>
        <p className="okr-wz-desc">{L.unitDescription}</p>
      </div>

      {error ? (
        <div role="alert" className="okr-ctx-alert" data-testid="okr-unit-policy-error">
          {error}
        </div>
      ) : loading || !policy ? (
        <p className="okr-wz-desc">{L.loading}</p>
      ) : (
        <>
          <div className="okr-wz-scopes">
            <div className="okr-wz-scope" data-testid="okr-unit-chip-company" data-operated="true">
              <div className="okr-wz-scope-label">{L.unitCompany}</div>
              <div className="okr-wz-scope-desc">{L.unitCompanyFixed}</div>
            </div>
            {levels.map((lv, i) => {
              const operated = i <= minIndex;
              const isMin = lv.id === minId;
              const hint = (L.unitLevelHint || '{{name}}').replace('{{name}}', lv.name);
              const pick = editable && !isMin ? () => onChange({ ...policy, minUnitLevelId: lv.id }) : null;
              return [
                <ChainChevron key={`${lv.id}-chev`} />,
                <Tooltip key={lv.id} content={hint} wrap={false}>
                <div
                  className={`okr-wz-scope${isMin ? ' is-active' : ''}`}
                  data-testid={`okr-unit-chip-${lv.id}`}
                  data-operated={operated ? 'true' : 'false'}
                  {...(pick
                    ? {
                        role: 'button',
                        tabIndex: 0,
                        onClick: pick,
                        onKeyDown: (e) => {
                          if (isEnterKey(e) || e.key === ' ') {
                            e.preventDefault();
                            pick();
                          }
                        },
                      }
                    : {})}
                >
                  <div className="okr-wz-scope-label">{lv.name}</div>
                  <div className="okr-wz-scope-desc">
                    {lv.count ?? 0}
                    {isMin && (
                      <>
                        {' · '}
                        <span data-testid="okr-unit-min-badge">{L.unitMinBadge}</span>
                      </>
                    )}
                    {/* 디자이너 범위 카드엔 «꺼짐» 모양이 없다 — 운영 밖 단위는 글로 알린다(PW-2219, 옛 회색 칩의 정보) */}
                    {!operated && L.unitNotOperated && (
                      <>
                        {' · '}
                        <span data-testid="okr-unit-not-operated">{L.unitNotOperated}</span>
                      </>
                    )}
                  </div>
                </div>
                </Tooltip>,
              ];
            })}
          </div>

          <div className="okr-ctx-switch-row">
            <Switch
              checked={individualOn}
              disabled={!editable}
              label={L.individualToggle}
              data-testid="okr-unit-individual-switch"
              onChange={(next) => onChange?.({ ...policy, individualOkr: next })}
            />
            <div className="okr-wz-section">
              <p className="okr-wz-scope-desc">{individualOn ? L.individualOn : L.individualOff}</p>
              <p className="okr-wz-tip">{individualOn ? L.individualOnDesc : L.individualOffDesc}</p>
            </div>
          </div>
        </>
      )}
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
  analysis,
  analyzing = false,
  analyzeFailed = false,
  onConfirmAnalysis,
  confirmingAnalysis = false,
  analysisNotice = null,
  processingDelayed = false,
  onRefresh,
  maxFileSize,
  maxTextLength,
  loadFailed = false,
  unitPolicy,
  unitPolicyLoading = false,
  unitPolicyError = null,
  onUnitPolicyChange,
  headerAction = null,
}) {
  const hasEditHandlers = !!(onAddUrl || onAddText || onAddFile);
  // 권한은 호스트가 말해 주는 게 정본이다. `canEdit` 미지정은 구버전 호출부 호환.
  const editable = canEdit === undefined ? hasEditHandlers : canEdit;
  const readOnly = !editable;
  const L = labels;

  // 문맥 앵커의 시작 버튼이 화면에 있는 동안에는 전역 앵커(하단 바)를 접는다 — 감추지 않으면
  // 같은 버튼이 나란히 두 번 보인다(PW-46 피드백).
  const nextStepBtnRef = useRef(null);
  const showNextStep = !readOnly && !loading && sources.length > 0 && !!onStartOkr;
  const nextStepOnScreen = useOnScreen(nextStepBtnRef, showNextStep);
  const showUnitPolicy = unitPolicy !== undefined || unitPolicyLoading || !!unitPolicyError;
  const analysisShown = analysis !== undefined || !!onAnalyze;

  return (
    <div data-testid="okr-context-setup">
      <div className="okr-ctx-page">
        <div className="okr-ctx-page-body">
          {/* 머리 — 디자이너 컨텍스트 창 머리(.okr-ctx-head): 큰 제목 + 「관리자 전용」 + 「선택 사항」 */}
          <div className="okr-ctx-head">
            <div className="okr-ctx-head-left">
              <h2 className="tl-group-modal-title">{L.title}</h2>
              {L.adminOnly && <StatusBadge className="okr-ctx-admin-badge">{L.adminOnly}</StatusBadge>}
              {L.optional && <span className="okr-ctx-optional">{L.optional}</span>}
            </div>
            {headerAction}
          </div>

          <div className="okr-wz-stepblock">
            <div className="okr-ctx-intro">
              {L.description && <p className="okr-ctx-intro-desc">{L.description}</p>}
              {L.descriptionNote && <p className="okr-ctx-intro-note">{L.descriptionNote}</p>}
            </div>
            {/* 열람 전용 안내 — 막지 않는 안내라 경고 노랑이 아니라 연회색(.okr-wz-vision-card) + 자물쇠 선 아이콘 */}
            {readOnly && (
              <div className="okr-wz-vision-card okr-ctx-readonly" data-testid="okr-context-readonly">
                <LockGlyph size={16} />
                <p className="okr-ctx-intro-desc">{L.readOnlyNotice}</p>
              </div>
            )}
          </div>

          {/* OKR 운영 단위(§3-1A) */}
          {showUnitPolicy && (
            <UnitPolicySection
              policy={unitPolicy}
              loading={unitPolicyLoading}
              error={unitPolicyError}
              readOnly={readOnly}
              onChange={onUnitPolicyChange}
              labels={L}
            />
          )}

          {/* 지식 소스 — 디자이너 창의 「지식 소스」 절 */}
          <div className="okr-wz-stepblock" data-testid="okr-context-sources">
            <div className="okr-wz-section">
              <div className="okr-ctx-head-left">
                <p className="okr-wz-question">{L.sourcesTitle}</p>
                <span className="okr-wz-desc">
                  {(L.sourceCount || '{{count}}').replace('{{count}}', String(sources.length))}
                </span>
              </div>
              {L.sourcesDesc && <p className="okr-wz-desc">{L.sourcesDesc}</p>}
            </div>

            {error && (
              <div role="alert" className="okr-ctx-alert">
                {error}
              </div>
            )}

            {loading ? (
              // 목록 줄 자리에 막대를 깐다(§4 「초기 로딩」) — 다 불러온 뒤 자리가 튀지 않게 줄 높이와 맞춘다.
              <SkeletonList count={3} height={58} aria-label={L.loading} data-testid="okr-context-loading" />
            ) : sources.length === 0 && loadFailed ? null : sources.length === 0 ? (
              <div className="okr-wz-vision-card" data-testid="okr-context-empty">
                <p className="okr-wz-tip">{L.empty}</p>
                {L.emptyHint && <p className="okr-wz-tip">{L.emptyHint}</p>}
              </div>
            ) : (
              <div className="okr-ctx-source-list">
                {sources.map((s) => (
                  <SourceRow
                    key={s.id}
                    source={s}
                    labels={L}
                    onRemove={onRemove}
                    delayed={processingDelayed}
                    onRefresh={onRefresh}
                  />
                ))}
              </div>
            )}

            {!readOnly && (
              <SourceAdder
                labels={L}
                busy={busy}
                onAddUrl={onAddUrl}
                onAddText={onAddText}
                onAddFile={onAddFile}
                maxFileSize={maxFileSize}
                maxTextLength={maxTextLength}
              />
            )}
          </div>

          {analysisShown && !loading && (
            <AnalysisSection
              sources={sources}
              labels={L}
              readOnly={readOnly}
              analysis={analysis || null}
              analyzing={analyzing}
              analyzeFailed={analyzeFailed}
              onAnalyze={onAnalyze}
              onConfirm={onConfirmAnalysis}
              confirming={confirmingAnalysis}
              notice={analysisNotice}
            />
          )}
        </div>

        {/* 문맥 앵커 — 소스가 1건이라도 있고 편집 권한이 있을 때만(§3-2A) */}
        {showNextStep && (
          <NextStepFooter
            sources={sources}
            labels={L}
            onStartOkr={onStartOkr}
            startBtnRef={nextStepBtnRef}
          />
        )}
      </div>

      {/*
        전역 앵커 — 소스 0건이어도, 인라인 푸터가 없는 열람자에게도 남는다(§6).
        인라인 푸터의 시작 버튼이 화면에 보이는 동안만 접는다 — 같은 버튼이 나란히 두 번 보이지
        않게(PW-46 피드백). 열람자는 비활성 + 툴팁.
      */}
      {onStartOkr && !nextStepOnScreen && (
        <StickyFooterCta
          sources={sources}
          labels={L}
          canEdit={editable}
          onStartOkr={onStartOkr}
          analysisShown={analysisShown}
          analysisConfirmed={analysis?.status === 'confirmed'}
        />
      )}
    </div>
  );
}
