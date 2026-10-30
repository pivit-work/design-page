/** 창 안 문구 — 앱은 `detail.labels` 로 번역을 넘긴다. 없으면 이 한국어를 쓴다. */
export const KR_UPDATE_DEFAULT_LABELS = {
  comment: '근거 코멘트 (선택)',
  commentPlaceholder: '이번 업데이트의 근거를 간단히 적어주세요 (선택)',
  commentCount: (n, max) => `${n}/${max}`,
  notifyManager: (name) => `저장 시 @${name}에게 알림이 발송됩니다`,
  historyToggle: (n) => `이력 보기 (${n})`,
  historyLoading: '이력을 불러오는 중…',
  historyFailed: '이력을 불러오지 못했어요',
  // 창 머리·발 줄·AI 초안 줄 (PW-2415 — 종전엔 창 안에 박혀 있어 영어 화면에도 한국어로 남았다)
  subtitle: (krLabel) => `${krLabel} — 달성률 업데이트`,
  close: '취소',
  cancel: '취소',
  submit: '확정',
  aiDraft: 'AI 초안',
  aiCaption: '집계결과',
  apply: '적용',
};
