import { useEffect } from 'react';
import ConfirmModal from '../shared/ConfirmModal.jsx';

/**
 * MeetingEndConfirmModal — 회의 종료 확인 alert.
 *
 * Figma node-id=16708-28310. "회의 종료하기" 타이틀 + desc + 취소/종료 버튼.
 *
 * 공용 확인 창(`ConfirmModal`)으로 그린다 (PW-836). 막을 누르거나 Esc 를 누르면 취소다.
 * pivit-work 의 1on1 미니 위젯·업로드 재시도 가드·1on1 화면도 이 창을 쓰므로 props 는
 * 종전 그대로 받는다 — `labels.close` 는 공용 확인 창에 닫기 X 가 없어 더는 그리지 않는다.
 *
 * labels: { title, descLine1, descLine2?, cancel, confirm, close? }
 */
export default function MeetingEndConfirmModal({ onCancel, onConfirm, labels }) {
  // 공용 확인 창은 Esc 를 호스트에 맡긴다 — 종전처럼 Esc 는 취소다.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <ConfirmModal
      title={labels.title}
      body={
        <>
          {labels.descLine1}
          {labels.descLine2 && (<><br />{labels.descLine2}</>)}
        </>
      }
      cancelLabel={labels.cancel}
      confirmLabel={labels.confirm}
      danger
      onCancel={onCancel}
      onConfirm={onConfirm}
      testId="mtg-end-confirm"
      cancelTestId="mtg-end-confirm-cancel"
      confirmTestId="mtg-end-confirm-confirm"
    />
  );
}
