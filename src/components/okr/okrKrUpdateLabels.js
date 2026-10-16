/** 창 안 문구 — 앱은 `detail.labels` 로 번역을 넘긴다. 없으면 이 한국어를 쓴다. */
export const KR_UPDATE_DEFAULT_LABELS = {
  comment: '근거 코멘트 (선택)',
  commentPlaceholder: '이번 업데이트의 근거를 간단히 적어주세요 (선택)',
  commentCount: (n, max) => `${n}/${max}`,
  notifyManager: (name) => `저장 시 @${name}에게 알림이 발송됩니다`,
  historyToggle: (n, open) => `${open ? '▾' : '▸'} 이력 보기 (${n})`,
  historyLoading: '이력을 불러오는 중…',
  historyFailed: '이력을 불러오지 못했어요',
};
