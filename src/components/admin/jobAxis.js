/**
 * 직군 > 직렬 > 직무 3단 축 유틸 (§1-3-d · §1-3-j).
 *
 * 스프레드시트 뷰(셀 드롭다운)와 목록 뷰(필터 칩)가 **같은 좁히기 규칙**을 써야 한다.
 * 두 벌로 갈리면 한쪽에서 고를 수 있는 값이 다른 쪽에서는 안 보이고, 저장에서만
 * 거부된다.
 */

/**
 * 상위 값으로 하위 선택지를 좁힌다.
 *
 * - 상위가 비어 있으면 좁히지 않는다 — 아직 안 정한 사람에게 빈 목록을 주면
 *   위에서부터 고르라는 안내 없이 막힌 것처럼 보인다.
 * - 매핑 자체가 없으면(조회 실패·구버전) 역시 좁히지 않는다.
 * - 매핑이 있는데 하위가 0건이면 **빈 목록 그대로** 둔다. 그 직렬에 직무가 아직
 *   없다는 사실을 전체 목록으로 덮으면, 고른 값이 저장에서 거부된다.
 */
export function narrowByParent(all, map, parentValue) {
  if (!parentValue) return all;
  if (!map || Object.keys(map).length === 0) return all;
  const children = map[parentValue];
  if (!children) return [];
  // 카탈로그(활성 값)와 교집합 — 비활성된 값이 매핑에만 남아 새로 선택되면 안 된다(D5).
  const active = new Set(all);
  return children.filter((c) => active.has(c));
}

/**
 * (상위, 하위) 한 쌍이 연결표에 있는지 본다 — §3.8.3-A 의 저장 차단 판정.
 *
 * 좁혀 주는 드롭다운(`narrowByParent`)은 «새로 어긋나게 만들기»만 막는다. 상위를
 * 나중에 바꿨거나, CSV 로 들어왔거나, 조직 설정에서 연결이 끊긴 값은 그대로 남아
 * 저장에서만 400 으로 거부됐다(INV-3 · INV-8). 그 값을 화면이 먼저 알리기 위한 판정이다.
 *
 * - **하위가 비어 있으면 통과.** 직렬·직무는 선택 입력이라, 아직 안 정한 사람을
 *   「잘못됐다」고 말하면 안 된다.
 * - **연결표를 못 받았으면(빈 매핑) 판정하지 않는다.** 조회 실패·구버전에서 전원을
 *   무효로 몰아 저장을 통째로 막는 것이 원래 문제보다 나쁘다. 그때는 서버가 판정한다.
 * - 상위가 비어 있는데 하위만 있으면 **무효다.** 그 하위는 어느 상위에도 매달려 있지
 *   않아 서버가 받지 않는다.
 */
export function isValidPair(map, parentValue, childValue) {
  if (!childValue) return true;
  if (!map || Object.keys(map).length === 0) return true;
  if (!parentValue) return false;
  const children = map[parentValue];
  return Array.isArray(children) && children.includes(childValue);
}

/**
 * 두 쌍((직군, 직렬) · (직렬, 직무)) 중 하나라도 어긋난 행의 id 집합.
 *
 * 요약의 N 이 이 집합의 크기이고, 「이 행만 보기」가 좁히는 대상도 이 집합이다 —
 * 세는 곳과 좁히는 곳이 갈리면 「N건」이라 해 놓고 다른 수가 보인다.
 */
