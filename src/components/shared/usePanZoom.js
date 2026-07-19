import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * usePanZoom — 캔버스 팬/줌 공용 훅 (OrgChartCanvas 에서 추출).
 *
 * 휠 스크롤로 마우스 위치 기준 줌, 드래그로 패닝, zoomIn/zoomOut 은
 * 캔버스 중심 기준 줌. `ignoreSelector` 에 매칭되는 요소에서 시작한
 * 드래그는 패닝하지 않는다(카드 클릭·자체 드래그 요소 보호).
 *
 * canvasRef 를 캔버스 컨테이너에, canvasProps 를 같은 요소에 스프레드하고
 * scale/translate 로 inner 요소를 transform 한다.
 */
export default function usePanZoom({ ignoreSelector, minScale = 0.2, maxScale = 3 } = {}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const applyView = useCallback((nextScale, nextTranslate) => {
    scaleRef.current = nextScale;
    translateRef.current = nextTranslate;
    setScale(nextScale);
    setTranslate(nextTranslate);
  }, []);

  // 앵커 포인트(캔버스 좌표) 기준으로 배율 변경 — 앵커 아래 콘텐츠가 고정된다.
  const zoomAt = useCallback((anchorX, anchorY, nextScaleRaw) => {
    const prevScale = scaleRef.current;
    const nextScale = Math.min(Math.max(minScale, nextScaleRaw), maxScale);
    const ratio = nextScale / prevScale;
    const prevT = translateRef.current;
    applyView(nextScale, {
      x: anchorX - ratio * (anchorX - prevT.x),
      y: anchorY - ratio * (anchorY - prevT.y),
    });
  }, [applyView, minScale, maxScale]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, scaleRef.current - e.deltaY * 0.002);
  }, [zoomAt]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e) => {
    if (ignoreSelector && e.target.closest(ignoreSelector)) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translateRef.current };
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const t = {
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    };
    translateRef.current = t;
    setTranslate(t);
  };
  const onMouseUp = () => setIsDragging(false);

  const zoomByStep = useCallback((delta) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, scaleRef.current + delta);
  }, [zoomAt]);

  const zoomIn = useCallback(() => zoomByStep(0.1), [zoomByStep]);
  const zoomOut = useCallback(() => zoomByStep(-0.1), [zoomByStep]);
  const resetView = useCallback(() => applyView(1, { x: 0, y: 0 }), [applyView]);

  return {
    canvasRef,
    scale,
    translate,
    isDragging,
    canvasProps: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp },
    zoomIn,
    zoomOut,
    resetView,
    // 초기 카메라 정렬 등에서 소비 측이 배율/이동을 직접 지정할 때 사용.
    setView: applyView,
  };
}
