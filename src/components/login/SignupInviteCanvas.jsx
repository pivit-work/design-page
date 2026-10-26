import TextInput from '../shared/TextInput.jsx';
import Button from '../shared/Button.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import { CloseGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import { SignupFrame, SignupCard, SignupField, SignupSubmit, SignupChoices, SignupNotice, SignupLink, SignupBack } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS, fill } from './signupLabels.js';

/**
 * SignupInviteCanvas — 7단계 「구성원 초대」. 이메일로 초대 / 링크로 초대 전환.
 *   이메일: 이메일 칸 줄(빼기) · [한 명 더 추가] · 최대 인원 안내 · [N명 초대하기]
 *   링크:   아직 링크 없음 안내 · 만료 기간(7일/30일/무제한) · [초대 링크 만들기] 또는 만든 링크 + [링크 복사]
 * 아래 「나중에 하기」로 건너뛴다.
 *
 * Props: baseUrl · mode · onModeChange · inviteMode('email'|'link') · onInviteModeChange
 *        emails(string[]) · onEmailsChange(next[]) · maxInvites(기본 50)
 *        link(만든 링크 주소 · 없으면 null) · linkExpiry · onLinkExpiryChange · onCreateLink · onCopyLink · copied
 *        onSubmit · onSkip · onBack · steps · currentStep(기본 6) · pending · labels · testIds { submit, skip }
 */
export default function SignupInviteCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  inviteMode = 'email',
  onInviteModeChange,
  emails = [''],
  onEmailsChange,
  maxInvites = 50,
  link = null,
  linkExpiry = '30d',
  onLinkExpiryChange,
  onCreateLink,
  onCopyLink,
  copied = false,
  onSubmit,
  onSkip,
  onBack,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 6,
  pending = false,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  const filled = emails.filter((e) => e.trim()).length;
  const setAt = (i, v) => onEmailsChange?.(emails.map((e, j) => (j === i ? v : e)));
  const removeAt = (i) => onEmailsChange?.(emails.length > 1 ? emails.filter((_, j) => j !== i) : ['']);
  const addRow = () => emails.length < maxInvites && onEmailsChange?.([...emails, '']);
  const expiries = [
    { value: '7d', label: l.linkExpiry7d },
    { value: '30d', label: l.linkExpiry30d },
    { value: 'never', label: l.linkExpiryNever },
  ];

  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.inviteTitle}
      subtitle={l.inviteDescription}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupBack label={l.back} onClick={onBack} testId="signup-back" />}
    >
      <SignupCard onSubmit={inviteMode === 'email' ? onSubmit : onCreateLink}>
        <SegmentedControl
          block
          equal
          ariaLabel={`${l.inviteByEmail} · ${l.inviteByLink}`}
          items={[
            { value: 'email', label: l.inviteByEmail },
            { value: 'link', label: l.inviteByLink },
          ]}
          value={inviteMode}
          onChange={(v) => onInviteModeChange?.(v)}
        />

        {inviteMode === 'email' ? (
          <>
            <div className="login-list" data-testid="signup-invite-list">
              {emails.map((value, i) => (
                <div className="login-list-row" key={i}>
                  <TextInput
                    className="login-input"
                    type="email"
                    placeholder={l.inviteEmailPlaceholder}
                    value={value}
                    onChange={(e) => setAt(i, e.target.value)}
                    aria-label={`${l.inviteEmailPlaceholder} ${i + 1}`}
                  />
                  <Button className="login-icon-btn" onClick={() => removeAt(i)} aria-label={l.removeRow}>
                    <CloseGlyph size={14} />
                  </Button>
                </div>
              ))}
              <SignupLink className="is-add" onClick={addRow} disabled={emails.length >= maxInvites}>
                <PlusGlyph size={14} />
                {l.addRow}
              </SignupLink>
            </div>
            <p className="login-hint">{fill(l.inviteMax, { max: maxInvites })}</p>
            <SignupSubmit pending={pending} testId={testIds.submit} disabled={filled === 0}>{fill(l.inviteSend, { count: filled })}</SignupSubmit>
          </>
        ) : (
          <>
            <SignupField label={l.linkExpiryLabel}>
              <SignupChoices options={expiries} value={linkExpiry} onChange={(v) => onLinkExpiryChange?.(v)} />
            </SignupField>
            {link ? (
              <div className="login-list-row">
                <TextInput className="login-input is-readonly" value={link} readOnly />
                <Button className="login-google is-compact" onClick={onCopyLink}>{copied ? l.copied : l.copyLink}</Button>
              </div>
            ) : (
              <SignupNotice>
                <p>{l.linkNotCreated}</p>
              </SignupNotice>
            )}
            <p className="login-hint">{l.linkRoleFixed}</p>
            {!link && <SignupSubmit pending={pending}>{l.linkCreate}</SignupSubmit>}
          </>
        )}

        <div className="login-center">
          <SignupLink className="is-muted" onClick={onSkip} data-testid={testIds.skip}>{l.skipForNow}</SignupLink>
        </div>
      </SignupCard>
    </SignupFrame>
  );
}
