import { useEffect, useState } from 'react';
import { BroadcastBar, Button } from './components';
import { BROADCAST_BAR_HEIGHT } from './components/broadcast/constants.js';
import StateSwitcher from './devtools/StateSwitcher.jsx';
import { LABEL_KNOB, useKnobs } from './devtools/knobs.js';
import { stressText } from './devtools/stress.js';

/**
 * BroadcastPage — 어드민 브로드캐스트 공지 바 데모 wrapper
 * (Figma 일반 공지 17816:26924 · 경고/장애 17816:26435 · 2026-11-04).
 *
 * 사이드바 메뉴에는 없다 — 주소 `/broadcast` 로 연다. 화면 맨 위에 공지 바를 고정으로 띄우고,
 * 본문에는 두 종류(일반 · 경고/장애)를 그대로 미리 보여 준다.
 *
 * 실제 앱(pivit-work)에서는:
 *  - 어드민이 보낸 브로드캐스트(message · kind · actions)를 앱 셸이 받아 `<BroadcastBar>` 를 맨 위에 세운다
 *  - 띄우는 동안 `document.documentElement` 에 `--broadcast-bar-h: 48px` 를 두면 사이드바·머리 줄·본문이
 *    그만큼 내려선다(App.css). 닫으면 0 으로 되돌린다 — 여기서 그 배선을 그대로 보인다.
 *  - 닫기 X 는 그 공지를 이 사용자에게서 숨긴다(서버 또는 로컬 저장) — 여기서는 화면에서만 뺀다
 */

const BROADCASTS = {
  notice: {
    kind: 'notice',
    message:
      '연말 평가 시즌을 앞두고 평가 화면이 바뀝니다 - 동료 리뷰 요청 마감일을 회사가 정할 수 있고, 상향 리뷰 결과는 조직장에게 익명으로만 보이며, 캘리브레이션 화면에 등급 분포 그래프가 새로 생깁니다.',
    actions: [
      { label: '자세히', href: '#notice-detail' },
      { label: '변경안내', href: '#notice-changes' },
    ],
  },
  warning: {
    kind: 'warning',
    message: '현재 구글 캘린더 연동 회의가 목록에 늦게 들어오고 있습니다. 복구 중입니다.',
    actions: [
      { label: '자세히', href: '#incident-detail' },
      { label: '장애 현황', href: '#incident-status' },
    ],
  },
};

const PREVIEWS = [
  { kind: 'notice', name: '일반 공지', sub: '기능 변경·안내 — 파랑 blue-400 → 500 (Figma 17816:26924)' },
  { kind: 'warning', name: '경고 · 장애', sub: '장애·복구 중 — 분홍 → 주황 (Figma 17816:26435)' },
];

const KIND_KNOB = {
  key: 'kind',
  label: '종류',
  options: [
    { value: 'default', label: '일반 공지' },
    { value: 'warning', label: '경고·장애' },
  ],
};
const KNOBS = [KIND_KNOB, LABEL_KNOB];
const SWITCHER_NOTE = '종류: 맨 위 공지 바의 색 / 라벨: 공지 글과 링크 글자 길이';

/** 띄우는 동안만 셸을 48px 내린다 — 닫거나 페이지를 떠나면 되돌린다. */
function useShellOffset(visible) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--broadcast-bar-h', visible ? `${BROADCAST_BAR_HEIGHT}px` : '0px');
    return () => root.style.removeProperty('--broadcast-bar-h');
  }, [visible]);
}

export default function BroadcastPage({ baseUrl }) {
  const { values: knobs, set: setKnob, reset: resetKnobs } = useKnobs(KNOBS);
  const knobKind = knobs.kind === 'warning' ? 'warning' : 'notice';
  // 맨 위 띠의 종류·보임 — 상태 스위처의 종류가 바뀌면(knob 이 달라지면) 그 종류로 다시 띄운다.
  const [dock, setDock] = useState({ knob: knobKind, kind: knobKind, visible: true });
  const cur = dock.knob === knobKind ? dock : { knob: knobKind, kind: knobKind, visible: true };
  const { kind: liveKind, visible } = cur;
  useShellOffset(visible);

  const withLabels = (b) => ({
    ...b,
    message: stressText(b.message, knobs.labels),
    actions: b.actions.map((a) => ({ ...a, label: stressText(a.label, knobs.labels) })),
  });
  const live = withLabels(BROADCASTS[liveKind]);

  const show = (kind) => setDock({ knob: knobKind, kind, visible: true });
  const hide = () => setDock({ ...cur, visible: false });

  return (
    <>
      {visible && (
        <div className="broadcast-dock" data-testid="broadcast-dock">
          <BroadcastBar
            kind={live.kind}
            message={live.message}
            actions={live.actions}
            onClose={hide}
            baseUrl={baseUrl}
          />
        </div>
      )}

      <div className="content-area">
        <div className="broadcast-page" data-testid="broadcast-page">
          <div className="broadcast-page-head">
            <h1 className="broadcast-page-title">공지 바</h1>
            <p className="broadcast-page-desc">
              어드민이 서비스 전체에 보내는 공지는 화면 맨 위 한 줄로 뜬다. 사이드바와 머리 줄은 그 아래로 내려서고, 닫기 X 를 누르면 사라진다.
            </p>
            {!visible && (
              <div>
                <Button variant="secondary" size="sm" onClick={() => show(liveKind)} data-testid="broadcast-reopen">
                  공지 다시 띄우기
                </Button>
              </div>
            )}
          </div>

          {PREVIEWS.map((p) => {
            const b = withLabels(BROADCASTS[p.kind]);
            return (
              <section key={p.kind} className="broadcast-preview" data-testid={`broadcast-preview-${p.kind}`}>
                <div className="broadcast-preview-head">
                  <div>
                    <h2 className="broadcast-preview-name">{p.name}</h2>
                    <p className="broadcast-preview-sub">{p.sub}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => show(p.kind)} data-testid={`broadcast-show-${p.kind}`}>
                    맨 위에 띄우기
                  </Button>
                </div>
                <div className="broadcast-preview-frame">
                  <BroadcastBar
                    kind={b.kind}
                    message={b.message}
                    actions={b.actions}
                    onClose={() => show(p.kind)}
                    baseUrl={baseUrl}
                    testId={`broadcast-bar-${p.kind}`}
                  />
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <StateSwitcher spec={KNOBS} values={knobs} onChange={setKnob} onReset={resetKnobs} note={SWITCHER_NOTE} />
    </>
  );
}
