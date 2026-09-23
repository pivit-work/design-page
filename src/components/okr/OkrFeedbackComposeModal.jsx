import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * OkrFeedbackComposeModal — 피드백 작성/피드백 요청 작성 공용 모달.
 * 제목·placeholder·확인 버튼 라벨만 다르다 (작성=완료, 요청=보내기).
 *
 * 껍데기는 공용 창 틀(ModalShell · PW-836) — 막·Esc·닫기 X·취소/확인 줄을 틀이 그린다.
 * 닫기 X 를 틀이 그리므로 `icons`·`baseUrl` 은 더 쓰지 않는다(넘겨도 무시된다).
 *
 * 🔴 확인은 **onSubmit 이 끝나기를 기다린 뒤에만 닫는다** (PW-966). 예전에는
 * `onSubmit(text); onClose();` 로 부르자마자 닫아서, 서버가 거절해도(권한 없는 KR 등)
 * 쓴 글이 사라지고 보낸 사람은 보낸 줄 알았다. 같은 보드의 KR 달성률 창(PW-823)과 같은
 * 규칙이다 — onSubmit 이 거부(reject)하면 창과 글을 그대로 두고, 사유는 소비처가 알린다.
 */
export default function OkrFeedbackComposeModal({ title, placeholder, submitLabel, onClose, onSubmit }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit?.(text);
      onClose();
    } catch {
      // 실패했으면 닫지 않는다 — 쓴 글을 남겨 다시 누를 수 있게 한다.
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={title}
      titleId="okr-fb-compose-title"
      closeLabel="취소"
      cancelLabel="취소"
      submitLabel={submitLabel}
      canSubmit
      busy={saving}
      onClose={onClose}
      onSubmit={submit}
      zIndex={1000}
      className="okr-shell"
    >
      <textarea
        className="okr-textarea"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </ModalShell>
  );
}
