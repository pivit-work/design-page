import { useState } from 'react';
import { createPortal } from 'react-dom';
import SegmentedControl from '../shared/SegmentedControl.jsx';

/**
 * ResourceCanvas — "리소스 투입 현황" 페이지 Pure 컴포넌트.
 *
 * 스니핏/액션 아이템과 같은 목록 화면 문법을 따른다: 헤더 카드 → 통계 카드 →
 * (경고) 배너 → 뷰 세그먼티드 → 멤버 카드 그리드 / 프로젝트 뷰, 그리고 우측
 * 상세 패널. 자체 상단바·브레드크럼은 두지 않는다.
 *
 * 프로젝트·멤버의 식별 색은 데이터라서 인라인 스타일로 받는다(그 외 색은 전부 토큰).
 * 목표치 편집 입력 상태만 캔버스가 들고, 저장은 onSaveTarget 으로 호스트에 넘긴다.
 */

const DEFAULT_LABELS = {
  title: '리소스 투입 현황',
  subtitle: '팀원별 프로젝트 투입 비율과 목표 대비 편차를 봅니다.',
  totalSnippets: '총 스니핏',
  targetHint: '세로선 = 목표 비율',
  memberView: '팀원별',
  projectView: '프로젝트별',
  hint: '카드 클릭 시 상세 패널',
  aiInsight: 'AI 인사이트',
  projectAlloc: '프로젝트 투입',
  vsTarget: '목표 대비',
  targetEdit: '목표 조정',
  save: '저장',
  cancel: '취소',
  empty: '표시할 리소스 데이터가 없습니다.',
  close: '닫기',
};

function Avatar({ member, size = 36 }) {
  const isUrl = typeof member.avatar === 'string' && member.avatar.startsWith('http');
  return (
    <span
      className="rs-avatar"
      style={{
        width: size,
        height: size,
        background: `${member.color}20`,
        color: member.color,
        fontSize: Math.round(size * 0.3),
      }}
    >
      {isUrl ? <img src={member.avatar} alt="" /> : member.avatar}
    </span>
  );
}

/** 프로젝트별 투입 비율 스택 바 + 목표 마커. */
function StackBar({ allocations, projectById, showTarget = false, height = 10 }) {
  return (
    <div className="rs-bar-wrap">
      <div className="rs-bar" style={{ height }}>
        {allocations.map((a, i) => {
          const proj = projectById(a.projectId);
          if (!proj || !a.ratio) return null;
          return (
            <span
              key={a.projectId}
              className="rs-bar-seg"
              style={{
                width: `${a.ratio}%`,
                background: proj.color,
                borderRadius:
                  i === 0 ? '9999px 0 0 9999px' : i === allocations.length - 1 ? '0 9999px 9999px 0' : 0,
              }}
            />
          );
        })}
      </div>
      {showTarget &&
        allocations.map((a, i) => {
          const proj = projectById(a.projectId);
          if (!proj || Math.abs(a.ratio - a.target) < 3) return null;
          const pos = allocations.slice(0, i).reduce((s, x) => s + x.target, 0) + a.target;
          return (
            <span
              key={`${a.projectId}-t`}
              className="rs-bar-target"
              style={{ left: `${pos}%`, height: height + 4 }}
            />
          );
        })}
    </div>
  );
}

function DiffBadge({ diff, labels, withLabel = false }) {
  if (Math.abs(diff) < 3) return null;
  return (
    <span className={`rs-diff ${diff > 0 ? 'is-over' : 'is-under'}`}>
      {withLabel ? `${labels.vsTarget} ` : ''}
      {diff > 0 ? '+' : ''}
      {diff}
      {withLabel ? '%p' : ''}
    </span>
  );
}

