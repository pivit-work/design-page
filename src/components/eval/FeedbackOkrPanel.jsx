import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './evalIcons';
import Chip from '../shared/Chip.jsx';

/**
 * OKR 컨텍스트 패널 — 내 피드백(screen-feedback-member §2, PW-1454)과 팀 피드백 팀원 스레드
 * (screen-feedback-manager §3.3, PW-1455)가 함께 쓴다. 시안: eval-app.jsx `OkrPanel`.
 *
 * 처음엔 접혀 있다. 접힌 줄에 Objective·KR 수와 커버리지(피드백이나 요청이 있는 KR / 전체 KR)를,
 * 펼치면 소유 단위(회사·팀·개인)별 Objective 그룹마다 진행률과 그 아래 KR(진행률·건수),
 * 이니셔티브와 건수, (넘겨 주면) 최근 스니핏을 보인다. KR 은 회색 바탕 안 나란한 칸이다(PW-2126). 건수는 블록 카드와 같은 묶음(block.items)에서
 * 세어 두 숫자가 어긋나지 않는다.
 *
 * `testIdPrefix` — 두 화면의 기존 testid(`fbm-…`·`fbmgr-…`)를 그대로 쓰려고 받는다.
 * `snippets` — `[{ id, date, summary }]`. 비었거나 안 넘기면 스니핏 칸을 그리지 않는다.
 */
const C = {
  surface: 'var(--bg-quaternary)',
  border: 'var(--border-secondary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-tertiary)',
  accent: 'var(--utility-brand-600)',
  green: 'var(--utility-success-600)',
  amber: 'var(--utility-warning-700)',
  red: 'var(--utility-error-600)',
};
const FONT = 'var(--font-family-body)';

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
    // 번호·건수·태그는 상태가 아니라 알려 주는 표시라 회색(중립) — 초록(완료)·파랑(진행 중)·보라(AI)와 섞이지 않게 (PW-2035)
    n > 0 ? <Chip tone="neutral">{n}{L.countSuffix}</Chip> : null;

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
        // PW-2126 — 펼친 모양은 매니저 대시보드 KR 고르기(manager.css `.mgr-kr-*`) 값을 옮겼다. 12px 한 줄에
        // 번호·이름·건수·막대·% 를 붙여 두니 빽빽했다. 여기선 고르는 칸이 아니라 «골라진 칸» 흰 바탕은 없고,
        // KR 이 많으면 줄을 바꾼다(eval-cycle.css `.fbokr-*`).
        <div data-testid={tid('okr-panel-body')} className="fbokr-body">
          {groups.map((g) => (
            <div key={g.id} data-testid={tid(`okr-group-${g.id}`)} className="fbokr-section">
              <p className="fbokr-label">{g.unitLabel}{L.okrObjectiveSuffix}</p>
              <div className="fbokr-obj">
                <span className="fbokr-obj-title">{g.title}</span>
                <span className="fbokr-bar fbokr-bar--obj">
                  <span style={{ width: `${g.progress ?? 0}%`, background: krColor(g.progress ?? 0) }} />
                </span>
                {/* Objective 도 KR 과 같은 세 단계 — 늘 초록이면 30% 도 잘 가는 것처럼 보인다 (PW-2035) */}
                <span data-testid={tid(`okr-group-progress-${g.id}`)} className="fbokr-percent" style={{ color: krColor(g.progress ?? 0) }}>{g.progress ?? 0}%</span>
              </div>
              {g.krIds.length > 0 && (
                <div className="fbokr-krs">
                  {g.krIds.map((id) => krById.get(id)).filter(Boolean).map((b) => (
                    <div key={b.id} data-testid={tid(`okr-kr-${b.id}`)} className="fbokr-kr">
                      <div className="fbokr-kr-head">
                        <span className="fbokr-kr-id">{b.badge}</span>
                        <span className="fbokr-kr-meta">
                          {countBadge(b.items.length)}
                          <span className="fbokr-percent" style={{ color: krColor(b.progress ?? 0) }}>{b.progress ?? 0}%</span>
                        </span>
                      </div>
                      <p className="fbokr-kr-title">{b.title}</p>
                      <span className="fbokr-bar">
                        <span style={{ width: `${b.progress ?? 0}%`, background: krColor(b.progress ?? 0) }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {initBlocks.length > 0 && (
            <div className="fbokr-section">
              <p className="fbokr-label">{L.okrPanelInitiatives ?? L.sectionInit}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {initBlocks.map((b) => (
                  <span key={b.id} data-testid={tid(`okr-init-${b.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Chip tone="neutral"># {b.title}</Chip>
                    {countBadge(b.items.length)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {snippets.length > 0 && (
            <div data-testid={tid('okr-snippets')} className="fbokr-section">
              <p className="fbokr-label">{L.okrPanelSnippets}</p>
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
