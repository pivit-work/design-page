import { useEffect, useMemo, useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import Icon from '../shared/Icon.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import TextInput from '../shared/TextInput.jsx';
import TextArea from '../shared/TextArea.jsx';
import Radio from '../shared/Radio.jsx';
import { fill } from './sessionHelpers.js';

/**
 * "1on1 일정 추가 / 1on1 잡기" 모달.
 *
 * 두 가지 모드:
 *  1) member 미지정 — "1on1 일정 추가" (Figma 16955:18943): 상단에 팀원 검색.
 *  2) member 지정   — "1on1 잡기" (Figma 16815:19137): 상단에 멤버 표시(아바타+
 *     이름+배지+직무), 검색 없음. 멤버 카드의 "1on1 잡기" 버튼에서 호출.
 *
 * 인터랙션: 날짜 picker / 시간 dropdown / 미팅 시간 "직접입력" 시 input.
 *
 * member shape: { name, role, avatar, badge? }
 *
 * members: 검색 dropdown 에 보일 팀원 이름 배열. 🔴 **배열이면 빈 배열도 그대로 존중한다**
 *   — 「담당 팀원이 0명」을 그릴 수 있어야 하기 때문이다. 예시 이름은 이 prop 을 아예
 *   넘기지 않았을 때(시안·데모)만 쓴다 (PW-824).
 *   항목은 `{ id, name }` 이다(이름 문자열도 받는다 — 그땐 이름이 id). [예약완료]는
 *   **목록에서 한 명을 골랐을 때만** 켜지고, `onSubmit` 의 `memberId` 가 고른 사람의 id 다.
 *   동명이인은 이름으로 가를 수 없으므로 저장하는 쪽은 `memberId` 로 찾는다 (PW-1061).
 *
 * defaultTime: 시간 칸의 기본값 — 로케일과 무관한 24시간 `'HH:MM'`. 「일정변경」처럼
 *   이미 잡혀 있는 시각을 채워 여는 자리에서 쓴다 (PW-825). 생략하면 `'10:00'` 이다.
 *   날짜와 마찬가지로 **마운트 시점에** 잡히므로, 열 때마다 새로 잡히게 하려면
 *   호출부가 열림 상태를 `key` 에 실어야 한다.
 *
 * defaultDate: 날짜 칸의 기본값(Date). 호스트 앱은 «사용자 시간대의 내일» 을 넘긴다.
 *   생략하면 브라우저 로컬 기준 내일로 폴백한다 — 어느 쪽이든 «지나간 날짜» 가
 *   기본값으로 남지 않는다.
 *
 * onDelete: 주면 푸터 왼쪽에 «없애기» 버튼이 생긴다 — 이미 잡아 둔 1on1 을 여는
 *   「일정변경」 자리에서 그 1on1 을 아예 없애기 위한 것이다 (PW-825). 안 주면 버튼이
 *   없고 종전 화면 그대로다. 되돌릴 수 없는 조작이라 **확인은 호스트가 받는다** —
 *   이 부품은 누르면 부르기만 한다.
 *
 * locale / labels: 모달 안 글자를 호스트가 번역할 자리 (PW-469).
 *   - labels: 고정 문구를 키별로 덮어쓴다. 안 넘긴 키는 한국어 기본값 그대로다.
 *   - locale: 날짜·요일·시간처럼 «글자» 가 아니라 «형식» 인 것을 정한다(Intl).
 *   둘 다 생략하면 종전과 100% 같은 화면이다.
 *
 * onSubmit: 🔴 **저장이 끝나기를 기다린 뒤에만 닫힌다** (PW-987). 약속(Promise)을 돌려주면
 *   그동안 [예약완료]·[취소]·Esc·막 클릭을 잠그고, 거부(reject)되면 창과 고른 날짜·시각·
 *   메모를 그대로 둔 채 그 사유(`err.message`, 없으면 `labels.submitFailed`)를 창 안에
 *   한 줄로 보인다. 예전에는 부르자마자 닫혀서, 서버가 거절해도 고른 값이 사라지고
 *   매니저는 잡힌 줄 알았다. 닫는 것은 여전히 호스트 몫이다(성공하면 open 을 내린다).
 *
 * startNow: 주면 «팀원 검색»(또는 팀원 이름) 아래에 «언제: [지금 바로] [예약]» 줄이 생긴다 (PW-2592).
 *   안 주면 줄이 없고 종전 화면 그대로다 — «일정 변경»·«다음 1on1 예약» 창은 미래 시각만 고르는
 *   창이라 넘기지 않는다. 기본은 «예약»이다.
 *   - startNow.upcomingFor(memberId): 그 팀원과 잡아 둔 1on1 하나를 알려 준다 —
 *     `{ id, whenLabel, topicCount?, startable }` 또는 null. `whenLabel` 은 호스트가 그 사람
 *     시간대·언어로 만든 글자다. `startable` 이면 이미 시작 가능 시간 안이라 새로 잡지 않고
 *     버튼이 «그 1on1 진행»이 된다. 아니면 «그 1on1 을 지금으로 당기기»(기본)/«따로 새 1on1 잡기»를
 *     고르게 한다.
 *   «지금 바로»면 날짜·시간 칸이 빠지고 버튼이 «바로 시작 (N분)»이다. onSubmit 에 `when`
 *   ('now'|'later')·`upcomingAction`('start'|'pull'|'separate'|null)·`upcomingId` 가 더 실린다.
 *   시각은 싣지 않는다 — 서버가 자기 지금으로 잡는다(호스트 몫).
 *   - initialWhen: «언제»의 처음 값. 카드 [바로 시작]이 'now' 로 연다 (PW-2593). `startNow` 가 없으면 무시한다.
 *
 * isPastStart(date, time24): 고른 날짜(로컬 달력일 그릇)와 시각이 «지금보다 앞»인지 (pivit-work PW-2516).
 *   앞이면 [예약완료]가 꺼지고 날짜·시간 칸 바로 아래 `labels.pastTime` 한 줄이 뜬다. 지난 시각을
 *   목록에서 빼거나 흐리게 하지 않고, 골라 둔 시각을 저절로 바꾸지도 않는다 — 막힌 이유는 문구가 말한다.
 *   🔴 «지금»은 예약하는 사람의 시간대로 재야 하므로 호스트가 넘긴다(브라우저 시간대와 다를 수 있다).
 *   안 넘기면 브라우저 로컬 시각으로 잰다. 누를 때 한 번 더 재므로, 창을 열어 둔 사이 시각이 지나도 저장되지 않는다.
 *   «지금 바로»는 서버가 시각을 잡으므로 재지 않는다.
 * defaultDuration: 미팅 시간 칸의 처음 값(분, 숫자) — «일정 변경»이 그 회차의 길이로 여는 자리다 (pivit-work PW-2521).
 *   25·55 면 그 버튼, 그 밖의 양수면 «직접입력»이 골라지고 칸에 그 분이 들어간다. 생략하거나 비면(null·0) 종전대로 55분.
 *   날짜·시각처럼 **마운트 시점에** 잡힌다.
 *
 * keepPrefilledPast: 채워 연 날짜·시각(defaultDate·defaultTime)을 그대로 두면 지난 시각이어도 막지 않는다 —
 *   «일정 변경»에서 시작 시각이 이미 지난 회차의 길이·메모만 고칠 때다. 날짜나 시각 하나라도 바꾸면 위 판정이 걸린다.
 *
 * 창은 공용 창 틀(ModalShell)로 그린다 (PW-836). 닫혀 있는 동안에는 틀을 그리지 않지만,
 * 입력 상태는 이 컴포넌트가 들고 있어 종전처럼 열고 닫아도 남는다(새로 잡으려면 `key`).
 * Esc·막 클릭·닫기 X 는 틀이 onClose 로 부른다. 막의 data-testid 는 `ono-add-modal-overlay`,
 * 창은 `ono-add-modal`. 푸터 두 버튼은 `type="button"` 이다 — 틀은 폼(form)이라 기본
 * 제출 버튼을 쓰면 검색칸에서 Enter 만 눌러도 예약이 나가 버린다.
 */

/** 모달 안 고정 문구의 한국어 기본값. 호스트가 labels 로 키별 덮어쓰기 한다. */
export const DEFAULT_LABELS = {
  titleWithMember: '1on1 잡기',
  titleNoMember: '1on1 일정 추가',
  close: '닫기',
  memberSearch: '팀원 검색',
  memberSearchPlaceholder: '이름으로 검색 해주세요.',
  memberSearchEmpty: '검색 결과 없음',
  /* 검색어와 무관하게 «고를 팀원이 아예 없을» 때. 기본값은 위와 같은 글자라, 안 넘기면
     종전 화면 그대로다. 호스트는 화면 본문의 「팀원 0명」 안내와 같은 문구를 넘긴다 (PW-824). */
  memberEmpty: '검색 결과 없음',
  duration: '미팅 시간',
  duration25: '25분',
  duration55: '55분',
  durationCustom: '직접입력',
  durationCustomPlaceholder: '시간을 입력하세요 (예: 30분)',
  date: '날짜',
  time: '시간',
  memo: '메모 (선택)',
  memoPlaceholder: '사전 아젠다 또는 주요 논의 포인트를 메모하세요.',
  cancel: '취소',
  submit: '예약완료',
  /* 푸터 왼쪽 «없애기». `onDelete` 를 준 호출부에서만 보인다 (PW-825). */
  delete: '이 1on1 없애기',
  /* 저장이 거부됐는데 사유 문구가 없을 때 창 안에 보이는 한 줄 (PW-987). */
  submitFailed: '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  /* 고른 날짜·시각이 지금보다 앞일 때 날짜·시간 칸 아래 한 줄 (pivit-work PW-2516). */
  pastTime: '지난 시간은 선택할 수 없습니다',
  /* «언제» 줄과 «지금 바로» 갈래 (PW-2592). `startNow` 를 준 창에서만 보인다. */
  when: '언제',
  whenNow: '지금 바로',
  whenLater: '예약',
  startNowSubmit: '바로 시작 ({minutes}분)',
  startNowSubmitPlain: '바로 시작',
  startNowNotice:
    '지금 시각으로 1on1 을 잡고 바로 준비 화면으로 갑니다. {name} 님에게 알림이 갑니다. 준비 화면에서 매니저 관점 네 칸을 확정하면 [시작하기]가 열립니다.',
  upcoming: '잡아 둔 1on1',
  upcomingNotice: '{when}에 잡아 둔 1on1 이 있습니다.',
  upcomingTopics: '{name} 님이 논의 주제 {count}개를 적어 두었습니다.',
  upcomingPull: '그 1on1 을 지금으로 당기기',
  upcomingPullHint: '준비한 내용이 그대로 이어지고, {when} 일정은 지금으로 옮겨집니다.',
  upcomingSeparate: '따로 새 1on1 잡기',
  upcomingSeparateHint: '{when} 일정은 그대로 남습니다.',
  inWindowNotice: '{when}에 잡아 둔 1on1 을 지금 시작할 수 있습니다. 새로 잡지 않고 그 1on1 을 엽니다.',
  inWindowSubmit: '그 1on1 진행',
  prevMonth: '이전 달',
  nextMonth: '다음 달',
};

/* 처음 골라 둘 미팅 시간 버튼 — 25·55 는 그 버튼, 그 밖의 양수는 «직접입력», 없으면 55 (pivit-work PW-2521). */
function initialDurationKey(min) {
  const n = Number(min);
  if (!Number.isFinite(n) || n <= 0) return '55';
  if (n === 25 || n === 55) return String(n);
  return 'custom';
}

function durationOptions(L) {
  return [
    { key: '25', label: L.duration25 },
    { key: '55', label: L.duration55 },
    { key: 'custom', label: L.durationCustom },
  ];
}

/* 시안·데모 화면용 예시 이름. 🔴 **호스트 앱이 `members` 를 넘기면 절대 쓰지 않는다** —
   빈 배열도 「담당 팀원이 없다」는 뜻이라 그대로 존중한다. 예전엔 `members.length > 0`
   으로 갈라서 «빈 목록»과 «안 넘김»이 같은 취급을 받았고, 팀원이 0명인 계정에서 이 일곱
   사람이 실재하는 팀원처럼 떴다 (PW-824). */
const DEMO_MEMBERS = ['김서윤', '김정호', '최수현', '김유진', '윤다희', '이서현', '신예린'];

/* 팀원 한 줄. 호스트는 `{ id, name }` 을 넘긴다 — 🔴 이름은 **보이는 글자**일 뿐 누구인지를
   가리키지 않는다. 동명이인이면 같은 글자가 두 줄 뜨므로, 저장하는 쪽은 `onSubmit` 의
   `memberId` 로 사람을 찾는다 (PW-1061). 옛 호출부의 이름 문자열은 이름을 id 로 쓴다. */
function toMemberOption(m) {
  return typeof m === 'string' ? { id: m, name: m } : { id: String(m.id), name: m.name };
}

/* ── 날짜 기본값 ──────────────────────────────────────────────
   날짜 picker 는 Date 를 로컬 getter(`getFullYear/getMonth/getDate`)로만 읽고 쓴다.
   그래서 여기서도 «로컬 달력일» 만 다루고, 프롭 비교는 달력일 문자열로 한다 —
   호스트가 매 렌더 새 Date 객체를 넘겨도 «같은 날» 이면 같은 키라, 모달이 열려 있는
   동안 사용자가 고른 날짜를 기본값으로 되돌리지 않는다. */
function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayKeyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m, d);
}

