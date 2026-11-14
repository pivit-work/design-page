/**
 * 구성원 본인 이의 화면의 기본 문구 (pivit-work PW-2636). 앱은 `labels` 로 `t()` 값을 넘겨 덮는다.
 * - `OBJECTION_DEFAULT_LABELS` — 내 평가 리포트(구성원 · member.policy §7.6-A)
 * - `OBJECTION_WORKSPACE_LABELS` — 리포트 검수 › 구성원 이의(인사 담당자 · 운영 · hr.policy §8.7-A)
 */

export const OBJECTION_TARGETS = ['grade', 'content', 'ai'];

/**
 * 내 평가 리포트 › 이의(구성원 · member.policy §7.6-A · 2026-11-14 David 결정). 문구는 정책서 표 글자 그대로.
 * `{judge}` 자리에는 판단자 표기(`objectionJudgeCommittee` / `objectionJudgeEvaluator`)가 들어간다.
 */
export const OBJECTION_DEFAULT_LABELS = {
  objectionButton: '이의 제기',
  objectionSubmittedBadge: '이의 접수됨',
  objectionDecidedBadge: '결정 완료',
  objectionClosedTip: '접수 기간이 지났습니다',
  objectionFormTitle: '이의 제기',
  objectionTargetsLabel: '이의 대상',
  objectionTargetGrade: '최종 등급',
  objectionTargetContent: '평가 내용',
  objectionTargetAi: 'AI 가 이 평가에 어떻게 쓰였는지 설명 요청',
  objectionReasonLabel: '사유',
  objectionReasonPlaceholder: '어떤 부분이 사실과 다르거나 납득하기 어려운지 적어 주십시오',
  /** 판단자 표기 — 위원회 경로 / 평가자 경로(`{name}` 맨 위 차수 평가자). 뒤 조사는 `이(가)` 꼴로 적고 화면이 고른다. */
  objectionJudgeCommittee: '평가위원회',
  objectionJudgeEvaluator: '최종 평가자({name})',
  objectionDisclosureLabel: '공개 시작 단계',
  objectionDisclosureHint:
    '평가 라인에서 어느 단계 평가자부터 이의 내용을 볼지 고르십시오. 접수한 뒤에는 넓힐 수만 있고 좁힐 수 없습니다.',
  /** `{round}` 차수 · `{name}` 이름. */
  objectionLineItem: '{round}차 · {name}',
  /** `{names}` 그 차수부터 맨 위까지 이름. */
  objectionLineSees: '이 단계와 그 위가 봅니다 — {names}',
  /** `{names}` 아래 차수 이름 — 위 문장 뒤에 « · »로 잇는다. */
  objectionLineHidden: '{names}에게는 보이지 않습니다',
  objectionFilesLabel: '증빙 (선택)',
  objectionFileAdd: '파일 추가',
  objectionFileRule: '최대 3개 · 파일당 10MB · PDF·JPG·PNG',
  objectionFileInvalid: '10MB 이하의 PDF·JPG·PNG 파일만 올릴 수 있습니다.',
  objectionFileUploading: '올리는 중',
  objectionFileFailed: '올리지 못했습니다',
  objectionFileRetry: '다시 올리기',
  /** `{name}` 파일 이름 — 칩 ✕ 버튼의 읽기 이름. */
  objectionFileRemove: '{name} 빼기',
  objectionNoticeSafe: '이의를 제기했다는 이유로 불이익을 받지 않습니다.',
  objectionNoticeScope:
    '이의 내용(대상·사유·첨부)은 고르신 단계와 그 위 평가자, {judge}, 인사 담당자가 봅니다. 고르지 않은 평가자에게는 보이지 않지만, 결정 결과와 결정 사유는 그 평가자에게도 전달될 수 있습니다.',
  /** `{days}` 답변 기한 일수. */
  objectionReplyNotice: '{judge}이(가) 다시 검토해 {days}일 안에 답변합니다.',
  objectionCancel: '취소',
  objectionSubmit: '이의 접수',
  objectionStatusSubmitted: '접수됨',
  objectionStatusInReview: '검토 중',
  /** `{due}` 답변 기한. */
  objectionActiveHead: '답변 기한 {due} · {judge}이(가) 답변합니다',
  objectionOverdue:
    '답변 기한이 지났습니다. {judge}의 결정을 기다리고 있으며, 인사 담당자가 처리를 챙기고 있습니다.',
  objectionYourTargets: '대상',
  objectionYourReason: '사유',
  objectionYourFiles: '첨부',
  /** `{stage}` 자리는 굵게 — «1차 · 김리더». */
  objectionDisclosureNow: '공개 시작 단계: {stage}부터',
  objectionWiden: '공개 범위 넓히기',
  /** `{stage}` «1차 · 김리더». */
  objectionWidenOption: '{stage}부터',
  /** `{names}` 새로 들어오는 평가자 이름. */
  objectionWidenBody:
    '{names}도 이의 내용(대상·사유·첨부)을 보게 되고 접수 알림을 받습니다. 넓힌 뒤에는 다시 좁힐 수 없습니다.',
  objectionWidenConfirm: '넓히기',
  objectionWidenFailed: '공개 범위를 넓히지 못했습니다. 잠시 후 다시 시도해 주십시오.',
  objectionWithdraw: '철회',
  objectionInterimLabel: '인사 담당자 안내',
  /** `{result}` 자리는 굵게. */
  objectionResultLine: '결과: {result}',
  objectionResultAccepted: '수용',
  objectionResultRejected: '거부',
  /** `{date}` 결정일. */
  objectionDecidedMeta: '{date} · {judge}',
  /** `{after}` 자리는 굵게. */
  objectionChangedGrade: '바뀐 등급: {before} → {after}',
  objectionDecisionReasonLabel: '결정 사유',
  objectionAiLabel: 'AI 관여 설명',
  objectionDecidedFollowup: '결정에 다시 이의가 있으면 소속 회사 인사 담당자에게 문의해 주십시오.',
  /** `{date}` 접수 마감일. */
  objectionClosedNotice: '접수 기간이 지났습니다(~{date}). 소속 회사 인사 담당자에게 문의해 주십시오.',
  objectionWithdrawTitle: '이의를 철회할까요?',
  objectionWithdrawBody: '철회하면 이 이의는 처리되지 않습니다. 접수 기간 안에는 다시 낼 수 있습니다.',
  objectionWithdrawConfirm: '철회',
  /** 리포트 본문 — 등급 카드 딱지 · «리더 코멘트» 칸 아래 블록 제목. */
  objectionGradeChangedTag: '이의 결정으로 바뀐 등급',
  objectionDecisionNoteTitle: '이의 결정',
};

