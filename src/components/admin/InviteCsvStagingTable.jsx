import { memo, useEffect, useRef, useState } from 'react';
import RosterTable from '../shared/RosterTable.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * 초대 CSV 미리보기 표 — 두 초대 화면(어드민 「구성원 초대」 창 · 온보딩 「구성원 초대」 단계)이
 * 함께 쓴다 (PW-902).
 *
 * 모양의 근거: pivit-specs `8. onboarding/onboarding-app.jsx` 탭 4 의 미리보기 표(기획서 시안) —
 * 가로 스크롤 · 이메일·이름 왼쪽 고정 · 연봉 칸 `●●●` · 빈 칸 `—`. 그 시안을 공용 명단 표
 * (`shared/RosterTable`)로 옮겼다. 기획서가 「상태」 칸도 왼쪽에 고정하라고 해 셋째로 붙였다
 * (`screen-onboarding-invite.policy.md` 탭 4).
 *
 * 무엇을 하는가:
 *  · **모든 칸을 그 자리에서 고친다** — 파일을 고쳐 다시 올리지 않는다(기획서 탭 4). 등록된 값만
 *    받는 칸은 입력하며 그 회사 값 목록이 뜬다(datalist)
 *  · 틀린 칸은 빨갛게, 줄 전체는 오류 바탕 — 사유는 「상태」 칸에 적는다
 *  · 🔒 연봉은 가린다 — 값이 있으면 `●●●`, 눌러 새로 적을 때도 글자가 보이지 않는다
 *  · 요약 `총 N건 · 정상 N · 오류 N` 과 [오류 줄만 보기]
 *
 * 무엇을 하지 않는가: 판정. 사유는 부르는 쪽이 `inviteCsvIssues()` 로 만들어 넘긴다 — 두
 * 화면이 같은 판정을 쓰게 하려고 판정을 표에서 뺐다.
 *
 * 500줄 × 칸 서른여 개라, 칸 하나를 고칠 때 **그 줄만** 다시 그린다(`memo` 줄).
 *
 * @param {object}   props
 * @param {Array}    props.rows            `{ key, values, failReason, failField }`
 * @param {Array}    props.columns         `inviteCsvColumns()`
 * @param {Record<string, Array<{key: string, message: string}>>} props.issuesByKey
 * @param {Record<string, Array<{key: string, message: string}>>} [props.notesByKey] 오류가 아닌 안내
 * @param {Record<string, string[]>} [props.fieldOptions] 옵션 키 → 등록된 값(입력 도움 목록)
 * @param {Record<string, string>}   props.labels
 * @param {boolean}  [props.disabled]
 * @param {(rowKey: string, colKey: string, value: string) => void} props.onChangeCell
 * @param {string}   [props.testId]
 */
