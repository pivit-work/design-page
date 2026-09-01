import { useState } from 'react';
import {
  TeamIcon, TEAM_ICON_NAMES, resolveTeamIconName,
  PencilIcon, SearchIcon, MoreVerticalIcon, CrownIcon, StarIcon,
  UserMinusIcon, Building2Icon, UserIcon,
} from './teamIcons.jsx';

const PRESET_COLORS = ['#3B5BDB', '#2F9E44', '#E03131', '#F08C00', '#7950F2', '#1098AD', '#D6336C', '#495057'];

const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

/**
 * 멤버 행을 "프로필 열기" 버튼으로 만드는 props. onSelectMember 가 없으면 빈 객체를
 * 돌려 기존(정적 행) 동작을 그대로 유지한다 — 콜백 미주입 소비자에 영향 없음.
 */
function memberOpenProps(member, onSelectMember, labels) {
  if (!onSelectMember) return {};
  return {
    role: 'button',
    tabIndex: 0,
    title: labels.openProfile,
    'aria-label': `${member.name} ${labels.openProfile}`,
    onClick: () => onSelectMember(member.id),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelectMember(member.id);
      }
    },
  };
}

/**
 * AdminTeamDetailPanel — 선택된 팀 상세(이름/설명 편집, 아이콘·색 피커, 멤버 목록,
 * 인라인 멤버 추가, 하위 팀, 삭제). 순수 표현: labels·renderAvatar·콜백 주입.
 */