function MemberCard({ member, projectById, labels, onSelect }) {
  const warn = (member.insights ?? []).find((i) => i.type === 'warn');
  const totalSnippets = (member.allocations ?? []).reduce((s, a) => s + (a.snippets ?? 0), 0);
  return (
    <button
      type="button"
      className={`rs-card ${warn ? 'is-warn' : ''}`.trim()}
      data-testid="member-card"
      onClick={() => onSelect?.(member.id)}
    >
      {warn && (
        <span className="rs-card-warn">
          <span aria-hidden="true">⚠</span>
          {warn.text}
        </span>
      )}
      <span className="rs-card-head">
        <Avatar member={member} size={36} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="rs-card-name" style={{ display: 'block' }}>{member.name}</span>
          <span className="rs-card-sub" style={{ display: 'block' }}>{member.subtitle}</span>
        </span>
        <span className="rs-card-metric">
          <span className="rs-card-metric-label" style={{ display: 'block' }}>{labels.totalSnippets}</span>
          <span className="rs-card-metric-value">{totalSnippets}</span>
        </span>
      </span>

      <StackBar allocations={member.allocations ?? []} projectById={projectById} showTarget />
      <span className="rs-bar-hint">{labels.targetHint}</span>

      <span className="rs-alloc-list">
        {(member.allocations ?? []).map((a) => {
          const proj = projectById(a.projectId);
          if (!proj) return null;
          return (
            <span className="rs-alloc" key={a.projectId}>
              <span className="rs-dot" style={{ background: proj.color }} />
              <span className="rs-alloc-name">{proj.name}</span>
              <span className="rs-alloc-pct" style={{ color: proj.color }}>{a.ratio}%</span>
              <DiffBadge diff={a.ratio - a.target} labels={labels} />
            </span>
          );
        })}
      </span>
    </button>
  );
}

