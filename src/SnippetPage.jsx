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
        recordCount={0}
        avgHealth="7.5"
        avgWrite="4/5"
        isManagerView={isManagerView}
        onToggleManagerView={() => setIsManagerView((v) => !v)}
        members={DEMO_MEMBERS}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
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
