import { useCallback, useMemo } from 'react';
import { TimelineCanvas } from './components';
import StateSwitcher from './devtools/StateSwitcher.jsx';
import { LABEL_KNOB, VOLUME_KNOB, knobKey, useKnobs } from './devtools/knobs.js';
import { stress, stressText } from './devtools/stress.js';
import {
  MEMBERS,
  GROUPS,
  MEETINGS,
  SNIPPETS,
  getEventsForDate,
} from './timeline-demo-data.js';

/* ── 상태 스위처 ─────────────────────────────────────────────────────────
   타임라인은 멤버 아바타 행과 그룹 칩이 가로로 붙는 화면이라, 멤버가 늘거나
   그룹 이름이 길어질 때 줄이 어떻게 되는지가 관심사다. 하루 이벤트 수도
   knob 으로 흔든다 — 빈 날 / 이벤트가 아주 많은 날. */
const TITLE_ALT = { long: '최고기술책임자 겸 플랫폼 총괄', latin: 'Chief Technology Officer', raw: 'chief_technology_officer' };

const KNOBS = [VOLUME_KNOB, LABEL_KNOB];
const SWITCHER_NOTE = '항목 수: 구성원·그룹·하루 이벤트 / 라벨: 구성원 이름·직함·그룹 이름';

const isDefault = (v) => !v || v === 'default';

function shapeMembers(volume, labelMode) {
  // 기본값에서는 원본 배열 참조를 그대로 돌려준다 — 매 렌더마다 새 배열을 만들면
  // 참조로 동기화하는 캔버스(TimelineCanvas 의 initialGroups)가 사용자 편집을 덮는다.
  if (isDefault(volume) && isDefault(labelMode)) return MEMBERS;
  let members = MEMBERS;
  if (volume === 'empty') members = [];
  else if (volume === 'one') members = MEMBERS.slice(0, 1);
  else if (volume === 'many') {
    members = Array.from({ length: 30 }, (_, i) => {
      const base = MEMBERS[i % MEMBERS.length];
      return { ...base, id: `${base.id}-x${i}`, name: `${base.name}${i + 1}` };
    });
  }
  if (labelMode && labelMode !== 'default') {
    members = members.map((m) => ({
      ...m,
      name: stressText(m.name, labelMode),
      title: stress(m.title, labelMode, TITLE_ALT),
    }));
  }
  return members;
}

function shapeGroups(members, volume, labelMode) {
  if (isDefault(volume) && isDefault(labelMode)) return GROUPS;
  const ids = new Set(members.map((m) => m.id));
  let groups = GROUPS
    .map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => ids.has(id)) }))
    .filter((g) => g.memberIds.length > 0 || volume === 'default');
  if (volume === 'empty') groups = [];
  else if (volume === 'one') groups = groups.slice(0, 1);
  else if (volume === 'many') {
    // 그룹 하나에 전 구성원을 몰아넣어 아바타 행이 넘치는지 본다.
    groups = Array.from({ length: 8 }, (_, i) => ({
      id: `g-x${i}`,
      label: `${GROUPS[i % GROUPS.length].label} ${i + 1}`,
      memberIds: members.map((m) => m.id),
    }));
  }
  if (labelMode && labelMode !== 'default') {
    groups = groups.map((g) => ({ ...g, label: stressText(g.label, labelMode) }));
  }
  return groups;
}

/**
 * TimelinePage — 타임라인 demo wrapper.
 *
 * design-page 의 "데이터는 wrapper 에서, 컴포넌트는 props 로만" 패턴.
 * TimelineCanvas 는 순수 컴포넌트이며 내부 fallback 이 없으므로 wrapper 가
 * 모든 데이터/초기 그룹을 주입한다. pivit-work 는 자체 Page 컴포넌트에서
 * 실 데이터로 TimelineCanvas 를 렌더하므로 이 wrapper 는 사용하지 않는다.
 */
export default function TimelinePage({ icons, baseUrl }) {
  const { values: knobs, set: setKnob, reset: resetKnobs } = useKnobs(KNOBS);
  const { volume, labels: labelMode } = knobs;

  /* ── knob 적용 — 기본값에서는 원본 그대로 ── */
  const members = useMemo(() => shapeMembers(volume, labelMode), [volume, labelMode]);
  const groups = useMemo(() => shapeGroups(members, volume, labelMode), [members, volume, labelMode]);

  const eventsForDate = useCallback((iso) => {
    const events = getEventsForDate(iso);
    if (volume === 'empty') return [];
    if (volume === 'one') return events.slice(0, 1);
    if (volume === 'many') {
      // 하루 칸에 이벤트 24개 — 셀 높이가 늘어나는지, 잘려 나가는지.
      return Array.from({ length: 24 }, (_, i) => {
        const base = events[i % Math.max(events.length, 1)];
        return base ? { ...base, id: `${base.id}-x${i}` } : null;
      }).filter(Boolean);
    }
    return events;
  }, [volume]);

  return (
    <>
      <TimelineCanvas
        key={knobKey(knobs)}
        icons={icons}
        baseUrl={baseUrl}
        members={members}
        meetings={volume === 'empty' ? [] : MEETINGS}
        snippets={volume === 'empty' ? [] : SNIPPETS}
        getEventsForDate={eventsForDate}
        initialGroups={groups}
        // 스니핏 상세 팝오버의 "전체 보기" — 실서비스는 /snippet/:id 로 라우팅한다.
        onSnippetOpen={(snippet) => console.log('open snippet', snippet.id)}
      />
      <StateSwitcher
        spec={KNOBS}
        values={knobs}
        onChange={setKnob}
        onReset={resetKnobs}
        note={SWITCHER_NOTE}
      />
    </>
  );
}
