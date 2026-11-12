import StatusBadge from '../shared/StatusBadge.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import withLockedHint from './lockedHint.jsx';

/** 1on1 기록 한 줄 (Figma 17873:34250) — 날짜 12/700 · 진행자/상태 · 제목 16/600. */
export default function OneOnOneRow({ item }) {
  const row = (
    <div
      className="profile-oneonone-item"
      {...(item.onOpen
        ? {
            role: 'link',
            tabIndex: 0,
            style: { cursor: 'pointer' },
            onClick: item.onOpen,
            onKeyDown: (e) => { if (isEnterKey(e)) item.onOpen(); },
          }
        : { ...(item.lockedHint ? { tabIndex: 0 } : {}), style: { cursor: 'default' } })}
    >
      <p className="profile-oneonone-date">{item.date}</p>
      {(item.hostLabel || item.statusLabel) && (
        <div className="profile-oneonone-meta">
          {item.hostLabel && <span className="profile-oneonone-host">{item.hostLabel}</span>}
          {item.statusLabel && <StatusBadge tone={item.statusTone} className="ono-done-badge">{item.statusLabel}</StatusBadge>}
        </div>
      )}
      {item.title && <p className="profile-oneonone-title">{item.title}</p>}
    </div>
  );
  return withLockedHint(item, row);
}
