import { useEffect, useRef, useState } from 'react';

/**
 * MySettingsCanvas — 내 설정 화면 정본.
 *
 * pivit-specs `K. 내-설정/my-settings-view.jsx` 시안을 design-page 토큰/프리미티브
 * (admin-card, admin-emp-input, admin-notif-toggle, admin-notif-btn, admin-notif-banner,
 * admin-notif-modal-*)로 포팅한 것. 스타일은 settings.css(msc-*) + admin.css.
 *
 * 순수/controlled 컴포넌트 — 데이터는 전부 props, 사용자 액션은 on* 콜백으로 방출.
 * 내부 state 는 편집 draft(프로필 폼, 비밀번호 폼)와 모달 open 여부 등 ephemeral UI 뿐.
 *
 * 탭 구성(설정 그룹): profile | visibility | notifications | integrations | security.
 * 프로필 그룹 확장 탭(내 프로필/가족/조직/성과/보상, PF1~PF4)은 백엔드 준비 후
 * tabs prop 에 추가하는 방식으로 확장한다.
 *
 * 2FA 는 다음 스프린트로 연기되어 이 캔버스에 없다 (2026-07-18 결정).
 */

const DEFAULT_LABELS = {
  navGroups: { profile: '프로필', settings: '설정' },
  tabs: {
    profile: '기본 정보',
    visibility: '공개 범위',
    notifications: '알림',
    integrations: '개인 연동',
    security: '보안',
  },
  profile: {
    photoSection: '프로필 사진',
    photoInUse: '사용 중',
    photoHelp: '사진을 클릭하면 프로필 사진으로 설정됩니다.',
    basicInfo: '기본 정보',
    name: '이름',
    title: '직함',
    email: '이메일',
    emailReadonlyHint: '이메일은 로그인 계정입니다. 변경은 관리자에게 문의하세요.',
    phone: '전화번호',
    phoneHint: '개인 휴대폰 번호입니다.',
    bio: '소개 (Bio)',
    bioHint: '타임라인·공개 카드에 표시됩니다.',
    bioPlaceholder: '나를 한 줄로 소개해 보세요',
    location: '위치',
    locationPlaceholder: '서울 마포구',
    workInfo: '근무 정보',
    workStart: '근무 시작 시간',
    workEnd: '근무 종료 시간',
    workHoursHint: '공개 카드와 조직도 툴팁에 표시됩니다.',
    timezone: '타임존',
    joinDate: '입사일',
    joinDateHint: '입사일은 어드민에서만 변경 가능합니다.',
    save: '변경사항 저장',
    saving: '저장 중…',
    saved: '✓ 저장됐습니다',
    saveFailed: '저장 실패 — 다시 시도',
  },
  upload: {
    title: '사진 업로드',
    dropTitle: '클릭하거나 사진을 끌어놓으세요',
    dropSub: 'JPG · PNG · WEBP · 최대 5MB',
    changeFile: '다른 사진 선택하기',
    cancel: '취소',
    confirm: '프로필에 추가',
    confirmEmpty: '사진을 선택하세요',
  },
  visibility: {
    banner:
      'Pivit의 공개 범위는 2단계로 구성됩니다. 항목별로 공개 여부를 직접 결정할 수 있으며, 비활성화된 항목은 나 외에 누구에게도 표시되지 않습니다.',
    saveError: '공개 범위 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  },
  integrations: {
    banner:
      '개인 연동은 나만의 데이터 흐름을 설정합니다. 회사 전체 연동은 어드민 설정에서 관리합니다.',
    connected: '연결됨',
    comingSoon: '준비 중',
    managedByOrg: '어드민에서 관리',
    connect: '연결하기',
    disconnect: '연결 해제',
    sync: '지금 동기화',
    syncing: '동기화 중…',
    loading: '불러오는 중…',
    loadError: '연동 정보를 불러오지 못했습니다.',
  },
  security: {
    changePassword: '비밀번호 변경',
    currentPassword: '현재 비밀번호',
    currentPwPlaceholder: '현재 비밀번호 입력',
    newPassword: '새 비밀번호',
    newPwHint: '8자 이상, 영문·숫자·특수문자 포함을 권장합니다.',
    newPwPlaceholder: '새 비밀번호 (8자 이상)',
    confirmPassword: '새 비밀번호 확인',
    confirmPwPlaceholder: '새 비밀번호 재입력',
    pwMismatch: '비밀번호가 일치하지 않습니다',
    pwSave: '비밀번호 변경',
    pwSaving: '변경 중…',
    pwSaved: '✓ 변경됐습니다',
    activeSessions: '활성 세션',
    sessionsEmpty: '세션 목록은 준비 중입니다.',
    sessionCurrent: '현재',
    endSession: '종료',
    logout: '로그아웃',
    logoutDesc: '이 기기에서 로그아웃합니다.',
    dangerZone: '위험 구역',
    deleteAccount: '계정 삭제',
    deleteAccountDesc: '모든 데이터가 영구 삭제됩니다.',
    deleteAccountBtn: '삭제 요청',
    deleteConfirmMessage:
      '정말 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 영구적으로 삭제됩니다.',
    deleteCancel: '취소',
    deleteConfirmBtn: '영구 삭제',
    deleteProcessing: '삭제 중…',
    deleteError: '계정 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  },
};

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

/* ── 토글 스위치 (admin.css 공유 클래스) ─────────────── */
function Toggle({ value, onChange, ariaLabel, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={`admin-notif-toggle${value ? ' is-on' : ''}`}
    >
      <span className="admin-notif-toggle-knob" />
    </button>
  );
}

function Card({ children, className = '', testId }) {
  return (
    <div className={`admin-card msc-card ${className}`.trim()} data-testid={testId}>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="msc-field">
      <label className="msc-field-label">{label}</label>
      {hint && <p className="msc-field-hint">{hint}</p>}
      {children}
    </div>
  );
}

function Banner({ children, testId }) {
  return (
    <div className="admin-notif-banner" data-testid={testId}>
      <span className="admin-notif-banner-icon" aria-hidden="true">
        ℹ
      </span>
      <p className="admin-notif-banner-text">{children}</p>
    </div>
  );
}

function AvatarBox({ photoUrl, initial, color, className, testId }) {
  const fallbackStyle = photoUrl
    ? undefined
    : { background: `${color || '#2dbd82'}20`, color: color || '#2dbd82' };
  return (
    <div className={className} style={fallbackStyle} data-testid={testId}>
      {photoUrl ? <img src={photoUrl} alt="" /> : initial}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ */

export default function MySettingsCanvas({
  activeTab = 'profile',
  onTabChange,
  tabs = [
    { id: 'profile', group: 'profile' },
    { id: 'visibility', group: 'settings' },
    { id: 'notifications', group: 'settings' },
    { id: 'integrations', group: 'settings' },
    { id: 'security', group: 'settings' },
  ],
  me = {},
  /* 프로필 */
  profile = {},
  timezoneOptions = [],
  photos = [],
  activePhotoId = null,
  maxPhotos = 5,
  minPhotos = 0,
  photoBusy = false,
  onSelectPhoto,
  onAddPhoto,
  onDeletePhoto,
  profileSaveState = 'idle',
  onSaveProfile,
  /* 공개 범위 */
  visibilityGroups = [],
  visibilityError = null,
  onToggleVisibility,
  /* 알림 */
  notifGroups = [],
  onToggleNotif,
  /* 개인 연동 */
  integrations = [],
  integrationsLoading = false,
  integrationsError = false,
  onConnectIntegration,
  onDisconnectIntegration,
  onSyncIntegration,
  onToggleIntegrationSetting,
  /* 보안 */
  passwordState = { saving: false, saved: false, error: null },
  onChangePassword,
  sessions = [],
  onEndSession,
  onLogout,
  deleteAccountState = { loading: false, error: false },
  onDeleteAccount,
  labels: providedLabels,
  baseUrl = '/',
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);

  /* ── 프로필 draft — profile prop 이 바뀌면 렌더 중 재시드 ── */
  const [draft, setDraft] = useState(profile);
  const [seededFrom, setSeededFrom] = useState(profile);
  if (profile !== seededFrom) {
    setSeededFrom(profile);
    setDraft(profile);
  }
  const setField = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }));

  /* ── 업로드 모달 ── */
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDrag, setUploadDrag] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const previewUrlRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPendingFile(file);
    setUploadPreview(url);
  }

  function closeUpload() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setUploadOpen(false);
    setPendingFile(null);
    setUploadPreview(null);
  }

  function confirmUpload() {
    if (!pendingFile) return;
    onAddPhoto && onAddPhoto(pendingFile);
    closeUpload();
  }

  /* ── 비밀번호 폼 ── */
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const pwSavedPrev = useRef(passwordState.saved);
  useEffect(() => {
    if (passwordState.saved && !pwSavedPrev.current) {
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
    pwSavedPrev.current = passwordState.saved;
  }, [passwordState.saved]);
  const pwReady = Boolean(currentPw) && newPw.length >= 8 && newPw === confirmPw;

  /* ── 계정 삭제 확인 모달 ── */
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0] || null;
  const groups = [...new Set(tabs.map((t) => t.group))];

  const saveLabel =
    profileSaveState === 'saving'
      ? labels.profile.saving
      : profileSaveState === 'saved'
        ? labels.profile.saved
        : profileSaveState === 'error'
          ? labels.profile.saveFailed
          : labels.profile.save;

  return (
    <div className="msc-canvas" data-testid="my-settings-canvas">
      <div className="msc-layout">
        {/* ── 좌측 내비게이션 ── */}
        <nav className="msc-nav" data-testid="settings-nav">
          <div className="msc-nav-profile">
            <AvatarBox
              photoUrl={activePhoto ? activePhoto.url : me.avatarUrl}
              initial={me.initial}
              color={me.color}
              className="msc-nav-avatar"
              testId="settings-nav-avatar"
            />
            <div className="msc-nav-name">{me.name}</div>
            <div className="msc-nav-title">{me.title}</div>
          </div>

          {groups.map((group, gi) => (
            <div key={group} style={{ display: 'contents' }}>
              {gi > 0 && <hr className="msc-nav-divider" />}
              <div className="msc-nav-group-label">{labels.navGroups[group] || group}</div>
              {tabs
                .filter((t) => t.group === group)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`msc-nav-btn${activeTab === t.id ? ' is-active' : ''}`}
                    onClick={() => onTabChange && onTabChange(t.id)}
                    data-testid={`settings-tab-${t.id}`}
                  >
                    {t.label || labels.tabs[t.id] || t.id}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        {/* ── 콘텐츠 ── */}
        <div className="msc-content">
          {/* ═══ 기본 정보 ═══ */}
          {activeTab === 'profile' && (
            <>
              <Card testId="profile-photo-card">
                <div className="admin-section-label">{labels.profile.photoSection}</div>
                <div className="msc-photo-section">
                  <div style={{ flexShrink: 0 }}>
                    <AvatarBox
                      photoUrl={activePhoto ? activePhoto.url : null}
                      initial={me.initial}
                      color={me.color}
                      className="msc-photo-preview"
                      testId="profile-photo-preview"
                    />
                    {activePhoto && <div className="msc-photo-caption">{labels.profile.photoInUse}</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="msc-photo-tiles">
                      {photos.map((photo) => (
                        <div
                          key={photo.id}
                          className={`msc-photo-tile${
                            activePhoto && activePhoto.id === photo.id ? ' is-active' : ''
                          }`}
                          onClick={() => onSelectPhoto && onSelectPhoto(photo.id)}
                        >
                          <div className="msc-photo-tile-img">
                            <img src={photo.url} alt="" />
                          </div>
                          {activePhoto && activePhoto.id === photo.id && (
                            <div className="msc-photo-tile-check">✓</div>
                          )}
                          {photos.length > minPhotos && onDeletePhoto && (
                            <button
                              type="button"
                              className="msc-photo-tile-del"
                              aria-label={`${labels.profile.photoSection} 삭제`}
                              data-testid={`photo-delete-${photo.id}`}
                              disabled={photoBusy}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePhoto(photo.id);
                              }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {photos.length < maxPhotos && onAddPhoto && (
                        <button
                          type="button"
                          className="msc-photo-add"
                          aria-label={labels.upload.title}
                          data-testid="photo-add-btn"
                          disabled={photoBusy}
                          onClick={() => setUploadOpen(true)}
                        >
                          +
                        </button>
                      )}
                    </div>
                    <p className="msc-photo-help">{labels.profile.photoHelp}</p>
                  </div>
                </div>
              </Card>

              <Card testId="profile-basic-card">
                <div className="admin-section-label">{labels.profile.basicInfo}</div>
                <div className="msc-grid-2col">
                  <Field label={labels.profile.name}>
                    <input
                      className="admin-emp-input"
                      value={draft.name || ''}
                      onChange={(e) => setField('name')(e.target.value)}
                      aria-label={labels.profile.name}
                    />
                  </Field>
                  <Field label={labels.profile.title}>
                    <input
                      className="admin-emp-input"
                      value={draft.title || ''}
                      onChange={(e) => setField('title')(e.target.value)}
                      aria-label={labels.profile.title}
                    />
                  </Field>
                  <Field label={labels.profile.email}>
                    <input
                      className="admin-emp-input is-readonly"
                      type="email"
                      value={profile.email || ''}
                      readOnly
                      aria-label={labels.profile.email}
                    />
                    <p className="msc-field-note">{labels.profile.emailReadonlyHint}</p>
                  </Field>
                  <Field label={labels.profile.phone} hint={labels.profile.phoneHint}>
                    <input
                      className="admin-emp-input"
                      value={draft.phone || ''}
                      onChange={(e) => setField('phone')(e.target.value)}
                      aria-label={labels.profile.phone}
                    />
                  </Field>
                </div>
                <Field label={labels.profile.bio} hint={labels.profile.bioHint}>
                  <textarea
                    className="admin-emp-input"
                    rows={3}
                    maxLength={200}
                    value={draft.bio || ''}
                    onChange={(e) => setField('bio')(e.target.value)}
                    placeholder={labels.profile.bioPlaceholder}
                    aria-label={labels.profile.bio}
                    style={{ resize: 'none', lineHeight: 1.7 }}
                  />
                  <div className="msc-char-count">{(draft.bio || '').length} / 200</div>
                </Field>
                <Field label={labels.profile.location}>
                  <input
                    className="admin-emp-input"
                    value={draft.location || ''}
                    onChange={(e) => setField('location')(e.target.value)}
                    placeholder={labels.profile.locationPlaceholder}
                    aria-label={labels.profile.location}
                  />
                </Field>
              </Card>

              <Card testId="profile-work-card">
                <div className="admin-section-label">{labels.profile.workInfo}</div>
                <div className="msc-grid-2col">
                  <Field label={labels.profile.workStart} hint={labels.profile.workHoursHint}>
                    <input
                      className="admin-emp-input"
                      type="time"
                      value={draft.workStart || ''}
                      onChange={(e) => setField('workStart')(e.target.value)}
                      aria-label={labels.profile.workStart}
                    />
                  </Field>
                  <Field label={labels.profile.workEnd} hint={labels.profile.workHoursHint}>
                    <input
                      className="admin-emp-input"
                      type="time"
                      value={draft.workEnd || ''}
                      onChange={(e) => setField('workEnd')(e.target.value)}
                      aria-label={labels.profile.workEnd}
                    />
                  </Field>
                </div>
                <Field label={labels.profile.timezone}>
                  <select
                    className="admin-emp-input"
                    value={draft.timezone || ''}
                    onChange={(e) => setField('timezone')(e.target.value)}
                    aria-label={labels.profile.timezone}
                    data-testid="profile-timezone-select"
                  >
                    {timezoneOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={labels.profile.joinDate}>
                  <input
                    className="admin-emp-input is-readonly"
                    type="date"
                    value={profile.joinDate || ''}
                    readOnly
                    aria-label={labels.profile.joinDate}
                  />
                  <p className="msc-field-note">{labels.profile.joinDateHint}</p>
                </Field>
              </Card>

              <button
                type="button"
                className={`msc-save-btn${
                  profileSaveState === 'saved' ? ' is-saved' : profileSaveState === 'error' ? ' is-error' : ''
                }`}
                disabled={profileSaveState === 'saving'}
                onClick={() => onSaveProfile && onSaveProfile(draft)}
                data-testid="profile-save-btn"
              >
                {saveLabel}
              </button>
            </>
          )}

          {/* ═══ 공개 범위 ═══ */}
          {activeTab === 'visibility' && (
            <>
              <Banner testId="visibility-banner">{labels.visibility.banner}</Banner>
              {visibilityError && (
                <div className="msc-input-error" data-testid="visibility-error">
                  {visibilityError}
                </div>
              )}
              {visibilityGroups.map((group) => (
                <Card key={group.key} className={`is-${group.tone || 'brand'}`} testId={`visibility-group-${group.key}`}>
                  <div className="msc-vis-header">
                    {group.icon && <span style={{ fontSize: 16 }}>{group.icon}</span>}
                    <div style={{ flex: 1 }}>
                      <div className="msc-vis-group-title">{group.title}</div>
                      <div className="msc-vis-group-desc">{group.desc}</div>
                    </div>
                  </div>
                  <div className="msc-vis-items">
                    {group.items.map((item) => (
                      <div key={item.key} className="msc-row">
                        <span className="msc-row-label">{item.label}</span>
                        {group.locked ? (
                          <span className={`msc-vis-badge is-${group.tone || 'brand'}`}>{group.badgeLabel}</span>
                        ) : (
                          <Toggle
                            value={Boolean(item.on)}
                            onChange={(next) => onToggleVisibility && onToggleVisibility(item.key, next)}
                            ariaLabel={item.label}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* ═══ 알림 ═══ */}
          {activeTab === 'notifications' && (
            <>
              {notifGroups.map((group) => (
                <Card key={group.key} testId={`notif-group-${group.key}`}>
                  <div className="admin-section-label">{group.title}</div>
                  <div className="msc-notif-items">
                    {group.items.map((item) => (
                      <div key={item.key} className="msc-row">
                        <div>
                          <div className="msc-notif-label">{item.label}</div>
                          <div className="msc-notif-sub">{item.sub}</div>
                        </div>
                        <Toggle
                          value={Boolean(item.on)}
                          onChange={(next) => onToggleNotif && onToggleNotif(item.key, next)}
                          ariaLabel={item.label}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* ═══ 개인 연동 ═══ */}
          {activeTab === 'integrations' && (
            <>
              <Banner testId="integrations-banner">{labels.integrations.banner}</Banner>
              {integrationsError ? (
                <div className="msc-empty-state" data-testid="integrations-error">
                  {labels.integrations.loadError}
                </div>
              ) : integrationsLoading ? (
                <div className="msc-empty-state" data-testid="integrations-loading">
                  {labels.integrations.loading}
                </div>
              ) : (
                integrations.map((intg) => (
                  <Card key={intg.id} testId={`integration-${intg.id}`}>
                    <div className="msc-intg-row">
                      <span className="msc-intg-icon">
                        {intg.logo ? <img src={`${baseUrl}${intg.logo}`.replace('//', '/')} alt="" /> : null}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span className="msc-intg-name">{intg.name}</span>
                          {intg.connected && (
                            <span className="msc-intg-badge">{labels.integrations.connected}</span>
                          )}
                          {intg.comingSoon && (
                            <span className="msc-intg-badge is-muted">{labels.integrations.comingSoon}</span>
                          )}
                          {intg.managedByOrg && (
                            <span className="msc-intg-badge is-muted">{labels.integrations.managedByOrg}</span>
                          )}
                        </div>
                        <p className="msc-intg-desc">{intg.desc}</p>
                        {(intg.metaLines || []).map((line, i) => (
                          <span key={i} className="msc-intg-meta">
                            {line}
                          </span>
                        ))}
                      </div>
                      <div className="msc-intg-actions">
                        {intg.connected && intg.syncable && onSyncIntegration && (
                          <button
                            type="button"
                            className="admin-notif-btn is-soft is-sm"
                            disabled={intg.busy || intg.syncing}
                            onClick={() => onSyncIntegration(intg.id)}
                            data-testid={`integration-sync-${intg.id}`}
                          >
                            {intg.syncing ? labels.integrations.syncing : labels.integrations.sync}
                          </button>
                        )}
                        {!intg.comingSoon && !intg.managedByOrg && (
                          <button
                            type="button"
                            className={`admin-notif-btn is-sm ${intg.connected ? 'is-danger' : 'is-soft'}`}
                            disabled={intg.busy || intg.syncing}
                            onClick={() =>
                              intg.connected
                                ? onDisconnectIntegration && onDisconnectIntegration(intg.id)
                                : onConnectIntegration && onConnectIntegration(intg.id)
                            }
                            data-testid={`integration-${intg.connected ? 'disconnect' : 'connect'}-${intg.id}`}
                          >
                            {intg.connected ? labels.integrations.disconnect : labels.integrations.connect}
                          </button>
                        )}
                      </div>
                    </div>

                    {intg.warning && (
                      <div className="admin-notif-banner" style={{ marginTop: 12 }} data-testid={`integration-warning-${intg.id}`}>
                        <span className="admin-notif-banner-icon" aria-hidden="true">
                          ⚠
                        </span>
                        <p className="admin-notif-banner-text">{intg.warning}</p>
                      </div>
                    )}
                    {intg.error && (
                      <div className="msc-input-error" style={{ marginTop: 10 }} data-testid={`integration-error-${intg.id}`}>
                        {intg.error}
                      </div>
                    )}

                    {intg.connected && intg.subSettings && intg.subSettings.length > 0 && (
                      <div className="msc-intg-sub">
                        <div className="msc-intg-sub-title">{intg.subSettingsTitle}</div>
                        {intg.subSettings.map((s) => (
                          <div key={s.key} className="msc-row">
                            <span className="msc-intg-sub-label">{s.label}</span>
                            <Toggle
                              value={Boolean(s.on)}
                              onChange={(next) =>
                                onToggleIntegrationSetting && onToggleIntegrationSetting(intg.id, s.key, next)
                              }
                              ariaLabel={s.label}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </>
          )}

          {/* ═══ 보안 ═══ */}
          {activeTab === 'security' && (
            <>
              <Card testId="security-password-card">
                <div className="admin-section-label">{labels.security.changePassword}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field label={labels.security.currentPassword}>
                    <input
                      className="admin-emp-input"
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder={labels.security.currentPwPlaceholder}
                      aria-label={labels.security.currentPassword}
                    />
                  </Field>
                  <Field label={labels.security.newPassword} hint={labels.security.newPwHint}>
                    <input
                      className="admin-emp-input"
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder={labels.security.newPwPlaceholder}
                      aria-label={labels.security.newPassword}
                    />
                  </Field>
                  <Field label={labels.security.confirmPassword}>
                    <input
                      className="admin-emp-input"
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder={labels.security.confirmPwPlaceholder}
                      aria-label={labels.security.confirmPassword}
                    />
                    {confirmPw && newPw !== confirmPw && (
                      <p className="msc-input-error" data-testid="pw-mismatch">
                        {labels.security.pwMismatch}
                      </p>
                    )}
                  </Field>
                </div>
                {passwordState.error && (
                  <p className="msc-input-error" data-testid="pw-error">
                    {passwordState.error}
                  </p>
                )}
                <button
                  type="button"
                  className={`msc-save-btn${passwordState.saved ? ' is-saved' : ''}`}
                  style={{ marginTop: 12, padding: '10px 0', fontSize: 13 }}
                  disabled={!pwReady || passwordState.saving}
                  onClick={() =>
                    onChangePassword && onChangePassword({ currentPassword: currentPw, newPassword: newPw })
                  }
                  data-testid="pw-save-btn"
                >
                  {passwordState.saving
                    ? labels.security.pwSaving
                    : passwordState.saved
                      ? labels.security.pwSaved
                      : labels.security.pwSave}
                </button>
              </Card>

              <Card testId="security-sessions-card">
                <div className="admin-section-label">{labels.security.activeSessions}</div>
                {sessions.length === 0 ? (
                  <div className="msc-empty-state" data-testid="sessions-empty">
                    {labels.security.sessionsEmpty}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {sessions.map((s) => (
                      <div key={s.id} className={`msc-session-row${s.current ? ' is-current' : ''}`}>
                        <div style={{ flex: 1 }}>
                          <div className="msc-notif-label">
                            {s.device}
                            {s.current && (
                              <span className="msc-vis-badge is-brand" style={{ marginLeft: 7 }}>
                                {labels.security.sessionCurrent}
                              </span>
                            )}
                          </div>
                          <div className="msc-notif-sub">{s.meta}</div>
                        </div>
                        {!s.current && onEndSession && (
                          <button
                            type="button"
                            className="admin-notif-btn is-soft is-sm"
                            onClick={() => onEndSession(s.id)}
                          >
                            {labels.security.endSession}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card testId="security-logout-card">
                <div className="msc-row">
                  <div>
                    <div className="msc-row-title">{labels.security.logout}</div>
                    <div className="msc-row-sub">{labels.security.logoutDesc}</div>
                  </div>
                  <button
                    type="button"
                    className="admin-notif-btn is-soft is-sm"
                    onClick={() => onLogout && onLogout()}
                    data-testid="logout-btn"
                  >
                    {labels.security.logout}
                  </button>
                </div>
              </Card>

              <Card testId="security-danger-card">
                <div className="admin-section-label">{labels.security.dangerZone}</div>
                <div className="msc-row">
                  <div>
                    <div className="msc-danger-title">{labels.security.deleteAccount}</div>
                    <div className="msc-row-sub">{labels.security.deleteAccountDesc}</div>
                  </div>
                  <button
                    type="button"
                    className="admin-notif-btn is-danger is-sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid="delete-account-btn"
                  >
                    {labels.security.deleteAccountBtn}
                  </button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ── 사진 업로드 모달 ── */}
      {uploadOpen && (
        <div className="admin-notif-modal-root" data-testid="photo-upload-modal">
          <div className="admin-notif-modal-backdrop" onClick={closeUpload} />
          <div className="admin-notif-modal" role="dialog" aria-modal="true" aria-label={labels.upload.title}>
            <div className="admin-notif-modal-header">
              <div className="admin-notif-modal-title">{labels.upload.title}</div>
              <button type="button" className="admin-notif-modal-close" onClick={closeUpload} aria-label="close">
                ×
              </button>
            </div>
            <div className="admin-notif-modal-body">
              <label
                className={`msc-upload-drop${uploadDrag ? ' is-drag' : ''}${uploadPreview ? ' has-preview' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setUploadDrag(true);
                }}
                onDragLeave={() => setUploadDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setUploadDrag(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                {uploadPreview ? (
                  <>
                    <img src={uploadPreview} alt="" className="msc-upload-preview" />
                    <span className="msc-upload-again">{labels.upload.changeFile}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 36 }} aria-hidden="true">
                      📁
                    </span>
                    <span className="msc-upload-title">{labels.upload.dropTitle}</span>
                    <span className="msc-upload-sub">{labels.upload.dropSub}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  data-testid="photo-file-input"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </label>
            </div>
            <div className="admin-notif-modal-footer">
              <button type="button" className="admin-notif-btn is-soft" onClick={closeUpload}>
                {labels.upload.cancel}
              </button>
              <button
                type="button"
                className="admin-notif-btn is-primary"
                disabled={!pendingFile}
                onClick={confirmUpload}
                data-testid="photo-upload-confirm"
              >
                {pendingFile ? labels.upload.confirm : labels.upload.confirmEmpty}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 계정 삭제 확인 모달 ── */}
      {showDeleteConfirm && (
        <div className="admin-notif-modal-root" data-testid="delete-account-modal">
          <div
            className="admin-notif-modal-backdrop"
            onClick={() => {
              if (!deleteAccountState.loading) setShowDeleteConfirm(false);
            }}
          />
          <div className="admin-notif-modal" role="dialog" aria-modal="true" aria-label={labels.security.deleteAccount}>
            <div className="admin-notif-modal-header">
              <div className="admin-notif-modal-title">{labels.security.deleteAccount}</div>
              <button
                type="button"
                className="admin-notif-modal-close"
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="close"
              >
                ×
              </button>
            </div>
            <div className="admin-notif-modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                {labels.security.deleteConfirmMessage}
              </p>
              {deleteAccountState.error && (
                <p className="msc-input-error" data-testid="delete-account-error" style={{ marginTop: 10 }}>
                  {labels.security.deleteError}
                </p>
              )}
            </div>
            <div className="admin-notif-modal-footer">
              <button
                type="button"
                className="admin-notif-btn is-soft"
                disabled={deleteAccountState.loading}
                onClick={() => setShowDeleteConfirm(false)}
              >
                {labels.security.deleteCancel}
              </button>
              <button
                type="button"
                className="admin-notif-btn is-danger"
                disabled={deleteAccountState.loading}
                onClick={() => onDeleteAccount && onDeleteAccount()}
                data-testid="delete-account-confirm-btn"
              >
                {deleteAccountState.loading ? labels.security.deleteProcessing : labels.security.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
