/**
 * OKR 화면 겉 조각 — 탭 오른쪽 위 버튼 줄·읽기 전용 배지·보조/작성 버튼·빈 탭 자리.
 *
 * 모양은 이미 okr.css 와 데모 페이지(src/OkrPage.jsx)에 있던 것 그대로다
 * (`.okr-header-actions` · `.okr-readonly-badge` · `.okr-ghost-btn` · `.okr-write-btn` ·
 * `.okr-tab-placeholder`). 소비자가 같은 마크업을 직접 칠하지 않도록 부품으로 꺼냈다
 * (pivit-work PW-766). 문구는 전부 소비자가 넘긴다(번역).
 */

/** 탭 오른쪽 위 버튼 줄 — 한 자리에서만 감싼다. 탭마다 따로 감싸면 모양이 갈린다. */
export function OkrHeaderActions({ children }) {
  return <div className="okr-header-actions">{children}</div>;
}

/** 작성 권한이 없을 때 [작성]·[편집] 자리에 놓는 배지. `title` 은 사유 툴팁. */
export function OkrReadOnlyBadge({ label, title, testId }) {
  return (
    <span className="okr-readonly-badge" data-testid={testId} title={title}>
      {label}
    </span>
  );
}

/** 회색 보조 버튼 — [편집]·[컨텍스트 설정]. */
export function OkrGhostButton({ children, onClick, disabled, title, testId }) {
  return (
    <button
      type="button"
      className="okr-ghost-btn"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * 초록 [작성] 버튼. `inline` (기본) 이면 버튼 줄 안에 서고, 아니면 okr.css 대로
 * 오른쪽 위에 고정된다. 아이콘은 `iconSrc` 로 받은 경로를 그대로 쓴다(앞에 아무것도 붙이지 않는다).
 */
export function OkrWriteButton({ label, iconSrc, onClick, inline = true, testId }) {
  return (
    <button
      type="button"
      className={inline ? 'okr-write-btn is-inline' : 'okr-write-btn'}
      data-testid={testId}
      onClick={onClick}
    >
      {iconSrc && <img src={iconSrc} width={20} height={20} alt="" />}
      <span>{label}</span>
    </button>
  );
}

/**
 * 탭 본문이 비었을 때(단위 OKR 없음·준비 중) 흰 캔버스 자리에 문구를 가운데 놓는다.
 * `framed={false}` 면 흰 패널 없이 문구 자리만 잡는다(첫 로드 전처럼 탭 줄이 아직 없을 때).
 */
export function OkrTabPlaceholder({ children, framed = true, role, testId }) {
  return (
    <div
      className={framed ? 'canvas-area okr-canvas-area okr-tab-placeholder' : 'okr-canvas-area okr-tab-placeholder'}
      role={role}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
