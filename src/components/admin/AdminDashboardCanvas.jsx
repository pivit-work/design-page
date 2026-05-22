import { useState } from 'react';

/**
 * AdminDashboardCanvas — 어드민 개요(대시보드) Pure 컴포넌트.
 * pivit-specs 의 admin-dashboard-view.jsx 시안을 design-page 정본으로 포팅.
 * 모든 데이터는 props 로 받는다 (page wrapper 가 fetch·매핑 소유).
 *
 * 색·간격은 design-page 토큰을 사용한다 (시안의 슬레이트/인디고 팔레트가 아니라
 * design-page 의 브랜드 그린 + 그레이 스케일).
 */

const FONT = "var(--font-family-body, 'Pretendard', sans-serif)";
const DISPLAY_FONT = "var(--font-family-display, 'Pretendard', sans-serif)";
// design-system shadow-sm — "약한 부상. 카드, 드롭다운". design-page 카드 표준 elevation.
const CARD_SHADOW = '0 1px 2px 0 rgba(10, 13, 18, 0.1), 0 1px 3px 0 rgba(10, 13, 18, 0.1)';

// 요약 카드 톤 → design-page 토큰
const STAT_TONE = {
  brand: 'var(--text-brand-tertiary)',
  green: 'var(--utility-green-600)',
  red: 'var(--colors-error-600)',
  purple: '#8B5CF6',
};

// 활동 로그 타입 → 색/배경/라벨
const LOG_META = {
  snippet:  { color: '#8B5CF6',                    bg: '#F5F3FF',                  label: '스니핏' },
  alert:    { color: 'var(--colors-error-600)',    bg: 'var(--utility-error-50)',  label: '알림' },
  oneonone: { color: 'var(--utility-green-600)',   bg: 'var(--utility-green-50)',  label: '1on1' },
  meeting:  { color: 'var(--text-brand-tertiary)', bg: 'var(--utility-brand-50)',  label: '회의록' },
  eval:     { color: '#F59E0B',                    bg: 'var(--colors-warning-50)', label: '평가' },
};

// 헬스체크 점수 → 알약 색
function healthStyle(h) {
  if (h >= 8) return { c: 'var(--utility-green-600)',  bg: 'var(--utility-green-50)',  bd: 'var(--colors-success-200)' };
  if (h >= 6) return { c: 'var(--colors-warning-600)', bg: 'var(--colors-warning-50)', bd: 'var(--colors-warning-200)' };
  return { c: 'var(--colors-error-600)', bg: 'var(--utility-error-50)', bd: 'var(--colors-error-200)' };
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--bg-quaternary)', borderRadius: 'var(--radius-2xl, 16px)',
      boxShadow: CARD_SHADOW, padding: '20px 22px', ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
      letterSpacing: '-0.01em', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function LinkButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11, padding: '5px 12px', borderRadius: 8,
        border: '1px solid var(--border-primary)', background: 'var(--bg-primary)',
        color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: FONT,
      }}
    >
      {children}
    </button>
  );
}

