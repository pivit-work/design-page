import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import ProfileFailure from './ProfileFailure.jsx';

/**
 * 스니핏 카드 맨 아래 「수정 기록」(pivit-work PW-2702 · 기획 스니핏 정책서 §7-A.6).
 *
 * 호스트가 버튼을 그릴 카드에만 `snippet.editLog` 를 넣는다 — 기록 0건·작성자 본인·어려움을 볼 수
 * 없는 사람이면 넣지 않아 버튼이 없다. 문구·날짜는 호스트가 만든다.
 *  - `{ label, onToggle, open, loading }` — 텍스트 버튼. 불러오는 동안 누를 수 없고 `label` 이 바뀐다
 *    글자 뒤에 접힘 ▾ / 펼침 ▴ 삼각형을 그린다(불러오는 동안은 없음 · 기획 매니저 뷰 §6-4-B «위치»).
 *    번역 글자에 기호를 넣지 않는 규칙이라 글자가 아니라 그림이다.
 *  - 펼친 칸(실패 문구 또는 목록)은 버튼 아래 구분선 밑에 놓는다(§6-4-B «트리거 → 결과»)
 *  - `error: { message, retryLabel }` + `onRetry` — 펼친 자리에 실패 문구와 [다시 시도](이 창의 실패 모양)
 *  - `rows: [{ key, summary: string[], chip?: { label, tone }, open, onToggle, changes?: [{ key, label, inline?, before, after }] }]`
 *    `summary` 는 한 줄 칸(날짜 시각·고친 사람·바뀐 섹션)을 카드의 점(•)으로 잇는다.
 *    `chip` 은 줄 오른쪽 끝 알림 칩 — 카드 태그와 같은 둥근 칩 틀, `tone` 은 `success`(알림 보냄) · `neutral`(알림 대기).
 *    열린 줄은 `changes` 를 섹션마다 보인다 — `inline` 이면 «3 → 4» 한 줄, 아니면 수정 전·후를 위아래로.
 *    `noChangeLabel` 이 있는 줄(그날 고친 섹션을 모두 되돌림)은 바뀐 섹션 자리에 그 글자를 연한 회색으로 두고,
 *    누를 수 없는 줄로 그린다 — 펼칠 섹션이 없다(기획 매니저 뷰 §6-4-B «기록 한 줄»·«줄을 누르면»).
 *    `beforeLabel`·`afterLabel` 은 위아래 칸 이름표다.
 */
export default function SnippetEditLog({ log }) {
  return (
    <div className="profile-snippet-log">
      <Button
        className="profile-snippet-log-toggle"
        aria-expanded={!!log.open}
        disabled={!!log.loading}
        onClick={() => log.onToggle?.()}
      >
        {log.label}
        {!log.loading && <Caret up={!!log.open} />}
      </Button>
      {log.open && (log.error || log.rows) && (
        <div className="profile-snippet-log-body">
      {log.error && (
        <ProfileFailure notice={log.error} onRetry={log.onRetry} />
      )}
      {!log.error && log.rows && (
        <ul className="profile-snippet-log-list">
          {log.rows.map((row) => (
            <li key={row.key} className="profile-snippet-log-row">
              {row.noChangeLabel ? (
                // 바뀐 섹션이 없는 날(모두 되돌림) — 펼칠 것이 없어 누르는 단추가 아니다(손 모양·펼침 표시 없음)
                <div className="profile-snippet-log-head is-static">
                  <RowHead row={row} />
                </div>
              ) : (
                <Button
                  className="profile-snippet-log-head"
                  aria-expanded={!!row.open}
                  onClick={() => row.onToggle?.()}
                >
                  <RowHead row={row} />
                </Button>
              )}
              {row.open && row.changes && (
                <div className="profile-snippet-log-changes">
                  {row.changes.map((c) => (
                    <div key={c.key} className="profile-snippet-log-change">
                      <p className="profile-snippet-log-section">{c.label}</p>
                      {c.inline ? (
                        <p className="profile-snippet-log-text">{`${c.before} → ${c.after}`}</p>
                      ) : (
                        <>
                          <p className="profile-snippet-log-caption">{log.beforeLabel}</p>
                          <p className="profile-snippet-log-text is-before">{c.before}</p>
                          <p className="profile-snippet-log-caption">{log.afterLabel}</p>
                          <p className="profile-snippet-log-text">{c.after}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
        </div>
      )}
    </div>
  );
}

/** 줄 머리 — 왼쪽 칸(점으로 잇는다) · 오른쪽 끝 알림 칩. */
function RowHead({ row }) {
  return (
    <>
      <span className="profile-snippet-log-parts">
        {row.summary.map((part, i) => (
          <span key={i} className="profile-snippet-point">
            <span>{part}</span>
            <span className="profile-snippet-dot">•</span>
          </span>
        ))}
        {row.noChangeLabel && (
          <span className="profile-snippet-point">
            <span className="profile-snippet-log-none">{row.noChangeLabel}</span>
            <span className="profile-snippet-dot">•</span>
          </span>
        )}
      </span>
      {row.chip && (
        <StatusBadge tone={row.chip.tone} className="manager-modal-snippet-tag profile-snippet-log-chip">
          {row.chip.label}
        </StatusBadge>
      )}
    </>
  );
}

/** 접힘 ▾ / 펼침 ▴ — 글자 색을 따른다. */
function Caret({ up }) {
  return (
    <svg
      className="profile-snippet-log-caret"
      data-open={up ? 'true' : 'false'}
      width="8"
      height="8"
      viewBox="0 0 8 8"
      aria-hidden="true"
    >
      <path d={up ? 'M4 1.5 7.5 6.5H.5z' : 'M4 6.5 .5 1.5h7z'} fill="currentColor" />
    </svg>
  );
}
