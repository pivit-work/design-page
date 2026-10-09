import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './evalIcons';
import Chip from '../shared/Chip.jsx';

/**
 * OKR 컨텍스트 패널 — 내 피드백(screen-feedback-member §2, PW-1454)과 팀 피드백 팀원 스레드
 * (screen-feedback-manager §3.3, PW-1455)가 함께 쓴다. 시안: eval-app.jsx `OkrPanel`.
 *
 * 처음엔 접혀 있다. 접힌 줄에 Objective·KR 수와 커버리지(피드백이나 요청이 있는 KR / 전체 KR)를,
 * 펼치면 소유 단위(회사·팀·개인)별 Objective 그룹마다 진행률과 그 아래 KR(진행률·건수),
 * 이니셔티브와 건수, (넘겨 주면) 최근 스니핏을 보인다. 건수는 블록 카드와 같은 묶음(block.items)에서
 * 세어 두 숫자가 어긋나지 않는다.
 *
 * `testIdPrefix` — 두 화면의 기존 testid(`fbm-…`·`fbmgr-…`)를 그대로 쓰려고 받는다.
 * `snippets` — `[{ id, date, summary }]`. 비었거나 안 넘기면 스니핏 칸을 그리지 않는다.
 */
const C = {
  surface: 'var(--bg-quaternary)',
  border: 'var(--border-secondary)',
  borderL: 'var(--border-tertiary)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-tertiary)',
  accent: 'var(--utility-brand-600)',
  green: 'var(--utility-success-600)',
  amber: 'var(--utility-warning-700)',
  red: 'var(--utility-error-600)',
  purple: 'var(--utility-purple-500)',
  purpleBg: 'var(--utility-purple-50)',
  purpleBd: 'var(--utility-purple-200)',
};
const FONT = 'var(--font-family-body)';
const PROGRESS_BAR_W = 96;

function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
function krColor(p) {
  if (p >= 80) return C.green;
  if (p >= 50) return C.amber;
  return C.red;
}

export default function FeedbackOkrPanel({ groups, krBlocks, initBlocks, snippets = [], L, testIdPrefix = 'fbm' }) {
  const [open, setOpen] = useState(false);
  const tid = (s) => `${testIdPrefix}-${s}`;
  const krById = new Map(krBlocks.map((b) => [b.id, b]));
  const covered = krBlocks.filter((b) => b.items.length > 0).length;
  const countBadge = (n) =>
    n > 0 ? <Chip tone="success">{n}{L.countSuffix}</Chip> : null;

  return (
    <div data-testid={tid('okr-panel')} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid={tid('okr-panel-toggle')}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT }}
      >
        <span style={{ fontSize: 'var(--font-size-text-xs)', fontWeight: 700, color: C.sub }}>{L.okrPanelTitle}</span>
        <span style={{ fontSize: 'var(--font-size-text-xs)', color: C.muted }}>
          {fill(L.okrPanelCounts, { objectives: groups.length, krs: krBlocks.length })}
          {' · '}
          <span data-testid={tid('okr-coverage')} style={{ color: covered > 0 ? C.accent : C.muted }}>
            {fill(L.okrPanelCoverage, { covered, total: krBlocks.length })}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', color: C.muted, display: 'inline-flex' }}>
          {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
        </span>
      </button>

      {open && (
        <div data-testid={tid('okr-panel-body')} style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map((g) => (
            <div key={g.id} data-testid={tid(`okr-group-${g.id}`)}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginBottom: 4 }}>
                {g.unitLabel}{L.okrObjectiveSuffix}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 'var(--font-size-text-xs)', color: C.text, flex: 1, lineHeight: 1.5 }}>{g.title}</span>
                <span style={{ width: PROGRESS_BAR_W, height: 6, background: C.borderL, borderRadius: 3, overflow: 'hidden' }}>
                  <span style={{ display: 'block', width: `${g.progress ?? 0}%`, height: '100%', background: C.accent }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>{g.progress ?? 0}%</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginBottom: 6 }}>{L.sectionKr}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.krIds.map((id) => krById.get(id)).filter(Boolean).map((b) => (
                  <div key={b.id} data-testid={tid(`okr-kr-${b.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Chip tone="info">{b.badge}</Chip>
                    <span style={{ fontSize: 12, color: C.sub, flex: 1, lineHeight: 1.4 }}>{b.title}</span>
                    {countBadge(b.items.length)}
                    <span style={{ width: 50, height: 4, background: C.borderL, borderRadius: 2, overflow: 'hidden' }}>
                      <span style={{ display: 'block', width: `${b.progress ?? 0}%`, height: '100%', background: krColor(b.progress ?? 0) }} />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: krColor(b.progress ?? 0), minWidth: 30, textAlign: 'right' }}>{b.progress ?? 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {initBlocks.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginBottom: 6 }}>{L.sectionInit}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {initBlocks.map((b) => (
                  <span key={b.id} data-testid={tid(`okr-init-${b.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: C.purple, background: C.purpleBg, border: `1px solid ${C.purpleBd}`, borderRadius: 20, padding: '2px 9px' }}>
                      # {b.title}
                    </span>
                    {countBadge(b.items.length)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {snippets.length > 0 && (
            <div data-testid={tid('okr-snippets')}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginBottom: 6 }}>{L.okrPanelSnippets}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {snippets.map((s) => (
                  <div key={s.id} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5 }}>
                    <span style={{ color: C.muted, flexShrink: 0 }}>{s.date}</span>
                    <span style={{ color: C.sub, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
