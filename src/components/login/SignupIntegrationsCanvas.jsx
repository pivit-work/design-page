import Button from '../shared/Button.jsx';
import assetUrl from '../shared/assetUrl.js';
import { SignupFrame, SignupCard, SignupSubmit, SignupLink, SignupBack } from './SignupPieces.jsx';
import { SIGNUP_LABELS, DEFAULT_SIGNUP_STEPS } from './signupLabels.js';

/**
 * SignupIntegrationsCanvas — 8단계 「협업 도구 연동」. 도구 카드(아이콘 · 이름 · 무엇을 모으는지 · [연결하기]/연결됨) ·
 * 「설정에서 언제든 연동할 수 있습니다.」 · [계속하기] · 「나중에 하기」.
 *
 * tools: [{ key, name, desc, icon }] — 안 넘기면 앱 기본 다섯(Slack · Jira · Notion · Google · GitHub).
 * connected: 연결된 key 목록. onToggle(key) 로 연결/해제.
 *
 * Props: baseUrl · mode · onModeChange · tools · connected · onToggle · onSubmit · onSkip · onBack
 *        steps · currentStep(기본 7) · labels · testIds { submit, skip }
 */
export default function SignupIntegrationsCanvas({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  tools,
  connected = [],
  onToggle,
  onSubmit,
  onSkip,
  onBack,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 7,
  labels: labelsProp,
  testIds = {},
}) {
  const l = { ...SIGNUP_LABELS, ...labelsProp };
  const list = tools ?? [
    { key: 'slack', name: 'Slack', desc: l.integSlack, icon: '/icons-brand/slack.svg' },
    { key: 'jira', name: 'Jira', desc: l.integJira, icon: '/icons-brand/jira.svg' },
    { key: 'notion', name: 'Notion', desc: l.integNotion, icon: '/icons-brand/notion.svg' },
    { key: 'google', name: 'Google', desc: l.integGoogle, icon: '/icons-brand/google.svg' },
    { key: 'github', name: 'GitHub', desc: l.integGithub, icon: '/icons-brand/github.svg' },
  ];
  return (
    <SignupFrame
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={{ login: l.modeLogin, signup: l.modeSignup }}
      title={l.integTitle}
      subtitle={l.integDescription}
      steps={steps}
      currentStep={currentStep}
      foot={<SignupBack label={l.back} onClick={onBack} testId="signup-back" />}
    >
      <SignupCard onSubmit={onSubmit}>
        <div className="login-list" data-testid="signup-integrations">
          {list.map((t) => {
            const on = connected.includes(t.key);
            return (
              <div className={`login-tool${on ? ' is-on' : ''}`} key={t.key}>
                <img className="login-tool-icon" src={assetUrl(baseUrl, t.icon)} alt="" draggable={false} />
                <div className="login-tool-text">
                  <span className="login-tool-name">{t.name}</span>
                  <span className="login-tool-desc">{t.desc}</span>
                </div>
                <Button className={`login-tool-btn${on ? ' is-on' : ''}`} onClick={() => onToggle?.(t.key)} aria-pressed={on}>
                  {on ? l.integConnected : l.integConnect}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="login-hint">{l.integLater}</p>
        <SignupSubmit testId={testIds.submit}>{l.continue}</SignupSubmit>
        <div className="login-center">
          <SignupLink className="is-muted" onClick={onSkip} data-testid={testIds.skip}>{l.skipForNow}</SignupLink>
        </div>
      </SignupCard>
    </SignupFrame>
  );
}
