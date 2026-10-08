/**
 * 내 리소스(리소스 투입) 화면의 문구 — 기본값은 지금 화면의 한국어 그대로다.
 *
 * 호스트가 `labels` 로 일부만 넘기면 나머지는 기본값으로 채운다(영어 화면 · PW-1171).
 * 값에 숫자·이름이 끼는 문구는 함수다 — 어순이 언어마다 달라 호스트가 통째로 만든다.
 *
 * 🔴 `status` 는 **표시 문구만** 바꾼다. 배지 색은 여전히 데이터의 한국어 상태값
 * (`여유`·`적정`·`쏠림`·`과부하`)으로 고른다 — 번역한 문자열로 색을 고르면 폴백으로 떨어진다.
 */
export const OKR_RESOURCE_DEFAULT_LABELS = {
  viewsAria: '리소스 투입 뷰',
  views: { my: '내 입력', team: '팀 현황', org: '조직 현황' },
  inputHint: '입력 가능',
  readOnlyHint: '조회 전용',
  status: { 여유: '여유', 적정: '적정', 쏠림: '쏠림', 과부하: '과부하' },
  managerComments: '매니저 코멘트',
  people: (n) => `${n}명`,
  my: {
    total: '투입 합계',
    items: '투입 항목',
    kr: '내 KR',
    status: '상태',
    aiEstimate: '스니핏 기반 추정',
    applyEstimates: '추정치 적용',
    estimateNote: '추정은 참고치입니다. 적용 후 슬라이더로 보정하고 저장해야 반영됩니다.',
    sliderAria: (name) => `${name} 투입 비율`,
    marker: '추정치',
    inputAria: (name) => `${name} 투입 비율 입력`,
    estimate: (pct) => `추정 ${pct}%`,
    estimateGap: '스니핏 기록과 차이 큼',
    removeAria: (name) => `${name} 삭제`,
    addTitle: '투입 항목 추가',
    confirmed: '확정',
    suggestTitle: '스니핏에 기록됐지만 목록에 없는 프로젝트',
    suggestChip: (name, pct) => `+ ${name} 추정 ${pct}%`,
    squadProjects: '스쿼드 프로젝트',
    personalOkr: '개인 OKR',
    loadKrs: '내 KR 불러오기',
    add: '추가',
    krNote: 'KR 정보는 개인 OKR에서 수동으로 불러온 항목입니다 (자동 동기화 없음). 스니핏 추정에는 포함되지 않습니다.',
    customTitle: '목록에 없는 프로젝트',
    customPlaceholder: '프로젝트 직접 입력 (20자 이내)',
    customAria: '프로젝트 직접 입력',
    customAdd: '직접 추가',
    customNote: '직접 추가한 프로젝트는 내 입력에만 표시되는 개인 항목이며, 스니핏 기반 추정에는 포함되지 않습니다.',
    save: '저장',
    openProject: '프로젝트 상세 보기',
    readOnlyNotice: (month) => `${month}은 끝난 달입니다. 입력한 값은 볼 수만 있고 고칠 수 없습니다. 매니저 코멘트와 답글은 남길 수 있습니다.`,
    readOnlyEmpty: '이 달에 입력한 기록이 없습니다.',
    replyPlaceholder: '답글을 입력하세요',
    replyAria: '답글 입력',
    replySubmit: '답글 남기기',
    reply: '답글 달기',
    me: '나',
  },
  team: {
    total: '팀원 총원',
    relaxed: '여유',
    focused: '몰입',
    overloaded: '과부하',
    items: (n) => `항목 ${n}`,
    comments: (n) => `코멘트 ${n}`,
    toggleAria: (name, open) => `${name} 코멘트 ${open ? '접기' : '펼치기'}`,
    commentAria: (name) => `${name} 코멘트 입력`,
    commentSubmit: '코멘트 남기기',
    me: '나',
  },
  org: {
    total: '조직 인원',
    avg: '평균 투입',
    overloaded: '과부하 인원',
    missing: '미입력',
    teamTag: '팀',
    lead: (name) => `리드 ${name}`,
    size: (n) => `인원 ${n}`,
    entered: (n) => `입력 ${n}`,
    avgMeta: (pct) => `평균 투입 ${pct}%`,
    openTeamAria: (name) => `${name} 상세 보기`,
    directs: '직속 구성원',
    modalHeadcount: (n) => `조직 인원 ${n}명`,
  },
};

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/** 넘겨받은 문구를 기본값 위에 한 단계씩 겹친다. 빈 값은 기본값을 지우지 않는다. */
export function mergeOkrResourceLabels(provided, base = OKR_RESOURCE_DEFAULT_LABELS) {
  if (!isObj(provided)) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(provided)) {
    if (v == null) continue;
    out[k] = isObj(v) && isObj(base[k]) ? mergeOkrResourceLabels(v, base[k]) : v;
  }
  return out;
}

/** 상태값 → 보이는 글자. 모르는 값은 그대로 둔다. */
export function statusLabel(status, labels = OKR_RESOURCE_DEFAULT_LABELS) {
  return labels.status?.[status] ?? status;
}
