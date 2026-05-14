import { Component, useCallback, useEffect, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';

/**
 * `<Spline>` 격리용 Error Boundary.
 * WebGL 컨텍스트 생성 실패(브라우저 한도 초과, GPU 비활성, headless 등) 시 Spline
 * 내부에서 throw 되면 부모 React 트리 전체가 언마운트된다. iframe 시절엔 에러가
 * iframe 안에 격리됐지만 이제 부모 문서에 직접 렌더되므로 boundary 필수.
 * 실패하면 헥사 영역을 빈 채로 두고(상위 spinner 가 계속 보임) 페이지는 정상 유지.
 */
class SplineBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail?.();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/**
 * 멤버 카드 상단 Spline 3D 영역.
 *
 * ── 단일 공유 런타임 ──
 * 카드마다 `<iframe src="spline-manager.html">` 였던 걸 `@splinetool/react-spline` 의
 * `<Spline>` 컴포넌트로 교체. iframe 은 각자 `@splinetool/runtime`(~2MB) 을 import 했고
 * sandbox iframe 의 opaque origin 때문에 JS 파싱·V8 code cache 가 공유되지 않아 카드
 * 수만큼 2MB 를 중복 파싱했다. `<Spline>` 은 번들에 런타임이 1회 포함·1회 파싱되고
 * 모든 카드가 공유한다.
 *
 * ── 고정 700 stage + scale ──
 * Spline scene(L6vcVdzQjJgBWFGD) 은 700×700 정사각 뷰포트 기준으로 디자인됐다.
 * react-spline 은 자기 컨테이너를 측정해 캔버스 크기를 잡는데, `.manager-spline-area`
 * 의 aspect-ratio 가 레이아웃 확정 후에야 계산되므로 mount 시점에 잘못된 크기를
 * 측정해 헥사가 찌그러진다. → iframe 시절처럼 `<Spline>` 을 **고정 700×700 stage** 에
 * 넣어 react-spline 이 항상 안정적인 700 을 측정하게 하고, stage 전체를 JS 로 계산한
 * scale 로 줄여 `.manager-spline-area` 에 맞춘다.
 *
 * ── 뷰포트 가상화 (mount/unmount) ──
 * WebGL 컨텍스트는 브라우저당 동시 ~16개로 제한된다. 카드가 24+ 개일 때 mount 한
 * `<Spline>` 을 계속 유지하면 컨텍스트가 고갈돼 깨진다. 카드가 뷰포트(rootMargin
 * 400px) 를 벗어나면 `<Spline>` 을 언마운트해 컨텍스트를 반납하고 재진입 시 재마운트.
 *
 * ── intro ──
 * scene 로드 + 텍스처 교체가 끝나면 'start' 이벤트를 emit 해서 인트로를 재생한다.
 * 카드는 스크롤에 따라 하나씩 들어오므로 자연스럽게 stagger 되고, 초기 fold 동시
 * 진입분만 index 기반으로 살짝(최대 6장) 어긋나게 한다.
 */
const SCENE_VIEWPORT = 700;
const INTRO_DELAY_STEP = 120;
const INTRO_STAGGER_CAP = 6;
const MOUNT_ROOT_MARGIN = '400px';

/**
 * Spline scene 의 'profileImage' 오브젝트 텍스처 레이어를 멤버 아바타로 교체.
 * 조직도 ProfileModal 과 동일 패턴.
 */
function applyTexture(app, objectName, imageSrc) {
  return new Promise((resolve) => {
    const obj = app.findObjectByName(objectName);
    if (!obj) { resolve(); return; }
    const layers = obj.material?.layers;
    if (!layers) { resolve(); return; }
    const texLayer = [...Array(layers.length)]
      .map((_, i) => layers[i])
      .find((l) => l.type === 'texture');
    if (!texLayer) { resolve(); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      try {
        texLayer.updateTexture(img);
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        texLayer.updateTexture(c.toDataURL('image/png'));
        const tex = texLayer.texture;
        tex.image = img;
        texLayer.texture = tex;
      } catch (e) { /* texture swap 실패 — baked 텍스처 유지 */ }
      resolve();
    };
    img.onerror = () => resolve();
  });
}

function resetIntro(app) {
  try { app.emitEventReverse('start', 'Group'); } catch (e) { /* no-op */ }
}

function playIntro(app) {
  try { app.emitEvent('start', 'Group'); } catch (e) { /* no-op */ }
}

export default function SplineHero({ scene, image, index = 0, onStart }) {
  const containerRef = useRef(null);
  // inView: 카드가 뷰포트(rootMargin 400px) 안에 있는지. true → <Spline> 마운트.
  const [inView, setInView] = useState(false);
  const [started, setStarted] = useState(false); // 인트로 발사 시점 = fade-in 시작
  const [failed, setFailed] = useState(false); // WebGL 실패 — 헥사를 빈 채로
  const [size, setSize] = useState({ w: 0, h: 0 }); // .manager-spline-area 측정값

  // 컨테이너 크기 측정 → 700 stage 의 scale 계산.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 뷰포트 가상화 — 들어오면 마운트, 벗어나면 언마운트(WebGL 컨텍스트 반납).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
          if (!entry.isIntersecting) {
            // 뷰포트를 벗어나면 다음 재마운트를 위해 상태 리셋.
            setStarted(false);
            setFailed(false);
          }
        }
      },
      { rootMargin: MOUNT_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // scene 로드 완료 → 텍스처 교체 → 인트로 재생.
  const handleLoad = useCallback(async (app) => {
    resetIntro(app);
    if (image) {
      await applyTexture(app, 'profileImage', image);
      await applyTexture(app, 'profileImage-2', image);
    }
    resetIntro(app);
    const delay = Math.min(index, INTRO_STAGGER_CAP) * INTRO_DELAY_STEP;
    setTimeout(() => {
      playIntro(app);
      setStarted(true);
      onStart?.();
    }, delay);
  }, [image, index, onStart]);

  // 700 stage 를 area 의 큰 변에 맞춘다 (iframe 시절 scale 계산과 동일).
  const scale = Math.max(size.w, size.h) / SCENE_VIEWPORT;

  return (
    <div ref={containerRef} className="manager-spline-area">
      {!started && !failed && (
        <div className="manager-spline-spinner" aria-hidden="true">
          <div className="manager-spline-spinner-circle" />
        </div>
      )}
      {inView && !failed && scale > 0 && (
        <div
          className="manager-spline-stage"
          style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          <SplineBoundary onFail={() => setFailed(true)}>
            <Spline
              scene={scene}
              onLoad={handleLoad}
              className={`manager-spline-canvas ${started ? 'is-ready' : ''}`}
            />
          </SplineBoundary>
        </div>
      )}
    </div>
  );
}
