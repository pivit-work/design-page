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
import { resolveKoreanParticles } from '../shared/koreanParticle.js';

export const ORGCHART_LABELS = {
  // ── 탭 줄 · 머리 (세 캔버스 공통) ──
  'tab.orgchart': '조직도',
  // 가운데 탭은 「리스트」(Figma 16610:35972 · 2026-10-25). 'tab.project' 는 옛 프로젝트 축 화면이 아직 쓴다.
  'tab.project': '프로젝트',
  'tab.squad': '스쿼드',
  'tab.list': '리스트',

  // ── 리스트 탭 (pivit-work PW-678 · pivit-specs org-chart-public-card-spec.md §3-D-1·§3-D-2) ──
  'list.col.name': '이름',
  'list.col.unit': '소속',
  'list.col.title': '직함',
  'list.col.grade': '직급·직책',
  'list.col.status': '근무 상태',
  'list.col.email': '이메일',
  'list.empty': '—',
  'list.unit.ceo': '대표',
  'list.unit.ceoDirect': '대표 직속',
  'list.unit.unassigned': '미배정',
  'list.concurrentMore': '+{{count}} 겸직',
  'list.concurrentHere': '겸직',
  'list.unitFilter': '조직 고르기',
  'list.allUnits': '전체 조직',
  'list.scope': '{{unit}} · 하위 포함 {{count}}명',
  'list.scopeConcurrent': ' +{{count}} 겸직',
  'list.searchPlaceholder': '이름·이메일로 찾기',
  'list.searchClear': '검색 지우기',
  'list.searchCount': '검색 결과 {{count}}명',
  'list.emptyUnit': '이 조직에 속한 구성원이 없습니다.',
  'list.emptySearch': '‘{{query}}’에 맞는 구성원이 없습니다.',
  'list.emptySearchInUnit': '이 조직에서 ‘{{query}}’에 맞는 구성원이 없습니다.',
  'list.pager.of': '/',
  'list.pager.prev': '이전',
  'list.pager.next': '다음',
  'list.pager.suffix': '명',

  // ── 조직도 ──
  'org.totalHeadcount': '전체 인원',
  'org.dragHint': '화면을 드래그하면 좀 더 쉽게 조직도를 보실 수 있습니다.',
  'org.lineStyle': '연결선 모양 바꾸기 (곡선 ↔ 직각)',
  'org.lineStyleOrtho': '직각 연결선 · 상위 부서 라인 맞춤 — 누르면 곡선으로',
  'org.lineStyleCurve': '곡선 연결선 — 누르면 직각(상위 부서 라인 맞춤)으로',
  'org.staffBadge': '대표 직속',
  'org.ceoBadge': '대표',
  'org.selfBadge': '나',
  'org.directSlot': '직속 {{count}}명',
  'org.expandChildren': '{{name}} 하위 조직 펼치기',
  'org.collapseChildren': '{{name}} 하위 조직 접기',
  'org.expandAll': '전체 펼치기 — 모든 조직을 펼친 첫 화면으로',
  'org.collapseAll': '전체 접기 — 회사와 최상위 조직 카드만 남기고 접기',
  // 자동 정렬 (pivit-specs §5.4-D · PW-2347) — 툴팁은 켜짐·흐림이 다르다
  'org.autoArrangeLabel': '자동 정렬',
  'org.autoArrange': '자동 정렬 — 끌어 옮긴 카드를 모두 제자리로',
  'org.autoArrangeEmpty': '끌어 옮긴 카드가 없습니다',
  // 캔버스 툴바 (Figma 16596:48857 개정 · 2026-10-25) — 보이는 정보의 양 · 기준일 · 확대/축소 · 전체 화면
  // 트리 ↔ 리스트 보기 전환 (Figma 17788:33051) — 조직도 탭 안 왼쪽 툴바 맨 앞 세그먼트
  'org.view': '보기',
  'org.view.tree': '트리',
  'org.view.list': '리스트',
  'org.density': '보이는 정보 양',
  'org.density.all': '전체',
  'org.density.leaders': '리더만',
  'org.density.count': '인원수만',
  'org.gradeCount': '{{grade}} {{count}}명',
  'org.gradeUnknown': '직급 미정',
  'org.headcount': '{{count}}명',
  'org.zoomIn': '확대',
  'org.zoomOut': '축소',
  'org.downloadImage': '이미지로 다운',
  'org.imageFileName': '조직도_{{date}}_{{time}}',
  'org.expandView': '전체 화면으로 보기',
  'org.closeExpandView': '전체 화면 닫기',
  'org.asOfPick': '기준일 고르기',

  // ── 리스트 탭 (Figma 16610:35863) — 조직 트리를 한 줄에 한 사람인 표로 ──
  'list.teamAll': '팀별 보기',
  'list.teamFilter': '조직 골라 보기',
  'list.sortBy': '정렬',
  'list.sort.name': '이름 순',
  'list.sort.dept': '부서 순',
  'list.sort.grade': '직급 순',
  'list.colName': '이름',
  'list.colDept': '부서',
  'list.colGrade': '직급',
  'list.colAttendance': '근무 상황',
  'list.colWorkHours': '출퇴근시각',
  'list.colVacation': '휴가',
  'list.onVacation': '휴가 중',
  'list.none': '-',
  'list.empty': '보여 줄 구성원이 없습니다',

  // ── 프로필 카드 (프로젝트 탭 · design-page 자체 화면) ──
  'profile.employmentType': '고용형태',
  'profile.rank': '직급',
  'profile.workHours': '업무시간',
  'profile.feedback': '피드백주기',
  'profile.meeting': '미팅잡기',
  'profile.employeeNo': '사번',
  'profile.joinedAt': '입사일',
  'profile.phone': '전화번호',
  'profile.healthCheck': '헬스체크',
  'profile.skills': '스킬',
  'profile.contact': '연락처',
  'profile.links': '링크',
  'profile.projects': '담당 프로젝트',
  'profile.affiliations': '소속',
  'profile.primary': '주',
  'profile.leader': '조직장',
  'squad.form.kind': '종류',
  'squad.form.squad': '스쿼드',
  'squad.form.tf': 'TF',
  'profile.localTime': '현지 시간',
  'profile.location': '근무지',
  'profile.directReports': '직속팀원',
  'profile.directReportChip': '직속',
  'profile.peopleCount': '{{count}}명',
  'profile.roleDefault': '사원',
  // 공개 카드 매니저 이력 · 날짜별 소속·직급 (pivit-work PW-1837)
  'profile.managerHistory': '매니저 이력',
  'profile.managerHistoryCurrent': '현재',
  'profile.managerHistoryLoading': '불러오는 중…',
  'profile.managerHistoryError': '이력을 불러오지 못했습니다',
  'profile.asOf': '날짜별 소속·직급',
  'profile.asOfDate': '조회 날짜',
  'profile.asOfHint': '날짜를 고르면 그날의 소속·직급을 보여 줍니다',
  'profile.asOfDept': '소속',
  'profile.asOfLevel': '직급',
  'profile.asOfEmpty': '-',
  'profile.asOfLoading': '불러오는 중…',
  'profile.asOfError': '불러오지 못했습니다',
  'profile.asOfNotFound': '그날 소속 기록이 없습니다',
  'profile.asOfOutOfRange': '이 날짜는 기록 범위 밖입니다',
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
  // 툴바 제목·안내 (Figma 17590:23983) — 제목은 자격과 무관하고, 안내만 편집 모드에서 갈린다.
  'squad.desc.title': '기능 조직과 평행한 한시 조직',
  'squad.desc.view': '스쿼드 카드와 배치 매트릭스로 구성을 확인합니다',
  'squad.desc.editAll': '전체 스쿼드의 비중·구성을 편집할 수 있습니다 — 캐파 사용은 본인만 정합니다 (관리자도 요청만 보냅니다)',
  'squad.desc.editOrg': '내 조직 구성원의 비중·구성을 편집할 수 있습니다 — 캐파 사용은 본인만 정합니다',
  'squad.desc.editLead': '내가 리드인 스쿼드의 비중·구성만 편집할 수 있습니다 — 팀원의 캐파 사용은 본인만 정합니다',
  'squad.create': '스쿼드 만들기',
  'squad.editAssign': '편집',
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
  'squad.card.searchPlaceholder': '이름 · 팀 · 직함으로 검색해주세요',
  'squad.card.addCancel': '취소',
  'squad.card.addConfirm': '추가',
  'squad.card.noCandidates': '추가할 수 있는 구성원이 없습니다',
  'squad.card.noCandidatesOutOfScope': '추가할 수 있는 구성원이 없습니다 (내 조직 범위 밖)',
  'squad.card.addMember': '팀원 추가',
  // ── 스쿼드: 추천 팀원 (§5-5 · §4 · PW-1155) ──
  'squad.suggest.title': '추천 팀원',
  'squad.suggest.titleWithLead': '추천 팀원 · {{lead}} 리드와 함께 일한 사람',
  'squad.suggest.caption': '에픽 {{epics}} · 코멘트 {{comments}} · 저장소 {{repos}} · 리뷰 {{reviews}}',
  'squad.suggest.noLead': '리드를 지정하면 추천 팀원이 나옵니다',
  'squad.suggest.leadUnlinked': '리드의 Jira·GitHub 계정이 이어지지 않아 추천할 수 없습니다',
  'squad.suggest.none': '추천할 팀원이 없습니다 (이미 배정됐거나 계정이 이어지지 않았습니다)',
  'squad.suggest.error': '추천을 불러오지 못했습니다',
  'squad.suggest.retry': '다시 시도',
  'squad.card.unassign': '배정 해제',
  'squad.card.chipCapacity': '(캐파 {{value}})',
  'squad.unknownMember': '알 수 없는 구성원',

  // ── 스쿼드: 마우스를 올리면 뜨는 설명 ──
  'squad.tip.memberSummary': '{{name}} — 스쿼드 내 비중 {{share}}% · 개인 캐파 사용 {{capacity}}',
  // 카드 진행률 막대 조각 말풍선(Figma 17765:40618) — 조각 색 바탕에 한 줄
  'squad.tip.segment': '{{name}} 스쿼드 내 비중 {{share}}%  •  내 캐파 사용 {{capacity}}',
  'squad.tip.leadSuffix': ' · 리드',
  'squad.tip.capacityUnset': '미설정 — 합계에서 제외됨',
  'squad.tip.capacityUnsetShort': '미설정',
  'squad.tip.clickEditAll': '클릭: 비중·캐파·리드 편집',
  'squad.tip.clickMyCapacity': '클릭: 내 캐파 설정',
  'squad.tip.clickEditShare': '클릭: 비중·리드 편집 (캐파는 본인만)',
  'squad.tip.lockedOrg': '편집 권한 없음 (내 조직 아님)',
  'squad.tip.lockedLead': '편집 권한 없음 (내가 리드인 스쿼드가 아님)',
  'squad.tip.cellCapacity': '개인 캐파 사용 {{capacity}} (내 캐파 100 기준 · 오른쪽 합계에 더함)',
  'squad.tip.cellShare': '스쿼드 내 비중 {{share}}% (이 스쿼드 100 기준 · 합계 제외)',
  'squad.tip.lead': '리드',
  'squad.tip.cellCapacityUnset': '캐파 사용이 아직 설정되지 않았습니다',
  'squad.tip.assignEmpty': '클릭: {{squad}}에 배정 (비중 미배분 · 캐파 미설정 — 캐파는 본인이 정한다)',
  'squad.tip.over100': '개인 캐파 100 초과',
  'squad.capacityIdleHint': '캐파 사용이 지정되지 않았습니다',

  // ── 스쿼드: 매트릭스 ──
  'squad.matrix.title': '멤버 × 스쿼드 배치',
  'squad.matrix.subtitleEdit': '빈 셀 클릭 = 배정 (비중 미배분 · 캐파 미설정) · 배정 셀 클릭 = 비중·캐파·리드 편집',
  'squad.matrix.subtitleView': '이름 클릭 시 프로필 확인 · 셀의 큰 숫자 = 내 캐파 100 중 이 스쿼드 비율(본인이 설정) · 옆의 「스쿼드 N%」 = 이 스쿼드 100 중 내 비중(스쿼드 리드가 설정)',
  'squad.matrix.colMember': '이름',
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
  'squad.mycap.owner': '이 값은 <b>내가 직접 정합니다</b>',
  'squad.mycap.setCta': '내 캐파 설정',
  'squad.mycap.adjustCta': '조정',
  'squad.overload.title': '과부하',
  // 과부하 띠(Figma 17757:34931) — 「과부하」 · 사람(사진+이름) · 이 문장 순으로 선다.
  'squad.overload.body': '개인 캐파 100을 넘겨 배정됐습니다',
  'squad.legend.lead': '리드 (스쿼드당 1명)',
  'squad.legend.rows': '셀 <b>윗줄</b> = 내 캐파 100 중 이 스쿼드에 쓰는 몫(합계에 더함) · <b>아랫줄</b> = 이 스쿼드 100 중 내 비중 — <b>두 값은 따로 정합니다</b>',
  'squad.legend.capacityPrefix': '캐파 사용(완료·보관 스쿼드 제외): ',
  'squad.legend.capacityOver': '>100 초과',
  'squad.legend.capacityRest': '(빗금 = 캐파 밖) · 100 가득 · 70~99 적정 · <70 여유',
  'squad.legend.owner': '소유자가 다르다 — <b>비중은 조직</b>이 정하고 <b>캐파 사용은 본인만</b> 정한다 (리드·관리자는 대신 정할 수 없고 <b>[캐파 설정 요청]</b>만 보낸다) · 점선 <b>—</b> = 미설정(합계 제외)',
  'squad.legend.faint': '스쿼드 내 비중은 「캐파 사용」 합계에 더하지 않습니다',

  // ── 스쿼드: 팀원 리소스 구성 (카드) ──
  // 카드 배분 줄(Figma 17757:32450) — 시안 문구는 「진행률」이지만 값은 스쿼드 100 기준 비중의 합이다.
  'squad.comp.title': '진행률',
  'squad.comp.basis': '스쿼드 100 기준',
  'squad.comp.allotLabel': '배분',
  'squad.comp.none': '배분된 비중이 없습니다 (전원 0%)',
  'squad.comp.capacityRaw': '캐파 {{value}}',
  'squad.comp.caplineTip': '스쿼드 내 비중과 분모가 다른 값입니다 (사람마다의 캐파 100 기준 합)',
  'squad.comp.caplineLabel': '이 스쿼드가 쓰는 인력',
  'squad.comp.caplineValue': '캐파 합 {{sum}}% • 약 {{fte}}인분',
  'squad.allot.done': '배분 완료',
  'squad.allot.over': '초과 {{diff}}%p',
  'squad.allot.under': '미배분 {{diff}}%p',
  'squad.gauge.capacity100': '캐파 100%',
  'squad.gauge.squad100': '스쿼드 100%',

  // ── 스쿼드: 배정 편집 창 ──
  'squad.pop.desc': '분모가 다른 두 값을 따로 정합니다 · 리드 지정 (스쿼드당 1명)',
  'squad.pop.shareAxis': '스쿼드 내 비중',
  'squad.pop.shareBasis': '이 스쿼드 100 기준',
  'squad.pop.shareOwnerLead': '· 리드인 내가 정하는 값',
  'squad.pop.shareOwnerProxy': '· 리드 대신 조정',
  'squad.pop.shareOwnerOther': '· 스쿼드 리드가 정하는 값',
  'squad.pop.shareInput': '스쿼드 내 비중',
  'squad.pop.shareInputDirect': '스쿼드 내 비중 직접 입력',
  'squad.pop.sharePreview': '이 스쿼드 배분',
  'squad.pop.otherMembers': '다른 팀원',
  'squad.pop.divider': '두 값은 연동되지 않습니다',
  'squad.pop.dividerDesc': '비중을 바꿔도 아래 캐파 사용은 바뀌지 않으니 따로 정하세요.',
  'squad.pop.capacityAxis': '개인 캐파 사용',
  'squad.pop.capacityBasis': '내 캐파 100 기준',
  'squad.pop.capacityOwnerSelf': '· 내가 정하는 값',
  'squad.pop.capacityOwnerOther': '· 본인만 정하는 값',
  'squad.pop.capacityUnsetNote': '아직 설정되지 않았습니다 — 저장하기 전까지 캐파 합계에 포함되지 않습니다.',
  'squad.pop.capacityLocked': '이 값은 본인만 정할 수 있습니다. 바꿔야 하면 「캐파 설정 요청 보내기」를 누르세요.',
  'squad.pop.capacityInput': '개인 캐파 사용',
  'squad.pop.capacityInputDirect': '개인 캐파 사용 직접 입력',
  'squad.pop.capacityPreview': '캐파 사용',
  'squad.pop.stateUnassigned': '미배정',
  'squad.pop.stateOver': '초과 {{diff}}%p',
  'squad.pop.stateSlack': '여유 {{diff}}%p',
  'squad.pop.otherSquads': '다른 스쿼드',
  'squad.pop.notCounted': '이 스쿼드는 {{status}} 상태라 캐파 합계에 포함되지 않습니다.',
  'squad.pop.idleNote': '비중은 잡혀 있는데 캐파 사용이 0입니다 — 저장은 되지만 과부하 판단에 반영되지 않습니다.',
  'squad.pop.planSum': '프로젝트 계획 합계 {{n}}% (이 스쿼드 자격)',
  'squad.pop.planSumWarn': '프로젝트 계획 합계 {{n}}%보다 낮아집니다 — 저장하면 계획을 정한 사람에게 알림이 갑니다',
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
  'squad.del.note': '되돌릴 수 없습니다. 확인을 위해 스쿼드명 <b>{{name}}</b>을(를) 입력하세요.',
  'squad.del.input': '삭제 확인용 스쿼드명',
  'squad.del.confirm': '삭제',
  'squad.del.cancel': '취소',
  'squad.status.reopenTitle': '스쿼드를 재개할까요?',
  'squad.status.archiveTitle': '스쿼드를 보관할까요?',
  'squad.status.reopenDesc': '<b>{{name}}</b>을(를) 진행중으로 되돌립니다. 이 스쿼드 배정이 캐파 합계에 다시 포함됩니다.',
  'squad.status.archiveDesc': '<b>{{name}}</b>을(를) 보관합니다. 목록에서 흐리게 표시되며 캐파 합계에서 계속 제외됩니다. 언제든 복원할 수 있습니다.',
  'squad.status.reopenOverload': '재개하면 {{count}}명이 과부하(>100%)가 됩니다',
  'squad.status.reopenOverloadNote': '저장은 허용됩니다 — 경고만 표시합니다',
  'squad.status.reopenConfirm': '재개',
  'squad.status.archiveConfirm': '보관',
  'squad.status.cancel': '취소',

  // ── 스쿼드 카드: 담당 프로젝트 (PW-1428) ──
  'squad.project.title': '담당 프로젝트 {{count}}',
  'squad.project.empty': '담당 프로젝트가 없습니다',
  'squad.project.locked': '이 스쿼드의 담당 프로젝트는 리드·관리자가 정합니다',
  'squad.project.primaryMark': '主',
  'squad.project.primaryTip': '주 스쿼드 — 투입% 집계 기준',
  'squad.project.primaryOf': '主 {{name}}',
  'squad.project.cannotOpen': '원장은 내 스쿼드에 연결된 프로젝트만 열 수 있습니다',
  'squad.project.alreadyPrimary': '이미 주 스쿼드입니다',
  'squad.project.setPrimaryTip': '이 스쿼드를 주 스쿼드로 지정',
  'squad.project.unlink': '연결 해제 (프로젝트는 삭제되지 않습니다)',
  'squad.project.add': '프로젝트 추가',
  'squad.project.search': '프로젝트 검색',
  'squad.project.linkCount': '연결 {{count}}개',
  'squad.project.noCandidates': '추가할 수 있는 프로젝트가 없습니다',
  'squad.project.createOpen': '새 프로젝트 만들기',
  'squad.project.createName': '새 프로젝트명',
  'squad.project.createDesc': '한 줄 설명 (선택)',
  'squad.project.createSubmit': '만들기',
  'squad.project.errNameRequired': '프로젝트명을 입력해주세요',
  'squad.project.errNameDuplicate': '같은 이름의 프로젝트가 이미 있습니다',
  'squad.project.createFailed': '프로젝트를 만들지 못했습니다',
  'squad.project.linkSelected': '선택 {{count}}개 추가',
  'squad.project.linkFailed': '프로젝트를 연결하지 못했습니다',
  'squad.project.cancel': '취소',
  'squad.project.transfer.title': '주 스쿼드를 먼저 이전해주세요',
  'squad.project.transfer.desc': '이 스쿼드는 <b>{{name}}</b>의 주 스쿼드입니다. 다른 스쿼드에 연결이 남아 있어 그대로 해제할 수 없습니다. 새 주 스쿼드를 지정하면 해제됩니다.',
  'squad.project.transfer.confirm': '지정 후 해제',
  'squad.project.transfer.failed': '주 스쿼드를 옮기지 못했습니다',

  // ── 프로젝트 원장 상태 (스쿼드 카드 · 프로젝트 상세 공통) ──
  'projectStatus.planned': '준비중',
  'projectStatus.active': '진행중',
  'projectStatus.done': '완료',

  // ── 프로젝트 상세 (PW-1428) ──
  'projectDetail.primarySuffix': '{{name}}(主)',
  'projectDetail.unassigned': '미배속',
  'projectDetail.undecided': '미정',
  'projectDetail.progress': '진행률 {{value}}%',
  'projectDetail.editable': '편집 가능',
  'projectDetail.readOnly': '조회 전용',
  'projectDetail.menuLabel': '프로젝트 관리',
  'projectDetail.menu.edit': '수정',
  'projectDetail.menu.editDoneHint': '완료 프로젝트는 재개 후 수정',
  'projectDetail.menu.status': '상태 전환',
  'projectDetail.menu.delete': '삭제',
  'projectDetail.transition.start': '시작',
  'projectDetail.transition.complete': '완료',
  'projectDetail.transition.reopen': '재개',
  'projectDetail.actionFailed': '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  'projectDetail.stats.headcount': '참여 인원',
  'projectDetail.stats.peopleUnit': '명',
  'projectDetail.stats.planTotal': '계획 합계',
  'projectDetail.stats.actualTotal': '실제 합계 · {{period}}',
  'projectDetail.stats.actualMissing': '미입력 {{count}}명',
  'projectDetail.info.title': '기본 정보',
  'projectDetail.info.edit': '수정',
  'projectDetail.info.description': '설명',
  'projectDetail.info.noDescription': '— 설명 없음',
  'projectDetail.info.period': '기간',
  'projectDetail.info.progress': '진행률',
  'projectDetail.form.name': '프로젝트명',
  'projectDetail.form.description': '한 줄 설명',
  'projectDetail.form.startDate': '시작일',
  'projectDetail.form.endDate': '종료일',
  'projectDetail.form.color': '색상',
  'projectDetail.form.progress': '진행률',
  'projectDetail.form.progressDirect': '진행률 직접 입력',
  'projectDetail.form.errNameRequired': '프로젝트명을 입력해 주세요.',
  'projectDetail.form.errEndBeforeStart': '종료일은 시작일보다 빠를 수 없습니다.',
  'projectDetail.form.saveFailed': '저장하지 못했습니다.',
  'projectDetail.form.cancel': '취소',
  'projectDetail.form.save': '저장',
  'projectDetail.squads.title': '연결 스쿼드',
  'projectDetail.squads.primary': '主 주 스쿼드',
  'projectDetail.squads.setPrimary': '主 지정',
  'projectDetail.squads.unlink': '연결 해제',
  'projectDetail.squads.unlinkPrimaryHint': '주 스쿼드는 다른 연결이 남아 있으면 해제할 수 없습니다',
  'projectDetail.squads.empty': '연결된 스쿼드가 없습니다',
  'projectDetail.del.title': '프로젝트를 삭제할까요?',
  'projectDetail.del.desc': '삭제하면 되돌릴 수 없습니다.',
  'projectDetail.del.note': '확인을 위해 프로젝트명 <b>{{name}}</b>을(를) 그대로 입력하세요.',
  'projectDetail.del.input': '삭제 확인용 프로젝트명',
  'projectDetail.del.confirm': '삭제',
  'projectDetail.del.cancel': '취소',
  'projectDetail.del.failed': '삭제하지 못했습니다.',
  'projectDetail.tabs.label': '프로젝트 상세 탭',
  'projectDetail.tabs.overview': '개요',
  'projectDetail.tabs.resource': '리소스',
  'projectDetail.tabs.history': '이력',
  'projectDetail.tabs.resourcePending': '리소스 탭은 준비 중입니다',
  'projectDetail.tabs.loading': '탭 내용을 불러오는 중',
  // 리소스 탭 (PW-2319 · screen-project-detail.policy.md §4-2·§5-3·§7·§8·§9)
  'projectDetail.resource.loadFailed': '불러오지 못했습니다',
  'projectDetail.resource.retry': '다시 시도',
  'projectDetail.resource.refreshing': '리소스를 다시 불러오는 중',
  'projectDetail.resource.unlinked': '먼저 조직도에서 스쿼드에 연결해 주세요',
  'projectDetail.resource.openSquads': '조직도 스쿼드로 가기',
  'projectDetail.resource.overCount': '초과 배정',
  'projectDetail.resource.overTitle': '스쿼드 계획%를 넘는 배정이 있습니다. 조정 전에는 저장할 수 없습니다.',
  'projectDetail.resource.overBody': '계획%를 줄이거나, 상한(본인이 정하는 캐파)을 늘려야 하면 해당 행에서 본인에게 요청하세요.',
  'projectDetail.resource.closed': '완료된 프로젝트입니다. 배정 편집은 잠겨 있으며, 재개하면 다시 열립니다.',
  'projectDetail.resource.outOfScope': '관할 밖 — 조회 전용',
  'projectDetail.resource.unknownSquad': '연결이 끊긴 스쿼드',
  'projectDetail.resource.empty': '아직 배정된 인원이 없습니다. 연결된 스쿼드의 팀원을 추가해 주세요.',
  'projectDetail.resource.unallocated': '구성원별 미배분 합계 {{value}}%',
  'projectDetail.resource.add': '인원 추가',
  'projectDetail.resource.search': '이름으로 찾기',
  'projectDetail.resource.pickSquad': '참여 자격(스쿼드) 선택 필요',
  'projectDetail.resource.pickSquadAria': '{{name}}의 참여 스쿼드',
  'projectDetail.resource.noCandidates': '추가할 수 있는 인원이 없습니다. 연결 스쿼드에 먼저 배정해 주세요.',
  'projectDetail.resource.cancel': '취소',
  'projectDetail.resource.addConfirm': '선택 {{count}}명 추가',
  'projectDetail.resource.save': '저장',
  'projectDetail.resource.saved': '저장됨',
  'projectDetail.resource.saveBlocked': '상한 초과 배정이 있어 저장할 수 없습니다',
  'projectDetail.resource.saveFailed': '저장하지 못했습니다. 다시 시도해 주세요.',
  'projectDetail.resource.conflict': '다른 관리자가 방금 변경했습니다',
  'projectDetail.resource.caption': '계획과 실제의 차이는 평가 근거가 아니라 대화의 재료입니다.',
  'projectDetail.resource.poChanged': '기존 PO {{name}}은(는) 팀원으로 변경됩니다',
  'projectDetail.resource.setPo': 'PO 지정',
  'projectDetail.resource.removeAria': '{{name}} 배정 해제',
  'projectDetail.resource.sliderAria': '{{name}} 계획%',
  'projectDetail.resource.inputAria': '{{name}} 계획% 숫자',
  'projectDetail.resource.overBadge': '상한 초과',
  'projectDetail.resource.capLine': '스쿼드 계획 {{cap}}% · 타 프로젝트 {{other}}% · 이 프로젝트 {{mine}}%',
  'projectDetail.resource.slack': '이 스쿼드 잔여 {{value}}%',
  'projectDetail.resource.overBy': '상한 {{value}}%p 초과',
  'projectDetail.resource.actual': '실제 {{value}}% ({{gap}}%p)',
  'projectDetail.resource.actualMissing': '실제 미입력',
  'projectDetail.resource.otherSeg': '타 프로젝트 {{value}}%',
  'projectDetail.resource.mineSeg': '이 프로젝트 {{value}}%',
  'projectDetail.resource.request': '캐파 설정 요청 보내기',
  'projectDetail.resource.requested': '요청됨 — 본인이 설정하면 반영됩니다',
  'projectDetail.resource.requestReason': '이 값의 주인은 본인입니다 — 관리자도 대신 정하지 않고 요청만 보냅니다',
  'projectDetail.resource.requestNotAllowed': '이 구성원의 캐파 요청은 그 스쿼드 리드나 소속 조직의 관리자가 보낼 수 있습니다',
  'projectDetail.resource.requestForbidden': '이 구성원에게 요청할 권한이 없습니다',
  'projectDetail.resource.requestFailed': '요청을 보내지 못했습니다. 다시 시도해 주세요.',
  'projectDetail.resource.myCapacity': '스쿼드 뷰에서 내 캐파 조정',
  'projectDetail.history.empty': '이력이 없습니다',
  'projectDetail.history.loadFailed': '불러오지 못했습니다',
  'projectDetail.history.retry': '다시 시도',
  'projectDetail.history.more': '더 보기',
  'projectDetail.history.resigned': '(퇴사)',
};

function interpolate(str, vars) {
  if (!vars) return str;
  return resolveKoreanParticles(str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] == null ? m : String(vars[k]))));
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
