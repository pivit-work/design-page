import { useEffect, useRef, useState } from 'react';
import ModalShell from '../shared/ModalShell.jsx';

/**
 * GroupAddModal — 간트 그룹 추가 모달.
 * Figma "group add modal" (node 16713:37970): panel 520x428, radius 16.
 *   - Top bar (pad 20/48): 닫기 X 버튼
 *   - Content (pad 0/48/0/48, gap 48 vertical):
 *       header: "그룹 추가" title + description (gap 8)
 *       field: "그룹명" label + "AI가 자동 생성 해줘요." hint + input (gap 12)
 *   - Footer (pad 24/48/24/48, gap 12 horizontal): 취소 / 추가 (각 206px)
 *
 * 공용 창 틀(`ModalShell`)로 그린다(PW-1013) — 막·Esc·닫기 동작이 다른 창과 같다.
 * 예전엔 같은 틀을 이 파일이 한 벌 더 복사해 들고 있었다.
 */
export default function GroupAddModal({ onClose, onSubmit }) {
  const [groupName, setGroupName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSubmit = groupName.trim().length > 0;

  return (
    <ModalShell
      title="그룹 추가"
      description="간트 차트에서 보여질 새 그룹명을 만들어 주세요."
      titleId="tl-group-modal-title"
      submitLabel="추가"
      cancelLabel="취소"
      closeLabel="닫기"
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={() => onSubmit(groupName.trim())}
    >
      <div className="tl-group-modal-field">
        <label htmlFor="tl-group-name" className="tl-group-modal-label">그룹명</label>
        <input
          ref={inputRef}
          id="tl-group-name"
          type="text"
          className="tl-group-modal-input"
          placeholder="그룹명을 입력해 주세요."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
      </div>
    </ModalShell>
  );
}
