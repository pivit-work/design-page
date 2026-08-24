import { useEffect, useRef } from 'react';

/**
 * useMicWave — 마이크 스펙트럼 → 이퀄라이저 막대 높이 실시간 반영 훅.
 *
 * waveRef 컨테이너의 자식 <span> 들의 style.height 를 rAF 로 직접 갱신한다
 * (60fps 리렌더 회피). 마이크 연결에 성공하면 컨테이너에 is-live 클래스를
 * 붙여 소비처 CSS 가 정적/데모 스타일을 끌 수 있게 한다. 권한 거부/미지원
 * 시엔 아무것도 하지 않는다 (정적 패턴 유지).
 *
 * 소비처: 1on1 녹음 위젯(OneOnOneRecordingWidget), 마이크 권한 모달
 * (MicPermissionModal), 회의 진행 중 모달(MeetingInProgressModal).
 *
 * opts:
 *   - enabled  : false 면 측정하지 않는다 (스트림도 열지 않음)
 *   - paused   : true 면 마지막 높이로 동결 (스트림은 유지)
 *   - barCount : 막대 수 (기본 6)
 *   - minPx    : 무음일 때 막대 최소 높이 (기본 3)
 *   - maxPx    : 트랙 높이 = 최대 막대 높이 (기본 20)
 */

// 무음 게이트 — 이 값(0~1) 미만의 밴드 에너지는 배경 소음으로 보고 0 처리해,
// 말하지 않는 동안 막대가 미세하게 떨리지 않고 최소 높이로 정지하게 한다.
const NOISE_GATE = 0.5;
// 게이트 위 구간의 √ 커브 게인 — 크면 발화 즉시 전 막대가 최대에 붙는다.
const GAIN = 1.1;

export default function useMicWave(waveRef, { enabled, paused = false, barCount = 6, minPx = 3, maxPx = 20 }) {
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let raf;
    let audioCtx;
    let stream;
    navigator.mediaDevices?.getUserMedia?.({ audio: true })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        audioCtx = new (window.AudioContext ?? window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        // 낮으면 프레임마다 잘게 떨려 예민해 보인다 — 0.85 로 움직임을 눌러준다.
        analyser.smoothingTimeConstant = 0.85;
        audioCtx.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        waveRef.current?.classList.add('is-live');
        // 목소리 에너지는 대부분 1kHz 이하 저역에 몰린다 — 스펙트럼을 균등
        // 분할하면 첫 막대만 반응하고 나머지는 빈 고역을 본다. 음성 대역
        // (bin 1 ~ 40 ≈ 0.2–7.5kHz)을 로그 간격으로 나눠 모든 막대가
        // 목소리에 반응하게 한다.
        const END_BIN = Math.min(40, data.length);
        const edges = Array.from({ length: barCount + 1 }, (_, i) =>
          Math.round(Math.pow(END_BIN, i / barCount)));
        const tick = () => {
          raf = requestAnimationFrame(tick);
          if (pausedRef.current) return; // 일시정지: 마지막 높이로 동결
          analyser.getByteFrequencyData(data);
          const spans = waveRef.current?.children;
          if (!spans) return;
          for (let i = 0; i < barCount && i < spans.length; i++) {
            const lo = edges[i];
            const hi = Math.max(lo + 1, edges[i + 1]);
            let sum = 0;
            for (let j = lo; j < hi; j++) sum += data[j];
            let v = sum / (hi - lo) / 255;
            // 게이트 아래(무음/배경 소음)는 0 으로 눌러 정지시키고, 그 위는
            // √ 커브 + 게인으로 데시벨 대비 체감 높이를 끌어올린다.
            v = v < NOISE_GATE
              ? 0
              : Math.min(1, Math.sqrt((v - NOISE_GATE) / (1 - NOISE_GATE)) * GAIN);
            spans[i].style.height = `${(minPx + v * (maxPx - minPx)).toFixed(1)}px`;
          }
        };
        tick();
      })
      .catch(() => {}); // 권한 거부/미지원 — 정적 패턴 유지
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      waveRef.current?.classList.remove('is-live');
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
    };
  }, [enabled, waveRef, barCount, minPx, maxPx]);
}
