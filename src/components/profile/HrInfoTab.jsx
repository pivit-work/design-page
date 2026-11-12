import { useState } from 'react';
import Tabs from '../shared/Tabs.jsx';
import ProfileFailure from './ProfileFailure.jsx';
import ProfileInfoRow from './ProfileInfoRow.jsx';

/**
 * 「인사정보」 탭 (Figma 17873:33232) — 밑줄 하위 탭(기본정보 · 조직·재직 정보 · 개인 정보 · 학력 · 경력 · 자격증 · 교육)과
 * 고른 묶음의 줄들.
 *
 * 이 컴포넌트는 **아무것도 판정하지 않는다.** 어떤 묶음·어떤 줄을 보여줄지, 값이 비었을 때 무엇을
 * 적을지는 전부 호스트가 정해 넘긴다 — 무엇을 볼 수 있는가는 서버가 정하는 것이고, 화면이 그 자리를
 * 되메우면 그 판정이 무효가 된다(PW-452). 그래서 「값이 없으면 이렇게 대신 그린다」를 하지 않는다.
 *
 * @param {Array<{ key, label, rows: Array<{ key, label, content, action?, testId? }> }>} sections
 *   하위 탭 하나 = 묶음 하나. 묶음이 하나뿐이면 하위 탭 줄은 그리지 않는다.
 * @param {{ loading?, loadingLabel?, error?: { message, retryLabel }, personalError?: { title, message, retryLabel } }} [status]
 *   실패가 두 층이다 — `error` 는 통째로 못 받았다(탭 안에서만 말한다). `personalError` 는 나머지는 받았는데
 *   **개인 정보 자리만** 못 받았다. 그 자리에만 문구를 두고 위쪽 줄은 정상으로 그린다.
 * @param {(sectionKey, rowKey) => void} [onRowAction]
 * @param {() => void} [onRetry]
 */
export default function HrInfoTab({ sections = [], status, onRowAction, onRetry }) {
  const [picked, setPicked] = useState(null);
  const current = sections.find((s) => s.key === picked) || sections[0];

  if (status?.loading) {
    return (
      <div className="profile-tab-body">
        <p className="profile-empty">{status.loadingLabel}</p>
      </div>
    );
  }
  if (status?.error) {
    return (
      <div className="profile-tab-body">
        <ProfileFailure notice={status.error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="profile-tab-body profile-hr">
      {sections.length > 1 && (
        <div className="tl-tabs-row profile-subnav">
          <Tabs
            items={sections.map((s) => ({ value: s.key, label: s.label, testId: s.testId }))}
            value={current?.key}
            onChange={setPicked}
          />
        </div>
      )}
      {current && (
        <div className="profile-rows" data-testid={`profile-hr-${current.key}`}>
          {current.rows.map((row) => (
            <ProfileInfoRow
              key={row.key}
              label={row.label}
              action={row.action}
              onAction={() => onRowAction?.(current.key, row.key)}
              testId={row.testId}
              className={row.className}
            >
              {row.content}
            </ProfileInfoRow>
          ))}
        </div>
      )}
      {status?.personalError && (
        <div className="profile-rows">
          <p className="profile-section-title">{status.personalError.title}</p>
          <ProfileFailure notice={status.personalError} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}
