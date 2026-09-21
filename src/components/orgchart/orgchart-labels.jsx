/**
 * 조직도 세 축(조직도 · 프로젝트 · 스쿼드) 화면 문구 — 소비자가 번역을 넘기는 자리 (pivit-work PW-705).
 *
 * 종전에는 문구가 각 부품 안에 한국어로 박혀 있어서, 영어로 바꿔도 조직도 화면 안은
 * 한국어로 남았다. 문구를 여기 한 곳에 모으고 캔버스가 `labels` prop 으로 번역을 받는다.
 *
 * `labels` 는 둘 중 하나다:
 *  - 객체 — `{ 'tab.orgchart': 'Org Chart', … }` 처럼 바꿀 키만 준다.
 *  - 함수 — `(key, vars) => string | undefined`. 번역기(i18next 등)를 그대로 물린다.
 *    자리 표시는 함수가 채워서 돌려준다. `undefined`·빈 문자열이면 아래 기본값(한국어)으로 떨어진다.
 *
 * 🔴 **안 넘기면 지금 한국어 문구가 그대로 나온다** — 기본값이 곧 종전 화면이다.
 *
 * 자리 표시는 `{{name}}` 이다(i18next 와 같다). 숫자 뒤에 붙는 말이 로케일마다 달라서
 * (`3명` / `3 people`) 숫자와 단위를 한 문구로 둔다.
 * `<b>…</b>` · `<br/>` 가 들어간 문구는 `rich()` 로 그린다 — 그 두 태그만 해석한다.
 */
import { createContext, useContext, Fragment } from 'react';

