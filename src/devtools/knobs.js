import { useCallback, useMemo, useState } from 'react';

/**
 * 데모 페이지 상태 스위처의 공용 knob 정의와 상태 훅.
 *
 * 데모 페이지는 캔버스에 픽스처를 물려 렌더하는데, 상태를 가르는 prop 이 한 값에
 * 못 박혀 있어 "빈 상태 / 실패 / 긴 라벨" 같은 화면을 보려면 페이지 소스를 직접
 * 고쳐야 했다. knob 은 그 값을 페이지 안에서 바꿀 수 있게 만든다.
 *
 * 기본값은 지금까지의 화면과 동일하다 — 스위처를 건드리지 않으면 아무것도 달라지지
 * 않는다. 선택한 값은 URL 쿼리(`?knobs=`)에 실려, 깨진 화면을 링크로 공유할 수 있다.
 */

const PARAM = 'knobs';

/* ── 공용 knob 3종 ─────────────────────────────────────────────────────── */

/** 항목 수 극단 — 0개 / 1개 / 아주 많음. */
export const VOLUME_KNOB = {
  key: 'volume',
  label: '항목 수',
  options: [
    { value: 'default', label: '기본' },
    { value: 'empty', label: '0개' },
    { value: 'one', label: '1개' },
    { value: 'many', label: '아주 많음' },
  ],
};

/** 라벨 길이 — 긴 CJK / 영문 / 미해석 코드값. 자세한 건 stress.js. */
export const LABEL_KNOB = {
  key: 'labels',
  label: '라벨',
  options: [
    { value: 'default', label: '기본' },
    { value: 'long', label: '긴 CJK' },
    { value: 'latin', label: '영문' },
    { value: 'raw', label: '미해석 코드값' },
  ],
};

/** 비동기 상태 — 로딩·저장 중에서 멈춰 세우거나, 실패로 떨어뜨린다. */
export const ASYNC_KNOB = {
  key: 'async',
  label: '비동기',
  options: [
    { value: 'default', label: '기본' },
    { value: 'loading', label: '로딩·저장 중' },
    { value: 'error', label: '실패' },
  ],
};

/** 모달·팝오버를 클릭 경로 없이 바로 연다. 페이지마다 목록이 다르다. */
export function modalKnob(options) {
  return {
    key: 'modal',
    label: '모달',
    options: [{ value: 'default', label: '닫힘' }, ...options],
  };
}

/* ── URL 직렬화 ────────────────────────────────────────────────────────── */

function parse(search) {
  const raw = new URLSearchParams(search).get(PARAM);
  if (!raw) return {};
  const out = {};
  for (const pair of raw.split(',')) {
    const [key, value] = pair.split(':');
    if (key && value) out[key] = value;
  }
  return out;
}

function write(values) {
  const params = new URLSearchParams(window.location.search);
  const encoded = Object.entries(values)
    .filter(([, v]) => v && v !== 'default')
    .map(([k, v]) => `${k}:${v}`)
    .join(',');
  if (encoded) params.set(PARAM, encoded);
  else params.delete(PARAM);
  const qs = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${qs ? `?${qs}` : ''}`,
  );
}

/* ── 훅 ───────────────────────────────────────────────────────────────── */

/**
 * knob 목록을 받아 현재 값과 setter 를 돌려준다.
 *
 * @param {Array<{key: string, label: string, options: Array<{value: string, label: string}>}>} spec
 * @returns {{values: Record<string,string>, set: (key: string, value: string) => void, reset: () => void}}
 */
export function useKnobs(spec) {
  const defaults = useMemo(() => {
    const out = {};
    for (const knob of spec) out[knob.key] = 'default';
    return out;
  }, [spec]);

  const [values, setValues] = useState(() => {
    const fromUrl = parse(window.location.search);
    const out = { ...defaults };
    for (const knob of spec) {
      const candidate = fromUrl[knob.key];
      if (candidate && knob.options.some((o) => o.value === candidate)) out[knob.key] = candidate;
    }
    return out;
  });

  const set = useCallback((key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setValues(() => {
      write(defaults);
      return defaults;
    });
  }, [defaults]);

  return { values, set, reset };
}

/**
 * 캔버스에 붙일 remount 키.
 *
 * 캔버스 중에는 픽스처를 마운트 시점에 한 번만 state 로 스냅샷하는 것들이 있다
 * (예: OrgChartCanvas 의 `useState(initialOrgData)`). prop 만 바꿔서는 화면이
 * 안 바뀌므로, 픽스처 모양을 바꾸는 knob(volume·labels)이 달라지면 key 로 강제
 * 리마운트한다.
 *
 * modal·async 는 제외한다 — 모달을 여는 순간 캔버스가 리마운트되면 그 아래
 * 화면이 초기화되고, '저장 중' 을 보려다 열어 둔 탭이 닫힌다. 탭·기간 같은
 * 내비게이션 상태는 wrapper 가 들고 있어 리마운트해도 유지된다.
 */
export function knobKey(values, keys = ['volume', 'labels']) {
  return keys.map((k) => `${k}:${values[k] ?? 'default'}`).join('|');
}

/* ── 항목 수 헬퍼 ──────────────────────────────────────────────────────── */

/**
 * 리스트를 volume knob 값에 맞춰 늘리거나 줄인다.
 *
 * @param {Array} list 원본
 * @param {string} volume VOLUME_KNOB 값
 * @param {{count?: number, clone?: (item: any, i: number) => any}} [opts]
 *   clone 은 'many' 에서 복제본마다 키를 유일하게 만들 때 쓴다. 안 주면 얕은 복사만 한다.
 */
export function resize(list, volume, opts = {}) {
  if (!Array.isArray(list)) return list;
  if (!volume || volume === 'default') return list;
  if (volume === 'empty') return [];
  if (volume === 'one') return list.slice(0, 1);
  if (volume === 'many') {
    const { count = 40, clone } = opts;
    if (list.length === 0) return list;
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const base = list[i % list.length];
      out.push(clone ? clone(base, i) : { ...base });
    }
    return out;
  }
  return list;
}