function AvatarFallback({ row, size = 26 }) {
  const [fail, setFail] = useState(false);
  const color = row.avatarColor || 'var(--text-brand-tertiary)';
  const text = row.avatarText || (row.name ? row.name.slice(0, 2) : '');
  return (
    <div style={{
      width: size, height: size, borderRadius: 7, overflow: 'hidden', flexShrink: 0,
      background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {row.avatarPhoto && !fail
        ? <img src={row.avatarPhoto} alt={row.name} onError={() => setFail(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.34, fontWeight: 800, color }}>{text}</span>}
    </div>
  );
}

export default function AdminDashboardCanvas({
  dateLabel = '',
  teamRows = [],            // [{ id, name, title, dept, snippetSubmitted, health, redFlag, active, avatarColor, avatarText, avatarPhoto }]
  snippetSubmittedCount = 0,
  redFlagCount = 0,
  actionItemCount = 0,
  evalCard = null,          // { inProgress, selfDone, managerDone, total }
  integrations = [],        // [{ name, icon, connected, lastSync }]
  activityLog = [],         // [{ time, type, actor, text }]
  onInvite,
  onManageEmployees,
  onManageEval,
  onSendReminder,
  onManageIntegrations,
  onConnectIntegration,
  renderAvatar,
}) {
  const activeRows = teamRows.filter((r) => r.active);
  const inactiveRows = teamRows.filter((r) => !r.active);
  const activeCount = activeRows.length;

  const stats = [
    { label: '활성 멤버',       value: activeCount,         sub: `전체 ${teamRows.length}명 중`,             tone: 'brand' },
    { label: '오늘 스니핏 제출', value: snippetSubmittedCount, sub: `${activeCount}명 중 ${snippetSubmittedCount}명`, tone: 'green' },
    { label: '레드플래그',      value: redFlagCount,        sub: '즉시 확인 필요',                            tone: 'red' },
    { label: '신규 액션 아이템', value: actionItemCount,      sub: '오늘 생성',                                tone: 'purple' },
  ];

  const evalPct = (done) => evalCard && evalCard.total ? Math.round((done / evalCard.total) * 100) : 0;
  const evalRows = evalCard ? [
    { label: '셀프 리뷰 완료',   done: evalCard.selfDone,    pct: evalPct(evalCard.selfDone),    color: 'var(--utility-green-600)' },
    { label: '매니저 평가 완료', done: evalCard.managerDone, pct: evalPct(evalCard.managerDone), color: 'var(--text-brand-tertiary)' },
  ] : [];

  const avatar = (row) => (renderAvatar ? renderAvatar(row) : <AvatarFallback row={row} />);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>

      {/* 헤더 — 날짜 + 팀원 초대 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
        {dateLabel && (
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{dateLabel}</span>
        )}
        <button
          type="button"
          onClick={onInvite}
          style={{
            padding: '8px 15px', borderRadius: 8, border: 'none',
            background: 'var(--text-brand-tertiary)', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
          }}
        >
          + 팀원 초대
        </button>
      </div>

      {/* 요약 카드 4개 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg-quaternary)', borderRadius: 'var(--radius-2xl, 16px)',
            boxShadow: CARD_SHADOW, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{s.label}</div>
            <div style={{
              fontFamily: DISPLAY_FONT, fontSize: 30, fontWeight: 700,
              color: STAT_TONE[s.tone], lineHeight: 1, marginBottom: 7,
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 2단 레이아웃 — 팀원 현황 / (상시 평가 + 외부 연동) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>

        {/* 팀원 현황 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionLabel>팀원 현황</SectionLabel>
            <LinkButton onClick={onManageEmployees}>직원 관리 →</LinkButton>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                {['이름', '부서', '오늘 스니핏', '헬스체크', '레드플래그', '상태'].map((h) => (
                  <th key={h} style={{
                    padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                    color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => {
                const hs = row.health != null ? healthStyle(row.health) : null;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--bg-secondary)' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {avatar(row)}
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{row.title}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.dept}</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: row.snippetSubmitted ? 'var(--utility-green-600)' : 'var(--border-primary)',
                        }} />
                        <span style={{ fontSize: 11, color: row.snippetSubmitted ? 'var(--utility-green-600)' : 'var(--text-tertiary)' }}>
                          {row.snippetSubmitted ? '제출' : '미제출'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {hs ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
                          borderRadius: 99, width: 'fit-content', background: hs.bg, border: `1px solid ${hs.bd}`,
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: hs.c }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: hs.c }}>{row.health}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {row.redFlag ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: 'var(--utility-error-50)', border: '1px solid var(--colors-error-200)',
                          color: 'var(--colors-error-600)',
                        }}>⚠ 감지</span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: 'var(--utility-green-50)', border: '1px solid var(--colors-success-200)',
                        color: 'var(--utility-green-600)',
                      }}>활성</span>
                    </td>
                  </tr>
                );
              })}
              {inactiveRows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--bg-secondary)', opacity: 0.5 }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {avatar(row)}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{row.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{row.title}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.dept}</span>
                  </td>
                  <td colSpan={3} style={{ padding: '10px' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>초대 대기 중</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                      color: 'var(--text-tertiary)',
                    }}>비활성</span>
                  </td>
                </tr>
              ))}
              {teamRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
                    팀원이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* 우측 컬럼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* 상시 평가 */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <SectionLabel>상시 평가</SectionLabel>
              <LinkButton onClick={onManageEval}>평가 관리 →</LinkButton>
            </div>
            {evalCard ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>상시 평가</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--utility-brand-50)', border: '1px solid var(--colors-utility-brand-utilityBrand200, #c7d2fe)',
                    color: 'var(--text-brand-tertiary)',
                  }}>진행 중 {evalCard.inProgress}건</span>
                </div>
                {evalRows.map((p) => (
                  <div key={p.label} style={{ marginBottom: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.label}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.done}/{evalCard.total}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={onSendReminder}
                  style={{
                    width: '100%', padding: '8px 0', borderRadius: 9, border: 'none',
                    background: 'var(--utility-error-50)', fontSize: 11, fontWeight: 700,
                    color: 'var(--colors-error-600)', cursor: 'pointer', fontFamily: FONT, marginTop: 4,
                  }}
                >
                  미완료 평가 리마인더 발송
                </button>
              </>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>진행 중인 평가가 없습니다</div>
            )}
          </Card>

          {/* 외부 연동 */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <SectionLabel>외부 연동</SectionLabel>
              <LinkButton onClick={onManageIntegrations}>연동 설정 →</LinkButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {integrations.map((intg) => (
                <div key={intg.name} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9,
                  background: intg.connected ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                  border: `1px solid ${intg.connected ? 'var(--border-primary)' : 'var(--bg-secondary)'}`,
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{intg.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{intg.name}</span>
                  {intg.connected ? (
                    <>
                      {intg.lastSync && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{intg.lastSync}</span>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--utility-green-600)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--utility-green-600)' }}>연결됨</span>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConnectIntegration && onConnectIntegration(intg.name)}
                      style={{
                        fontSize: 10, padding: '3px 9px', borderRadius: 6,
                        border: '1px solid var(--border-primary)', background: 'var(--bg-quaternary)',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: FONT,
                      }}
                    >
                      연결
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* 오늘 활동 로그 */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionLabel>오늘 활동 로그</SectionLabel>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{activityLog.length}건</span>
        </div>
        {activityLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-tertiary)', fontSize: 12 }}>
            오늘 활동 기록이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activityLog.map((log, i) => {
              const lm = LOG_META[log.type] || LOG_META.meeting;
              const last = i === activityLog.length - 1;
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10,
                  paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10,
                  borderBottom: last ? 'none' : '1px solid var(--bg-secondary)',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)', width: 56, flexShrink: 0, marginTop: 1 }}>
                    {log.time}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: lm.bg, color: lm.color, flexShrink: 0, height: 'fit-content', marginTop: 1,
                  }}>
                    {lm.label}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: log.isSystem ? 'var(--text-tertiary)' : 'var(--text-brand-tertiary)',
                    }}>
                      {log.actor}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{' — '}{log.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