export const OBJECTION_WORKSPACE_LABELS = {
  listTitle: '구성원 이의',
  empty: '접수된 구성원 이의가 없습니다',
  loadFailed: '이의 목록을 불러오지 못했습니다',
  retry: '다시 시도',
  pickHint: '왼쪽 목록에서 이의를 고르세요.',
  targetGrade: '등급',
  targetContent: '내용',
  targetAi: 'AI 설명',
  statusSubmitted: '접수됨',
  statusInReview: '검토 중',
  statusDecided: '결정 완료',
  statusWithdrawn: '철회',
  routeCommittee: '위원회',
  routeEvaluator: '평가자',
  judgeMissing: '판단자 없음',
  judgeHr: '인사 담당자',
  finalGrade: '지금 최종 등급',
  submittedAt: '접수',
  dueAt: '기한',
  routeTitle: '판단 경로 · 판단자',
  sessionLabel: '세션',
  chairLabel: '위원장',
  inputterLabel: '결정 입력자',
  inputterChair: '위원장',
  inputterHr: '인사 담당자',
  inputterFallback: '인사 담당자(위원장이 공개 단계 아래 차수)',
  judgeLabel: '판단자',
  /** `{name}` 이름 · `{round}` 차수. */
  judgeRound: '{name} · {round}차 평가자',
  /** `{name}` 지정한 인사 담당자 · `{date}` 시각. */
  judgeAssigned: '지정 · {name} · {date}',
  judgeMissingNote: '판단자가 퇴사했거나 권한이 없습니다. 기한 알림은 인사 담당자가 받습니다.',
  aiSummaryTitle: 'AI 관여 기록',
  aiSummaryHint: '평가 기록에서 읽은 사실입니다. AI 가 쓴 글이 아닙니다.',
  logsTitle: '독촉 기록',
  logNudge: '독촉',
  logInterim: '중간 안내',
  /** `{kind}` 독촉/중간 안내 · `{author}` 보낸 사람 · `{recipient}` 받은 사람 · `{date}` 시각. */
  logLine: '{kind} · {author} → {recipient} · {date}',
  nudge: '독촉 보내기',
  /** `{name}` 보낸 사람 · `{time}` HH:MM. */
  nudgedToday: '오늘 독촉함 · {name} {time}',
  /** `{name}` 받은 사람. */
  nudgeToast: '{name} 님에게 독촉을 보냈습니다',
  interimTitle: '중간 안내',
  interimPlaceholder: '예) 판단이 진행 중입니다. 결정이 나오면 바로 알려 드리겠습니다.',
  interimSend: '중간 안내 보내기',
  assignJudge: '판단자 지정',
  assignTitle: '판단자 고르기',
  assignHint: '평가 라인에서 공개 단계 이상인 다른 평가자 · 피평가자 소속 조직의 지금 조직장',
  /** `{round}` 차수. */
  candidateRound: '{round}차 평가자',
  candidateHead: '조직장',
  assignNone: '고를 수 있는 사람이 없습니다.',
  assignNext: '다음',
  assignConfirmTitle: '판단자를 지정할까요?',
  /** `{name}` 고른 사람. */
  assignConfirmBody: '{name} 님이 이 이의를 판단합니다. 대상 · 사유 · 증빙이 이 사람에게 보입니다.',
  assignConfirm: '지정',
  decideIntro: '위원회의 판단을 입력하는 칸입니다',
  decideConfirmBody: '결정을 보내면 바꿀 수 없습니다. 피평가자와 공유 대상에게 바로 알림이 갑니다.',
  decidedConflict: '다른 인사 담당자가 이미 결정을 입력했습니다',
  withdrawnConflict: '본인이 철회해 결정을 보낼 수 없습니다',
  refresh: '새로고침',
  decidedToast: '결정을 보냈습니다. 피평가자와 공유 대상에게 알림이 갔습니다.',
  decisionTitle: '결정 결과',
  /** `{date}` 철회 시각. */
  withdrawn: '본인이 철회했습니다 · {date}',
  gradeChangeTitle: '공개 뒤 등급 변경 기록',
  gradeChangeBy: '바꾼 사람',
  gradeChangeNote: '사유',
  gradeChangeAt: '시각',
  gradeChangeRoute: '경로',
  gradeRouteCommittee: '구성원 이의 · 위원회',
  gradeRouteEvaluator: '구성원 이의 · 평가자',
  sending: '보내는 중…',
  sendFailed: '보내지 못했습니다. 다시 시도해 주십시오.',
  fileFailed: '증빙을 열지 못했습니다. 다시 시도해 주십시오.',
  cancel: '취소',
};