export default function InviteCsvStagingTable({
  rows,
  columns,
  issuesByKey,
  notesByKey = {},
  fieldOptions = {},
  labels,
  disabled = false,
  onChangeCell,
  testId = 'invite-csv-table',
}) {
  const [errorsOnly, setErrorsOnly] = useState(false);
  /* 표 틀의 폭 — 붙는 열이 틀을 다 덮으면 옆으로 밀어도 나머지 칸이 영영 안 보인다
     (온보딩 카드는 400px 남짓이라 붙는 열 셋(530px)이 틀보다 넓다). 잰 폭의 60% 안에
     들어가는 만큼만 붙인다. 폭을 못 재는 환경(테스트)에서는 전부 붙인다. */
  const frameRef = useRef(null);
  const [frameWidth, setFrameWidth] = useState(Infinity);
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width || Infinity));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bad = (r) => (issuesByKey[r.key]?.length ?? 0) > 0 || Boolean(r.failReason);
  const errCount = rows.filter(bad).length;
  const shown = errorsOnly ? rows.filter(bad) : rows;

  /* 머리 순서: 고정 열(이메일·이름) → 상태 → 나머지. 상태도 고정이다(틀이 넉넉할 때). */
  const STATUS_WIDTH = 220;
  const budget = frameWidth * 0.6;
  const sticky = [];
  let left = 0;
  const lefts = [];
  for (const c of columns.filter((col) => col.sticky)) {
    if (left + c.width > budget && sticky.length > 0) break;
    sticky.push(c);
    lefts.push(left);
    left += c.width;
  }
  const statusPinned = left + STATUS_WIDTH <= budget;
  const statusLeft = statusPinned ? left : undefined;
  const rest = columns.filter((c) => !sticky.includes(c));
  const minWidth = columns.reduce((a, c) => a + (c.width || 100), STATUS_WIDTH);

  const listIdOf = (option) => `invite-csv-opt-${option}`;

  return (
    <div className="admin-inv-csvt" data-testid={testId} ref={frameRef}>
      <div className="admin-inv-csv-summary">
        <span className="admin-inv-csv-counts" data-testid="invite-csv-summary">
          {fmt(labels.csvSummary, { total: rows.length, ok: rows.length - errCount, err: errCount })}
        </span>
        {errCount > 0 && (
          <label className="admin-inv-csv-toggle">
            <input
              type="checkbox"
              checked={errorsOnly}
              onChange={(e) => setErrorsOnly(e.target.checked)}
            />
            {labels.csvErrorsOnly}
          </label>
        )}
      </div>

      {/* 등록된 값 목록 — 입력칸이 이 목록을 도움말로 띄운다. 목록 밖 값도 적을 수는 있고,
          그러면 그 칸이 오류로 선다(옵션을 늘리지 않는다). */}
      {columns.filter((c) => c.option).map((c) => (
        <datalist key={c.option} id={listIdOf(c.option)}>
          {(fieldOptions[c.option] || []).map((o) => <option key={o} value={o} />)}
        </datalist>
      ))}

      <RosterTable scroll="both" maxHeight={420} minWidth={minWidth} dense framed>
        <RosterTable.Head>
          {sticky.map((c, i) => (
            <RosterTable.HeadCell key={c.key} width={c.width} stickyLeft={lefts[i]}>
              {labels[c.labelKey]}{c.required ? ' *' : ''}
            </RosterTable.HeadCell>
          ))}
          <RosterTable.HeadCell width={STATUS_WIDTH} stickyLeft={statusLeft}>
            {labels.csvColStatus}
          </RosterTable.HeadCell>
          {rest.map((c) => (
            <RosterTable.HeadCell key={c.key} width={c.width}>{labels[c.labelKey]}</RosterTable.HeadCell>
          ))}
        </RosterTable.Head>
        <RosterTable.Body>
          {shown.map((r) => (
            <StagingRow
              key={r.key}
              row={r}
              issues={issuesByKey[r.key] || EMPTY}
              notes={notesByKey[r.key] || EMPTY}
              sticky={sticky}
              lefts={lefts}
              statusLeft={statusLeft}
              rest={rest}
              labels={labels}
              disabled={disabled}
              listIdOf={listIdOf}
              onChangeCell={onChangeCell}
            />
          ))}
          {errorsOnly && errCount === 0 && (
            <RosterTable.Empty colSpan={columns.length + 1}>{labels.csvNoErrorRows}</RosterTable.Empty>
          )}
        </RosterTable.Body>
      </RosterTable>
    </div>
  );
}

const EMPTY = [];

