import { useState } from 'react';
import SectionLabel from './SectionLabel.jsx';
import ToneBadge from '../shared/StatusBadge.jsx';
import TextArea from '../shared/TextArea.jsx';
import Button from '../shared/Button.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import { NoteText, ReadonlyBox } from '../shared/SharedText.jsx';
import { OFFBOARDING_TYPE_IDS } from './offboardingRules.js';
import { OFFBOARDING_NOTE_MAX } from './AdminOffboardingCanvas.jsx';

const fill = (tpl, map) =>
  Object.entries(map).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''), String(tpl ?? ''));

const OFFBOARDING_REASON_DEFAULT_LABELS = {
  section: '퇴사 사유',
  badge: '어드민만',
  typeLine: '퇴사 유형 {type}',
  unspecified: '미지정',
  reveal: '세부 사유 보기',
  revealing: '불러오는 중…',
  revealFailed: '세부 사유를 불러오지 못했어요 — 다시 시도',
  loadFailed: '퇴사 사유를 불러오지 못했어요',
  noNote: '세부 사유 없음',
  archived: '세부 사유는 퇴사가 확정되어 따로 보관 중입니다.',
  edit: '고치기',
  notePlaceholder: '세부 사유 (선택) — 예: 다른 회사로 이직 · 계약 기간 종료 · 처우',
  noteHint: '어드민(직원 정보 수정 권한)만 봅니다. 건강·가족 사정처럼 민감한 내용은 적지 마세요.',
  noteCount: '{count}/{max}',
  cancel: '취소',
  save: '저장',
  saving: '저장 중…',
  saveFailed: '저장하지 못했어요 — 다시 시도하세요',
  logTitle: '고친 기록',
  logEmpty: '고친 기록이 없습니다.',
  logType: '유형 {before} → {after}',
  logNote: '세부 사유 고침',
  types: {
    voluntary: '자발적 퇴사',
    involuntary: '권고사직',
    contract_end: '계약 만료',
    etc: '기타',
  },
};

/**
 * 어드민 › 구성원 설정 › 퇴사자 상세의 «퇴사 사유» 칸 (pivit-work PW-1693 · 퇴사 처리 정책 v1.26 §5-I · §6-A · E50~E55).
 *
 * 유형은 바로 보이고, 세부 사유는 접혀 있다가 [세부 사유 보기]로 펼친다 — 펼칠 때만 `onReveal` 로 서버에서 받는다
 * (서버가 그 열람을 감사 로그에 남긴다). 한 번 펼치면 이 칸이 사라질 때(패널을 닫을 때)까지 다시 부르지 않는다(E55).
 * [고치기]는 `summary.editable` 일 때만 — 누르면 세부 사유를 펼친 것으로 본다(아직 안 펼쳤으면 먼저 받는다).
 * 세부 사유의 이전 본문은 고친 기록에 남기지 않는다.
 *
 * 모양은 바로 아래 «따로 보관한 기록» 칸(`ArchivedRecordsSection`)과 같은 칸 문법을 쓴다 — 제목+딱지 · 회색 상자 ·
 * 작은 버튼 · 기록 목록. 유형 고르기는 퇴사 처리 화면 섹션 1 과 같은 세그먼트다.
 *
 * @param {object} props
 * @param {{ status: 'loading'|'error'|'ready', summary?: { type: string, hasNote: boolean,
 *   edits: Array<{ at: string, byName: string, typeBefore: string, typeAfter: string, noteChanged: boolean }>,
 *   editable: boolean, archived: boolean } | null }} props.state  `ready` 인데 `summary` 가 없으면 칸을 그리지 않는다
 * @param {boolean} [props.typeOnly] 대신 로그인 세션 — 유형 한 줄만 보인다(정책 §7)
 * @param {() => Promise<string|null>} [props.onReveal] 세부 사유 본문 받기. 실패면 reject
 * @param {(input: { type: string, note: string }) => Promise<object>} [props.onSave] 저장 — 새 요약으로 resolve, 실패면 reject
 * @param {(iso: string) => string} [props.formatAt] 고친 기록의 시각 표기
 * @param {object} [props.labels]
 */
