import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import { pointAnchor } from '../shared/anchoredPlacement.js';

/**
 * CellPicker — 타임라인 빈 셀(본인 행) 클릭 시 뜨는 액션 피커.
 * 스타일은 design-page 타임라인 팝오버(FilterMenuPopover) 톤에 맞춘다:
 *   radius 10 · 레이어드 소프트 섀도우 · 14px 타이포 · Icon 컴포넌트(SVG) + 브랜드 그린.
 *   시간 라벨 + "데일리 스니핏 작성" + "이벤트 추가" + Google Calendar 연동 상태.
 */
const fmtHour = (h) => {
  if (h == null) return '';
  if (h === 0) return '자정';
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return '정오';
  return `오후 ${h - 12}시`;
};

/**
 * 화면 문구 기본값(한국어). 소비자가 `labels` 로 덮는다 — 이 패키지는 i18n 을 모른다
 * (pivit-work PW-2216 · 영어 화면에서도 이 메뉴가 한국어로 남았다). 미주입 시 시안 그대로.
 */
const DEFAULT_LABELS = {
  menu: '셀 액션 선택',
  snippetTitle: '데일리 스니핏 작성',
  snippetSub: '오늘 한 일 · 헬스체크 · 태그',
  eventTitle: '이벤트 추가',
  eventSub: '회의 · 집중 작업 · 리뷰 · 외부 미팅',
  gcalConnected: '연동',
  gcalDisconnected: '미연동',
  gcalConnectedSub: '캘린더 일정이 타임라인에 자동 반영됩니다',
};

export default function CellPicker({
  pos,
  hour,
  date,
  gcalConnected = false,
  baseUrl,
  onSnippet,
  onEvent,
  onClose,
  snippetDisabled = false,
  snippetDisabledLabel = '오늘 이후 날짜에는 쓸 수 없습니다',
  // 미연동일 때 「Google Calendar」 줄 설명 (PW-1515 · 기획서 screen-timeline-feed §8.4)
  gcalDisconnectedLabel = '내 설정에서 연동하세요',
  // 메뉴 문구 묶음 — 키는 `DEFAULT_LABELS`. 빠진 키는 기본 한국어 (PW-2216).
  labels,
  // 맨 위 시각 표기(자정·오전 N시·정오·오후 N시) — 소비자가 언어에 맞춰 넘긴다.
  formatHour = fmtHour,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  const dateLabel = typeof date === 'string' ? date.slice(5) : '';

  // 배치는 `AnchoredLayer` 가 클릭 지점을 앵커로 삼아 실측한다 (PW-313).
  // 종전에는 `window.innerHeight - 250` 처럼 **팝오버 높이를 상수로 가정**했는데,
  // Google Calendar 안내가 조건부로 붙어 실제 높이가 흔들린다. 낮은 창에서 아래쪽
  // 셀을 누르면 '이벤트 추가' 가 화면 밖에 남았다.
  //
  // 백드롭과 패널은 **형제**여야 한다. 패널을 백드롭 안에 두면(포털이라도) React
  // 이벤트가 트리를 타고 올라가 백드롭의 onClick 이 함께 불려 바로 닫힌다.
  return (
    <>
      {createPortal(
        <div className="tl-cell-picker-overlay" onClick={onClose} />,
        document.body,
      )}
      <AnchoredLayer
        anchorRect={pointAnchor(pos.x, pos.y)}
        className="tl-cell-picker"
        data-testid="timeline-cell-picker"
        role="menu"
        aria-label={L.menu}
      >
        <div className="tl-cell-picker-time">
          {dateLabel} {formatHour(hour)}
        </div>

        {/* 오늘보다 뒤 날짜 칸이면 스니핏 작성만 끈다 — 누르면 아무 일도 없고 팝업도 닫지 않는다.
            이벤트 추가는 그대로다 (PW-1421 · 기획 타임라인 §7.2-A · pivit-specs timeline-app.jsx CellPicker). */}
        <button
          type="button"
          className="tl-cell-picker-item"
          role="menuitem"
          disabled={snippetDisabled}
          aria-disabled={snippetDisabled || undefined}
          onClick={() => {
            if (snippetDisabled) return;
            onClose();
            // 셀의 날짜를 함께 올린다 — 안 올리면 호스트가 오늘로 연다 (PW-1417).
            onSnippet?.(date, hour);
          }}
        >
          <span className="tl-cell-picker-ico">
            <Icon
              src="/icons-solid/file-06.svg"
              size={18}
              color="var(--colors-foreground-fgBrandPrimary, #2dbd82)"
              baseUrl={baseUrl}
            />
          </span>
          <span className="tl-cell-picker-body">
            <span className="tl-cell-picker-title">{L.snippetTitle}</span>
            <span className="tl-cell-picker-sub">
              {snippetDisabled ? snippetDisabledLabel : L.snippetSub}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="tl-cell-picker-item"
          role="menuitem"
          onClick={() => {
            onClose();
            // 시각뿐 아니라 **셀의 날짜**도 함께 올려 보낸다. 시각만 넘기면 호스트가
            // "오늘" 로 가정할 수밖에 없어, 다른 날을 띄워 놓고 클릭해도 오늘 날짜로
            // 이벤트가 생성된다 (PW-262).
            onEvent?.(hour, date);
          }}
        >
          <span className="tl-cell-picker-ico">
            <Icon
              src="/icons-solid/calendar.svg"
              size={18}
              color="var(--colors-foreground-fgBrandPrimary, #2dbd82)"
              baseUrl={baseUrl}
            />
          </span>
          <span className="tl-cell-picker-body">
            <span className="tl-cell-picker-title">{L.eventTitle}</span>
            <span className="tl-cell-picker-sub">{L.eventSub}</span>
          </span>
        </button>

        <div className="tl-cell-picker-divider" />

        <div className="tl-cell-picker-gcal">
          <Icon
            src="/icons-solid/calendar-check-02.svg"
            size={16}
            color="var(--colors-foreground-fgQuaternary, #98a2b3)"
            baseUrl={baseUrl}
          />
          <span className="tl-cell-picker-gcal-body">
            <span className="tl-cell-picker-gcal-title">
              Google Calendar
              <span className={`tl-cell-picker-gcal-dot ${gcalConnected ? 'is-on' : 'is-off'}`} />
              <span className="tl-cell-picker-gcal-state">
                {gcalConnected ? L.gcalConnected : L.gcalDisconnected}
              </span>
            </span>
            <span className="tl-cell-picker-gcal-sub">
              {gcalConnected ? L.gcalConnectedSub : gcalDisconnectedLabel}
            </span>
          </span>
        </div>
      </AnchoredLayer>
    </>
  );
}
