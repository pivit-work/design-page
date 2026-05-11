import { useState } from 'react';
import { SnippetCanvas } from './components';
import SnippetModal from './components/timeline/SnippetModal.jsx';

/**
 * SnippetPage — "스니핏" (스니핏 히스토리) demo wrapper.
 * Figma: 멤버 뷰 16960:13435 / 매니저 뷰 16960:20541 / 리스트 16960:20172.
 *
 * 매니저 뷰 토글은 개발 확인용. ON 이면 멤버 아바타 행이 추가로 노출.
 * 리스트 행 클릭 시 SnippetModal 이 해당 스니핏 내용(detail)으로 prefill 되어 열림.
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

// detail = SnippetModal 의 initial prop shape: { summary, tags, sections, health }.
const DEMO_SNIPPETS = [
  {
    id: 's-1',
    dateLabel: '12월31일',
    timestamp: '2026.12.31',
    recent: true,
    date: new Date(2026, 11, 31),
    summary:
      'pgvector 기반 시각적 유사도 검색 인덱스 전략 초안 작성 및 벤치마크 테스트 수행. BullMQ 기반 비동기 작업 큐 기초 구현 완료 및 워커 프로세스 구조 설계. 백엔드 개발팀 스프린트 코드 리뷰 진행 및 성능 병목 지점 개선 가이드 제공.',
    detail: {
      summary:
        'pgvector 기반 시각적 유사도 검색 인덱스 전략 초안 작성 및 벤치마크 테스트 수행. BullMQ 기반 비동기 작업 큐 기초 구현 완료 및 워커 프로세스 구조 설계. 백엔드 개발팀 스프린트 코드 리뷰 진행 및 성능 병목 지점 개선 가이드 제공.',
      tags: ['개발', '인덱스', '큐', '코드리뷰'],
      sections: {
        what: 'pgvector 인덱스 전략 초안 작성 및 후보 3종 벤치마크. BullMQ 비동기 작업 큐 기초 구현 + 워커 프로세스 구조 설계. 백엔드 스프린트 코드 리뷰 진행.',
        why: '시각적 유사도 검색 성능을 확보하고, 대용량 비동기 작업을 안정적으로 처리하기 위해. 코드 리뷰로 다음 스프린트 품질 리스크를 줄이기 위해.',
        value: '인덱스 후보 벤치마크 결과를 표로 정리해 의사결정 근거 마련. 큐 구조 프로토타입으로 다음 스프린트 일정 단축 가능성 확인.',
        highlights: '복잡한 인덱스 구조를 시각화 문서로 정리해 팀에 공유한 점. 큐 구현을 핵심 로직 위주로 빠르게 프로토타이핑한 점.',
        lowlights: '인덱스 테스트 리소스 점유율이 예상보다 높아 하드웨어 스펙 재검토가 필요해진 점. 코드 리뷰 시간이 길어 개인 집중 개발 시간이 부족했던 부분.',
      },
      health: { score: 8, note: '전반적으로 안정적이었으나 리소스 이슈로 약간의 불확실성이 있었음.' },
    },
  },
  {
    id: 's-2',
    dateLabel: '12월30일',
    timestamp: '2026.12.30',
    recent: false,
    date: new Date(2026, 11, 30),
    summary:
      '복잡한 인덱스 구조를 팀원들이 쉽게 이해할 수 있도록 시각화된 문서로 정리하여 공유한 점. 기술적 이슈로 지연될 수 있었던 큐 구현 단계를 핵심 로직 위주로 빠르게 프로토타이핑하여 일정을 단축함. 인덱스 테스트 과정에서 예상보다 리소스 점유율이 높게 나타나 하드웨어 스펙 재검토가 필요해진 점. 코드 리뷰 시간이 길어져 개인 집중 개발 시간이 부족했던 부분.',
    detail: {
      summary:
        '복잡한 인덱스 구조를 시각화 문서로 정리해 팀과 공유하고, 큐 구현 단계를 핵심 로직 위주로 빠르게 프로토타이핑해 일정을 단축함. 인덱스 테스트에서 리소스 이슈를 발견해 하드웨어 스펙 재검토 필요성을 인지함.',
      tags: ['개발', '문서', '회고'],
      sections: {
        what: '인덱스 구조 시각화 문서 작성, 큐 구현 프로토타이핑, 인덱스 리소스 점유율 테스트.',
        why: '팀 전체가 같은 그림을 보고 의사결정하기 위해. 일정 리스크를 줄이고 다음 단계 진입 여부를 빠르게 판단하기 위해.',
        value: '문서 공유로 온보딩/리뷰 시간 단축. 프로토타입 결과로 다음 단계 진입을 결정.',
        highlights: '복잡한 인덱스 구조를 시각화 문서로 정리해 공유한 점. 핵심 로직 위주의 빠른 프로토타이핑으로 일정을 단축한 점.',
        lowlights: '인덱스 테스트 리소스 점유율이 높게 나타나 하드웨어 스펙 재검토가 필요해진 점. 코드 리뷰가 길어져 개인 집중 시간이 부족했던 부분.',
      },
      health: { score: 7, note: '양호했으나 리소스/시간 배분 이슈가 있었음.' },
    },
  },
];

// "지난 달"(2026년 4월) 데모용 30건. 날짜 내림차순(4월30일 → 4월1일).
const LM_FRAGMENTS = [
  'API 응답 캐싱 레이어 도입으로 평균 응답시간 40% 단축. 부하 테스트 시나리오 3종 작성.',
  '결제 모듈 리팩터링 — 트랜잭션 경계 재정의 및 멱등성 키 적용. 엣지 케이스 12건 정리.',
  '대시보드 위젯 드래그 정렬 기능 구현. 레이아웃 직렬화 포맷 v2 설계.',
  '온보딩 플로우 A/B 테스트 셋업. 전환율 추적 이벤트 5종 정의.',
  '검색 인덱스 재구성 — 동의어 사전 적용 및 한국어 형태소 분석기 튜닝.',
  '알림 발송 파이프라인 큐 분리. 재시도 정책 및 데드레터 처리 추가.',
  '권한 모델 RBAC → ABAC 마이그레이션 1단계. 정책 평가 엔진 PoC.',
  '모바일 웹 성능 개선 — 번들 분할, 이미지 lazy-load, LCP 1.2s 달성.',
  '데이터 파이프라인 스키마 변경 대응. 다운스트림 영향 분석 및 마이그레이션 스크립트 작성.',
  '신규 기능 스펙 리뷰 미팅 진행. 디자인-개발 인터페이스 정의서 v1 합의.',
  '에러 모니터링 알림 룰 재정비. 노이즈 알림 60% 감소, 대응 SLA 명문화.',
  '컴포넌트 라이브러리 v3 마이그레이션 — 토큰 기반 테마 적용 및 다크모드 대응.',
];
const LAST_MONTH_SNIPPETS = Array.from({ length: 30 }, (_, i) => {
  const day = 30 - i;
  const summary = `${LM_FRAGMENTS[i % LM_FRAGMENTS.length]} ${LM_FRAGMENTS[(i + 4) % LM_FRAGMENTS.length]}`;
  return {
    id: `lm-${day}`,
    dateLabel: `4월${day}일`,
    timestamp: `2026.04.${String(day).padStart(2, '0')}`,
    recent: i === 0,
    date: new Date(2026, 3, day),
    summary,
    detail: {
      summary,
      tags: ['개발', '회의', i % 2 ? '리뷰' : '문서'],
      sections: {
        what: LM_FRAGMENTS[i % LM_FRAGMENTS.length],
        why: '제품 안정성과 사용자 경험을 개선하기 위해.',
        value: '핵심 지표 개선 및 다음 작업 의존성 해소.',
        highlights: '계획 대비 일정 내 마무리한 점.',
        lowlights: '테스트 커버리지가 다소 부족했던 점.',
      },
      health: { score: 6 + (i % 4), note: '대체로 양호.' },
    },
  };
});

export default function SnippetPage({ baseUrl }) {
  const [periodTab, setPeriodTab] = useState('thisWeek');
  const [isManagerView, setIsManagerView] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(DEMO_MEMBERS[0].id);
  // 모달 — null = 닫힘. snippet 객체면 그 detail 로 prefill, true 면 새 작성.
  const [editing, setEditing] = useState(null);

  // 데모 정책: "이번 달" 2건, "지난 달" 30건(임의), 나머지(이번주/전체)는
  // 작성한 스니핏이 없는 빈 상태.
  const visibleSnippets =
    periodTab === 'thisMonth' ? DEMO_SNIPPETS
      : periodTab === 'lastMonth' ? LAST_MONTH_SNIPPETS
        : [];

  return (
    <>
      <SnippetCanvas
        baseUrl={baseUrl}
        periodTab={periodTab}
        onPeriodTabChange={setPeriodTab}
        initialDateFrom={new Date(2026, 3, 10)}
        initialDateTo={new Date(2026, 3, 15)}
        recordCount={visibleSnippets.length}
        avgHealth={visibleSnippets.length ? '7.5' : '0'}
        avgWrite={visibleSnippets.length ? '4/5' : '0/5'}
        isManagerView={isManagerView}
        onToggleManagerView={() => setIsManagerView((v) => !v)}
        members={DEMO_MEMBERS}
        selectedMemberId={selectedMemberId}
        onSelectMember={setSelectedMemberId}
        snippets={visibleSnippets}
        onSnippetClick={(s) => setEditing(s)}
        onWriteSnippet={() => setEditing(true)}
        onWriteNow={() => setEditing(true)}
      />
      {editing && (
        <SnippetModal
          baseUrl={baseUrl}
          date={editing !== true ? editing.date : undefined}
          initial={editing !== true ? editing.detail : undefined}
          onClose={() => setEditing(null)}
          onSubmit={() => setEditing(null)}
        />
      )}
    </>
  );
}