function ProjectView({ members, projects, labels }) {
  const rows = projects
    .map((proj) => {
      const contributors = members
        .map((m) => {
          const a = (m.allocations ?? []).find((x) => x.projectId === proj.id);
          return a ? { member: m, ratio: a.ratio, snippets: a.snippets ?? 0 } : null;
        })
        .filter(Boolean);
      return { proj, contributors, total: contributors.reduce((s, c) => s + c.snippets, 0) };
    })
    .filter((r) => r.contributors.length > 0);

  if (rows.length === 0) return <div className="rs-empty">{labels.empty}</div>;

  return (
    <div className="rs-projects">
      {rows.map(({ proj, contributors, total }) => (
        <section className="rs-project" key={proj.id} data-testid="project-row">
          <header className="rs-project-head">
            <span className="rs-dot" style={{ width: 10, height: 10, borderRadius: 3, background: proj.color }} />
            <span className="rs-project-name">{proj.name}</span>
            <span className="rs-project-meta">
              {labels.totalSnippets} {total}
            </span>
          </header>
          <div className="rs-bar" style={{ height: 8 }}>
            {contributors.map((c, i) => (
              <span
                key={c.member.id}
                className="rs-bar-seg"
                style={{
                  width: `${c.ratio}%`,
                  background: c.member.color,
                  opacity: 0.85,
                  borderRadius:
                    i === 0 ? '9999px 0 0 9999px' : i === contributors.length - 1 ? '0 9999px 9999px 0' : 0,
                }}
              />
            ))}
          </div>
          <div className="rs-project-members">
            {contributors.map((c) => (
              <span className="rs-project-member" key={c.member.id}>
                <Avatar member={c.member} size={18} />
                {c.member.name}
                <strong style={{ color: c.member.color }}>{c.ratio}%</strong>
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MemberPanel({ member, projectById, labels, onClose, onSaveTarget }) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const totalSnippets = (member.allocations ?? []).reduce((s, a) => s + (a.snippets ?? 0), 0);
  const targetTotal = (member.allocations ?? []).reduce((s, a) => s + a.target, 0);

  const save = async (alloc) => {
    const next = parseInt(value, 10);
    if (Number.isNaN(next) || next < 0 || next > 100) return;
    setSaving(true);
    try {
      await onSaveTarget?.(member.id, alloc.projectId, next);
    } finally {
      setSaving(false);
      setEditing(null);
    }
  };

  // 페이지 루트(.tl-page)가 position:fixed 라 그 안에서 오버레이를 그리면 상단바
  // (.top-nav, z=90)에 덮인다. body 로 포털해 스태킹 트랩을 피한다.
  return createPortal(
    <div className="rs-panel-overlay">
      <div className="rs-panel-scrim" role="presentation" onClick={onClose} />
      <aside className="rs-panel" data-testid="member-panel">
        <header className="rs-panel-head">
          <div className="rs-panel-id">
            <div className="rs-panel-person">
              <Avatar member={member} size={40} />
              <div>
                <div className="rs-panel-name">{member.name}</div>
                <div className="rs-panel-sub">{member.subtitle}</div>
              </div>
            </div>
            <button type="button" className="rs-panel-close" aria-label={labels.close} onClick={onClose}>
              ×
            </button>
          </div>
          <div className="rs-panel-stats">
            {(member.panelStats ?? [
              { label: labels.totalSnippets, value: totalSnippets },
              { label: labels.projectAlloc, value: (member.allocations ?? []).length },
            ]).map((s) => (
              <div className="rs-panel-stat" key={s.label}>
                <div className="rs-panel-stat-label">{s.label}</div>
                <div className="rs-panel-stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        </header>

        <div className="rs-panel-body">
          {(member.insights ?? []).length > 0 && (
            <section>
              <div className="rs-section-label">{labels.aiInsight}</div>
              {member.insights.map((ins, i) => (
                <p className={`rs-insight ${ins.type === 'warn' ? 'is-warn' : ''}`.trim()} key={i}>
                  {ins.text}
                </p>
              ))}
            </section>
          )}

          <section>
            <div className="rs-section-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{labels.projectAlloc}</span>
              <span>{labels.vsTarget} {targetTotal}%</span>
            </div>
            {(member.allocations ?? []).map((a) => {
              const proj = projectById(a.projectId);
              if (!proj) return null;
              const isEditing = editing === a.projectId;
              return (
                <div className={`rs-panel-alloc ${isEditing ? 'is-editing' : ''}`.trim()} key={a.projectId}>
                  <div className="rs-panel-alloc-head">
                    <span className="rs-dot" style={{ width: 8, height: 8, background: proj.color }} />
                    <span className="rs-panel-alloc-name">{proj.name}</span>
                    {!isEditing && <DiffBadge diff={a.ratio - a.target} labels={labels} withLabel />}
                  </div>
                  <StackBar allocations={[a]} projectById={projectById} height={8} />
                  <div className="rs-panel-alloc-head" style={{ marginTop: 10, marginBottom: 0 }}>
                    <span className="rs-alloc-name">
                      {a.ratio}% / {labels.vsTarget} {a.target}%
                    </span>
                    {isEditing ? (
                      <>
                        <input
                          className="rs-target-input"
                          type="number"
                          min="0"
                          max="100"
                          value={value}
                          aria-label={labels.targetEdit}
                          onChange={(e) => setValue(e.target.value)}
                        />
                        <button
                          type="button"
                          className="rs-btn is-primary"
                          disabled={saving}
                          onClick={() => save(a)}
                        >
                          {labels.save}
                        </button>
                        <button type="button" className="rs-btn" onClick={() => setEditing(null)}>
                          {labels.cancel}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="rs-btn"
                        onClick={() => {
                          setEditing(a.projectId);
                          setValue(String(a.target));
                        }}
                      >
                        {labels.targetEdit}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export default function ResourceCanvas({
  labels: labelsProp,
  note,
  stats = [],
  banner = null,
  view = 'member',
  onViewChange,
  members = [],
  projects = [],
  onSelectMember,
  selectedMember = null,
  onClosePanel,
  onSaveTarget,
}) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp || {}) };
  const projectById = (id) => projects.find((p) => p.id === id);
  const TONE = { default: '', brand: 'is-brand', warning: 'is-warning' };

  return (
    <main className="tl-page rs-page">
      <div className="rs-header">
        <div className="rs-header-info">
          <h1 className="rs-title">{labels.title}</h1>
          <p className="rs-subtitle">{labels.subtitle}</p>
        </div>
        {note && <span className="rs-note">{note}</span>}
      </div>

      <div className="rs-body">
        {stats.length > 0 && (
          <div className="rs-stats">
            {stats.map((s) => (
              <div className="rs-stat-card" key={s.key || s.label}>
                <span className="rs-stat-label">{s.label}</span>
                <span className={`rs-stat-value ${TONE[s.tone] || ''}`.trim()}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {banner && (
          <div className="rs-banner" data-testid="ai-banner">
            <span aria-hidden="true">✦</span>
            <div>
              <p className="rs-banner-title">{banner.title}</p>
              <p className="rs-banner-text">{banner.text}</p>
            </div>
          </div>
        )}

        <div className="rs-toolbar">
          <SegmentedControl
            items={[
              { value: 'member', label: labels.memberView },
              { value: 'project', label: labels.projectView },
            ]}
            value={view}
            onChange={onViewChange}
            ariaLabel={labels.title}
          />
          <span className="rs-hint">{labels.hint}</span>
        </div>

        {members.length === 0 ? (
          <div className="rs-empty">{labels.empty}</div>
        ) : view === 'project' ? (
          <ProjectView members={members} projects={projects} labels={labels} />
        ) : (
          <div className="rs-grid">
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                projectById={projectById}
                labels={labels}
                onSelect={onSelectMember}
              />
            ))}
          </div>
        )}
      </div>

      {selectedMember && (
        <MemberPanel
          member={selectedMember}
          projectById={projectById}
          labels={labels}
          onClose={onClosePanel}
          onSaveTarget={onSaveTarget}
        />
      )}
    </main>
  );
}
