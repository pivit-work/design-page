import { createPortal } from 'react-dom';

/**
 * CellPicker — 타임라인 빈 셀(본인 행) 클릭 시 뜨는 액션 피커.
 * pivit-specs timeline-feed-view CellPicker 포팅: 클릭 좌표에 뜨는 186px 메뉴.
 *   시간 라벨 + "데일리 스니핏 작성" + "이벤트 추가" + Google Calendar 연동 상태.
 */
const fmtHour = (h) => {
  if (h == null) return '';
  if (h === 0) return '자정';
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return '정오';
  return `오후 ${h - 12}시`;
};

export default function CellPicker({
  pos,
  hour,
  date,
  gcalConnected = false,
  onSnippet,
  onEvent,
  onClose,
}) {
  // 화면 오른쪽/아래 넘침 방지 — 메뉴 크기만큼 clamp.
  const left = Math.min(pos.x, window.innerWidth - 198);
  const top = Math.min(pos.y, window.innerHeight - 220);
  const dateLabel = typeof date === 'string' ? date.slice(5) : '';

  return createPortal(
    <div className="tl-cell-picker-overlay" onClick={onClose}>
      <div
        className="tl-cell-picker"
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label="셀 액션 선택"
      >
        <div className="tl-cell-picker-time">
          {dateLabel} {fmtHour(hour)}
        </div>

        <button
          type="button"
          className="tl-cell-picker-item"
          role="menuitem"
          onClick={() => {
            onClose();
            onSnippet?.();
          }}
        >
          <span className="tl-cell-picker-ico tl-cell-picker-ico--snip">📝</span>
          <span className="tl-cell-picker-body">
            <span className="tl-cell-picker-title">데일리 스니핏 작성</span>
            <span className="tl-cell-picker-sub">오늘 한 일 · 헬스체크 · 태그</span>
          </span>
        </button>

        <div className="tl-cell-picker-divider" />

        <button
          type="button"
          className="tl-cell-picker-item"
          role="menuitem"
          onClick={() => {
            onClose();
            onEvent?.();
          }}
        >
          <span className="tl-cell-picker-ico tl-cell-picker-ico--event">📅</span>
          <span className="tl-cell-picker-body">
            <span className="tl-cell-picker-title">이벤트 추가</span>
            <span className="tl-cell-picker-sub">회의 · 집중 작업 · 리뷰 · 외부 미팅</span>
          </span>
        </button>

        <div className="tl-cell-picker-divider" />

        <div className="tl-cell-picker-gcal">
          <span className="tl-cell-picker-gcal-ico">📅</span>
          <span className="tl-cell-picker-gcal-body">
            <span className="tl-cell-picker-gcal-title">
              Google Calendar
              <span className={`tl-cell-picker-gcal-dot ${gcalConnected ? 'is-on' : 'is-off'}`} />
              <span className="tl-cell-picker-gcal-state">
                {gcalConnected ? '연동' : '미연동'}
              </span>
            </span>
            <span className="tl-cell-picker-gcal-sub">
              캘린더 일정이 타임라인에 자동 반영됩니다
            </span>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
