import { useEffect, useRef, useState } from 'react';

/**
 * 멤버 카드 상단 Spline 3D 영역.
 *
 * iframe + `public/spline-manager.html` 패턴. 자동 'start' 는 reset 으로 막아두고,
 * 부모로부터 'play-intro' 메시지를 받아야만 인트로 재생.
 *
 * 페이지 진입 시 viewport 안에 있는 카드는 자기 `index` 에 따라 0.2초 간격으로
 * 인트로를 재생한다. viewport 밖 카드는 IntersectionObserver 로 스크롤 진입을
 * 기다렸다가 진입 시점에 인트로를 재생한다 (브라우저가 off-screen iframe 의 RAF 를
 * throttle 하므로, 사전에 play 를 쏘면 시작 프레임에 멈춰 보이는 문제 회피).
 *
 * spline 인트로 애니메이션이 시작되는 그 시점에 opacity 0 → 1 (0.3s) fade-in 시작.
 * 그 이전(scene 로드 / 텍스처 적용 / 대기) 동안에는 계속 opacity 0 유지.
 */
const SCENE_VIEWPORT = 700;
const X_OFFSET_RATIO = 0.1;
const INTRO_DELAY_STEP = 200;

export default function SplineHero({ scene, image, baseUrl = '', index = 0, onClick, onStart }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false); // 인트로(또는 snap) 발사 시점 = fade-in 시작
  const [size, setSize] = useState({ w: 0, h: 0 });

  // 컨테이너 사이즈 측정 → scale 계산.
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // iframe 의 spline-ready 메시지 (자기 iframe 출처만).
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type !== 'spline-ready') return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      setReady(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // spline iframe click 감지 — cross-origin iframe 안 click 은 부모로 전파되지 않지만,
  // 클릭 시 iframe 이 focus 를 가져가면서 부모 window 의 blur 가 발생한다.
  // 그 시점에 activeElement 가 자기 iframe 이면 모달 오픈을 트리거한다.
  useEffect(() => {
    if (!onClick) return;
    const handler = () => {
      // blur 이후 microtask 에서 activeElement 확인.
      setTimeout(() => {
        if (document.activeElement === iframeRef.current) {
          onClick();
          window.focus(); // 부모 focus 복귀 (다음 클릭도 감지되도록)
        }
      }, 0);
    };
    window.addEventListener('blur', handler);
    return () => window.removeEventListener('blur', handler);
  }, [onClick]);

  // ready 후 인트로 발사. 카드가 viewport 에 들어와 있을 때만 play 메시지를 보낸다
  // (off-screen iframe 은 브라우저가 RAF 를 throttle 해서 시작 프레임에 멈추기 때문).
  useEffect(() => {
    if (!ready || started) return;
    const el = containerRef.current;
    const win = iframeRef.current?.contentWindow;
    if (!el || !win) return;

    let timer = null;
    let observer = null;

    const fire = (inViewportOnFire) => {
      const delay = inViewportOnFire ? index * INTRO_DELAY_STEP : 0;
      timer = setTimeout(() => {
        win.postMessage({ type: 'play-intro' }, '*');
        setStarted(true);
        onStart?.();
      }, delay);
    };

    const rect = el.getBoundingClientRect();
    const inViewportNow =
      rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;

    if (inViewportNow) {
      fire(true);
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              observer.disconnect();
              observer = null;
              fire(false);
              break;
            }
          }
        },
        { rootMargin: '100px' },
      );
      observer.observe(el);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [ready, started, index, onStart]);

  const params = new URLSearchParams();
  params.set('scene', scene);
  if (image) params.set('img', image);
  const src = `${baseUrl}spline-manager.html?${params.toString()}`;

  const scale = Math.max(size.w, size.h) / SCENE_VIEWPORT;
  // 비율 기반 보정 후 추가 미세 조정 (좌측 -10px).
  const offsetX = size.w * X_OFFSET_RATIO - 10;

  return (
    <div ref={containerRef} className="manager-spline-area">
      {!started && (
        <div className="manager-spline-spinner" aria-hidden="true">
          <div className="manager-spline-spinner-circle" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        className={`manager-spline-iframe ${started && scale > 0 ? 'is-ready' : ''}`}
        src={src}
        sandbox="allow-scripts"
        title="Spline 3D"
        style={{
          width: SCENE_VIEWPORT,
          height: SCENE_VIEWPORT,
          transform: `translate(calc(-50% + ${offsetX}px), -50%) scale(${scale})`,
        }}
      />
    </div>
  );
}