/** `{n}` 자리 치환. */
function fmt(template, vars) {
  return String(template ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

/**
 * 한 줄. 줄의 값·사유가 그대로면 다시 그리지 않는다 — 부르는 쪽은 고친 줄만 새 객체로 바꾼다.
 * 사유 배열은 렌더마다 새로 만들어지므로 글자로 비교한다.
 */
const StagingRow = memo(function StagingRow({
  row, issues, notes, sticky, lefts, statusLeft, rest, labels, disabled, listIdOf, onChangeCell,
}) {
  const badKeys = new Set(issues.map((i) => i.key));
  if (row.failField) badKeys.add(row.failField);
  const isBad = issues.length > 0 || Boolean(row.failReason);

  const cell = (c, stickyLeft) => {
    const invalid = badKeys.has(c.key);
    const message = issues.filter((i) => i.key === c.key).map((i) => i.message).join(' · ');
    return (
      <RosterTable.Cell key={c.key} stickyLeft={stickyLeft}>
        {c.masked ? (
          <MaskedInput
            value={row.values[c.key]}
            label={labels[c.labelKey]}
            invalid={invalid}
            disabled={disabled}
            onChange={(v) => onChangeCell(row.key, c.key, v)}
          />
        ) : (
          <input
            type="text"
            className={`admin-inv-csvt-input${invalid ? ' is-invalid' : ''}`}
            value={row.values[c.key]}
            placeholder="—"
            list={c.option ? listIdOf(c.option) : undefined}
            aria-label={labels[c.labelKey]}
            aria-invalid={invalid || undefined}
            title={message || undefined}
            disabled={disabled}
            onChange={(e) => onChangeCell(row.key, c.key, e.target.value)}
          />
        )}
      </RosterTable.Cell>
    );
  };

  return (
    <RosterTable.Row tone={isBad ? 'error' : undefined} data-testid="invite-csv-row">
      {sticky.map((c, i) => cell(c, lefts[i]))}
      <RosterTable.Cell stickyLeft={statusLeft}>
        <div className="admin-inv-csvt-status">
          {isBad ? (
            <StatusBadge tone="danger" className="admin-inv-csv-chip">
              {fmt(labels.csvRowErrors, { n: issues.length + (row.failReason ? 1 : 0) })}
            </StatusBadge>
          ) : (
            <StatusBadge tone="success" className="admin-inv-csv-chip">{labels.csvRowOk}</StatusBadge>
          )}
          {issues.map((i, n) => (
            <span key={`${i.key}-${n}`} className="admin-inv-csvt-reason">{i.message}</span>
          ))}
          {row.failReason && <span className="admin-inv-csvt-reason">{row.failReason}</span>}
          {notes.map((i, n) => (
            <span key={`note-${n}`} className="admin-inv-csvt-note">{i.message}</span>
          ))}
        </div>
      </RosterTable.Cell>
      {rest.map((c) => cell(c))}
    </RosterTable.Row>
  );
}, (a, b) =>
  a.row === b.row
  && a.disabled === b.disabled
  // 틀 폭이 바뀌어 붙는 열 수가 달라지면 줄도 다시 그린다.
  && a.sticky.length === b.sticky.length
  && a.statusLeft === b.statusLeft
  && a.labels === b.labels
  && sameMessages(a.issues, b.issues)
  && sameMessages(a.notes, b.notes));

function sameMessages(a, b) {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.key === b[i].key && x.message === b[i].message);
}

/**
 * 🔒 가린 칸 — 값이 있으면 `●●●` 만 보인다. 누르면 새로 적는 칸이 열리고, 그때도 글자는
 * 가려진다(`type="password"`). 원래 값을 보여 주는 길은 두지 않는다 — 기획서 탭 4 가 연봉을
 * 화면에 띄우지 말라고 했다.
 */
function MaskedInput({ value, label, invalid, disabled, onChange }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="password"
        autoComplete="new-password"
        className={`admin-inv-csvt-input${invalid ? ' is-invalid' : ''}`}
        value={value}
        aria-label={label}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        // 열자마자 쓸 수 있게 — 눌러서 연 칸이다.
        autoFocus
      />
    );
  }
  return (
    <button
      type="button"
      className={`admin-inv-csvt-masked${invalid ? ' is-invalid' : ''}`}
      aria-label={label}
      disabled={disabled}
      onClick={() => setEditing(true)}
      data-testid="invite-csv-masked"
    >
      {value ? '●●●' : '—'}
    </button>
  );
}