export const ORGCHART_LABELS = {
  // ── 탭 줄 · 머리 (세 캔버스 공통) ──
  'tab.orgchart': '조직도',
  'tab.project': '프로젝트',
  'tab.squad': '스쿼드',

  // ── 조직도 ──
  'org.totalHeadcount': '전체 인원',
  'org.dragHint': '화면을 드래그하면 좀 더 쉽게 조직도를 보실 수 있습니다.',
  'org.lineStyle': '연결선 모양 바꾸기 (곡선 ↔ 직각)',
  'org.staffBadge': '대표 직속',
  'org.ceoBadge': '대표',
  'org.selfBadge': '나',
  'org.directSlot': '직속 {{count}}명',
  'org.expandChildren': '{{name}} 하위 조직 펼치기',
  'org.collapseChildren': '{{name}} 하위 조직 접기',

  // ── 프로필 카드 (프로젝트 탭 · design-page 자체 화면) ──
  'profile.employmentType': '고용형태',
  'profile.employmentTypeDefault': '정규직',
  'profile.rank': '직급',
  'profile.workHours': '업무시간',
  'profile.feedback': '피드백주기',
  'profile.meeting': '미팅잡기',
  'profile.employeeNo': '사번',
  'profile.joinedAt': '입사일',
  'profile.phone': '전화번호',
  'profile.skills': '스킬',
  'profile.contact': '연락처',
  'profile.links': '링크',
  'profile.directReports': '직속팀원',
  'profile.directReportChip': '직속',
  'profile.peopleCount': '{{count}}명',
  'profile.roleDefault': '사원',
  'member.status.working': '재직중',
  'member.status.leave': '휴직',
  'member.status.resigned': '퇴사 예정',
  'member.status.standby': '대기중',

  // ── 프로젝트 ──
  'project.count': '{{count}}개',
  'project.filter.all': '전체',
  'project.filter.preparing': '준비 중',
  'project.filter.inProgress': '진행중',
  'project.filter.completed': '완료',
  'project.status.inProgress': '진행 중',
  'project.status.preparing': '준비 중',
  'project.status.completed': '완료',
  'project.progress': '진행률',
  'project.memberCount': '{{count}}명',
  'project.tableTitle': '프로젝트에 배치된 멤버 리스트',
  'project.tableSubtitle': '이름을 클릭하면 상세 정보를 보실 수 있어요.',
  'project.colName': '이름',
  'project.colTotal': '총',
  'project.more': '더 보기',

  // ── 스쿼드: 머리 · 도구줄 ──
  'squad.count': '{{count}}개',
  'squad.title': '스쿼드',
  'squad.desc.view': '기능 조직과 평행한 한시 조직 — 스쿼드 카드와 배치 매트릭스로 구성을 확인합니다',
  'squad.desc.editAll': '전체 스쿼드의 비중·구성을 편집할 수 있습니다 — 캐파 사용은 본인만 정합니다 (관리자도 요청만 보냅니다)',
  'squad.desc.editOrg': '내 조직 구성원의 비중·구성을 편집할 수 있습니다 — 캐파 사용은 본인만 정합니다',
  'squad.desc.editLead': '내가 리드인 스쿼드의 비중·구성만 편집할 수 있습니다 — 팀원의 캐파 사용은 본인만 정합니다',
  'squad.create': '스쿼드 만들기',
  'squad.editAssign': '할당 편집',
  'squad.editDone': '편집 완료',
  'squad.dismiss': '닫기',
  'squad.loading': '스쿼드 정보를 불러오는 중…',
  'squad.loadFailed': '스쿼드 정보를 불러오지 못했습니다',
  'squad.retry': '다시 시도',
  'squad.overdueTitle': '종료일이 지난 진행중 스쿼드 {{count}}건',
  'squad.overdueNote': '상태 배지에서 완료로 전환하세요 — 자동으로 바뀌지 않습니다',
  'squad.empty.title': '운영 중인 스쿼드가 없습니다',
  'squad.empty.descAdmin': '첫 스쿼드를 만들어 팀원을 배정해보세요',
  'squad.empty.descViewer': '관리자가 스쿼드를 만들면 표시됩니다',

  // ── 스쿼드: 상태 ──
  'squad.status.planned': '준비중',
  'squad.status.active': '진행중',
  'squad.status.done': '완료',
  'squad.status.archived': '보관',
  'squad.transition.start': '시작',
  'squad.transition.done': '완료',
  'squad.transition.archive': '보관',
  'squad.transition.reopen': '재개',
  'squad.transition.restore': '복원',
  'squad.dateUndecided': '미정',

  // ── 스쿼드: 카드 ──
  'squad.card.changeStatus': '상태 변경',
  'squad.card.manage': '스쿼드 관리',
  'squad.card.edit': '수정',
  'squad.card.history': '이력',
  'squad.card.delete': '삭제',
  'squad.card.deleteOnlyArchived': '보관 상태에서만 삭제할 수 있습니다',
  'squad.card.memberCount': '{{count}}명',
  'squad.card.lead': '리드',
  'squad.card.leadUnset': '미지정',
  'squad.card.noMembers': '배정된 팀원이 없습니다',
  'squad.card.addCaption': '이 스쿼드의 구성은 리드·관리자가 정합니다',
  'squad.card.searchMember': '팀원 검색',
  'squad.card.searchPlaceholder': '이름 · 팀 · 직함 검색…',
  'squad.card.noCandidates': '추가할 수 있는 구성원이 없습니다',
  'squad.card.noCandidatesOutOfScope': '추가할 수 있는 구성원이 없습니다 (내 조직 범위 밖)',
  'squad.card.addMember': '팀원 추가',
  'squad.card.unassign': '배정 해제',
  'squad.card.chipCapacity': '(캐파 {{value}})',
  'squad.unknownMember': '알 수 없는 구성원',

  // ── 스쿼드: 마우스를 올리면 뜨는 설명 ──
  'squad.tip.memberSummary': '{{name}} — 스쿼드 내 비중 {{share}}% · 개인 캐파 사용 {{capacity}}',
  'squad.tip.leadSuffix': ' · 리드',
  'squad.tip.capacityUnset': '미설정 — 합계에서 제외됨',
  'squad.tip.capacityUnsetShort': '미설정',
  'squad.tip.clickEditAll': '클릭: 비중·캐파·리드 편집',
  'squad.tip.clickMyCapacity': '클릭: 내 캐파 설정',
  'squad.tip.clickEditShare': '클릭: 비중·리드 편집 (캐파는 본인만)',
  'squad.tip.lockedOrg': '편집 권한 없음 (내 조직 아님)',
  'squad.tip.lockedLead': '편집 권한 없음 (내가 리드인 스쿼드가 아님)',
  'squad.tip.cellCapacity': '개인 캐파 사용 {{capacity}} (내 캐파 100 기준 — 오른쪽 합계의 재료)',
  'squad.tip.cellShare': '스쿼드 내 비중 {{share}}% (이 스쿼드 100 기준 — 합계에 들어가지 않음)',
  'squad.tip.lead': '리드',
  'squad.tip.cellCapacityUnset': '캐파 사용이 아직 설정되지 않았습니다',
  'squad.tip.assignEmpty': '클릭: {{squad}}에 배정 (비중 미배분 · 캐파 미설정 — 캐파는 본인이 정한다)',
  'squad.tip.over100': '개인 캐파 100 초과',
  'squad.capacityIdleHint': '캐파 사용이 지정되지 않았습니다',

  // ── 스쿼드: 매트릭스 ──
  'squad.matrix.title': '멤버 × 스쿼드 배치',
  'squad.matrix.subtitleEdit': '빈 셀 클릭 = 배정 (비중 미배분 · 캐파 미설정) · 배정 셀 클릭 = 비중·캐파·리드 편집',
  'squad.matrix.subtitleView': '셀 윗줄 = 개인 캐파 사용(합계의 재료) · 아랫줄 = 스쿼드 내 비중(합계 밖)',
  'squad.matrix.colMember': '멤버',
  'squad.matrix.colCapacity': '캐파 사용',
  'squad.matrix.colCapacityBasis': '내 캐파 100 기준',
  'squad.matrix.cellShare': '스쿼드 {{share}}%',
  'squad.matrix.cellShareNone': '스쿼드 —',
  'squad.matrix.unsetCount': '미설정 {{count}}곳 · ',
  'squad.matrix.noteExcluded': '합계 제외됨',
  'squad.matrix.noteUnassigned': '미배정',
  'squad.matrix.noteOver': '초과 {{diff}}%p · {{count}}개',
  'squad.matrix.noteSlack': '여유 {{diff}}%p · {{count}}개',
  'squad.matrix.emptyRow': '배정된 팀원이 없습니다 — 「할당 편집」에서 배정해보세요',
  'squad.mycap.label': '내 캐파 사용',
  'squad.mycap.over': '초과 {{diff}}%p',
  'squad.mycap.slack': '여유 {{diff}}%p',
  'squad.mycap.unset': ' · 미설정 {{count}}곳',
  'squad.mycap.owner': '이 값은 <b>본인이 정한다</b> — 스쿼드 볼륨이 나오기 전까지 자동 계산하지 않는다',
  'squad.mycap.setCta': '내 캐파 설정',
  'squad.mycap.adjustCta': '조정',
  'squad.overload.title': '과부하',
  'squad.overload.body': ' — 개인 캐파 100을 넘겨 배정됐습니다 (저장은 허용 · 조정은 사람이 결정)',
  'squad.legend.lead': '리드 (스쿼드당 1명)',
  'squad.legend.rows': '셀 <b>윗줄</b> = 내 가용 캐파 100 중 이 스쿼드에 쓰는 비율(합산 대상) · <b>아랫줄</b> = 이 스쿼드 100 중 내 비중 —<b> 서로 파생되지 않는 별개 값</b>이다 (스쿼드마다 절대 볼륨이 달라 한쪽에서 다른 쪽을 계산할 수 없다)',
  'squad.legend.capacityPrefix': '캐파 사용(완료·보관 스쿼드 제외): ',
  'squad.legend.capacityOver': '>100 초과',
  'squad.legend.capacityRest': '(빗금 = 캐파 밖) · 100 가득 · 70~99 적정 · <70 여유',
  'squad.legend.owner': '소유자가 다르다 — <b>비중은 조직</b>이 정하고 <b>캐파 사용은 본인만</b> 정한다 (리드·관리자는 대신 정할 수 없고 <b>[캐파 설정 요청]</b>만 보낸다) · 점선 <b>—</b> = 미설정(합계 제외)',
  'squad.legend.faint': '스쿼드 내 비중은 「캐파 사용」 합계에 들어가지 않는다 · 실제 투입%는 「리소스 투입현황」 자기신고 값과 별개',

  // ── 스쿼드: 팀원 리소스 구성 (카드) ──
  'squad.comp.title': '팀원 리소스 구성',
  'squad.comp.basis': '스쿼드 100 기준',
  'squad.comp.allotLabel': '배분',
  'squad.comp.none': '배분된 비중이 없습니다 (전원 0%)',
  'squad.comp.capacityRaw': '(캐파 {{value}})',
  'squad.comp.caplineTip': '스쿼드 내 비중과 분모가 다른 값입니다 (사람마다의 캐파 100 기준 합)',
  'squad.comp.caplineLabel': '이 스쿼드가 쓰는 인력',
  'squad.comp.caplineValue': '캐파 합 {{sum}}% · 약 {{fte}}인분',
  'squad.allot.done': '배분 완료',
  'squad.allot.over': '초과 {{diff}}%p',
  'squad.allot.under': '미배분 {{diff}}%p',
  'squad.gauge.capacity100': '캐파 100%',
  'squad.gauge.squad100': '스쿼드 100%',

  // ── 스쿼드: 배정 편집 창 ──
  'squad.pop.desc': '분모가 다른 두 값을 따로 정합니다 · 리드 지정 (스쿼드당 1명)',
  'squad.pop.shareAxis': '① 스쿼드 내 비중',
  'squad.pop.shareBasis': '이 스쿼드 100 기준',
  'squad.pop.shareOwnerLead': '· 리드인 내가 정하는 값',
  'squad.pop.shareOwnerProxy': '· 리드 대신 조정',
  'squad.pop.shareOwnerOther': '· 스쿼드 리드가 정하는 값',
  'squad.pop.shareInput': '스쿼드 내 비중',
  'squad.pop.shareInputDirect': '스쿼드 내 비중 직접 입력',
  'squad.pop.sharePreview': '이 스쿼드 배분',
  'squad.pop.otherMembers': '다른 팀원',
  'squad.pop.divider': '두 값은 연동되지 않습니다',
  'squad.pop.dividerDesc': '스쿼드 볼륨(절대 공수)이 정해지기 전까지 캐파 사용은 직접 정합니다 — 비중을 바꿔도 아래 값은 그대로입니다.',
  'squad.pop.capacityAxis': '② 개인 캐파 사용',
  'squad.pop.capacityBasis': '내 캐파 100 기준',
  'squad.pop.capacityOwnerSelf': '· 내가 정하는 값',
  'squad.pop.capacityOwnerOther': '· 본인만 정하는 값',
  'squad.pop.capacityUnsetNote': '아직 설정되지 않았습니다 — 저장하기 전까지 캐파 합계에 포함되지 않습니다.',
  'squad.pop.capacityLocked': '이 값은 본인만 정합니다. 같은 비중이라도 그것이 그 사람의 100 중 얼마인지는 다른 스쿼드·숙련도·병행 업무가 정하기 때문입니다 — 관리자도 요청만 보냅니다.',
  'squad.pop.capacityInput': '개인 캐파 사용',
  'squad.pop.capacityInputDirect': '개인 캐파 사용 직접 입력',
  'squad.pop.capacityPreview': '캐파 사용',
  'squad.pop.stateUnassigned': '미배정',
  'squad.pop.stateOver': '초과 {{diff}}%p',
  'squad.pop.stateSlack': '여유 {{diff}}%p',
  'squad.pop.otherSquads': '다른 스쿼드',
  'squad.pop.notCounted': '이 스쿼드는 {{status}} 상태라 캐파 합계에 포함되지 않습니다. (비중은 상태와 무관하게 계산됩니다)',
  'squad.pop.idleNote': '비중은 잡혀 있는데 캐파 사용이 0입니다 — 저장은 되지만 과부하 판단에 반영되지 않습니다.',
  'squad.pop.requested': '요청됨 — 본인이 설정하면 반영됩니다',
  'squad.pop.request': '캐파 설정 요청 보내기',
  'squad.pop.unsetLead': '리드 해제',
  'squad.pop.setLead': '리드 지정',
  'squad.pop.unassign': '배정 해제',

  // ── 스쿼드: 상태 이력 ──
  'squad.hist.title': '상태 이력',
  'squad.hist.loading': '불러오는 중…',
  'squad.hist.failed': '이력을 불러오지 못했습니다',
  'squad.hist.created': '생성',
  'squad.hist.unknownUser': '알 수 없음',
  'squad.hist.empty': '기록이 없습니다',

  // ── 스쿼드: 만들기 · 수정 카드 ──
  'squad.form.titleEdit': '스쿼드 수정',
  'squad.form.titleCreate': '새 스쿼드',
  'squad.form.name': '스쿼드명',
  'squad.form.namePlaceholder': '스쿼드명 (필수)',
  'squad.form.mission': '미션',
  'squad.form.missionPlaceholder': '미션 한 줄 (선택)',
  'squad.form.startDate': '시작일',
  'squad.form.startDateLabel': '시작일 (필수)',
  'squad.form.endDate': '종료일',
  'squad.form.endDateLabel': '종료일 (선택)',
  'squad.form.color': '색상',
  'squad.form.leadLabel': '팀장 (리드) — 선택',
  'squad.form.leadClear': '팀장 지정 해제',
  'squad.form.leadSearch': '팀장 검색',
  'squad.form.leadSearchPlaceholder': '이름·팀·직함 검색',
  'squad.form.leadNoResults': '검색 결과가 없습니다',
  'squad.form.leadPick': '팀장 지정',
  'squad.form.noteCreate': '상태는 <b>준비중</b>으로 생성됩니다.',
  'squad.form.noteNoLead': ' 팀장을 지정하지 않으면 해당 조직 팀장이 이 스쿼드의 프로젝트를 편집할 수 없습니다.',
  'squad.form.noteEdit': '상태는 여기서 바꿀 수 없습니다 — 카드의 상태 배지에서 전환하세요.',
  'squad.form.save': '저장',
  'squad.form.create': '만들기',
  'squad.form.cancel': '취소',
  'squad.form.errNameRequired': '스쿼드명을 입력해주세요',
  'squad.form.errNameDuplicate': '같은 이름의 스쿼드가 이미 있습니다',
  'squad.form.errEndBeforeStart': '종료일은 시작일 이후여야 합니다',

  // ── 스쿼드: 삭제 · 상태 전환 확인 창 ──
  'squad.del.title': '스쿼드를 삭제할까요?',
  'squad.del.lost': '함께 삭제',
  'squad.del.lostAssignments': '팀원 배정 {{count}}건',
  'squad.del.lostHistory': '상태 이력 전체',
  'squad.del.kept': '보존',
  'squad.del.keptLedger': '프로젝트 원장',
  'squad.del.keptActuals': '실제 투입% 이력',
  'squad.del.note': '되돌릴 수 없습니다. 확인을 위해 스쿼드명 <b>{{name}}</b> 을(를) 입력하세요.',
  'squad.del.input': '삭제 확인용 스쿼드명',
  'squad.del.confirm': '삭제',
  'squad.del.cancel': '취소',
  'squad.status.reopenTitle': '스쿼드를 재개할까요?',
  'squad.status.archiveTitle': '스쿼드를 보관할까요?',
  'squad.status.reopenDesc': '<b>{{name}}</b> 을(를) 진행중으로 되돌립니다. 이 스쿼드 배정이 캐파 합계에 다시 포함됩니다.',
  'squad.status.archiveDesc': '<b>{{name}}</b> 을(를) 보관합니다. 목록에서 흐리게 표시되며 캐파 합계에서 계속 제외됩니다. 언제든 복원할 수 있습니다.',
  'squad.status.reopenOverload': '재개하면 {{count}}명이 과부하(>100%)가 됩니다',
  'squad.status.reopenOverloadNote': '저장은 허용됩니다 — 경고만 표시합니다',
  'squad.status.reopenConfirm': '재개',
  'squad.status.archiveConfirm': '보관',
  'squad.status.cancel': '취소',
};

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] == null ? m : String(vars[k])));
}

