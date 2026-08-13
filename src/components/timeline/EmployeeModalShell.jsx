import ModalShell from '../shared/ModalShell.jsx';

/**
 * EmployeeModalShell — 내부/외부 직원 추가 모달의 공통 쉘.
 * Figma "add_inside_people_modal" / "add_outside_poeple_modal".
 *
 * 껍데기 자체는 `shared/ModalShell` 로 올라갔다(매니저 화면도 같은 걸 쓴다).
 * 여기는 **직원 추가 모달의 고정값**만 얹는 얇은 래퍼다 — 520x920 변형 클래스와
 * '취소'/'추가'/'닫기' 문구. 렌더 결과 DOM 은 승격 전과 동일해야 한다.
 */
export default function EmployeeModalShell({
  title,
  description,
  canSubmit,
  onClose,
  onSubmit,
  children,
}) {
  return (
    <ModalShell
      title={title}
      description={description}
      titleId="tl-emp-modal-title"
      submitLabel="추가"
      cancelLabel="취소"
      closeLabel="닫기"
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={onSubmit}
      className="tl-emp-modal"
      contentClassName="tl-emp-modal-content"
      bodyClassName="tl-emp-modal-body"
    >
      {children}
    </ModalShell>
  );
}