export default function AdminTeamDetailPanel({
  team, availableMembers = [], labels, levels = [], levelsUnavailable = false, renderAvatar,
  onUpdateTeam, onChangeLevel, onMemberAction, onSelectSubTeam, onSelectMember, onAddMember, onDeleteTeam,
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [menuMemberId, setMenuMemberId] = useState(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  // 계층 배정 (PW-540). 🔴 낙관적 업데이트를 쓰지 않는다 — 서버가 400 으로 되돌리는
  // 것이 «정상 응답»이다(계층 역전 검증). 그래서 정본은 언제나 서버가 준 `team.levelId`
  // 이고, 로컬 값은 요청이 도는 동안만 그 앞에 선다. 팀이 바뀌거나 서버 값이 바뀌면
  // 아래 `levelKey` 가 달라져 로컬 값이 저절로 버려진다 — effect 로 되돌리지 않는다.
  const teamLevelId = team?.levelId ?? '';
  const levelKey = `${team?.id ?? ''}:${teamLevelId}`;
  const [levelEdit, setLevelEdit] = useState({ key: '', value: '', err: '' });
  const levelLocal = levelEdit.key === levelKey ? levelEdit : null;
  const levelValue = levelLocal ? levelLocal.value : teamLevelId;
  const levelErr = levelLocal ? levelLocal.err : '';

  const changeLevel = async (nextLevelId) => {
    setLevelEdit({ key: levelKey, value: nextLevelId, err: '' });
    try {
      await onChangeLevel?.(team.id, nextLevelId || null, team.name);
    } catch (err) {
      // 직전 값(= 서버가 아직 들고 있는 값)으로 되돌리고, 사유는 Select 바로 아래에
      // 남긴다. 토스트로 흘리면 3초 뒤 사라져 「왜 안 됐는지」가 남지 않는다.
      setLevelEdit({ key: levelKey, value: teamLevelId, err: err?.message || labels.toastError });
    }
  };

  const avatar = (m, size) =>
    (renderAvatar ? renderAvatar(m, size) : <span className="tm-avatar-fallback" style={{ width: size, height: size }}>{(m.name || '?').charAt(0)}</span>);

  if (!team) {
    return (
      <div className="tm-detail-empty">
        <div>
          <div className="tm-detail-empty-icon"><Building2Icon size={40} /></div>
          <p className="tm-detail-empty-text">{labels.noTeamSelected}</p>
        </div>
      </div>
    );
  }

  if (team.isUnassigned) {
    return (
      <div className="tm-detail">
        <div className="tm-unassigned-head">
          <span className="tm-unassigned-head-icon"><UserIcon size={28} /></span>
          <div>
            <h2 className="tm-unassigned-title">{labels.unassigned}</h2>
            <p className="tm-unassigned-sub">{fill(labels.unassignedSub, { count: team.members.length })}</p>
          </div>
        </div>
        {team.members.length === 0 ? (
          <p className="tm-empty-note">{labels.noUnassignedMembers}</p>
        ) : (
          <div>
            {team.members.map((m) => (
              <div
                key={m.id}
                className={`tm-member-row${onSelectMember ? ' is-clickable' : ''}`}
                {...memberOpenProps(m, onSelectMember, labels)}
              >
                <div className="tm-member-avatar">{avatar(m, 36)}</div>
                <div className="tm-member-main">
                  <div className="tm-member-name-row"><span className="tm-member-name">{m.name}</span></div>
                  {m.jobTitle && <span className="tm-member-title">{m.jobTitle}</span>}
                </div>
                <span className="tm-tag is-gray">{labels.unassigned}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const leaders = team.members.filter((m) => m.isLeader);
  const regulars = team.members.filter((m) => !m.isLeader);

  const saveDescription = (val) => {
    const trimmed = val.trim();
    if (trimmed !== (team.description ?? '')) {
      onUpdateTeam?.(team.id, { description: trimmed || undefined });
    }
    setEditingDescription(false);
  };

  const candidates = availableMembers.filter((m) => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return m.name.toLowerCase().includes(q)
      // 표시 이름이 사내 호칭이면 본명은 화면 어디에도 없다 — 그래도 본명으로 찾을 수
      // 있어야 한다(소비자가 fullName 으로 넘긴다). 검색 전용, 표시에는 쓰지 않는다.
      || (m.fullName?.toLowerCase().includes(q) ?? false)
      || (m.jobTitle?.toLowerCase().includes(q) ?? false)
      // 소속 경로로도 찾게 한다 — '개발본부' 로 그 아래 사람들을 훑을 수 있어야 한다.
      || (m.orgPath?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="tm-detail">
      {/* 팀 헤더 */}
      <div className="tm-team-head">
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="tm-icon-btn"
            onClick={() => setIconPickerOpen((p) => !p)}
            style={{ background: team.color || 'var(--text-tertiary)', border: 'none' }}
            aria-label={labels.pickIcon}
          >
            <TeamIcon name={team.icon} size={26} color="#fff" strokeWidth={2.25} />
          </button>
          {iconPickerOpen && (
            <div className="tm-popover" style={{ top: 58, left: 0, width: 220 }}>
              <div className="tm-icon-grid">
                {TEAM_ICON_NAMES.map((ic) => (
                  <button
                    type="button"
                    key={ic}
                    className={`tm-icon-grid-item${resolveTeamIconName(team.icon) === ic ? ' is-selected' : ''}`}
                    onClick={() => { onUpdateTeam?.(team.id, { icon: ic }); setIconPickerOpen(false); }}
                  >
                    <TeamIcon name={ic} size={20} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="tm-team-head-main">
          {editingName ? (
            <div className="tm-name-edit-row">
              <input
                autoFocus
                className="tm-name-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                onBlur={() => {
                  if (nameInput.trim() && nameInput !== team.name) {
                    onUpdateTeam?.(team.id, { name: nameInput.trim() });
                  }
                  setEditingName(false);
                }}
              />
            </div>
          ) : (
            <h2
              className="tm-team-name"
              onClick={() => { setNameInput(team.name); setEditingName(true); }}
              title={labels.editTeam}
            >
              <span>{team.name}</span>
              <span className="tm-team-name-pencil" aria-hidden><PencilIcon size={14} /></span>
            </h2>
          )}

          <div className="tm-breadcrumb">
            <span>{labels.parentTeam}:</span>
            {team.parentName ? (
              <span className="tm-breadcrumb-parent">
                {team.parentIcon && <TeamIcon name={team.parentIcon} size={12} />}
                {team.parentName}
              </span>
            ) : (
              <span>{labels.topLevel}</span>
            )}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="tm-color-btn"
            data-testid="tm-color-open"
            onClick={() => setColorPickerOpen((p) => !p)}
            style={{ background: team.color || 'var(--text-tertiary)', boxShadow: `0 0 0 1.5px ${team.color || '#9CA3AF'}` }}
            aria-label={labels.pickColor}
          />
          {colorPickerOpen && (
            <div className="tm-popover" style={{ top: 40, right: 0, width: 180 }}>
              <p className="tm-popover-label">{labels.pickColor}</p>
              <div className="tm-color-grid">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    data-testid="tm-color-swatch"
                    className={`tm-color-swatch${team.color === c ? ' is-selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => { onUpdateTeam?.(team.id, { color: c }); setColorPickerOpen(false); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 계층 — 자리는 «상위 팀 breadcrumb 바로 아래»다 (PW-540 ②A · 정책서 §2-M-3).
           상위 팀과 계층은 둘 다 «구조» 속성이라 붙여 두고, 이름·설명은 표시 속성이라
           그 아래로 간다.
           ⛔ 이것은 계층 «목록»을 이 화면에 되살린 것이 아니다 — 목록(이름·순서·보관)의
              편집 주인은 여전히 「계층」 탭이고, 여기는 단위에 «배정»하는 자리다. */}
      <div className="tm-section">
        <label className="tm-section-label" htmlFor="tm-level-select">{labels.level}</label>
        <select
          id="tm-level-select"
          className={`tm-level-select${levelValue ? '' : ' is-unset'}${levelErr ? ' is-invalid' : ''}`}
          data-testid="tm-level-select"
          value={levelValue}
          /* 목록을 못 받았으면 «고를 수 없게» 둔다. 열어 두면 선택지가 「계층 미지정」
             하나뿐이라, 관리자가 그것을 고르는 순간 멀쩡한 배정이 지워진다. */
          disabled={levelsUnavailable}
          onChange={(e) => { void changeLevel(e.target.value); }}
        >
          {/* 미지정은 «정상» 선택지다 — 경고 톤을 쓰지 않는다 (조직장 미지정과 같은 규칙) */}
          <option value="">{labels.levelUnassigned}</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
          {/* 목록에 없는 계층에 «이미» 배정돼 있으면 현재값만 남긴다. 빈칸으로 두면 아직
              배정돼 있는 값을 「미지정」으로 오독한다 (정책서 §10 N2).
              🔴 「(보관됨)」은 **목록을 실제로 받아 본 뒤에만** 붙인다 — 목록을 못 받은
              상태에서 붙이면 멀쩡히 살아 있는 계층을 보관된 것으로 잘못 부른다. */}
          {teamLevelId && !levels.some((l) => l.id === teamLevelId) && (
            <option value={teamLevelId}>
              {levelsUnavailable || levels.length === 0
                ? (team.levelName || team.type || teamLevelId)
                : fill(labels.levelArchivedOption, { name: team.levelName || team.type || teamLevelId })}
            </option>
          )}
        </select>
        {levelErr ? (
          <p className="tm-level-error" role="alert" data-testid="tm-level-error">{levelErr}</p>
        ) : levelsUnavailable ? (
          <p className="tm-level-error" role="alert" data-testid="tm-level-unavailable">{labels.levelLoadFailed}</p>
        ) : (
          <p className="tm-level-hint">{labels.levelHint}</p>
        )}
      </div>

      {/* 설명 */}
      <div className="tm-section">
        <label className="tm-section-label">{labels.description}</label>
        {editingDescription ? (
          <textarea
            autoFocus
            className="tm-desc-textarea"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            onBlur={() => saveDescription(descriptionInput)}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditingDescription(false); }}
            maxLength={200}
            rows={3}
            placeholder={labels.descriptionPlaceholder}
            data-testid="description-textarea"
          />
        ) : (
          <p
            className={`tm-desc-display${team.description ? '' : ' is-empty'}`}
            onClick={() => { setDescriptionInput(team.description ?? ''); setEditingDescription(true); }}
            data-testid="description-display"
          >
            {team.description || labels.descriptionPlaceholder}
          </p>
        )}
      </div>

      {/* 멤버 */}
      <div className="tm-section">
        <div className="tm-section-head">
          <label className="tm-section-label">
            {labels.members} <span className="tm-section-label-count">({team.members.length})</span>
          </label>
        </div>

        {team.members.length === 0 ? (
          <p className="tm-empty-note">{labels.noMembers}</p>
        ) : (
          <div>
            {[...leaders, ...regulars].map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                teamId={team.id}
                labels={labels}
                renderAvatar={avatar}
                showMenu={menuMemberId === m.id}
                onToggleMenu={() => setMenuMemberId(menuMemberId === m.id ? null : m.id)}
                onAction={onMemberAction}
                onSelectMember={onSelectMember}
              />
            ))}
          </div>
        )}

        {onAddMember && (
          <div className="tm-add-member">
            <div
              className={`tm-add-member-box${memberSearchOpen ? ' is-open' : ''}`}
              onClick={() => setMemberSearchOpen(true)}
            >
              <span className="tm-search-icon"><SearchIcon size={14} /></span>
              <input
                className="tm-add-member-input"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onFocus={() => setMemberSearchOpen(true)}
                placeholder={labels.searchMember}
                data-testid="member-search"
              />
            </div>
            {memberSearchOpen && (
              candidates.length > 0 ? (
                <div className="tm-add-member-dropdown">
                  {candidates.slice(0, 50).map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      className="tm-add-member-result"
                      onClick={() => {
                        onAddMember(team.id, m.id);
                        setMemberSearch('');
                        setMemberSearchOpen(false);
                      }}
                    >
                      {avatar(m, 28)}
                      <div className="tm-add-member-result-main">
                        <p className="tm-add-member-result-name">{m.name}</p>
                        {m.jobTitle && <p className="tm-add-member-result-title">{m.jobTitle}</p>}
                        {/* 현재 소속을 전체 경로로 — 팀명만 보면 어느 본부 밑인지,
                            동명이팀 중 어느 쪽인지 알 수 없다(PW-112, §5-A P4). */}
                        {m.orgPath && <p className="tm-add-member-result-title">{m.orgPath}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              ) : memberSearch ? (
                <div className="tm-add-member-dropdown">
                  <div className="tm-add-member-noresult">{labels.noSearchResults}</div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* 하위 팀 */}
      {team.subTeams.length > 0 && (
        <div className="tm-section">
          <label className="tm-section-label">
            {labels.subTeams} ({team.subTeams.length})
          </label>
          <div className="tm-subteam-list">
            {team.subTeams.map((sub) => (
              <button
                type="button"
                key={sub.id}
                className="tm-subteam-chip"
                onClick={() => onSelectSubTeam?.(sub.id)}
                style={{ background: `${sub.color || '#888'}11`, borderColor: `${sub.color || '#888'}44` }}
              >
                <span className="tm-subteam-chip-icon"><TeamIcon name={sub.icon} size={14} color={sub.color || 'var(--text-secondary)'} /></span>
                <span className="tm-subteam-chip-name">{sub.name}</span>
                <span className="tm-subteam-chip-count">{sub.memberCount}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {onDeleteTeam && (
        <div className="tm-delete-section">
          <button type="button" className="tm-delete-btn" onClick={() => onDeleteTeam(team.id)}>
            {labels.deleteTeam}
          </button>
        </div>
      )}
    </div>
  );
}

function MemberRow({ member, teamId, labels, renderAvatar, showMenu, onToggleMenu, onAction, onSelectMember }) {
  // 퇴사자는 조직장으로 지정할 수 없다(정책 G2). 이미 조직장인 사람의 **해제**는
  // 막지 않는다 — 퇴사 전에 지정된 자리를 내려놓는 길까지 막으면 갇힌다.
  const leaderBlocked = !member.isLeader && member.canBeLeader === false;
  const menuItems = [
    {
      action: 'setLeader',
      label: member.isLeader ? labels.removeLeader : labels.setLeader,
      Icon: CrownIcon,
      disabled: leaderBlocked,
      title: leaderBlocked ? labels.leaderResignedHint : undefined,
    },
    { action: 'setPrimary', label: labels.setPrimary, Icon: StarIcon },
    { action: 'remove', label: labels.removeMember, Icon: UserMinusIcon, danger: true },
  ];

  return (
    <div
      className={`tm-member-row${onSelectMember ? ' is-clickable' : ''}`}
      {...memberOpenProps(member, onSelectMember, labels)}
    >
      <div className="tm-member-avatar">{renderAvatar(member, 36)}</div>
      <div className="tm-member-main">
        <div className="tm-member-name-row">
          <span className="tm-member-name">{member.name}</span>
          {member.isLeader && <span className="tm-tag is-amber">{labels.leader}</span>}
          {member.isPrimary && <span className="tm-tag is-blue">{labels.primary}</span>}
        </div>
        {member.jobTitle && <span className="tm-member-title">{member.jobTitle}</span>}
      </div>

      {onAction && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="tm-member-menu-btn"
            aria-label={labels.openMenu}
            onClick={(e) => { e.stopPropagation(); onToggleMenu(); }}
          >
            <MoreVerticalIcon size={16} />
          </button>
          {showMenu && (
            <div className="tm-menu" style={{ top: '100%', right: 0 }}>
              {menuItems.map(({ action, label, Icon, danger, disabled, title }) => (
                <button
                  type="button"
                  key={action}
                  className={`tm-menu-item${danger ? ' is-danger' : ''}${disabled ? ' is-disabled' : ''}`}
                  disabled={disabled}
                  title={title}
                  onClick={(e) => { e.stopPropagation(); onAction(action, teamId, member.id); onToggleMenu(); }}
                >
                  <span className="tm-menu-item-icon"><Icon size={14} /></span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
