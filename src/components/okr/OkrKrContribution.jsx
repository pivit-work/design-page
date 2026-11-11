import Icon from '../shared/Icon.jsx';
import FormField from '../shared/FormField.jsx';
import TextInput from '../shared/TextInput.jsx';
import Select from '../shared/Select.jsx';
import Button from '../shared/Button.jsx';
import { contribSum, contribValid, evenSplit, toContribPct } from './okrKrContribution.js';

/**
 * KR 업데이트 창 아래 «팀원 기여도 배분» 칸 (PW-2529 · 기획 okr-policy §4.4).
 *
 * 디자이너 원본이 아직 없다(디자인 카드 PW-2528). 같은 OKR 화면에서 디자이너가 그린 모양을 옮겨 쓴다 —
 * 한 줄은 OKR 작성 창의 가중치 줄(`.okr-cf-kr-meta` · `.okr-cf-input.is-sm` · `.okr-cf-unit` · `.okr-cf-x`),
 * 합계 글자는 그룹 달성률 글자(`.okr-group-percent` 회색 · 초록 · 빨강). 칸 틀은 공용 FormField,
 * 추가 칸은 공용 Select, [균등 배분]은 같은 창 «연결된 스니핏» 칸의 머리 버튼과 같은 Button secondary sm.
 *
 * 값은 부모(창)가 들고 이 칸은 그리기·고치기만 한다 — 저장은 창의 [확정] 한 번이다(§4.4.5).
 *
 * props: rows([{ id, name, pct, departed }]) · candidates([{ id, name }] — 이미 넣은 사람은 부모가 뺀다) ·
 *   onChange(rows) · labels · icons · baseUrl · disabled
 */
export default function OkrKrContribution({ rows, candidates, onChange, labels: L, icons, baseUrl = '', disabled = false }) {
  const sum = contribSum(rows);
  const valid = contribValid(rows);
  const empty = rows.length === 0;
  const editable = rows.some((r) => !r.departed);
  const picks = candidates.filter((c) => !rows.some((r) => r.id === c.id));

  const setPct = (id, raw) =>
    onChange(rows.map((r) => (r.id === id && !r.departed ? { ...r, pct: toContribPct(raw) } : r)));
  const remove = (id) => onChange(rows.filter((r) => r.id !== id || r.departed));
  const add = (id) => {
    const c = picks.find((p) => p.id === id);
    if (!c) return;
    onChange([...rows, { id: c.id, name: c.name, pct: 0, departed: false }]);
  };

  const sumTone = empty ? '' : valid ? ' is-success' : ' is-error';

  return (
    <FormField
      group
      label={L.contribTitle}
      labelExtra={(
        <span className="okr-kru-contrib-head">
          {editable && (
            <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onChange(evenSplit(rows))} data-testid="okr-kru-contrib-even">
              {L.contribEven}
            </Button>
          )}
          <span className={`okr-group-percent${sumTone}`} data-testid="okr-kru-contrib-sum">
            {empty ? L.contribUnassigned : `${sum}%`}
          </span>
        </span>
      )}
      hint={empty ? L.contribEmpty : undefined}
      hintAbove
      error={!valid ? L.contribSumWarn(sum) : undefined}
      errorTestId="okr-kru-contrib-warn"
    >
      {!empty && (
        <div className="okr-kru-contrib-rows" data-testid="okr-kru-contrib-rows">
          {rows.map((r) => (
            <div key={r.id} className="okr-cf-kr-meta okr-kru-contrib-row" data-testid="okr-kru-contrib-row">
              <span className={`okr-kru-contrib-name${r.departed ? ' is-departed' : ''}`} title={r.name}>{r.name}</span>
              {r.departed ? (
                // 퇴사한 구성원 — 숫자만 보이고 입력 칸·[×] 없음 (§4.4.8)
                <span className="okr-kru-contrib-fixed" data-testid="okr-kru-contrib-fixed">{r.pct}</span>
              ) : (
                <TextInput
                  type="number"
                  className="okr-cf-input is-sm okr-kru-contrib-input"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  value={String(r.pct)}
                  disabled={disabled}
                  aria-label={L.contribPctLabel(r.name)}
                  // 정수만 — 소수점·지수 글자는 칠 수 없다(§4.4.4). 붙여넣은 소수는 toContribPct 가 버린다.
                  onKeyDown={(e) => { if (['.', ',', 'e', 'E'].includes(e.key)) e.preventDefault(); }}
                  onChange={(e) => setPct(r.id, e.target.value)}
                />
              )}
              <span className="okr-cf-unit">%</span>
              {r.departed ? (
                <span className="okr-kru-contrib-x-slot" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="okr-cf-x"
                  disabled={disabled}
                  aria-label={L.contribRemove(r.name)}
                  onClick={() => remove(r.id)}
                  data-testid="okr-kru-contrib-remove"
                >
                  <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {picks.length > 0 && (
        <Select
          value=""
          placeholder={L.contribAdd}
          options={picks.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(e) => add(e.target.value)}
          disabled={disabled}
          aria-label={L.contribAdd}
          data-testid="okr-kru-contrib-add"
        />
      )}
    </FormField>
  );
}
