import Button from '../shared/Button.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';

/**
 * 고른 휴가 날짜를 달마다 한 줄로 — «11월 | 11 12 13 … | 14일» (pivit-work PW-2688 ⑥ · 시안 ⑧ · 커트 11-10 확인).
 *
 * 날짜마다 «11.24 (화) 하루 ×» 칩을 늘어놓으면 17일 4시간이 칩 20~35개 · 서너 줄이 되고, 위 달력에 이미 표시된 날을
 * 한 번 더 나열한다. 그래서 날짜 숫자만 달마다 한 줄에 두고 줄 끝에 그 달 합계를 둔다.
 *
 * - 하루는 연초록 칸, 반차는 점선 테두리 + 작은 «오전/오후». 지난 날은 회색 숫자.
 * - `onRemove` 가 있으면 마우스를 올리거나 Tab 으로 옮겨 갈 때만 × 가 보인다(공용 `Button` 에 칩 지우기 모양 `dp-chip__remove` —
 *   진짜 단추라 키보드로도 지운다). 날짜 칸은 상태 딱지가 아니라 날짜라 `Chip`(딱지) 모양을 덧칠하지 않는다.
 *   마우스가 없는 화면에서는 달력에서 그 날을 다시 눌러 뺀다.
 * - 날짜에 마우스를 올리면 `title`(«11.24 (화) 하루») 말풍선.
 * 글은 앱이 다 만들어 넘긴다 — 이 부품은 자리만 정한다.
 *
 *   <LeaveDateMonths testId months={[{ key, label: '11월', sum: '14일',
 *     days: [{ key, day: '24', half: '오전' | null, passed, title, onRemove, removeLabel, testId }] }]} />
 */
export default function LeaveDateMonths({ months = [], testId }) {
  return (
    <div className="leave-months" data-testid={testId}>
      {months.map((m) => (
        <div key={m.key} className="leave-month" data-testid={m.testId}>
          <span className="leave-month-label">{m.label}</span>
          <div className="leave-month-days">
            {m.days.map((d) => (
              <Tooltip key={d.key} content={d.title}>
                <span
                  className={['leave-day', d.half ? 'is-half' : '', d.passed ? 'is-passed' : '', d.onRemove ? 'has-remove' : '']
                    .filter(Boolean)
                    .join(' ')}
                  data-testid={d.testId}
                >
                  {d.day}
                  {d.half && <small className="leave-day-half">{d.half}</small>}
                  {d.onRemove && (
                    <Button className="dp-chip__remove leave-day-remove" aria-label={d.removeLabel} onClick={d.onRemove}>
                      <CloseGlyph size={12} />
                    </Button>
                  )}
                </span>
              </Tooltip>
            ))}
          </div>
          <span className="leave-month-sum" data-testid={m.sumTestId}>
            {m.sum}
          </span>
        </div>
      ))}
    </div>
  );
}