/** 브라우저 로컬 기준 «내일» 의 달력일 키. */
function tomorrowKey(now = new Date()) {
  return dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

/* ── 시간 ─────────────────────────────────────────────────────
   드롭다운이 들고 있는 값은 로케일과 무관한 24시간 «HH:MM» 이고, 화면 글자도
   그 값 그대로다. 예약을 저장하는 쪽은 그 값(onSubmit 의 `time24`)을 읽으면 되므로
   영어 '1:00 PM' 을 1시로 되읽는 사고가 아예 생기지 않는다.

   🔴 오전·오후를 붙이지 않는다 (PW-867). 예전 한국어 표기 «오후 13:00» 은 오전·오후와
   24시간 숫자를 함께 써서 한 목록에 두 표기가 섞였고, 영어만 «1:00 PM» 이었다.
   예약이 잡힌 뒤 1on1 카드·일정표가 보여 주는 시각은 언어와 무관하게 «13:00» 이라
   고르는 자리도 그쪽에 맞춘다(TimeInput·evalScheduleStamp 와 같은 24시간 규약).

   하루 전체 00:00~23:30 의 30분 단위 48개다 (pivit-work PW-2516). 근무 시간은 회사·사람마다 달라
   09:00~18:00 으로 자르지 않는다. */
export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

/** 브라우저 로컬 시각 기준 «지난 시각» — 호스트가 `isPastStart` 를 안 넘겼을 때만 쓴다. */
function isPastLocal(date, time24) {
  const [h, m] = String(time24).split(':').map(Number);
  const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m);
  return at.getTime() < Date.now();
}

