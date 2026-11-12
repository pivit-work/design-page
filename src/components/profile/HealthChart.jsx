import { useLayoutEffect, useRef, useState } from 'react';

/**
 * 헬스 트렌드 꺾은선 (SVG · Figma 17873:34076).
 * y축 0~10, x축 dates, 선 + 점 + 팀 평균 점선.
 *
 * 그림 좌표계(viewBox)는 칸의 실제 폭을 따른다 — 예전 432 창의 336 고정값을 855 폭 칸에 늘려 그리면
 * 글자·점이 가로로 찌그러진다. 칸 폭을 재서 그 값으로 그리고, 폭이 바뀌면 다시 잰다.
 */
export default function HealthChart({ points, teamAverage, dates, teamAverageLabel = '팀 평균' }) {
  const wrapRef = useRef(null);
  const [W, setW] = useState(855);
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => { const w = Math.round(el.clientWidth); if (w > 0) setW(w); };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 150;
  const PAD_LEFT = 24;
  const PAD_RIGHT = 12;
  const Y_MAX = 10;

  const xFor = (i, n) =>
    PAD_LEFT + ((W - PAD_LEFT - PAD_RIGHT) / Math.max(1, n - 1)) * i;
  const yFor = (v) => (H - (v / Y_MAX) * H);

  // 값이 없는 주(null)는 0 으로 그리지 않고 비워 두며, 앞뒤 주를 잇지 않는다(기획 §6-5).
  // 바로 앞 주에 값이 있으면 잇고(L), 없으면 새 토막을 연다(M).
  const linePath = points
    .map((p, i) => {
      if (p.value == null) return '';
      const joined = i > 0 && points[i - 1].value != null;
      return `${joined ? 'L' : 'M'} ${xFor(i, points.length)} ${yFor(p.value)}`;
    })
    .filter(Boolean)
    .join(' ');
  const teamY = teamAverage != null ? yFor(teamAverage) : null;

  return (
    <div className="profile-chart" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible' }} /* 맨 위 «10» 글자가 그림 위쪽 경계에 잘리지 않게 */
      >
        {[10, 8, 6, 4, 2, 0].map((v) => (
          <g key={v}>
            <text x={0} y={yFor(v) + 4} fontSize="12" fill="var(--text-tertiary)">{v}</text>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT / 2}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--border-secondary-alt, #e6e8ea)"
              strokeWidth="1"
            />
          </g>
        ))}
        {teamY != null && (
          <line
            x1={PAD_LEFT}
            x2={W - PAD_RIGHT / 2}
            y1={teamY}
            y2={teamY}
            stroke="var(--text-tertiary)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}
        {linePath && (
          <path d={linePath} stroke="var(--utility-purple-500)" strokeWidth="2" fill="none" />
        )}
        {points.map((p, i) => p.value == null ? null : (
          <circle
            key={i}
            cx={xFor(i, points.length)}
            cy={yFor(p.value)}
            r="4"
            fill="var(--utility-purple-500)"
          />
        ))}
      </svg>
      <div
        className="profile-chart-x-labels"
        style={{ paddingLeft: PAD_LEFT, paddingRight: PAD_RIGHT }}
      >
        {dates.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      {teamAverage != null && (
        <div className="profile-chart-legend">
          <span className="profile-chart-legend-line" />
          <span>{teamAverageLabel} {teamAverage}</span>
        </div>
      )}
    </div>
  );
}