export function invalidPairRowIds(rows, jobAxis) {
  const ids = new Set();
  if (!Array.isArray(rows) || !jobAxis) return ids;
  for (const r of rows) {
    if (!r) continue;
    const badLadder = !isValidPair(jobAxis.laddersByFamily, r.jobFamily, r.jobTitle);
    const badDuty = !isValidPair(jobAxis.dutiesByLadder, r.jobTitle, r.jobDuty);
    if (badLadder || badDuty) ids.add(r.id);
  }
  return ids;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3단 연동 select 의 «고르면 무슨 일이 일어나나» (admin-spec §3.5-A · PW-748)
 *
 * 구성원 편집 창과 발령 단건이 **같은 함수**를 탄다. 두 화면이 제각각 규칙을 들고
 * 있으면 한쪽은 직렬을 비우고 다른 쪽은 남겨, 남은 쪽에서만 저장이 거절된다
 * (PW-748 이 그 상태였다 — 편집 창은 좁히기만, 발령 단건은 좁히기조차 안 했다).
 * ──────────────────────────────────────────────────────────────────────────── */

const hasMap = (map) => !!map && Object.keys(map).length > 0;

/** 그 하위 값을 가진 상위 값 목록 — 역채움 판정에 쓴다. 매핑 순서를 따른다. */
export function parentsOf(map, childValue) {
  if (!hasMap(map) || !childValue) return [];
  return Object.keys(map).filter((p) => Array.isArray(map[p]) && map[p].includes(childValue));
}

/**
 * 상위를 안 고른 채 하위 목록을 열 때 쓰는 묶음 — `[{ group, options }]`.
 *
 * 전체를 평면으로 늘어놓으면 어느 직군의 직렬인지 안 보인다(§3.5-A 「optgroup(직군별
 * 그룹 헤더)」). 여러 상위에 걸친 값은 여러 묶음에 중복으로 나온다.
 * 매핑이 없으면 `null` — 그때는 호출부가 평면 목록을 그린다.
 *
 * @param map        상위 → 하위 값 목록
 * @param parents    상위 값의 **순서** (활성 목록). 매핑에만 남은 상위는 뺀다
 * @param activeKids 하위 활성 값 — 비활성은 새로 고를 수 없다(D5)
 */
export function groupedChildren(map, parents, activeKids) {
  if (!hasMap(map)) return null;
  const active = new Set(activeKids || []);
  const out = [];
  for (const p of parents || []) {
    const options = (map[p] || []).filter((c) => active.has(c));
    if (options.length > 0) out.push({ group: p, options });
  }
  return out;
}

/** optgroup 안의 선택지 값 — 같은 직렬이 두 직군에 있을 때 «어느 묶음에서 골랐나» 를 싣는다. */
const GROUP_SEP = String.fromCharCode(1);
export const groupedOptionValue = (group, value) => `${group}${GROUP_SEP}${value}`;
export function parseGroupedOptionValue(raw) {
  const s = String(raw ?? '');
  const i = s.indexOf(GROUP_SEP);
  return i < 0 ? { group: '', value: s } : { group: s.slice(0, i), value: s.slice(i + 1) };
}

/**
 * 한 칸을 바꿨을 때 세 칸의 다음 값과 안내를 돌려준다.
 *
 * @param axis   `{ laddersByFamily, dutiesByLadder }`
 * @param cur    `{ family, ladder, duty }` — 바꾸기 전 값
 * @param level  `'family' | 'ladder' | 'duty'`
 * @param value  고른 값 (optgroup 에서 골랐으면 `parseGroupedOptionValue` 로 푼 뒤의 값)
 * @param group  optgroup 에서 골랐을 때 그 묶음(상위 값). 없으면 `''`
 * @returns `{ next: { family, ladder, duty }, notice }` —
 *   notice 는 `null` 또는 `{ kind, field, value?, owners? }`.
 *   kind: `ladderReset` · `ladderDutyReset` · `dutyReset` · `familyFilled` · `ladderFilled`
 *        · `familyAmbiguous` · `ladderAmbiguous`
 *   field: 안내를 붙일 칸 — `'family' | 'ladder' | 'duty'`
 *
 * 매핑을 못 받았으면(빈 매핑) 아무것도 비우거나 채우지 않는다 — 판정할 근거가 없는데
 * 멀쩡한 값을 지우면 원래 문제보다 나쁘다. 그때는 서버가 판정한다.
 */
export function applyJobAxisChange(axis, cur, level, value, group = '') {
  const lf = axis?.laddersByFamily || {};
  const dl = axis?.dutiesByLadder || {};
  const family = cur?.family || '';
  const ladder = cur?.ladder || '';
  const duty = cur?.duty || '';
  const v = value || '';

  if (level === 'family') {
    // 직군을 «비우는» 것은 초기화하지 않는다 — 실수로 미지정을 고른 한 번에 아래 두 칸이
    // 날아가면 되돌릴 길이 없다. 그 상태는 저장이 칸을 짚어 거절한다(INV-3).
    if (v && ladder && hasMap(lf) && !isValidPair(lf, v, ladder)) {
      return {
        next: { family: v, ladder: '', duty: '' },
        notice: { kind: duty ? 'ladderDutyReset' : 'ladderReset', field: 'ladder' },
      };
    }
    return { next: { family: v, ladder, duty }, notice: null };
  }

  if (level === 'ladder') {
    // 직렬이 비면 그 아래 직무는 매달릴 곳이 없다(INV-8) — 함께 비운다.
    if (!v) {
      return {
        next: { family, ladder: '', duty: '' },
        notice: duty ? { kind: 'dutyReset', field: 'duty' } : null,
      };
    }
    const keepDuty = duty && isValidPair(dl, v, duty) ? duty : '';
    const dutyNotice = duty && !keepDuty ? { kind: 'dutyReset', field: 'duty' } : null;
    if (group) {
      return {
        next: { family: group, ladder: v, duty: keepDuty },
        notice: dutyNotice || (group !== family ? { kind: 'familyFilled', field: 'family', value: group } : null),
      };
    }
    if (!family) {
      const owners = parentsOf(lf, v);
      if (owners.length === 1) {
        return {
          next: { family: owners[0], ladder: v, duty: keepDuty },
          notice: dutyNotice || { kind: 'familyFilled', field: 'family', value: owners[0] },
        };
      }
      if (owners.length > 1) {
        return {
          next: { family: '', ladder: v, duty: keepDuty },
          notice: { kind: 'familyAmbiguous', field: 'family', value: v, owners },
        };
      }
    }
    return { next: { family, ladder: v, duty: keepDuty }, notice: dutyNotice };
  }

  // level === 'duty'
  if (!v) return { next: { family, ladder, duty: '' }, notice: null };
  const dutyOwners = parentsOf(dl, v);
  const pickLadder = group || (!ladder && dutyOwners.length === 1 ? dutyOwners[0] : '');
  if (pickLadder && pickLadder !== ladder) {
    // 직렬을 채우면 직군도 연쇄로 본다 — 지금 직군이 새 직렬과 안 맞으면 소속 직군이
    // 하나일 때만 채우고, 여럿이면 비워 고르게 한다.
    const fams = parentsOf(lf, pickLadder);
    let nextFamily = family;
    if (hasMap(lf) && !isValidPair(lf, family, pickLadder)) nextFamily = fams.length === 1 ? fams[0] : '';
    return {
      next: { family: nextFamily, ladder: pickLadder, duty: v },
      notice: { kind: 'ladderFilled', field: 'ladder', value: pickLadder },
    };
  }
  if (!ladder && dutyOwners.length > 1) {
    return {
      next: { family, ladder: '', duty: v },
      notice: { kind: 'ladderAmbiguous', field: 'ladder', value: v, owners: dutyOwners },
    };
  }
  return { next: { family, ladder, duty: v }, notice: null };
}

/** 안내를 사람이 읽는 문장으로 — 라벨 묶음(`axisNotice*`)의 `{value}`·`{owners}` 를 채운다. */
export function jobAxisNoticeText(notice, labels) {
  if (!notice || !labels) return '';
  const key = {
    ladderReset: 'axisNoticeLadderReset',
    ladderDutyReset: 'axisNoticeLadderDutyReset',
    dutyReset: 'axisNoticeDutyReset',
    familyFilled: 'axisNoticeFamilyFilled',
    ladderFilled: 'axisNoticeLadderFilled',
    familyAmbiguous: 'axisNoticeFamilyAmbiguous',
    ladderAmbiguous: 'axisNoticeLadderAmbiguous',
  }[notice.kind];
  const tpl = key ? labels[key] : '';
  if (!tpl) return '';
  return String(tpl)
    .replace('{value}', notice.value ?? '')
    .replace('{owners}', (notice.owners || []).join(' · '));
}

/** 세 칸 연동의 기본 문구 (한국어) — 화면 라벨 묶음에 섞어 쓴다. */
export const JOB_AXIS_DEFAULT_LABELS = {
  axisNoticeLadderReset: '직렬이 초기화되었습니다. 다시 선택해 주세요',
  axisNoticeLadderDutyReset: '직렬·직무가 초기화되었습니다. 다시 선택해 주세요',
  axisNoticeDutyReset: '직무가 초기화되었습니다. 다시 선택해 주세요',
  axisNoticeFamilyFilled: "직군이 '{value}'(으)로 자동 설정되었습니다",
  axisNoticeLadderFilled: "직렬이 '{value}'(으)로 자동 설정되었습니다",
  axisNoticeFamilyAmbiguous: "'{value}'은(는) {owners} 직군에 속합니다. 직군을 선택해 주세요",
  axisNoticeLadderAmbiguous: "'{value}'은(는) {owners} 직렬에 속합니다. 직렬을 선택해 주세요",
  axisEmptyFamilies: '옵션 없음 — 조직 설정에서 추가',
  axisEmptyLadders: '이 직군에 연결된 직렬이 없어요',
  axisEmptyDuties: '이 직렬에 연결된 직무가 없어요',
  axisGoFieldOptions: '조직 설정',
};