/**
 * PW-2636 · 2026-11-14 David 결정 · spec-eval-cycle §17.4-A — 판단 측(평가자 · 위원 · 인사 담당자)이 함께 쓰는 칸의 기본 문구.
 * `EvalObjectionShared.jsx` 가 쓴다. 앱은 `labels` 로 `t()` 값을 넘겨 덮는다.
 */
export const OBJECTION_JUDGE_LABELS = {
  statusSubmitted: '접수됨',
  statusInReview: '검토 중',
  statusDecided: '결정 완료',
  statusWithdrawn: '철회',
  targetsLabel: '대상',
  targetGrade: '최종 등급',
  targetContent: '평가 내용',
  targetAi: 'AI 관여 설명 요청',
  reasonLabel: '사유',
  filesLabel: '증빙',
  filesNone: '증빙 없음',
  disclosureLabel: '공개 시작 단계',
  /** `{round}` 차수. */
  disclosureFrom: '{round}차 평가자부터 봅니다',
  /** `{date}` 넓힌 날 · `{round}` 넓힌 차수. */
  disclosureWidened: '{date}에 {round}차부터로 넓혔습니다',
  /** `{round}` 차수 · `{name}` 이름. */
  lineItem: '{round}차 · {name}',
  lineSees: '이의 내용을 봅니다',
  lineHidden: '이의 내용을 보지 않습니다',
  opinionsTitle: '의견',
  opinionsHint: '피평가자에게는 보이지 않습니다.',
  opinionsEmpty: '아직 남은 의견이 없습니다.',
  /** `{round}` 차수. */
  seatRound: '{round}차 평가자',
  seatCommittee: '위원',
  seatJudge: '판단자',
  opinionPlaceholder: '이 이의에 대한 의견을 남겨 주십시오',
  opinionInputHint: '의견은 판단하는 쪽과 인사 담당자만 봅니다. 구성원에게는 보이지 않습니다.',
  opinionSend: '의견 남기기',
  opinionFailed: '의견을 남기지 못했습니다. 다시 시도해 주세요.',
  decisionTitle: '결정',
  resultLabel: '결과',
  resultAccepted: '수용',
  resultRejected: '거부',
  newGradeLabel: '새 등급',
  newGradeHint: '평가 내용만 받아들이면 등급은 고르지 않아도 됩니다.',
  currentGradeTag: '지금 등급',
  decisionReasonLabel: '결정 사유',
  decisionReasonHint: '구성원에게 가는 답변이자, 공유 대상에게 가는 글입니다.',
  aiExplanationLabel: 'AI 관여 설명',
  aiExplanationHint: '기록에서 읽은 사실을 미리 채웠습니다. 고쳐서 확정해 주십시오.',
  shareLabel: '결정 사유 공유 대상',
  shareHint: '고른 평가자에게 결정 결과와 결정 사유만 갑니다. 이의 대상·사유·증빙은 가지 않습니다.',
  /** `{round}` 차수 · `{name}` 이름. */
  shareItem: '{round}차 · {name}',
  shareReasonOnly: '이의 내용은 받지 않고 결정 사유만 받습니다',
  shareNone: '없음',
  decideButton: '결정 보내기',
  confirmTitle: '결정을 보낼까요?',
  confirmBody: '보낸 뒤에는 고칠 수 없습니다.',
  /** `{n}` 공유 대상 수. */
  confirmRecipients: '받는 사람: 구성원 본인(답변) · 인사 담당자(결정과 변경 기록) · 공유 대상 {n}명(결정 사유)',
  confirmSend: '보내기',
  cancel: '취소',
  decideFailed: '결정을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  changedGradeLabel: '바뀐 등급',
};

