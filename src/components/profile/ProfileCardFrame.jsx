import ModalLayer from '../shared/ModalLayer.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';

/**
 * 프로필 창의 틀 — 막 · 스크롤 칸 · 1297 폭 카드 · 오른쪽 위 닫기 X (Figma 17873:33194).
 *
 * 카드는 왼쪽 `aside`(머리 칸 410) 와 오른쪽 `children`(탭 칸) 을 나란히 놓는다. 카드 높이는 브라우저 높이를 따르고
 * (위아래 71 을 뺀 만큼), 내용이 길면 오른쪽 탭 칸 안에서 내린다 — 세그먼트 탭 줄은 위에 붙어 있다. 막·Esc·바깥 누르기·body 포털은
 * 공용 창 바탕(`ModalLayer`)이 갖는다(PW-1013). 닫혀 있어도 그려 둔다(keepMounted) — 닫힘 애니메이션 동안
 * 마지막 사람의 내용이 보여야 한다.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} [closeLabel]  닫기 X 의 화면 읽기 이름
 * @param {React.Ref} [scrollRef]  내용이 내리는 오른쪽 칸 — 새 사람으로 열릴 때 맨 위로 올리려는 쪽이 쓴다
 * @param {React.ReactNode} aside  왼쪽 머리 칸
 * @param {string} [className]  카드에 덧붙일 클래스
 */
export default function ProfileCardFrame({ open, onClose, closeLabel = '닫기', scrollRef, aside, children, className = '', testId = 'profile-card' }) {
  return (
    <ModalLayer open={open} keepMounted onClose={() => onClose?.()}>
      <div className="profile-card-wrap" onClick={onClose}>
        <div className={`profile-card ${className}`.trim()} onClick={(e) => e.stopPropagation()} data-testid={testId}>
          <button type="button" className="profile-close" onClick={onClose} aria-label={closeLabel} data-testid="profile-close">
            <CloseGlyph size={20} strokeWidth={2.4} />
          </button>
          {aside}
          <div className="profile-main" ref={scrollRef}>{children}</div>
        </div>
      </div>
    </ModalLayer>
  );
}
