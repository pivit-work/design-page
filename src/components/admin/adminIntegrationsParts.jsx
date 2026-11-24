import { Fragment } from 'react';
import { AlertTriangleGlyph, InfoGlyph } from '../shared/lineIcons.jsx';
import { sentences } from './adminIntegrationsText.js';

/**
 * 연동 화면 조각 (pivit-work PW-3126) — 공용 틀(components/frames)이 못 담는 색 띠.
 *
 * - `IntgBand` 색 띠(오류 · 경고 · 안내) — 디자이너 1on1 띠 `.ono-done-banner`(stesslee) 짜임에 아이콘 · 첫 문장 진하게 · 뒤 문장 작게 ·
 *   오른쪽 버튼 자리. 안내 줄 틀(`NoticeLines`)은 바탕 없는 줄이라 빨강 · 주황 띠는 여기서 그린다.
 * 문장 나누기 `sentences` 는 adminIntegrationsText.js.
 */

const TONE_CLASS = { error: 'is-bad', warning: 'is-warning', info: 'is-info' };

/**
 * @param {object} props
 * @param {'error' | 'warning' | 'info'} [props.tone]
 * @param {import('react').ReactNode[]} props.lines 첫 줄은 진하게, 나머지는 작게. 빈 값은 건너뛴다
 * @param {import('react').ReactNode} [props.actions] 오른쪽 버튼 자리
 * @param {string} [props.role]
 * @param {string} [props.testId]
 */
export function IntgBand({ tone = 'error', lines, actions, role, testId }) {
  const shown = (lines ?? []).filter((l) => l !== null && l !== undefined && l !== false && l !== '');
  const [head, ...rest] = shown;
  const Glyph = tone === 'info' ? InfoGlyph : AlertTriangleGlyph;
  return (
    <div className={`ono-done-banner intg-band ${TONE_CLASS[tone] ?? ''}`} role={role} data-testid={testId}>
      <Glyph size={16} aria-hidden />
      <span className="intg-band-text">
        {head !== undefined && <span className="intg-band-head">{head}</span>}
        {rest.map((line, i) => (
          <span key={i} className="intg-band-rest">{line}</span>
        ))}
      </span>
      {actions && <span className="intg-band-actions">{actions}</span>}
    </div>
  );
}

/**
 * 창 머리 설명 — 창 틀이 설명을 `<p>` 에 담아 목록을 못 넣으므로 문장 사이를 줄바꿈으로 나눈다(PW-3126).
 * @param {{ text: string }} props
 */
export function DescLines({ text }) {
  return sentences(text).map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line}
    </Fragment>
  ));
}

/**
 * 판 안 줄 묶음 · 줄 한 개 — 「회의실 불러오기」 · 「휴가 캘린더 기록」이 쓰는 `.intg-rows` · `.intg-row` 짜임을 그대로 꺼낸 것
 * (pivit-work PW-3207 «시트에 기록 (워크플로우)» 블록이 앱 쪽에서 맨 태그 없이 쓰려고). 모양 값은 admin-integrations.css 그대로.
 */
export function IntgRows({ children }) {
  return <div className="intg-rows">{children}</div>;
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.label] 줄 이름(왼쪽)
 * @param {import('react').ReactNode} [props.account] 이름 아래 계정 메일(진하게)
 * @param {{ key: string, text: import('react').ReactNode, testId?: string }[]} [props.subs] 이름 아래 옅은 줄들
 * @param {import('react').ReactNode} [props.value] 오른쪽 값 · 버튼 자리
 * @param {import('react').ReactNode} [props.band] 이름 대신 줄을 채우는 색 띠(IntgBand)
 * @param {string} [props.testId]
 * @param {string} [props.state] data-state
 */
export function IntgRow({ label, account, subs = [], value, band, testId, state }) {
  return (
    <div className="intg-row" data-testid={testId} data-state={state}>
      {band ?? (
        <span className="intg-row-label">
          {label}
          {account && <span className="intg-row-sub intg-row-account">{account}</span>}
          {subs.map((s) => (
            <span key={s.key} className="intg-row-sub" data-testid={s.testId}>{s.text}</span>
          ))}
        </span>
      )}
      {value && <span className="intg-row-value">{value}</span>}
    </div>
  );
}

/** 칸 아래 빨간 한 줄(`.intg-row-error`) — 창 안에서 서버가 거절한 사유를 보일 때. */
export function IntgErrorLine({ children, testId }) {
  return <span className="intg-row-error" role="alert" data-testid={testId}>{children}</span>;
}
