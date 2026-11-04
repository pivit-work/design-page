import Icon from '../shared/Icon.jsx';
import { BROADCAST_KINDS } from './constants.js';

/**
 * BroadcastBar — 어드민이 서비스 전체에 보내는 공지를 화면 맨 위 한 줄로 띄운다
 * (Figma 일반 공지 17816:26924 · 경고/장애 17816:26435 · 2026-11-04).
 *
 * 화면 폭 가득한 48px 띠다(위아래 6 · 좌우 32). 가운데에 공지 글(14/24 흰 글씨) · 링크들(12/18 굵게,
 * 사이 12) · 닫기 X(36 · r14)가 10px 간격으로 서고, 사이드바와 머리 줄은 그 아래로 내려간다.
 * 종류(`kind`)에 따라 바탕이 다르다 — 일반 공지는 보라 → 초록, 경고·장애는 분홍 → 주황 그라데이션.
 *
 * 이 부품은 띠 자체만 그린다 — 띠를 어디에 세우고(`position: fixed` 등) 아래 화면을 얼마나 내릴지는
 * 호스트가 정한다. design-page 는 `--broadcast-bar-h`(App.css) 로 사이드바·머리 줄·본문을 내린다.
 * 공지 글이 한 줄을 넘치면 말줄임으로 자르고 전체 글은 `title` 로 보인다 — 띠 높이는 늘 48 이다.
 *
 * @param {'notice'|'warning'} [kind='notice']  공지 종류
 * @param {string} message  공지 글
 * @param {{ label: string, href?: string, onClick?: () => void, external?: boolean }[]} [actions]
 *   오른쪽 링크들 — 「자세히」 「변경안내」. `href` 가 있으면 <a>, 없으면 <button>. `external` 이면 새 탭.
 * @param {() => void} [onClose]  닫기 X. 없으면 X 를 그리지 않는다
 * @param {string} [closeLabel='공지 닫기']  닫기 X 의 접근성 이름
 * @param {string} [baseUrl]
 * @param {string} [testId='broadcast-bar']
 */
export default function BroadcastBar({
  kind = 'notice',
  message,
  actions = [],
  onClose,
  closeLabel = '공지 닫기',
  baseUrl = '',
  testId = 'broadcast-bar',
}) {
  const tone = BROADCAST_KINDS.includes(kind) ? kind : 'notice';
  return (
    <div
      className={`broadcast-bar is-${tone}`}
      role={tone === 'warning' ? 'alert' : 'status'}
      data-testid={testId}
      data-kind={tone}
    >
      <p className="broadcast-message" title={message}>{message}</p>
      {actions.length > 0 && (
        <div className="broadcast-actions">
          {actions.map((action, i) =>
            action.href ? (
              <a
                key={`${action.label}-${i}`}
                className="broadcast-link"
                href={action.href}
                onClick={action.onClick}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noopener noreferrer' : undefined}
                data-testid="broadcast-action"
              >
                {action.label}
              </a>
            ) : (
              <button
                key={`${action.label}-${i}`}
                type="button"
                className="broadcast-link"
                onClick={action.onClick}
                data-testid="broadcast-action"
              >
                {action.label}
              </button>
            ),
          )}
        </div>
      )}
      {onClose && (
        <button
          type="button"
          className="broadcast-close"
          onClick={onClose}
          aria-label={closeLabel}
          data-testid="broadcast-close"
        >
          <Icon src="/icons-solid/x-close.svg" size={20} color="var(--fg-light)" baseUrl={baseUrl} />
        </button>
      )}
    </div>
  );
}
