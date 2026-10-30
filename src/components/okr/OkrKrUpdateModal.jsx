import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import FormField from '../shared/FormField.jsx';
import TextArea from '../shared/TextArea.jsx';
import Button from '../shared/Button.jsx';
import LoadingState from '../shared/LoadingState.jsx';
import { ModalDescription, NoteText, NoticeCard } from '../shared/SharedText.jsx';
import { BellIcon, ChevronIcon } from './okrIcons.jsx';
import { KR_UPDATE_DEFAULT_LABELS } from './okrKrUpdateLabels.js';


/** 기획서의 코멘트 상한(okr-policy §4.1.2). 앱은 서버와 같은 값을 `detail.commentMaxLength` 로 넘긴다. */
const DEFAULT_COMMENT_MAX = 500;

/**
 * OkrKrUpdateModal — Key Result 달성률 업데이트 모달.
 *
 * detail: { title, krLabel('KR #1-1'), method('개수 달성'), unit('개'),
 *   total, currentValue, aiValue?, aiMeta?('신뢰도 88% · 오늘 9:12') }
 * AI 초안 카드는 aiValue 가 있을 때만 렌더한다(집계 데이터가 없으면 숨김).
 * 입력값 초기치는 currentValue → aiValue 순으로 채우고, 달성률(%)은
 * 입력값/목표로 자동 계산된다. 호스트가 detail.progressFor(값) 를 넘기면 그 값을
 * 그대로 보인다(PW-1063 — 저장 뒤 서버가 매길 달성률과 창 안 미리보기를 맞추려고.
 * 완료형·목표 0·음수에서 단순 나눗셈과 서버 값이 달랐다).
 *
 * detail.extra(선택) — 소비처가 그린 칸을 입력 줄 아래에 그대로 놓는다(PW-1220 · 앱의
 * «연결된 스니핏» 칸). 이 창은 그 칸의 저장에 관여하지 않는다 — [확정]은 달성률만 저장한다.
 * 없으면 아무것도 그리지 않으므로 기존 소비처는 그대로다.
 *
 * 근거 코멘트·이력·매니저 알림 안내 (PW-1868 · okr-spec §3.1A.1):
 * - 코멘트 칸은 늘 있다(선택). [확정]은 `onConfirm(value, { comment })` 로 코멘트를 함께 넘긴다
 *   (앞뒤 공백을 걷은 값 — 비었으면 빈 문자열).
 * - detail.notifyManagerName 이 있으면 «저장 시 @이름에게 알림» 안내를 보인다. 누구에게 보일지는
 *   소비처가 정한다(서버가 알림을 보내는 조건과 같아야 해서다).
 * - detail.loadHistory() 가 있으면 창을 열 때 한 번 부른다 → `{ total, items }`. items 는 최신순으로
 *   이미 글자로 만든 줄(`{ id, head, comment }`)이다. 0건이면 이력 줄을 그리지 않고, 실패하면
 *   «없음»이 아니라 불러오지 못했다고 보인다.
 * - 문구는 detail.labels 로 바꿔 끼운다(KR_UPDATE_DEFAULT_LABELS).
 * - 이력 줄은 KR 드릴다운 줄 모양(`manager.css` 의 `.mgr-krd-*`)을 쓴다 — 소비처가 그 CSS 를 싣는다.
 *
 * 🔴 확정은 **onConfirm 이 끝나기를 기다린 뒤에만 닫는다.** 예전에는 부르자마자
 * 닫았는데, 저장이 거절돼도(권한 없음·서버 오류) 창이 그대로 사라져서 아무 말도 없이
 * 「저장된 것처럼」 보였다 — 소비처가 실패를 알려 줄 자리조차 없었다. onConfirm 이
 * 거부(reject)하면 창을 열어 둔 채로 두어 입력값을 잃지 않게 한다. 실패 사유를 사람에게
 * 보이는 것은 소비처 몫이다(앱은 토스트를 쓴다).
 */
