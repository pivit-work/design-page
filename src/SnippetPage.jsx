import { useState } from 'react';
import { SnippetCanvas } from './components';
import SnippetModal from './components/timeline/SnippetModal.jsx';

/**
 * SnippetPage — "스니핏" (스니핏 히스토리) demo wrapper.
 * Figma: 멤버 뷰 16960:13435 / 매니저 뷰 16960:20541.
 *
 * 매니저 뷰 토글은 개발 확인용. ON 이면 멤버 아바타 행이 추가로 노출되고,
 * 멤버를 선택해 해당 멤버의 스니핏 히스토리를 보는 형태(데모에선 빈 상태 유지).
 */
function pickAvatars(count) {
  const pool = Array.from({ length: 70 }, (_, i) => i + 1);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out.map((n) => `https://i.pravatar.cc/200?img=${n}`);
}

const MEMBER_NAMES = ['줄리엇', '김지석', '이현서', '한유진', '김하늘', '박서아', '한도현', '신예린'];
const AVATARS = pickAvatars(MEMBER_NAMES.length);
const DEMO_MEMBERS = MEMBER_NAMES.map((name, i) => ({
  id: `m-${i}`,
  name,
  avatar: AVATARS[i],
}));

const DEMO_SNIPPETS = [
  {
    id: 's-1',
    dateLabel: '12월31일',
    summary:
      'pgvector 기반 시각적 유사도 검색 인덱스 전략 초안 작성 및 벤치마크 테스트 수행. BullMQ 기반 비동기 작업 큐 기초 구현 완료 및 워커 프로세스 구조 설계. 백엔드 개발팀 스프린트 코드 리뷰 진행 및 성능 병목 지점 개선 가이드 제공.',
    timestamp: '2026.12.31',
    recent: true,
  },
  {
    id: 's-2',
    dateLabel: '12월30일',
    summary:
      '복잡한 인덱스 구조를 팀원들이 쉽게 이해할 수 있도록 시각화된 문서로 정리하여 공유한 점. 기술적 이슈로 지연될 수 있었던 큐 구현 단계를 핵심 로직 위주로 빠르게 프로토타이핑하여 일정을 단축함. 인덱스 테스트 과정에서 예상보다 리소스 점유율이 높게 나타나 하드웨어 스펙 재검토가 필요해진 점. 코드 리뷰 시간이 길어져 개인 집중 개발 시간이 부족했던 부분.',
    timestamp: '2026.12.30',
    recent: false,
  },
];

export default function SnippetPage({ baseUrl }) {
  const [periodTab, setPeriodTab] = useState('thisWeek');
  const [isManagerView, setIsManagerView] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(DEMO_MEMBERS[0].id);
  const [writeOpen, setWriteOpen] = useState(false);

  return (
    <>
      <SnippetCanvas
        baseUrl={baseUrl}
        periodTab={periodTab}
        onPeriodTabChange={setPeriodTab}
        dateFrom="2026년 4월 10일"
        dateTo="2026년 4월 15일"
        recordCount={DEMO_SNIPPETS.length}
        avgHealth="7.5"
        avgWrite="4/5"
        isManagerView={isManagerView}
        onToggleManagerView={() => setIsManagerView((v) => !v)}
        members={DEMO_MEMBERS}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        snippets={DEMO_SNIPPETS}
        onSnippetClick={() => setWriteOpen(true)}
        onWriteSnippet={() => setWriteOpen(true)}
        onWriteNow={() => setWriteOpen(true)}
      />
      {writeOpen && (
        <SnippetModal
          baseUrl={baseUrl}
          onClose={() => setWriteOpen(false)}
          onSubmit={() => setWriteOpen(false)}
        />
      )}
    </>
  );
}