/**
 * PW-2636 · leader.policy §7.0-A — 하향 리뷰 «구성원 이의» 블록(`EvalLeaderObjectionBlock.jsx`)의 기본 문구.
 */
export const LEADER_OBJECTION_LABELS = {
  title: '구성원 이의',
  /** `{n}` 남은 날 · `{date}` 기한 날짜. */
  due: '답변 기한 D-{n} ({date})',
  overdue: '기한 초과',
  pathJudge: '최종 차수 평가자로서 이 이의를 결정합니다',
  /** `{name}` 최종 차수 평가자. */
  pathEvaluator: '결정은 최종 차수 평가자({name})가 합니다',
  pathCommittee:
    '결정은 이 구성원의 등급을 확정한 캘리브레이션 위원회가 합니다. 이 화면에서는 의견만 남길 수 있습니다',
  pathAssigned: '인사 담당자가 이 이의의 판단자로 지정했습니다',
  withdrawn: '본인이 철회했습니다',
  decisionTitle: '이의 결정',
  loadFailed: '구성원 이의를 불러오지 못했습니다',
  retry: '다시 시도',
  /** `{from}` 처음 등급 — 하향 리뷰 등급 칸 옆. */
  gradeChangedNote: '이의 결정으로 바뀐 등급 · 처음 {from}',
};

/** 상태 넷 → 딱지 뜻(§17.4-A «상태» · hr §8.7-A «상태 배지»). */
export const OBJECTION_STATUS_META = {
  submitted: { key: 'statusSubmitted', tone: 'info' },
  in_review: { key: 'statusInReview', tone: 'neutral' },
  decided: { key: 'statusDecided', tone: 'success' },
  withdrawn: { key: 'statusWithdrawn', tone: 'neutral' },
};

/** `{키}` 자리 채우기. */
export function fillObjectionText(s, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''),
    String(s ?? ''),
  );
}

/** 의견 자리 이름표 — «2차 평가자» · «위원» · «판단자». */
export function seatLabel(op, L) {
  if (op.seat === 'committee') return L.seatCommittee;
  if (op.seat === 'judge') return L.seatJudge;
  return fillObjectionText(L.seatRound, { round: op.round ?? '' });
}
