import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import OkrResourceMyInput from './OkrResourceMyInput.jsx';
import OkrResourceTeam from './OkrResourceTeam.jsx';
import OkrResourceOrg from './OkrResourceOrg.jsx';
import OkrResourceTeamModal from './OkrResourceTeamModal.jsx';
import { mergeOkrResourceLabels } from './okrResourceLabels.js';

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
 *
 * `initialView` 는 처음 열 서브탭이다(주소의 `?tab=` 을 호스트가 넘긴다). `views` 에 없으면 첫 탭을
 * 연다 — 권한이 없는 탭으로 들어온 사람은 자기 입력으로 떨어진다. 팀·조직 데이터가 늦게 와서
 * `views` 가 나중에 늘면 그때 그 탭으로 넘어간다.
 *
 * `view` 를 주면 그 탭을 연다 — 사람이 앞서 고른 탭보다 앞선다. 호스트가 주소(`?tab=`)를 정본으로 둘 때
 * 쓴다: 다른 탭을 보던 중 바깥(왼쪽 메뉴 등)에서 주소만 바뀌어도 그 탭으로 옮긴다. 사람이 탭을 고르면
 * `onViewChange(view)` 로 알린다 — 호스트가 주소와 왼쪽 메뉴 선택 표시를 따라 옮기게(PW-2468).
 *
 * `placeholder` 를 주면 헤더·본문 대신 같은 자리(`.rsx-area`)에 그것만 그린다 — 불러오는 중·
 * 불러오기 실패처럼 `data` 가 아직 없을 때. `viewPlaceholders` 는 같은 일을 서브탭 하나에만 한다 —
 * 조직 현황만 못 불러왔을 때 탭은 두고 그 탭 본문 자리에 실패 안내를 그린다(PW-2214). `actionError` 는 저장 실패 문구로(코멘트 실패는 앱이 따로 알린다 · PW-2214),
 * 헤더 위에 인라인으로 띄운다(전역 오류 화면으로 보내면 방금 맞춘 슬라이더 값이 날아간다).
 *
 * `labels` 로 화면 문구를 바꿀 수 있다(영어 화면 · PW-1171). 생략한 문구는 한국어 기본값 —
 * 목록은 `okrResourceLabels.js`.
 *
 * `readOnly` 는 끝난 달(PW-1173) — 내 입력의 슬라이더·✕·항목 추가·저장을 내리고, 머리의
 * 「입력 가능」 자리를 「조회 전용」으로 바꾼다. 코멘트·답글은 그대로 둔다(가동률을 바꾸지 않는다).
 * 조직 현황 탭은 달과 무관하게 늘 「조회 전용」이다(기획서 §3-0).
 *
 * `maxTotal` 은 내 입력의 한 달 합계 상한 — 넘는 동안 [저장] 이 눌리지 않는다(PW-1587).
 *
 * `data.month` 는 글자 대신 요소를 받아도 된다 — 호스트가 달 옆에 이동 버튼을 붙일 자리다.
 * 그때는 문장에 넣을 달 글자를 `data.monthLabel` 로 따로 준다(끝난 달 안내 문장).
 * `data.periodKey` 가 바뀌면 세 뷰를 새로 그린다 — 뷰가 슬라이더 값 등을 자기 상태로 들고 있어,
 * 달을 옮겨도 앞 달 값이 남는다.
 */
const VIEWS = ['my', 'team', 'org'];

