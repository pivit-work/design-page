import { useEffect, useLayoutEffect, useState } from 'react';
import ModalLayer from '../shared/ModalLayer.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';

/** 큰 사진 한 변 — Figma 17876:34282 (585). 화면이 작으면 양옆·위아래 40 을 남기고 줄인다. */
const VIEW_SIZE = 585;
const VIEW_GUTTER = 40;
/** 작은 사진의 모서리(프로필 창 머리 130 · 모서리 46) — 날아가는 동안 이 둥글기에서 네모로 풀린다 */
const ORIGIN_RADIUS = 46;

/** 지금 창 크기에서 큰 사진이 설 자리 — 가운데 정사각. 창이 바뀌면 다시 잰다. */
function measureBox() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const size = Math.max(1, Math.min(VIEW_SIZE, vw - VIEW_GUTTER * 2, vh - VIEW_GUTTER * 2));
  return { size, left: Math.round((vw - size) / 2), top: Math.round((vh - size) / 2) };
}

/**
 * 사진 크게 보기 (Figma 17876:34463 «photo view») — 어두운 막(bg-overlay 50%) 위에 585 정사각 사진, 오른쪽 위 흰 X.
 *
 * 프로필 창의 작은 사진(130 · 모서리 46)이 그 자리에서 화면 가운데로 옮겨 가며 585 로 커진다(FLIP). 닫을 때는 거꾸로
 * 돌아간 뒤 사라진다. 창 크기가 바뀌면 큰 사진도 다시 가운데로 가고, 돌아갈 자리도 그때의 작은 사진 자리다.
 * 막·Esc·바깥 누르기는 공용 창 바탕(ModalLayer)이 갖는다 — 나중에 연 층이라 Esc 는 이 창을 먼저 닫는다.
 *
 * @param {string} photo  사진 주소
 * @param {() => DOMRect|null} getOrigin  작은 사진의 지금 화면 좌표 — 여기서 출발하고 여기로 돌아간다
 * @param {() => void} onClose  돌아가는 움직임이 끝난 뒤 불린다
 * @param {string} [closeLabel]
 */
export default function ProfilePhotoViewer({ photo, getOrigin, onClose, closeLabel = '닫기' }) {
  // 'from' — 작은 사진 자리 · 'to' — 가운데 · 'back' — 다시 작은 자리로(끝나면 onClose)
  const [phase, setPhase] = useState('from');
  const [box, setBox] = useState(measureBox);
  // 출발·귀환 자리 — 열 때 한 번, 돌아갈 때 다시 잰다(창 크기가 바뀌었을 수 있다)
  const [origin, setOrigin] = useState(() => getOrigin?.() || null);

  // 첫 그리기는 작은 자리에, 다음 프레임에 가운데로 — 그래야 transition 이 움직임이 된다.
  useLayoutEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setPhase('to')); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, []);

  // 창 크기가 바뀌면 가운데 자리를 다시 잰다.
  useEffect(() => {
    const onResize = () => setBox(measureBox());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const close = () => {
    setPhase((p) => {
      if (p === 'back') return p;
      setOrigin(getOrigin?.() || null);
      return 'back';
    });
  };
  const onTransitionEnd = (e) => {
    if (e.propertyName === 'transform' && phase === 'back') onClose?.();
  };

  // 돌아갈 자리를 못 재면(작은 사진이 사라졌으면) 제자리에서 줄어들며 사라진다.
  const o = origin || { left: box.left + box.size / 2, top: box.top + box.size / 2, width: 1 };
  const scale = o.width / box.size;
  const atOrigin = phase !== 'to';
  const style = {
    left: box.left,
    top: box.top,
    width: box.size,
    height: box.size,
    transform: atOrigin ? `translate(${o.left - box.left}px, ${o.top - box.top}px) scale(${scale})` : 'none',
    borderRadius: atOrigin ? ORIGIN_RADIUS / scale : 0,
  };

  return (
    <ModalLayer onClose={close} className={`profile-photo-viewer ${phase === 'back' ? 'is-leaving' : ''}`.trim()} testId="profile-photo-viewer">
      <button type="button" className="profile-photo-viewer-close" onClick={close} aria-label={closeLabel} data-testid="profile-photo-viewer-close">
        <CloseGlyph size={24} strokeWidth={2} />
      </button>
      <img
        className="profile-photo-viewer-img"
        src={photo}
        alt=""
        draggable={false}
        style={style}
        onTransitionEnd={onTransitionEnd}
        onClick={(e) => e.stopPropagation()}
        data-phase={phase}
      />
    </ModalLayer>
  );
}
