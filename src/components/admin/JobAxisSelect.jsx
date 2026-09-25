import {
  narrowByParent, groupedChildren, groupedOptionValue, parseGroupedOptionValue,
} from './jobAxis.js';
import { IconChevronRight } from './employeesIcons.jsx';
import Select from '../shared/Select.jsx';

/**
 * 직군 → 직렬 → 직무 3단 연동의 «한 칸» (admin-spec §3.5-A · PW-748).
 *
 * 구성원 편집 창과 발령 단건이 이 칸을 같이 쓴다. 칸이 그리는 것은 셋 중 하나다:
 *  · 상위를 골랐으면 — 그 상위에 연결된 값만 (평면 목록)
 *  · 상위를 안 골랐으면 — 상위별로 묶은 전체 (optgroup). 고른 묶음이 상위로 확정된다
 *  · 고를 값이 0개면 — 빈 목록 대신 사유 + [조직 설정 →] (A1·A2·A5)
 *
 * 🔴 고를 값이 없을 때 **아무 값이나 적는 칸으로 바꾸지 않는다.** 적어 넣은 값은
 *    저장에서 거절된다 — 되는 것처럼 보이다가 마지막에 막히는 길을 열어 두는 셈이다.
 *
 * 값을 바꾼 결과(아래 칸 비우기·위 칸 채우기)는 이 칸이 정하지 않는다. `onPick(level,
 * value, group)` 을 받은 쪽이 `applyJobAxisChange` 로 세 칸을 한꺼번에 고친다.
 *
 * @param level     'family' | 'ladder' | 'duty'
 * @param values    { family, ladder, duty } — 지금 세 칸의 값
 * @param jobAxis   { families, ladders, duties, laddersByFamily, dutiesByLadder }
 * @param labels    { none, axisEmptyFamilies, axisEmptyLadders, axisEmptyDuties, axisGoFieldOptions }
 * @param onOpenFieldOptions  [조직 설정 →] 을 누르면 부른다. 없으면 버튼을 그리지 않는다
 */
export default function JobAxisSelect({
  level, values, jobAxis, labels, onPick, onOpenFieldOptions,
  className, disabled, testId, placeholder,
}) {
  const axis = jobAxis || {};
  const families = axis.families || [];
  const ladders = axis.ladders || [];
  const duties = axis.duties || [];
  const cur = values?.[level] || '';

  let flat = null;
  let groups = null;
  let emptyKey = 'axisEmptyFamilies';
  if (level === 'family') {
    flat = families;
  } else {
    const map = (level === 'ladder' ? axis.laddersByFamily : axis.dutiesByLadder) || {};
    const parent = level === 'ladder' ? values?.family : values?.ladder;
    const all = level === 'ladder' ? ladders : duties;
    const parentOrder = level === 'ladder' ? families : ladders;
    const mapped = Object.keys(map).length > 0;
    if (mapped && parent) {
      flat = narrowByParent(all, map, parent);
      emptyKey = level === 'ladder' ? 'axisEmptyLadders' : 'axisEmptyDuties';
    } else if (mapped) {
      groups = groupedChildren(map, parentOrder, all);
    } else {
      // 연결표를 못 받았으면 좁히지 않는다 — 조회 실패로 선택지를 0으로 만들지 않는다.
      flat = all;
    }
  }

  const count = groups ? groups.reduce((n, g) => n + g.options.length, 0) : flat.length;
  // 묶음 목록의 선택지 값은 «묶음+값» 이라 지금 값과 맞춰지지 않는다 — 상위가 빈 채
  // 값만 있는 상태(연결 없는 값)이므로 지금 값을 따로 한 줄 세워 보여 준다.
  const known = groups ? false : flat.includes(cur);
  const empty = count === 0;

  const emptyNote = empty && (
    <span className="admin-emp-axis-empty" data-testid={testId ? `${testId}-empty` : undefined}>
      <span className="admin-emp-manager-note">{labels[emptyKey]}</span>
      {onOpenFieldOptions && (
        <button
          type="button"
          className="admin-emp-btn is-ghost is-sm"
          onClick={onOpenFieldOptions}
          data-testid={testId ? `${testId}-go-field-options` : undefined}
        >
          {labels.axisGoFieldOptions}
          <IconChevronRight size={14} />
        </button>
      )}
    </span>
  );

  // 고를 값이 없고 지금 값도 없으면 빈 드롭다운을 그리지 않는다.
  if (empty && !cur) return emptyNote;

  const handle = (e) => {
    const { group, value } = parseGroupedOptionValue(e.target.value);
    onPick?.(level, value, group);
  };

  return (
    <>
      <Select
        className={className}
        value={cur}
        disabled={disabled}
        data-testid={testId}
        onChange={handle}
      >
        <option value="">{placeholder ?? labels.none}</option>
        {/* 지금 값이 목록에 없어도(연결이 끊겼거나 비활성) 선택지에 남긴다 — 없으면
            select 가 «미지정» 으로 보여, 다른 칸만 고쳐 저장해도 멀쩡한 값이 지워진다. */}
        {cur && !known && <option value={cur}>{cur}</option>}
        {groups
          ? groups.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((o) => (
                  <option key={`${g.group}|${o}`} value={groupedOptionValue(g.group, o)}>{o}</option>
                ))}
              </optgroup>
            ))
          : flat.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
      {emptyNote}
    </>
  );
}
