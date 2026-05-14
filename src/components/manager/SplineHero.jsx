import { Component, useCallback, useEffect, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';

/**
 * `<Spline>` 격리용 Error Boundary.
 * WebGL 컨텍스트 생성 실패(브라우저 한도 초과 ~16개, GPU 비활성, headless 등) 시
 * Spline 내부에서 throw 되면 부모 React 트리 전체가 언마운트된다. iframe 시절엔
 * 에러가 iframe 안에 격리됐지만 이제 부모 문서에 직접 렌더되므로 boundary 필수.
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
 * 초기 구현은 카드마다 `<iframe src="spline-manager.html">` 였다. iframe 은 각자
 * `@splinetool/runtime` (~2MB) 을 import 하는데, sandbox iframe 은 opaque origin 이라
 * JS 파싱·V8 code cache 가 iframe 경계를 못 넘는다 → 화면에 보이는 카드 수만큼
 * 2MB 를 중복 파싱 + WebGL 컨텍스트 N개. 매우 느렸다.
 *
 * → `@splinetool/react-spline` 의 `<Spline>` 컴포넌트로 교체. 런타임이 번들에 1회
 * 포함·1회 파싱되고, 모든 카드가 그 모듈을 공유한다. iframe·postMessage·blur 클릭
 * 핵이 전부 사라진다 (canvas 가 부모 문서에 있으므로 클릭이 정상 버블).
 *
 * ── 뷰포트 lazy mount ──
 * 그래도 WebGL 컨텍스트는 카드당 1개라, 카드가 뷰포트 근처(rootMargin 400px) 에
 * 들어왔을 때만 `<Spline>` 을 mount 한다. 한 번 mount 되면 언마운트하지 않는다.
 *
 * ── intro ──
 * scene 로드 + 텍스처 교체가 끝나면 index 기반 stagger(0.2초 간격) 후 'start' 이벤트를
 * emit 해서 인트로를 재생. 그 시점에 opacity 0 → 1 fade-in.
 */
const INTRO_DELAY_STEP = 200;
const MOUNT_ROOT_MARGIN = '400px';

/**
 * Spline scene 의 'profileImage' 오브젝트 텍스처 레이어를 멤버 아바타로 교체.
 * 조직도 ProfileModal / 기존 spline-manager.html 과 동일 패턴.
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
  const [mounted, setMounted] = useState(false); // <Spline> 을 실제로 렌더할지
  const [started, setStarted] = useState(false); // 인트로 발사 시점 = fade-in 시작
  const [failed, setFailed] = useState(false); // WebGL 실패 — 헥사를 빈 채로 둔다

  // 뷰포트 lazy mount — 카드가 rootMargin 안에 들어오면 <Spline> 을 mount.
  // 한 번 mount 되면 observer 를 끊고 다시는 언마운트하지 않는다.
  useEffect(() => {
    if (mounted) return;
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const nearViewport =
      rect.top < window.innerHeight + 400 &&
      rect.bottom > -400 &&
      rect.left < window.innerWidth &&
      rect.right > 0;
    if (nearViewport) {
      setMounted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            setMounted(true);
            break;
          }
        }
      },
      { rootMargin: MOUNT_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  // scene 로드 완료 → 텍스처 교체 → index stagger 후 인트로 재생.
  const handleLoad = useCallback(async (app) => {
    resetIntro(app);
    if (image) {
      await applyTexture(app, 'profileImage', image);
      await applyTexture(app, 'profileImage-2', image);
    }
    resetIntro(app);
    const delay = index * INTRO_DELAY_STEP;
    setTimeout(() => {
      playIntro(app);
      setStarted(true);
      onStart?.();
    }, delay);
  }, [image, index, onStart]);

  return (
    <div ref={containerRef} className="manager-spline-area">
      {!started && !failed && (
        <div className="manager-spline-spinner" aria-hidden="true">
          <div className="manager-spline-spinner-circle" />
        </div>
      )}
      {mounted && !failed && (
        <SplineBoundary onFail={() => setFailed(true)}>
          <Spline
            scene={scene}
            onLoad={handleLoad}
            className={`manager-spline-canvas ${started ? 'is-ready' : ''}`}
          />
        </SplineBoundary>
      )}
    </div>
  );
}