export default function OkrResourceCanvas({
  /**
   * «?» 튜토리얼 도움말 버튼 (pivit-work PW-2567) — `(view) => node`. 고른 서브탭마다 영상이 달라 함수로 받는다.
   * «팀 현황»(team)은 탭 본문 첫 제목(조직 이름) 오른쪽, 본문에 제목이 없는 탭은 위 제목 «리소스 투입» 오른쪽에 그린다.
   * 안 주면 지금과 같다.
   */
  titleHelp: renderTitleHelp,
  data,
  icons,
  baseUrl = '',
  views,
  initialView,
  view: requestedView,
  onViewChange,
  onSave,
  onComment,
  onApplyEstimates,
  onReply,
  /** 내 입력의 투입 행 프로젝트 이름 · 팀 현황 팀원 칩(PW-1865, 늘 `unsaved: false`)을 눌렀을 때 — `(projectId, { unsaved })`. `OkrResourceMyInput` 참고. */
  onOpenProject,
  placeholder,
  /** `{ team?, org? }` — 그 서브탭 본문 대신 그릴 것(불러오기 실패 안내 등). 탭은 그대로 남는다. */
  viewPlaceholders,
  actionError,
  labels: providedLabels,
  readOnly = false,
  maxTotal,
}) {
  const L = mergeOkrResourceLabels(providedLabels);
  const items = (views?.length ? VIEWS.filter((v) => views.includes(v)) : VIEWS)
    .map((value) => ({ value, label: L.views[value] }));
  // 사람이 고른 탭이 없으면 initialView — 불러오는 중(placeholder)에 먼저 떠 있던 캔버스도 따라가게
  // 상태 초기값으로 굳히지 않는다.
  const [picked, setPicked] = useState(null);
  const wanted = requestedView ?? picked ?? initialView;
  const setView = (next) => {
    setPicked(next);
    onViewChange?.(next);
  };
  const view = items.some((item) => item.value === wanted) ? wanted : (items[0]?.value ?? 'my');
  const viewHelp = renderTitleHelp ? renderTitleHelp(view) : null;
  const titleHelp = view === 'team' ? null : viewHelp;
  const [openTeam, setOpenTeam] = useState(null);

  if (placeholder != null) {
    return <div className="rsx-area">{placeholder}</div>;
  }

  return (
    <div className="rsx-area">
      {actionError && (
        <p className="okr-resource-action-error" role="alert">
          {actionError}
        </p>
      )}
      <div className="rsx-head">
        <p className={`rsx-title${titleHelp ? ' tvh-title-row' : ''}`}>{data.title}{titleHelp}</p>
        <div className="rsx-meta">
          <span className="rsx-meta-org">{data.org}</span>
          <span className="rsx-meta-dot">∙</span>
          <span className="rsx-meta-month">{data.month}</span>
          <span className="rsx-meta-dot">∙</span>
          <span className="rsx-meta-owner">{data.owner}</span>
          <StatusBadge className="rsx-meta-badge">{data.role}</StatusBadge>
        </div>
      </div>
      <div className="rsx-views">
        {/* 볼 수 있는 탭이 하나(구성원의 「내 입력」)면 고르는 줄을 그리지 않는다 — okr-policy §2E E2 (PW-1498).
            안내 글(입력 가능/조회 전용)은 남긴다. */}
        {items.length > 1 && (
          <SegmentedControl items={items} value={view} onChange={setView} ariaLabel={L.viewsAria} />
        )}
        <span className="rsx-views-hint">{readOnly || view === 'org' ? L.readOnlyHint : L.inputHint}</span>
      </div>

      {view === 'my' && (
        <OkrResourceMyInput
          key={data.periodKey}
          data={data.my}
          monthLabel={data.monthLabel ?? data.month}
          readOnly={readOnly}
          icons={icons}
          baseUrl={baseUrl}
          onSave={onSave}
          onApplyEstimates={onApplyEstimates}
          onReply={onReply}
          onOpenProject={onOpenProject}
          maxTotal={maxTotal}
          labels={L}
        />
      )}
      {view !== 'my' && viewPlaceholders?.[view] != null ? viewPlaceholders[view] : (
        <>
          {view === 'team' && (
            <OkrResourceTeam key={data.periodKey} scopeHelp={view === 'team' ? viewHelp : null} data={data.team} icons={icons} baseUrl={baseUrl} onComment={onComment} onOpenProject={onOpenProject ? (id) => onOpenProject(id, { unsaved: false }) : undefined} labels={L} />
          )}
          {view === 'org' && (
            <OkrResourceOrg key={data.periodKey} data={data.orgView} icons={icons} baseUrl={baseUrl} onOpenTeam={setOpenTeam} labels={L} />
          )}
        </>
      )}

      <OkrResourceTeamModal team={openTeam} icons={icons} baseUrl={baseUrl} onClose={() => setOpenTeam(null)} labels={L} />
    </div>
  );
}
