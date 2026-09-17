/**
 * 구성원 목록 창 — 조직 스냅숏에서 인원 카드(재직 인원·조직별 등)를 누르면 뜬다 (PW-760).
 *
 * 확인·취소 입력 창 틀(`.admin-modal`)과 달리 아래 버튼 줄이 없고 목록이 본문 전부라
 * 새로 만들었다. 어드민 창 모양(모서리·그림자·헤더 구분선·닫기 버튼)을 따른다.
 *
 * 막은 호출부가 그린다 — 앱은 막을 화면 맨 바깥으로 꺼내야 하고, 프로필 창을 이 위에
 * 겹쳐 올리는 층 순서도 호출부가 쥐고 있다. 카드 안 클릭이 막까지 올라가지 않게 막는다.
 *
 * Props
 *   title, countLabel, closeLabel, emptyLabel
 *   members   [{ key, name, sub, status, statusLabel, clickable }]
 *             status: active · probation · on_leave · terminated · pending (색만 정한다)
 *   renderAvatar(member)  아바타 자리 — 사진·이니셜 규칙은 앱이 갖는다
 *   onMemberClick(member) clickable 인 행을 누르면
 *   onClose
 */
import { IconX } from '../employeesIcons.jsx';

export default function AdminMemberListDialog({
  title,
  countLabel,
  closeLabel,
  emptyLabel,
  members = [],
  renderAvatar,
  onMemberClick,
  onClose,
  testId,
}) {
  return (
    <div
      className="admin-kit-members"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testId}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="admin-kit-members-head">
        <div className="admin-kit-members-headline">
          <span className="admin-kit-members-title">{title}</span>
          {countLabel && <span className="admin-kit-members-count">{countLabel}</span>}
        </div>
        <button type="button" className="admin-modal-close" aria-label={closeLabel} onClick={onClose}>
          <IconX size={18} />
        </button>
      </div>
      <div className={`admin-kit-members-body${members.length ? '' : ' is-empty'}`}>
        {members.length === 0 ? (
          <div className="admin-kit-members-empty">{emptyLabel}</div>
        ) : (
          members.map((m) => (
            <button
              key={m.key}
              type="button"
              className="admin-kit-members-row"
              disabled={!m.clickable}
              onClick={m.clickable ? () => onMemberClick?.(m) : undefined}
            >
              {renderAvatar?.(m)}
              <span className="admin-kit-members-text">
                <span className="admin-kit-members-name">{m.name}</span>
                <span className="admin-kit-members-sub">{m.sub}</span>
              </span>
              <span className={`admin-kit-members-status is-${m.status || 'active'}`}>{m.statusLabel}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