export default function OffboardingReasonSection({ state, typeOnly = false, onReveal, onSave, formatAt, labels }) {
  const L = {
    ...OFFBOARDING_REASON_DEFAULT_LABELS,
    ...(labels || {}),
    types: { ...OFFBOARDING_REASON_DEFAULT_LABELS.types, ...(labels?.types || {}) },
  };
  const [override, setOverride] = useState(null);
  const [note, setNote] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [revealFailed, setRevealFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [eType, setEType] = useState('');
  const [eNote, setENote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // 불러오지 못했으면 «칸 없음»으로 보이지 않게 제목과 한 줄을 둔다
  if (state?.status === 'error') {
    return (
      <>
        <SectionLabel>{L.section}</SectionLabel>
        <div className="admin-emp-archived" data-testid="offboarding-reason-load-failed">
          <span className="admin-emp-status-date-note is-error" role="alert">{L.loadFailed}</span>
        </div>
      </>
    );
  }
  if (state?.status !== 'ready' || !state.summary) return null;
  const summary = override ?? state.summary;
  const typeText = L.types[summary.type] ?? L.unspecified;
  const revealed = note !== null;

  const reveal = async () => {
    if (revealed) return note;
    setRevealing(true);
    setRevealFailed(false);
    try {
      const got = (await onReveal?.()) ?? '';
      setNote(got);
      return got;
    } catch {
      setRevealFailed(true);
      return null;
    } finally {
      setRevealing(false);
    }
  };

  const startEdit = async () => {
    const current = summary.hasNote ? await reveal() : '';
    if (current === null) return;
    setEType(OFFBOARDING_TYPE_IDS.includes(summary.type) ? summary.type : OFFBOARDING_TYPE_IDS[0]);
    setENote(current);
    setSaveFailed(false);
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    const trimmed = eNote.trim();
    if (eType === summary.type && trimmed === (note ?? '').trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      const next = await onSave?.({ type: eType, note: trimmed });
      if (next) setOverride(next);
      setNote(trimmed);
      setEditing(false);
    } catch {
      // 입력값은 그대로 둔다 — 다시 누르기만 하면 된다(정책 §6-A)
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const editLine = (e) =>
    [
      e.typeBefore !== e.typeAfter &&
        fill(L.logType, {
          before: L.types[e.typeBefore] ?? L.unspecified,
          after: L.types[e.typeAfter] ?? L.unspecified,
        }),
      e.noteChanged && L.logNote,
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <>
      <SectionLabel>
        <span className="admin-emp-archived-head">
          {L.section}
          <ToneBadge tone="neutral">{L.badge}</ToneBadge>
        </span>
      </SectionLabel>
      <div className="admin-emp-archived" data-testid="offboarding-reason">
        <div className="admin-emp-archived-intro" data-testid="offboarding-reason-type">
          {fill(L.typeLine, { type: typeText })}
        </div>
        {!typeOnly && !editing && (
          <>
            {summary.archived ? (
              <div className="admin-emp-status-date-note" data-testid="offboarding-reason-archived">{L.archived}</div>
            ) : !summary.hasNote ? (
              <div className="admin-emp-status-date-note" data-testid="offboarding-reason-empty">{L.noNote}</div>
            ) : revealed ? (
              <ReadonlyBox data-testid="offboarding-reason-note">{note}</ReadonlyBox>
            ) : (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={revealing}
                  onClick={reveal}
                  data-testid="offboarding-reason-reveal"
                >
                  {revealing ? L.revealing : L.reveal}
                </Button>
              </div>
            )}
            {revealFailed && (
              <span className="admin-emp-status-date-note is-error" role="alert" data-testid="offboarding-reason-reveal-failed">
                {L.revealFailed}
              </span>
            )}
            {summary.editable && !summary.archived && (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revealing}
                  onClick={startEdit}
                  data-testid="offboarding-reason-edit"
                >
                  {L.edit}
                </Button>
              </div>
            )}
          </>
        )}
        {!typeOnly && editing && (
          <div className="admin-emp-archived-confirm" data-testid="offboarding-reason-form">
            <SegmentedControl
              ariaLabel={L.section}
              value={eType}
              onChange={setEType}
              items={OFFBOARDING_TYPE_IDS.map((id) => ({
                value: id,
                label: L.types[id] ?? id,
                disabled: saving,
                testId: `offboarding-reason-type-${id}`,
              }))}
            />
            <TextArea
              className="admin-emp-input"
              rows={3}
              value={eNote}
              maxLength={OFFBOARDING_NOTE_MAX}
              placeholder={L.notePlaceholder}
              aria-label={L.notePlaceholder}
              disabled={saving}
              onChange={(e) => setENote(e.target.value.slice(0, OFFBOARDING_NOTE_MAX))}
              data-testid="offboarding-reason-note-input"
            />
            <NoteText>
              {L.noteHint} · {fill(L.noteCount, { count: eNote.length, max: OFFBOARDING_NOTE_MAX })}
            </NoteText>
            {saveFailed && (
              <span className="admin-emp-status-date-note is-error" role="alert" data-testid="offboarding-reason-save-failed">
                {L.saveFailed}
              </span>
            )}
            <div className="admin-emp-archived-actions">
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => setEditing(false)}>
                {L.cancel}
              </Button>
              <Button variant="primary" size="sm" disabled={saving} onClick={save} data-testid="offboarding-reason-save">
                {saving ? L.saving : L.save}
              </Button>
            </div>
          </div>
        )}
        {!typeOnly && (
          <>
            <div className="admin-emp-archived-log-title">{L.logTitle}</div>
            {summary.edits.length === 0 ? (
              <div className="admin-emp-status-date-note" data-testid="offboarding-reason-log-empty">{L.logEmpty}</div>
            ) : (
              <ul className="admin-emp-archived-log" data-testid="offboarding-reason-log">
                {summary.edits.map((e, i) => (
                  <li key={`${e.at}-${i}`}>
                    <span className="admin-emp-archived-log-at">{formatAt ? formatAt(e.at) : e.at}</span> · {e.byName} · {editLine(e)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}