/**
 * `labels`(객체·함수·없음)를 `L(key, vars) → string` 하나로 만든다.
 * 소비자가 못 준 키는 기본값(한국어)으로 떨어진다 — 빈 칸이 뜨지 않는다.
 */
export function makeOrgLabels(labels) {
  return (key, vars) => {
    // 함수가 준 문구는 **이미 완성된 문장**이다(번역기가 자리 표시를 채웠다) — 다시 채우지
    // 않는다. 다시 채우면 스쿼드 이름에 `{{…}}` 가 들어 있을 때 엉뚱하게 바뀐다.
    if (typeof labels === 'function') {
      const v = labels(key, vars);
      if (typeof v === 'string' && v !== '') return v;
    } else if (labels && typeof labels === 'object') {
      const v = labels[key];
      if (typeof v === 'string' && v !== '') return interpolate(v, vars);
    }
    const base = ORGCHART_LABELS[key];
    return base == null ? key : interpolate(base, vars);
  };
}

const DEFAULT_L = makeOrgLabels(null);

export const OrgLabelsContext = createContext(DEFAULT_L);

/** 캔버스 안 부품이 문구를 꺼내는 곳. Provider 가 없으면 한국어 기본값. */
export function useOrgLabels() {
  return useContext(OrgLabelsContext);
}

/**
 * `<b>…</b>` · `<br/>` 만 해석해 React 노드로 그린다. 나머지는 글자 그대로다 —
 * 번역 문구에 HTML 을 통째로 허용하지 않는다.
 */
export function rich(str) {
  const parts = String(str).split(/(<b>[\s\S]*?<\/b>|<br\s*\/?>)/g);
  return parts.map((p, i) => {
    if (/^<br\s*\/?>$/.test(p)) return <br key={i} />;
    const m = /^<b>([\s\S]*?)<\/b>$/.exec(p);
    if (m) return <b key={i}>{m[1]}</b>;
    return p ? <Fragment key={i}>{p}</Fragment> : null;
  });
}

/**
 * 스쿼드 상태 코드 → 화면 문구. 모르는 코드는 `squadStatusMeta` 와 같이 «준비중» 으로
 * 떨어진다 — 코드값이 화면에 새지 않는다.
 */
const SQUAD_STATUS_CODES = ['planned', 'active', 'done', 'archived'];
export function squadStatusText(L, status) {
  return L(`squad.status.${SQUAD_STATUS_CODES.includes(status) ? status : 'planned'}`);
}
