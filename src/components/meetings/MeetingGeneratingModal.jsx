import { useEffect } from 'react';
import ConfirmModal from '../shared/ConfirmModal.jsx';

/**
 * MeetingGeneratingModal — 회의 종료 직후 뜨는 "회의록 생성 중" 안내 다이얼로그.
 *
 * Figma node-id=16920-37316. 타이틀 + 소요시간 안내 + 확인 버튼.
 * 답을 받지 않는 «안내»라 공용 확인 창을 취소 버튼 없이 쓴다 (PW-836).
 * 확인·막 클릭·Esc 모두 onConfirm 이다(종전 그대로).
 * 모든 라벨은 caller 주입. 내부 fallback 없음. (`baseUrl` 은 예전 아이콘 자리라 받기만 한다.)
 */
export default function MeetingGeneratingModal({ labels, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onConfirm?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConfirm]);

  return (
    <ConfirmModal
      title={labels.title}
      body={labels.desc}
      confirmLabel={labels.confirm}
      hideCancel
      onConfirm={onConfirm}
      onCancel={onConfirm}
      testId="mtg-generating-modal"
      confirmTestId="mtg-generating-confirm"
    />
  );
}
