import { useState } from 'react';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import OkrResourceMyInput from './OkrResourceMyInput.jsx';
import OkrResourceTeam from './OkrResourceTeam.jsx';
import OkrResourceOrg from './OkrResourceOrg.jsx';
import OkrResourceTeamModal from './OkrResourceTeamModal.jsx';

/**
 * OkrResourceCanvas — OKR '내 리소스' 탭 (리소스 투입) Pure 컴포넌트.
 * Figma 17478:21448 외 6종.
 *
 * 헤더(타이틀·부문/월/이름 메타·역할 배지) + 서브 세그먼트(내 입력/팀 현황/
 * 조직 현황 + '입력 가능' 라벨) 아래에 뷰별 컴포넌트를 그린다.
 * 조직 현황의 팀 카드 클릭 → 팀 상세 모달.
 *
 * 데이터는 전부 props(page wrapper 가 소유). 서브탭·모달은 UI 상태로 여기서 관리.
 *
 * `views` 로 노출할 서브탭을 좁힐 수 있다(기본 = 3종 전부). 리소스 투입은 볼 수 있는
 * 범위가 사람마다 다른데 — 구성원은 자기 입력만, 매니저는 팀까지, 조직장은 조직까지 —
 * 탭을 항상 3개 그리면 눌렀을 때 권한 오류만 나오는 탭이 남는다. 판정 자체는 호스트
 * (서버 권한)가 하고, 여기서는 받은 목록만 그린다.
 */
const VIEWS = [
  { value: 'my', label: '내 입력' },
  { value: 'team', label: '팀 현황' },
  { value: 'org', label: '조직 현황' },
];

export default function OkrResourceCanvas({
  data,
  icons,
  baseUrl = '',
  views,
  onSave,
  onComment,
  onApplyEstimates,
  onReply,
}) {
  const items = views?.length ? VIEWS.filter((v) => views.includes(v.value)) : VIEWS;
  const [view, setView] = useState(items[0]?.value ?? 'my');
  const [openTeam, setOpenTeam] = useState(null);

  return (
    <div className="rsx-area">
      <div className="rsx-head">
        <p className="rsx-title">{data.title}</p>
        <div className="rsx-meta">
          <span className="rsx-meta-org">{data.org}</span>
          <span className="rsx-meta-dot">∙</span>
          <span className="rsx-meta-month">{data.month}</span>
          <span className="rsx-meta-dot">∙</span>
          <span className="rsx-meta-owner">{data.owner}</span>
          <span className="rsx-meta-badge">{data.role}</span>
        </div>
      </div>
      <div className="rsx-views">
        <SegmentedControl items={items} value={view} onChange={setView} ariaLabel="리소스 투입 뷰" />
        <span className="rsx-views-hint">입력 가능</span>
      </div>

      {view === 'my' && (
        <OkrResourceMyInput
          data={data.my}
          icons={icons}
          baseUrl={baseUrl}
          onSave={onSave}
          onApplyEstimates={onApplyEstimates}
          onReply={onReply}
        />
      )}
      {view === 'team' && (
        <OkrResourceTeam data={data.team} icons={icons} baseUrl={baseUrl} onComment={onComment} />
      )}
      {view === 'org' && (
        <OkrResourceOrg data={data.orgView} icons={icons} baseUrl={baseUrl} onOpenTeam={setOpenTeam} />
      )}

      <OkrResourceTeamModal team={openTeam} icons={icons} baseUrl={baseUrl} onClose={() => setOpenTeam(null)} />
    </div>
  );
}
