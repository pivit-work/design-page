/**
 * 매니저 DONE 뷰(PW-430)의 순수 판정 — 컴포넌트 파일에 두지 않는다.
 *
 * `sessionHelpers.js` 와 같은 이유다: 컴포넌트 파일이 컴포넌트 아닌 것을 export 하면
 * Fast Refresh 가 모듈 전체를 재실행해 편집 중 상태가 날아간다. 그리고 이 판정은
 * **소비처(pivit-work)의 폴링 조건**과 같아야 하므로 캔버스 소유로 두면 안 된다 —
 * 화면은 「분석 중」이라고 말하는데 폴링은 이미 멈춰 있는 어긋남이 생긴다.
 */

/**
 * DONE 화면 배너의 상태 — 「지금 무슨 단계인지」를 하나로 판정한다 (policy §6.1).
 *
 * 녹음을 올린 회차는 서버가 **전사 뒤에** 요약을 만든다(PW-275). 종료 직후에는
 * 요약이 없는 게 정상이고, 그 사이를 침묵으로 두면 매니저는 기다려야 하는지 다시
 * 눌러야 하는지 알 수 없다.
 *
 * | 반환 | 뜻 |
 * |---|---|
 * | `transcribing` | 전사가 도는 중 (`sttStatus === 'processing'`) |
 * | `summarizing` | 전사는 끝났는데 요약이 아직 없다 |
 * | `summarizing-no-recording` | 녹음이 없는 회차의 요약 대기 — 오지 않을 전사를 기다리지 않게 문구를 가른다 |
 * | `failed` | 전사 실패 + 요약도 아직 없다 |
 * | `ready` | 요약이 있다 |
 *
 * 요약이 **있으면** 전사 상태보다 우선한다. 전사가 실패했어도 요약은 대화 원문 없이
 * 만들어질 수 있고, 그때 화면이 계속 실패만 말하면 이미 나온 산출물이 가려진다.
 */
export function doneBannerState(session) {
  const stt = session?.sttStatus ?? null;
  const hasSummary = !!(session?.aiSummary && String(session.aiSummary).trim());
  if (hasSummary) return 'ready';
  if (stt === 'processing') return 'transcribing';
  if (stt === 'failed') return 'failed';
  return stt === null ? 'summarizing-no-recording' : 'summarizing';
}

/**
 * 아직 서버가 만들고 있는 중인가 — **소비처의 폴링 조건이 이 함수다.**
 *
 * 🔴 `failed`(전사 실패)도 「진행 중」이다. 서버는 전사가 깨져도 **요약을 계속
 * 만든다**(`summarizeAfterTranscription` 은 전사 실패 뒤에도 돌아간다). 여기서
 * 멈추면 잠시 뒤 도착하는 요약을 화면이 영원히 못 받는다.
 *
 * 확정 상태는 `ready` 하나다. 다만 「영원히 안 오는 경우」가 있으므로, 폴링을
 * 무한히 도는 것은 소비처가 시도 횟수로 끊는다 — 그건 이 판정의 몫이 아니다.
 */
export const isDonePending = (state) => state !== 'ready';
