/**
 * EvalLeaderEvidenceSignals — 하향 리뷰 근거 칸의 근거 넷 (PW-1214 · TC-EVAL-020).
 *
 * OKR 달성도(KR 마다 팀원이 셀프 리뷰에서 넣은 달성률·메모 포함) · 헬스체크 12주 추이 ·
 * 원온원 할 일 이행률 · 스니핏 활동량. 블록 값이 null 이면 앱이 그 근거를 못 읽은 것이라
 * «불러오지 못했습니다»를, 빈 값이면 «없음» 문구를 그린다. 둘을 섞으면 실패가 «기록 없음»으로
 * 보여 매니저가 잘못된 근거로 평가한다.
 *
 * OKR 큰 % 는 팀원이 셀프 리뷰에 적은 KR 달성률의 가중 평균이다(okr-spec §12.1, PW-1607).
 * KR 이 있는데 `averagePct` 가 null 이면 팀원이 하나도 안 적은 것이라 «미입력» 배지를 그린다(§12.3).
 */

import StatusBadge from '../shared/StatusBadge.jsx';

const HEALTH_MAX = 10;

function pctTone(pct) {
  if (pct >= 80) return 'is-good';
  if (pct >= 60) return 'is-mid';
  return 'is-low';
}

function Bar({ pct }) {
  const clamped = Math.min(Math.max(pct ?? 0, 0), 100);
  return (
    <span className="evl-sig-track" aria-hidden>
      <span className={`evl-sig-fill ${pctTone(clamped)}`} style={{ width: `${clamped}%` }} />
    </span>
  );
}

function HealthSpark({ weeks }) {
  const W = 160;
  const H = 32;
  const n = weeks.length;
  const x = (i) => (n > 1 ? (i / (n - 1)) * W : 0);
  const y = (v) => H - (v / HEALTH_MAX) * (H - 4) - 2;
  const pts = weeks
    .map((w, i) => (w.average == null ? null : [x(i), y(w.average)]))
    .filter(Boolean);
  if (pts.length === 0) return null;
  const d = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  return (
    <svg
      className="evl-sig-spark"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      data-testid="evl-sig-health-spark"
    >
      <title>
        {weeks
          .filter((w) => w.average != null)
          .map((w) => `${w.weekStart}: ${w.average}`)
          .join('  ·  ')}
      </title>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={2} fill="currentColor" />
      ))}
    </svg>
  );
}

function Failed({ L, testId }) {
  return (
    <p className="evc-empty-sub" data-testid={testId}>
      {L.signalsLoadFailed}
    </p>
  );
}

export default function EvalLeaderEvidenceSignals({ signals, L }) {
  if (!signals) return null;
  const { okr, healthTrend, oneOnOneActions, snippetActivity } = signals;
  return (
    <div className="evl-signals" data-testid="evl-signals">
      <p className="evl-sig-period" data-testid="evl-sig-period">
        {L.signalsPeriod} {signals.periodStart} ~ {signals.periodEnd}
      </p>

      {/* OKR 달성도 */}
      <section className="evl-sig-block" data-testid="evl-sig-okr">
        <span className="evc-field-label">{L.signalsOkrTitle}</span>
        {okr == null ? (
          <Failed L={L} testId="evl-sig-okr-failed" />
        ) : okr.keyResults.length === 0 && okr.averagePct == null ? (
          <p className="evc-empty-sub">{L.signalsOkrEmpty}</p>
        ) : (
          <>
            {okr.averagePct != null ? (
              <p className="evl-sig-big">
                {okr.averagePct}%<span className="evl-sig-sub"> {L.signalsOkrAverage}</span>
              </p>
            ) : (
              <p className="evl-sig-big" data-testid="evl-sig-okr-unentered">
                <StatusBadge className="evc-status-badge tone-neutral">{L.signalsOkrUnentered}</StatusBadge>
                <span className="evl-sig-sub"> {L.signalsOkrAverage}</span>
              </p>
            )}
            <ul className="evl-sig-krs">
              {okr.keyResults.map((kr) => (
                <li key={kr.id} className="evl-sig-kr" data-testid="evl-sig-kr">
                  <span className="evl-sig-kr-head">
                    <span className="evl-sig-kr-title">{kr.title}</span>
                    <span className="evl-sig-kr-pct">{kr.progressPct}%</span>
                  </span>
                  <Bar pct={kr.progressPct} />
                  <span className="evl-sig-self" data-testid="evl-sig-kr-self">
                    {kr.selfAchievePct != null
                      ? `${L.signalsKrSelf} ${kr.selfAchievePct}%`
                      : L.signalsKrSelfNone}
                  </span>
                  {kr.selfAchieveNote ? (
                    <p className="evl-evi-text" data-testid="evl-sig-kr-note">
                      {L.signalsKrNote} · {kr.selfAchieveNote}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 헬스체크 12주 추이 */}
      <section className="evl-sig-block" data-testid="evl-sig-health">
        <span className="evc-field-label">{L.signalsHealthTitle}</span>
        {healthTrend == null ? (
          <Failed L={L} testId="evl-sig-health-failed" />
        ) : healthTrend.average == null ? (
          <p className="evc-empty-sub">{L.signalsHealthEmpty}</p>
        ) : (
          <>
            <p className="evl-sig-big">
              {healthTrend.average}
              <span className="evl-sig-sub"> / {HEALTH_MAX} · {L.signalsHealthAverage}</span>
            </p>
            <HealthSpark weeks={healthTrend.weeks} />
          </>
        )}
      </section>

      {/* 원온원 할 일 이행률 */}
      <section className="evl-sig-block" data-testid="evl-sig-actions">
        <span className="evc-field-label">{L.signalsActionsTitle}</span>
        {oneOnOneActions == null ? (
          <Failed L={L} testId="evl-sig-actions-failed" />
        ) : oneOnOneActions.total === 0 ? (
          <p className="evc-empty-sub">{L.signalsActionsEmpty}</p>
        ) : (
          <>
            <p className="evl-sig-big">
              {oneOnOneActions.ratePct}%
              <span className="evl-sig-sub">
                {' '}
                {L.signalsDone} {oneOnOneActions.completed} / {L.signalsTotal} {oneOnOneActions.total}
              </span>
            </p>
            <Bar pct={oneOnOneActions.ratePct} />
          </>
        )}
      </section>

      {/* 스니핏 활동량 */}
      <section className="evl-sig-block" data-testid="evl-sig-snippets">
        <span className="evc-field-label">{L.signalsSnippetTitle}</span>
        {snippetActivity == null ? (
          <Failed L={L} testId="evl-sig-snippets-failed" />
        ) : (
          <p className="evl-sig-big">
            {snippetActivity.writtenDays}
            {L.signalsDays}
            <span className="evl-sig-sub">
              {' '}
              / {snippetActivity.periodDays}
              {L.signalsDays}
              {snippetActivity.ratePct != null ? ` · ${L.signalsRate} ${snippetActivity.ratePct}%` : ''}
            </span>
          </p>
        )}
      </section>
    </div>
  );
}
