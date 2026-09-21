import { useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * OkrFeedbackComposeModal — 피드백 작성/피드백 요청 작성 공용 모달.
 * 제목·placeholder·확인 버튼 라벨만 다르다 (작성=완료, 요청=보내기).
 *
 * 껍데기는 공용 창 틀(ModalShell · PW-836) — 막·Esc·닫기 X·취소/확인 줄을 틀이 그린다.
 * 닫기 X 를 틀이 그리므로 `icons`·`baseUrl` 은 더 쓰지 않는다(넘겨도 무시된다).
 */
export default function OkrFeedbackComposeModal({ title, placeholder, submitLabel, onClose, onSubmit }) {
  const [text, setText] = useState('');

  return (
    <ModalShell
      title={title}
      titleId="okr-fb-compose-title"
      closeLabel="취소"
      cancelLabel="취소"
      submitLabel={submitLabel}
      canSubmit
      onClose={onClose}
      onSubmit={() => { if (onSubmit) onSubmit(text); onClose(); }}
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