export default function OkrKrUpdateModal({ detail, icons, baseUrl = '', onClose, onConfirm }) {
  const [value, setValue] = useState(detail.currentValue ?? detail.aiValue ?? '');
  const [saving, setSaving] = useState(false);
  const [comment, setComment] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  // { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready', total, items } — 부를 함수가 없으면 null.
  const [history, setHistory] = useState(() => (detail.loadHistory ? { kind: 'loading' } : null));
  const L = { ...KR_UPDATE_DEFAULT_LABELS, ...(detail.labels ?? {}) };
  const commentMax = detail.commentMaxLength ?? DEFAULT_COMMENT_MAX;
  const loadHistory = detail.loadHistory;

  useEffect(() => {
    if (!loadHistory) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => loadHistory())
      .then((res) => {
        if (!cancelled) setHistory({ kind: 'ready', total: res?.total ?? 0, items: res?.items ?? [] });
      })
      .catch(() => {
        if (!cancelled) setHistory({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  const numeric = Number(value) || 0;
  const percent = typeof detail.progressFor === 'function'
    ? detail.progressFor(numeric)
    : Math.min(Math.round((numeric / detail.total) * 100), 100);

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onConfirm?.(numeric, { comment: comment.trim() });
      onClose();
    } catch {
      // 실패했으면 닫지 않는다 — 입력값을 남겨 다시 누를 수 있게 한다.
      setSaving(false);
    }
  };

  // 껍데기는 공용 창 틀(ModalShell · PW-836). 저장 중에는 busy 로 Esc·막 클릭·닫기 X·취소를
  // 모두 막는다 — 닫아 버리면 저장이 끝났는지 모르는 채로 입력값만 사라진다.
  return (
    <ModalShell
      title={detail.title}
      description={(
        <span className="okr-kru-sub">
          <span>{L.subtitle(detail.krLabel)}</span>
          <span className="okr-kru-method">{detail.method}</span>
        </span>
      )}
      titleId="okr-kru-title"
      closeLabel={L.close}
      cancelLabel={L.cancel}
      submitLabel={L.submit}
      canSubmit
      busy={saving}
      onClose={onClose}
      onSubmit={confirm}
      zIndex={1000}
      className="okr-shell"
      bodyClassName="okr-shell-body"
    >
      {detail.aiValue != null && (
        <div className="okr-kru-ai">
          <div className="okr-kru-ai-head">
            <div className="okr-kru-ai-label">
              <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
              <span>{L.aiDraft}</span>
            </div>
            <span>{detail.aiMeta}</span>
          </div>
          <div className="okr-kru-ai-result">
            <p className="okr-kru-ai-caption">{L.aiCaption}</p>
            <p className="okr-kru-ai-value">{detail.aiValue}/{detail.total}{detail.unit}</p>
          </div>
          <button type="button" className="okr-kru-apply" onClick={() => setValue(detail.aiValue)}>{L.apply}</button>
        </div>
      )}

      <div className="okr-kru-input-row">
        <input
          className="okr-kru-input"
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <span className="okr-kru-total">/ {detail.total}</span>
        <span className="okr-kru-percent">{percent}%</span>
      </div>

      <FormField
        label={L.comment}
        labelExtra={<NoteText as="span">{L.commentCount(comment.length, commentMax)}</NoteText>}
      >
        <TextArea
          value={comment}
          maxLength={commentMax}
          rows={3}
          placeholder={L.commentPlaceholder}
          onChange={(e) => setComment(e.target.value.slice(0, commentMax))}
          data-testid="okr-kru-comment"
        />
      </FormField>

      {detail.extra ?? null}

      {detail.notifyManagerName ? (
        <NoticeCard data-testid="okr-kru-notify">
          {/* 창 본문 설명 글씨(14/20 2단계) — 12px 흐린 글씨는 연두 바탕에서 잘 안 읽혔다 */}
          <ModalDescription>
            <BellIcon size={14} /> {L.notifyManager(detail.notifyManagerName)}
          </ModalDescription>
        </NoticeCard>
      ) : null}

      {history?.kind === 'loading' && <LoadingState size="inline">{L.historyLoading}</LoadingState>}
      {history?.kind === 'failed' && <NoteText data-testid="okr-kru-history-failed">{L.historyFailed}</NoteText>}
      {history?.kind === 'ready' && history.total > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((o) => !o)}
            data-testid="okr-kru-history-toggle"
          >
            <ChevronIcon open={historyOpen} /> {L.historyToggle(history.total, historyOpen)}
          </Button>
          {historyOpen && (
            <div className="mgr-krd-list" data-testid="okr-kru-history">
              {history.items.map((h) => (
                <div key={h.id} className="mgr-krd-snippet">
                  <p className="mgr-krd-date">{h.head}</p>
                  {h.comment ? <p className="mgr-krd-text">{h.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
