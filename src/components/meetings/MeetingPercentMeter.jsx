/**
 * MeetingPercentMeter — 이름 + 백분율 + 가는 막대 한 줄.
 *
 * 디자이너가 그린 마이크 선택 창(`MicSelectModal`, stesslee)의 «입력 음량» 줄을 값 그대로 꺼냈다 —
 * 같은 클래스(`mtg-mic-field`·`mtg-mic-volume-*`)를 쓴다. 녹음 파일 올리기 창의 «올리는 중» 진행률에 쓴다
 * (pivit-work PW-2196). 디자이너 검수(design-review) 대상.
 *
 * Props: label(이름) · percent(0~100, 넘치면 자른다) · testId
 */
export default function MeetingPercentMeter({ label, percent = 0, testId }) {
  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  return (
    <div className="mtg-mic-field" data-testid={testId}>
      <div className="mtg-mic-volume-head">
        <span className="mtg-mic-field-label">{label}</span>
        <span className="mtg-mic-volume-pct">{p}%</span>
      </div>
      <div
        className="mtg-mic-volume-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p}
      >
        <div className="mtg-mic-volume-fill" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
