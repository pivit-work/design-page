/**
 * 명부 내보내기 범위 항목 계산 — `screen-admin-employees-export.policy.md §2-2`.
 *
 * 🔴 목록 뷰와 스프레드시트 뷰가 **같은 계산**을 쓴다(PW-411). 뷰마다 따로 세면 같은
 * 조직·같은 상태에서 서로 다른 캡션이 나오고, 어느 쪽이 맞는지는 받은 파일을 열어
 * 세어 보기 전에는 알 수 없다.
 *
 * 컴포넌트가 아닌 순수 함수라 `employeeExport.jsx` 와 파일을 나눈다 — 한 파일이
 * 컴포넌트와 상수를 함께 export 하면 Fast Refresh 가 꺼진다.
 */

/** `{count}`·`{columns}` 자리 채우기 — 라벨은 소비자(i18n)가 준다. */
export function fillExportCaption(tpl, vals) {
  return Object.entries(vals).reduce(
    (s, [k, v]) => s.split(`{${k}}`).join(String(v)),
    String(tpl || ''),
  );
}

/** 퇴사자 수 — 제출용 명부에 섞여 나가는 게 가장 흔한 사고다(E3). */
export function countTerminated(list) {
  return list.filter((r) => r.employmentStatus === 'terminated').length;
}

/**
 * 범위 드롭다운 항목 — 정책 §2-2.
 *
 * ②「선택한 N명」 은 **체크한 행이 있을 때만** 렌더된다. 행 체크박스가 없는 뷰
 * (목록 뷰)에서는 `selected` 를 주지 않으므로 항목 자체가 나오지 않는다 — 범위를
 * 만들려고 체크박스를 새로 넣지 않는다.
 *
 * @param labels        exportLabels (i18n)
 * @param viewRows      ① 대상 행(필터 적용 결과)
 * @param allRows       ③ 대상 행(조직 전원)
 * @param columnCount   화면에 보이는 열 수
 * @param hasActiveFilter 필터·검색어가 하나라도 걸렸는가
 * @param salaryVisible 연봉 열이 보이는가
 * @param selectedRows  ② 대상 행. `null`·빈 배열이면 항목을 만들지 않는다
 */
export function buildExportItems({
  labels,
  viewRows,
  allRows,
  columnCount,
  hasActiveFilter,
  salaryVisible,
  selectedRows = null,
}) {
  const L = labels || {};
  const fill = fillExportCaption;
  const warnOf = (list) => (countTerminated(list) > 0
    ? fill(L.terminatedIncluded || '퇴사 {count}명 포함', { count: countTerminated(list) })
    : null);
  const sensitive = salaryVisible ? (L.salaryIncluded || '연봉 포함') : null;

  return [
    {
      id: 'view',
      label: L.scopeView || '현재 화면 그대로',
      caption: fill(L.scopeViewCaption || '{count}명 · {columns}열', {
        count: viewRows.length,
        columns: columnCount,
      }) + (hasActiveFilter ? ` · ${L.filtered || '필터 적용됨'}` : ''),
      warn: warnOf(viewRows),
      sensitive,
    },
    ...(selectedRows && selectedRows.length > 0
      ? [{
        id: 'selected',
        label: fill(L.scopeSelected || '선택한 {count}명', { count: selectedRows.length }),
        caption: fill(L.scopeSelectedCaption || '체크한 행만 · {columns}열', {
          columns: columnCount,
        }),
        warn: warnOf(selectedRows),
        sensitive,
      }]
      : []),
    {
      id: 'all',
      label: L.scopeAll || '전체 구성원 (표준 13열)',
      caption: fill(L.scopeAllCaption || '{count}명 · 필터·컬럼 설정 무시', {
        count: allRows.length,
      }),
      warn: warnOf(allRows),
      // ③ 은 연봉을 포함하지 않는다(§2-2 · E13) — 🔒 예고도 붙이지 않는다.
      sensitive: null,
    },
  ];
}
