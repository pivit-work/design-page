/**
 * 구성원 목록 창 — 조직 스냅숏에서 인원 카드(재직 인원·조직별 등)를 누르면 뜬다 (PW-760).
 *
 * [PW-2043] 따로 만든 작은 창(제목 15px)이던 것을 공용 창 틀(`ModalShell` + `adm-shell`, 제목 30px)로
 * 옮겼다. 읽기만 하는 창이라 아래 버튼 줄은 없다. 모양은 디자이너가 그린 것을 값 그대로 따른다:
 *   인원 «N명»      — 매니저 팀 요약 «구성원» 딱지(`.adm-count-chip`)
 *   사람 줄         — 매니저 지정 창의 사람 줄(`.ons-candidate`) 회색 카드 + 40px 사진 원
 *   상태 딱지       — 매니저 팀 요약 점수 딱지(`.mgr-ts-score`) 색: 재직 초록, 수습·휴직 노랑, 퇴사 회색
 *   겸직            — 초록 딱지(`.adm-count-chip`)
 * 이름표가 같이 붙은 머리(제목 + 인원 딱지)는 틀의 제목 줄이 아니라 본문 맨 위에 직접 그린다 —
 * 틀의 제목을 쓰면 창 이름(aria)에 «N명»까지 섞인다. 창 이름은 `ariaLabel` 로 제목만 준다.
 *
 * 막·Esc·바깥 누르기는 공용 창 바탕(`ModalLayer`, 틀이 씀)이 맡는다(PW-1013). 이 위에 띄우는
 * 프로필 창도 같은 바탕이라 나중에 연 쪽이 위에 뜨고 Esc 는 위의 것부터 닫는다.
 *
 * Props
 *   title, countLabel, closeLabel, emptyLabel
 *   members   [{ key, name, sub, status, statusLabel, clickable, tag }]
 *             status: active · probation · on_leave · terminated · pending (색만 정한다)
 *             tag: 이름 옆 작은 딱지 글자(예: 조직 스냅샷 노드의 «겸직» — org-snapshot-spec §1). 없으면 안 그린다
 *   renderAvatar(member)  아바타 자리 — 사진·이니셜 규칙은 앱이 갖는다
 *   onMemberClick(member) clickable 인 행을 누르면
 *   onClose
 *   overlayTestId  막의 data-testid
 */
import StatusBadge from '../../shared/StatusBadge.jsx';
import ModalShell from '../../shared/ModalShell.jsx';

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
  overlayTestId,
}) {
  return (
    <ModalShell
      ariaLabel={title}
      closeLabel={closeLabel}
      onClose={onClose}
      className="adm-shell admin-kit-members"
      bodyClassName="admin-kit-members-frame"
      footer={null}
      testId={testId}
      overlayTestId={overlayTestId}
    >
      <div className="admin-kit-members-head">
        <h2 className="tl-group-modal-title admin-kit-members-title">{title}</h2>
        {countLabel && <StatusBadge className="adm-count-chip admin-kit-members-count">{countLabel}</StatusBadge>}
      </div>
      {members.length === 0 ? (
        <div className="admin-kit-members-empty">{emptyLabel}</div>
      ) : (
        <div className="admin-kit-members-body">
          {members.map((m) => (
            <button
              key={m.key}
              type="button"
              className="admin-kit-members-row"
              disabled={!m.clickable}
              onClick={m.clickable ? () => onMemberClick?.(m) : undefined}
            >
              {renderAvatar?.(m)}
              <span className="admin-kit-members-text">
                <span className="admin-kit-members-name">
                  <span className="admin-kit-members-name-text">{m.name}</span>
                  {m.tag && <StatusBadge className="adm-count-chip admin-kit-members-tag">{m.tag}</StatusBadge>}
                </span>
                <span className="admin-kit-members-sub">{m.sub}</span>
              </span>
              <StatusBadge className={`admin-kit-members-status is-${m.status || 'active'}`}>{m.statusLabel}</StatusBadge>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}
