/**
 * 화면 언어 — 날짜·시각을 글자로 만들 때 쓰는 로케일 (PW-793).
 *
 * 🔴 `toLocaleString()`·`new Intl.DateTimeFormat()` 에 로케일을 안 넘기면 **브라우저
 * 언어**를 따른다. 영어 크롬을 쓰는 한국 사용자는 앱 언어가 한국어여도 `9/29/2026,
 * 9:00 AM` 을 보게 된다. 그래서 로케일은 늘 여기서 받는다.
 *
 * 순서: 호출부가 넘긴 값 → 문서의 `<html lang>`(앱이 화면 언어에 맞춰 바꿔 둔다)
 * → `ko`. 캔버스마다 locale prop 을 끝까지 내려 보내지 않아도 화면 언어를 따르게
 * 하려는 것이다.
 */
export function resolveUiLocale(locale) {
  if (typeof locale === 'string' && locale.trim()) return locale;
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.getAttribute('lang');
    if (lang && lang.trim()) return lang;
  }
  return 'ko';
}

export function isKoreanLocale(locale) {
  return resolveUiLocale(locale).toLowerCase().startsWith('ko');
}

const PICKER_WORDS = {
  ko: { today: '오늘', prevMonth: '이전 달', nextMonth: '다음 달' },
  en: { today: 'Today', prevMonth: 'Previous month', nextMonth: 'Next month' },
};

// 2023-01-02 는 월요일 — 달력이 월요일부터라 요일 이름도 월요일부터 뽑는다.
const MONDAY = new Date(2023, 0, 2);

/**
 * DatePicker 의 `labels` 를 화면 언어로 만든다. 요일·달 이름은 로케일에서 뽑는다
 * (ko 「월 화 수」「2026년 9월」, en 「Mon Tue Wed」「September 2026」).
 */
export function datePickerLabels(locale) {
  const lang = resolveUiLocale(locale);
  const words = isKoreanLocale(lang) ? PICKER_WORDS.ko : PICKER_WORDS.en;
  let weekday;
  let month;
  let yearMonth;
  try {
    weekday = new Intl.DateTimeFormat(lang, { weekday: 'short' });
    month = new Intl.DateTimeFormat(lang, { month: 'long' });
    yearMonth = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' });
  } catch {
    // 잘못된 lang 문자열이면 한국어로 — 영어로 떨어지면 이 카드가 고친 증상이 돌아온다.
    return datePickerLabels('ko');
  }
  return {
    weekdays: Array.from({ length: 7 }, (_, i) =>
      weekday.format(new Date(2023, 0, MONDAY.getDate() + i)),
    ),
    months: Array.from({ length: 12 }, (_, i) => month.format(new Date(2023, i, 1))),
    monthLabel: (y, m) => yearMonth.format(new Date(y, m, 1)),
    today: words.today,
    prevMonth: words.prevMonth,
    nextMonth: words.nextMonth,
  };
}