/**
 * 'HH:MM'(24h) → 화면에 보일 글자. 언어와 무관하게 24시간 그대로다 (PW-867).
 */
export function formatTime(value) {
  return value;
}

function formatDateLabel(date, locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function formatMonthLabel(date, locale) {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
}

/** 일요일 시작 요일 약칭 7개. (2024-01-07 이 일요일) */
function weekdayLabels(locale) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 7 + i)));
}

// 상세(열람모드) 모달도 같은 시간 옵션·데이트피커를 쓴다 — export 해 공유.
export const TIME_OPTIONS = TIME_SLOTS.map((slot) => formatTime(slot));

export default function AddOneOnOneModal({ open, onClose, onSubmit, onDelete, member, icons, baseUrl = '', members, defaultDate, defaultTime, locale = 'ko', labels, startNow, initialWhen = 'later', isPastStart = isPastLocal, keepPrefilledPast = false, defaultDuration }) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const memberList = useMemo(
    () => (Array.isArray(members) ? members : DEMO_MEMBERS).map(toMemberOption),
    [members],
  );
  const [search, setSearch] = useState('');
  /* 팀원 목록은 검색칸 «밖» 어디를 눌러도 닫힌다 — 창 제목·푸터·막은 폼(`closePopovers`) 바깥이라
     폼 클릭만 보던 때는 목록이 남아 있었다. 문서의 pointerdown 을 잡는 단계(capture)에서 보므로
     막 클릭처럼 전파를 멈추는 자리에서도 닫힌다. */
  const memberWrapRef = useRef(null);
  /* 목록에서 **고른** 팀원의 id. 검색칸에 글자를 치면 풀린다 — 친 글자가 우연히 이름과
     같아도 고른 것이 아니다. 예전엔 글자만 있으면 [예약완료]가 켜져, 이름 일부만 친 채
     눌러도 창이 닫히고 예약은 안 생겼다 (PW-1061). */
  const [pickedId, setPickedId] = useState(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [duration, setDuration] = useState(() => initialDurationKey(defaultDuration));
  const [customDuration, setCustomDuration] = useState(() =>
    initialDurationKey(defaultDuration) === 'custom' ? String(defaultDuration) : '',
  );
  /* 날짜 기본값은 «마운트 시점» 에 잡는다. 이 모달은 닫혀도 언마운트되지 않고
     display 로만 숨기 때문에, 열 때마다 새로 잡히게 하려면 호출부가 열림 상태를
     `key` 에 실어야 한다 (`OneOnOneCanvasV2` 가 그렇게 한다). */
  const defaultKey = defaultDate ? dayKey(defaultDate) : '';
  const [date, setDate] = useState(() => dayKeyToDate(defaultKey || tomorrowKey()));
  const [dateOpen, setDateOpen] = useState(false);
  /* 값은 로케일과 무관한 24시간 'HH:MM'. 화면 글자는 formatTime 이 만든다.
     `defaultTime` 을 주면 그 시각으로 연다 — 「일정변경」처럼 **이미 잡혀 있는 시각을
     보여 주고 고치게** 하는 자리에서 쓴다(PW-825). 안 주면 종전대로 10:00 이다. */
  const [time, setTime] = useState(defaultTime || '10:00');
  const [timeOpen, setTimeOpen] = useState(false);
  /* 시각 목록을 펼치면 골라 둔 줄이 보이게 내린다 — 48줄이라 맨 위(00:00)만 보이면 고른 값이 안 보인다. */
  const selectedTimeRef = useRef(null);
  useEffect(() => {
    if (timeOpen) selectedTimeRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [timeOpen]);
  const [memo, setMemo] = useState('');
  /* 저장 중 잠금과 실패 사유 (PW-987) — 실패해도 위 입력값은 건드리지 않는다. */
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submitErrorRef = useRef(null);
  /* 낮은 창에서는 실패 줄이 본문 스크롤 아래에 있어, 눌러도 아무 일 없는 것처럼 보인다 (pivit-work PW-2592). */
  useEffect(() => {
    if (submitError) submitErrorRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [submitError]);

  /* «언제» (PW-2592) — 기본은 «예약»이라 종전에 쓰던 사람에게 바뀌는 것이 없다. */
  const [when, setWhen] = useState(initialWhen);
  const [upcomingChoice, setUpcomingChoice] = useState('pull');

  const canSubmit = !!member || pickedId != null;
  const isNow = !!startNow && when === 'now';
  const targetId = member ? (member.id != null ? String(member.id) : null) : pickedId;
  const targetName = member ? member.name : (memberList.find((m) => m.id === pickedId)?.name ?? '');
  const upcoming = isNow && targetId != null ? (startNow.upcomingFor?.(targetId) ?? null) : null;
  const startable = !!upcoming?.startable;
  const upcomingAction = !upcoming ? null : startable ? 'start' : upcomingChoice;
  const nowMinutes = duration === 'custom' ? (customDuration.match(/\d+/)?.[0] ?? '') : duration;
  /* 지난 시각 (PW-2516) — 채워 연 값을 그대로 둔 «일정 변경»은 재지 않는다. 렌더 때 재고, 누를 때 한 번 더 잰다. */
  const prefilledKept = keepPrefilledPast && dayKey(date) === (defaultKey || tomorrowKey()) && time === (defaultTime || '10:00');
  const checkPast = () => !isNow && !prefilledKept && !!isPastStart(date, time);
  /* 누를 때 지난 것으로 잰 값 — 날짜·시각을 바꾸면 그 값이 아니게 되어 다시 렌더 때 판정으로 돌아간다. */
  const pickedKey = `${dayKey(date)} ${time}`;
  const [pastAtClickKey, setPastAtClickKey] = useState(null);
  const isPast = checkPast() || (!isNow && pastAtClickKey === pickedKey);
  const submitLabel = !isNow
    ? L.submit
    : startable
      ? L.inWindowSubmit
      : nowMinutes
        ? fill(L.startNowSubmit, { minutes: nowMinutes })
        : L.startNowSubmitPlain;

  const submit = async () => {
    if (saving || !canSubmit) return;
    if (checkPast()) {
      setPastAtClickKey(pickedKey);
      return;
    }
    setSubmitError('');
    setSaving(true);
    try {
      /* time 은 «화면에 보인 글자», time24 는 로케일 무관 'HH:MM'. 저장하는
         쪽은 time24 를 읽는다 — 영어 '1:00 PM' 을 1시로 잘못 읽지 않게 (PW-469). */
      await onSubmit?.({
        member, memberId: member ? null : pickedId, search, duration, customDuration, date, time: formatTime(time), time24: time,
        /* 이미 열 수 있는 회차는 저장할 곳이 없어 메모를 싣지 않는다 — 칸도 숨긴다. 당기기는 그 회차에 더한다. */
        memo: upcomingAction === 'start' ? '' : memo,
        when: isNow ? 'now' : 'later',
        upcomingAction: isNow ? upcomingAction : null,
        upcomingId: isNow && upcoming ? upcoming.id : null,
      });
    } catch (err) {
      setSubmitError((err && err.message) || L.submitFailed);
      return;
    } finally {
      setSaving(false);
    }
  };

  // 바깥 누르기는 공용 훅으로 듣는다 — 훅도 누르기를 잡는 단계(capture)에서 받아 막 클릭에서도 닫히고,
  // Esc 는 목록만 닫고 창은 남긴다.
  useDismissLayer(() => setMemberOpen(false), memberWrapRef, undefined, memberOpen);

  // 모든 popover/dropdown 닫기
  const closePopovers = () => {
    setMemberOpen(false);
    setDateOpen(false);
    setTimeOpen(false);
  };

  const filteredMembers = useMemo(() => {
    if (!search) return memberList;
    return memberList.filter((m) => m.name.includes(search));
  }, [search, memberList]);

  const dateLabel = formatDateLabel(date, locale);

  if (typeof document === 'undefined' || !open) return null;

  return (
    <ModalShell
      title={member ? L.titleWithMember : L.titleNoMember}
      titleId="ono-add-modal-title"
      closeLabel={L.close}
      onClose={() => onClose?.()}
      busy={saving}
      zIndex={1001}
      className="ono-add-shell"
      testId="ono-add-modal"
      overlayTestId="ono-add-modal-overlay"
      footer={
        <>
          {/* 없애기는 «이 미팅을 할 것인가» 를 되돌리는 조작이라 저장 버튼들과 같은 무게로
              놓지 않는다 — 왼쪽 끝에 두고 넓이를 차지하지 않게 한다 (PW-825). */}
          {onDelete && (
            <button
              type="button"
              className="tl-group-modal-btn ono-add-modal-btn-delete"
              data-testid="ono-add-modal-delete"
              disabled={saving}
              onClick={() => onDelete()}
            >
              {L.delete}
            </button>
          )}
          <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary" onClick={onClose} disabled={saving}>
            {L.cancel}
          </button>
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            data-testid="ono-add-modal-submit"
            onClick={() => void submit()}
            disabled={!canSubmit || saving || isPast}
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="ono-add-modal-form" onClick={closePopovers}>
        {member ? (
          /* "1on1 잡기" 모드 — 멤버 표시 (검색 없음) */
          <div className="ono-add-modal-member">
            <div className="ono-add-modal-member-avatar">
              {member.avatar && <img src={member.avatar} alt="" />}
            </div>
            <div className="ono-add-modal-member-info">
              <div className="ono-add-modal-member-name-row">
                <span className="ono-add-modal-member-name">{member.name}</span>
                {member.badge && (
                  <StatusBadge className="ono-add-modal-member-badge">{member.badge}</StatusBadge>
                )}
              </div>
              {member.role && (
                <span className="ono-add-modal-member-role">{member.role}</span>
              )}
            </div>
          </div>
        ) : (
          /* "1on1 일정 추가" 모드 — 팀원 검색 */
          <Field label={L.memberSearch}>
            <div ref={memberWrapRef} className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="ono-add-modal-input">
                <Icon src={icons?.search} size={20} color="var(--text-placeholder)" baseUrl={baseUrl} />
                <TextInput
                  placeholder={L.memberSearchPlaceholder}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPickedId(null); setMemberOpen(true); }}
                  onFocus={() => setMemberOpen(true)}
                  className="ono-add-modal-input-el"
                />
              </div>
              {memberOpen && (
                <div className="ono-add-modal-menu ono-add-modal-menu-wide">
                  {filteredMembers.length === 0 ? (
                    <div className="ono-add-modal-menu-empty">
                      {memberList.length === 0 ? L.memberEmpty : L.memberSearchEmpty}
                    </div>
                  ) : (
                    filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="ono-add-modal-menu-item"
                        data-testid="ono-add-modal-member-option"
                        onClick={() => { setSearch(m.name); setPickedId(m.id); setMemberOpen(false); }}
                      >
                        {m.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Field>
        )}

        {/* 언제 (PW-2592) — 디자이너 원본이 없어 바로 아래 «미팅 시간» 라디오 칸 모양을 그대로 쓴다. */}
        {startNow && (
          <Field label={L.when} group>
            <div className="ono-add-modal-radio-group">
              {[['now', L.whenNow], ['later', L.whenLater]].map(([key, label]) => (
                <Radio
                  key={key}
                  variant="card"
                  name="ono-add-when"
                  value={key}
                  checked={when === key}
                  onChange={() => setWhen(key)}
                  label={label}
                  data-testid={`ono-add-when-${key}`}
                />
              ))}
            </div>
          </Field>
        )}

        {/* 미팅 시간 — 공용 라디오(PW-1012). 전에는 동그라미를 버튼으로 직접 그려 키보드 화살표로
            옮겨 다닐 수 없었고, 화면 읽기 프로그램은 「버튼」으로 읽었다. */}
        {!startable && (
        <Field label={L.duration} group>
          <div className="ono-add-modal-radio-group">
            {durationOptions(L).map((opt) => (
              <Radio
                key={opt.key}
                variant="card"
                name="ono-add-duration"
                value={opt.key}
                checked={duration === opt.key}
                onChange={() => setDuration(opt.key)}
                label={opt.label}
                data-testid={`ono-add-duration-${opt.key}`}
              />
            ))}
          </div>
          {duration === 'custom' && (
            <div className="ono-add-modal-input">
              <TextInput
                placeholder={L.durationCustomPlaceholder}
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="ono-add-modal-input-el"
                aria-label={L.durationCustom}
              />
            </div>
          )}
        </Field>
        )}

        {/* 잡아 둔 1on1 (PW-2592) — 그 팀원과 이미 잡아 둔 회차가 있으면 당길지 따로 잡을지 고른다.
            안내 글씨는 디자이너의 일정 추가 창 안내(.tl-event-helper), 고르는 칸은 위 라디오 칸에
            회의 공유 창의 설명 줄(.mtg-share-card-desc)을 붙인 것이다. */}
        {upcoming && !startable && (
          <Field label={L.upcoming} group>
            <p className="tl-event-helper ono-add-modal-hint" data-testid="ono-add-modal-upcoming">
              {fill(L.upcomingNotice, { when: upcoming.whenLabel })}
              {upcoming.topicCount > 0 && ` ${fill(L.upcomingTopics, { name: targetName, count: upcoming.topicCount })}`}
            </p>
            <div className="ono-add-modal-choice-list">
              {[
                ['pull', L.upcomingPull, L.upcomingPullHint],
                ['separate', L.upcomingSeparate, L.upcomingSeparateHint],
              ].map(([key, title, hint]) => (
                <Radio
                  key={key}
                  variant="card"
                  name="ono-add-upcoming"
                  value={key}
                  checked={upcomingChoice === key}
                  onChange={() => setUpcomingChoice(key)}
                  data-testid={`ono-add-upcoming-${key}`}
                  label={
                    <span className="ono-add-modal-choice">
                      <span>{title}</span>
                      <span className="mtg-share-card-desc">{fill(hint, { when: upcoming.whenLabel })}</span>
                    </span>
                  }
                />
              ))}
            </div>
          </Field>
        )}
        {startable && (
          <p className="tl-event-helper ono-add-modal-hint" data-testid="ono-add-modal-in-window">
            {fill(L.inWindowNotice, { when: upcoming.whenLabel })}
          </p>
        )}

        {/* 날짜 + 시간 — «지금 바로»면 서버가 시각을 정하므로 뺀다 (PW-2592). */}
        {!isNow && (
        <div>
        <div className="ono-add-modal-row">
          {/* 날짜 */}
          <Field label={L.date}>
            <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="ono-add-modal-input ono-add-modal-input-with-icon"
                onClick={() => { setDateOpen((v) => !v); setTimeOpen(false); setMemberOpen(false); }}
              >
                <Icon src={icons?.calendar} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
                <span className="ono-add-modal-input-text">{dateLabel}</span>
              </button>
              {dateOpen && (
                <DatePickerPopover
                  value={date}
                  onChange={(d) => { setDate(d); setDateOpen(false); }}
                  locale={locale}
                  labels={L}
                />
              )}
            </div>
          </Field>
          {/* 시간 */}
          <Field label={L.time}>
            <div className="ono-add-modal-popover-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="ono-add-modal-input"
                onClick={() => { setTimeOpen((v) => !v); setDateOpen(false); setMemberOpen(false); }}
              >
                <span className="ono-add-modal-input-text">{formatTime(time)}</span>
                <Icon src={icons?.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
              </button>
              {timeOpen && (
                <div className="ono-add-modal-menu ono-add-modal-menu-time">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      ref={slot === time ? selectedTimeRef : undefined}
                      type="button"
                      className={`ono-add-modal-menu-item ${slot === time ? 'is-selected' : ''}`}
                      onClick={() => { setTime(slot); setTimeOpen(false); }}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>
        {/* 지난 시각 (PW-2516) — 두 칸 «바로 아래» 공용 칸 오류 한 줄. 줄 사이 간격(3xl) 밖에 두려고 두 칸과 함께 묶는다. */}
        {isPast && (
          <FieldError id="ono-add-modal-past" data-testid="ono-add-modal-past">{L.pastTime}</FieldError>
        )}
        </div>
        )}

        {/* 메모 — 이미 열 수 있는 회차는 저장할 곳이 없어 칸을 뺀다 (PW-2592). 당기기는 그 회차에 한 줄 더한다. */}
        {!startable && (
        <Field label={L.memo}>
          <TextArea
            className="ono-add-modal-textarea"
            placeholder={L.memoPlaceholder}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Field>
        )}
        {isNow && !upcoming && canSubmit && (
          <p className="tl-event-helper ono-add-modal-hint" data-testid="ono-add-modal-now-notice">
            {fill(L.startNowNotice, { name: targetName })}
          </p>
        )}
        {/* 저장 실패 사유 (PW-987) — 1on1 화면의 다른 인라인 실패 줄과 같은 모양이다. */}
        {submitError && (
          <p ref={submitErrorRef} className="ono-done-inline-error" role="alert" data-testid="ono-add-modal-error">
            {submitError}
          </p>
        )}
      </div>
    </ModalShell>
  );
}

/** 이 창의 칸 틀 — 공용 이름표·오류 문구 틀(FormField)에 이 창의 모양 클래스를 얹은 것 (PW-1012). */
function Field({ label, group = false, children }) {
  return (
    <FormField
      label={label}
      group={group}
      className="ono-add-modal-field"
      labelClassName="ono-add-modal-field-label"
    >
      {children}
    </FormField>
  );
}

/* ────────────────────────────────────────────────
   Date picker popover — month grid + 좌/우 month nav.
   ──────────────────────────────────────────────── */
/** 날짜 피커의 바깥 높이(px · 브라우저 실측 364) — 16 패딩 ×2 · 머리 · 요일 줄 · 6주 격자. 여는 쪽이 자리 계산에 쓴다. */
export const DATEPICKER_HEIGHT = 364;

/** @param {'down'|'up'} [placement='down'] 버튼 아래/위 어느 쪽에 펼지 (popoverPlacement 결과) */
export function DatePickerPopover({ value, onChange, locale = 'ko', labels = DEFAULT_LABELS, placement = 'down' }) {
  const weekdays = weekdayLabels(locale);
  // value 는 null 허용(미선택) — 뷰는 오늘 기준 달, 선택 하이라이트는 없음.
  const [view, setView] = useState(() => {
    const base = value ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const popoverRef = useRef(null);

  const grid = useMemo(() => buildMonthGrid(view), [view]);

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const today = new Date();

  const navMonth = (delta) => {
    const next = new Date(view.getFullYear(), view.getMonth() + delta, 1);
    setView(next);
  };

  return (
    <div ref={popoverRef} className={`ono-add-modal-datepicker${placement === 'up' ? ' is-up' : ''}`}>
      <div className="ono-add-modal-datepicker-head">
        <button type="button" className="ono-add-modal-datepicker-nav" onClick={() => navMonth(-1)} aria-label={labels.prevMonth}>‹</button>
        <span className="ono-add-modal-datepicker-title">
          {formatMonthLabel(view, locale)}
        </span>
        <button type="button" className="ono-add-modal-datepicker-nav" onClick={() => navMonth(1)} aria-label={labels.nextMonth}>›</button>
      </div>
      <div className="ono-add-modal-datepicker-weekdays">
        {weekdays.map((w) => (
          <span key={w} className="ono-add-modal-datepicker-weekday">{w}</span>
        ))}
      </div>
      <div className="ono-add-modal-datepicker-grid">
        {grid.map((d, i) => {
          const isCurrent = d.getMonth() === view.getMonth();
          const isSelected = value ? isSameDay(d, value) : false;
          const isToday = isSameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              className={`ono-add-modal-datepicker-day ${isCurrent ? '' : 'is-other-month'} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => onChange(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthGrid(view) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // 0=일
  const start = new Date(year, month, 1 - startDow);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return cells;
}
