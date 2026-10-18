import { useEffect, useState } from 'react';
import RecordingPlayerRow from '../components/shared/RecordingPlayerRow.jsx';

/**
 * 데모용 녹음 재생기 — 회의록 상세(Figma 17693:23137)·1on1 상세(17693:23149) 모달이 같이 쓴다.
 *
 * 실제 소리는 없다. 시안의 「11:00 / 33:00 · 녹음 보관 30일」 에서 시작해, ▶ 를 누르면 1초에
 * 1초씩 진행률만 올린다. pivit-work 는 같은 `RecordingPlayerRow` 에 `<audio>` 와 실제 재생
 * 상태를 넣어 만든다 — 모양은 `className="is-flat"` 이 정한다.
 */
const TOTAL_SEC = 33 * 60;
const LABELS = { play: '재생', pause: '일시정지', seek: '재생 위치' };
const fmtClock = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function DemoRecordingPlayer({ testIdPrefix = 'demo-recording', retentionText = '녹음 보관 30일' }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(11 * 60);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setElapsed((v) => {
        if (v + 1 >= TOTAL_SEC) { setPlaying(false); return TOTAL_SEC; }
        return v + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <RecordingPlayerRow
      className="is-flat"
      playing={playing}
      onToggle={() => setPlaying((v) => !v)}
      progress={elapsed / TOTAL_SEC}
      onSeek={(ratio) => setElapsed(Math.round(ratio * TOTAL_SEC))}
      timeText={`${fmtClock(elapsed)} / ${fmtClock(TOTAL_SEC)}`}
      retentionText={retentionText}
      labels={LABELS}
      testIdPrefix={testIdPrefix}
    />
  );
}
