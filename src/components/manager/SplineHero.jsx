import { useEffect, useRef, useState } from 'react';

/**
 * 멤버 카드 상단 Spline 3D 영역.
 *
 * iframe + `public/spline-manager.html` 패턴. 자동 'start' 는 reset 으로 막아두고,
 * 부모로부터 'play-intro' 메시지를 받아야만 인트로 재생.
 *
 * ── 뷰포트 lazy mount ──
 * 큰 팀(수십 명) 에서 모든 카드의 Spline iframe 을 한 번에 로드하면 GPU/네트워크가
 * 포화돼 첫 페인트가 매우 느리다. 그래서 iframe `src` 는 카드가 뷰포트 근처(rootMargin
 * 400px) 에 들어왔을 때만 mount 한다. 한 번 mount 되면 다시 언마운트하지 않는다
 * (스크롤로 벗어났다 돌아올 때 재로딩 방지).
 *
 * 페이지 진입 시 viewport 안에 있는 카드는 자기 `index` 에 따라 0.2초 간격으로
 * 인트로를 재생한다. viewport 밖 카드는 mount 후 spline-ready 시점에 인트로를 재생한다.
 *
 * spline 인트로 애니메이션이 시작되는 그 시점에 opacity 0 → 1 (0.3s) fade-in 시작.
 * 그 이전(scene 로드 / 텍스처 적용 / 대기) 동안에는 계속 opacity 0 유지.
 */
const SCENE_VIEWPORT = 700;
const X_OFFSET_RATIO = 0.1;
const INTRO_DELAY_STEP = 200;
// 카드가 뷰포트에 들어오기 이 거리 전부터 iframe 을 미리 mount (스크롤 시 매끄럽게).
const MOUNT_ROOT_MARGIN = '400px';

export default function SplineHero({ scene, image, baseUrl = '', index = 0, onClick, onStart }) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [mounted, setMounted] = useState(false); // iframe src 를 실제로 박을지 여부
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

  // 뷰포트 lazy mount — 카드가 rootMargin 안에 들어오면 iframe src 를 박는다.
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
    if (!mounted || !ready || started) return;
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
      // 카드가 viewport 에 충분히 들어와서 (10% 이상) iframe RAF throttle 가
      // 풀린 뒤에 play-intro 를 보낸다. 너무 일찍 보내면 RAF 가 멈춘 상태라 시작
      // 프레임에 그대로 멈춰버린다. requestAnimationFrame 한 틱 더 기다려 RAF
      // 활성화를 확실히 한 뒤 발사.
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0) {
              observer.disconnect();
              observer = null;
              requestAnimationFrame(() => fire(false));
              break;
            }
          }
        },
        { threshold: [0, 0.1] },
      );
      observer.observe(el);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [mounted, ready, started, index, onStart]);

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
      {mounted && (
        <iframe
          ref={iframeRef}
          className={`manager-spline-iframe ${started && scale > 0 ? 'is-ready' : ''}`}
          src={src}
          sandbox="allow-scripts"
          loading="lazy"
          title="Spline 3D"
          style={{
            width: SCENE_VIEWPORT,
            height: SCENE_VIEWPORT,
            transform: `translate(calc(-50% + ${offsetX}px), -50%) scale(${scale})`,
          }}
        />
      )}
    </div>
  );
}
