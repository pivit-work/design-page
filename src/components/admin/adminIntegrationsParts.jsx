import { AlertTriangleGlyph, InfoGlyph } from '../shared/lineIcons.jsx';

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
