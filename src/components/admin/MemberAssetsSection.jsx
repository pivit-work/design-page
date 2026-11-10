import SectionLabel from './SectionLabel.jsx';
import Button from '../shared/Button.jsx';
import Stack from '../shared/Stack.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import { IconChevronRight } from './employeesIcons.jsx';

const fill = (tpl, map) =>
  Object.entries(map).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v ?? ''), String(tpl ?? ''));

/**
 * 구성원 편집 패널 › 근무지 묶음 — 책상 배치에 앉은 사람의 자리 (pivit-work PW-2600 · admin-spec §3.2.5 ·
 * spec-company-assets §13-A-5). 빌딩 · 층 · 책상 · 자리 유형 네 칸 자리에 읽기 전용 상자 하나를 둔다 — 값 넷 +
 * «책상 배치에서 정한 자리입니다 — 동료에게 보이는 자리 · {한 줄}» + [배치도에서 보기]. 자리를 바꾸는 길은 배치도 하나다.
 *
 * 모양은 같은 패널의 읽기 전용 칸(«매니저» `.admin-emp-manager-readonly` 회색 바탕 줄)과 «조직장인 조직» 줄
 * (`.admin-emp-leader-of-row` · 이름표 `.admin-emp-manager-note`) · [조직도 스쿼드 뷰 →] 버튼을 그대로 쓴다.
 */
export function SeatLockedBox({ member, seat, labels, typeOptions = [], onOpenSeat }) {
  const L = labels || {};
  const typeLabel = typeOptions.find((o) => o.value === member.seatType)?.label || '—';
  const rows = [
    ['workBuilding', member.workBuilding],
    ['workFloor', member.workFloor],
    ['workDesk', member.workDesk || seat.deskName],
    ['seatType', typeLabel],
  ];
  return (
    <div className="admin-emp-manager-readonly is-wrap" data-testid="employees-panel-seat-locked">
      <Stack gap="xs">
        {rows.map(([key, value]) => (
          <div key={key} className="admin-emp-leader-of-row" data-testid={`employees-panel-seat-locked-${key}`}>
            <span className="admin-emp-manager-note">{L[key]}:</span>
            <span className="admin-emp-manager-name">{value || '—'}</span>
          </div>
        ))}
        <span className="admin-emp-manager-note" data-testid="employees-panel-seat-locked-note">
          {fill(L.seatLocked, { line: seat.seatLine || '—' })}
        </span>
        {onOpenSeat && (
          <div>
            <Button variant="secondary" size="sm" onClick={() => onOpenSeat(seat)} data-testid="employees-panel-seat-go-layout">
              {L.seatGoLayout}
              <IconChevronRight size={14} />
            </Button>
          </div>
        )}
      </Stack>
    </div>
  );
}

/**
 * 구성원 편집 패널 «지급된 자산» 묶음 (pivit-work PW-2600 · admin-spec §3.2.13 · spec-company-assets §10).
 *
 * 줄 = 이름/모델 + «자산 번호 · 종류 · 지급 {날짜}». 줄을 누르면 회사 자산 화면에서 그 자산의 서랍이 열린다.
 * [자산 지급]은 패널 [저장]과 따로 바로 저장된다(창은 소비자 몫). 퇴사자에게는 버튼이 없고 «퇴사자 보유» 안내 한 줄.
 * 책상에 둔 자산은 이 목록에 넣지 않는다 — 소비자가 지급한 것만 넘긴다.
 *
 * 모양 — 줄은 같은 패널 «소속» 칸(`.admin-emp-org-current` · 누르면 다른 창이 열리는 회색 칸)에 «대표 지정» 줄의
 * 두 줄 글(`.admin-emp-ceo-text` · 이름 `.admin-emp-manager-name` · 보조 `.admin-emp-manager-note`)을 얹었다.
 * 불러오는 중 · 실패 + [다시 시도]는 같은 패널 «따로 보관한 기록»(`ArchivedRecordsSection`)과 같다.
 *
 * @param {{ status: 'idle'|'loading'|'ready'|'error', view: { assets?: Array<{ id: string, assetNo: string,
 *   kindName: string|null, name: string, issuedOn: string|null }> } | null }} props.state
 */
export default function MemberAssetsSection({ state, labels, resigned = false, onRetry, onOpenAsset, onIssue }) {
  const L = labels || {};
  const assets = state?.view?.assets || [];
  const issueButton = onIssue && !resigned && (
    <div>
      <Button variant="secondary" size="sm" onClick={onIssue} data-testid="employees-panel-assets-issue">
        {L.issue}
      </Button>
    </div>
  );
  let body;
  if (state?.status === 'error') {
    body = (
      <Stack gap="sm" testId="employees-panel-assets-error">
        <span className="admin-emp-status-date-note is-error" role="alert">{L.loadError}</span>
        {onRetry && (
          <div>
            <Button variant="ghost" size="sm" onClick={onRetry} data-testid="employees-panel-assets-retry">{L.retry}</Button>
          </div>
        )}
      </Stack>
    );
  } else if (state?.status === 'loading' && !state?.view) {
    body = <div className="admin-emp-status-date-note" data-testid="employees-panel-assets-loading">{L.loading}</div>;
  } else if (assets.length === 0) {
    body = (
      <Stack gap="sm">
        <span className="admin-emp-manager-note" data-testid="employees-panel-assets-empty">{L.empty}</span>
        {issueButton}
      </Stack>
    );
  } else {
    body = (
      <Stack gap="sm" testId="employees-panel-assets">
        {assets.map((a) => {
          const meta = [a.assetNo, a.kindName, a.issuedOn ? fill(L.issuedOn, { date: a.issuedOn }) : null].filter(Boolean).join(' · ');
          const open = onOpenAsset ? () => onOpenAsset(a.id) : undefined;
          return (
            <div
              key={a.id}
              className="admin-emp-org-current"
              role={open ? 'button' : undefined}
              tabIndex={open ? 0 : undefined}
              onClick={open}
              onKeyDown={open ? (e) => { if (isEnterKey(e) || e.key === ' ') { e.preventDefault(); open(); } } : undefined}
              data-testid={`employees-panel-asset-${a.id}`}
            >
              <span className="admin-emp-ceo-text">
                <span className="admin-emp-manager-name">{a.name}</span>
                <span className="admin-emp-manager-note">{meta}</span>
              </span>
              {open && (
                <span className="admin-emp-org-current-arrow" aria-hidden="true"><IconChevronRight size={14} /></span>
              )}
            </div>
          );
        })}
        {resigned && <span className="admin-emp-manager-note" data-testid="employees-panel-assets-resigned">{L.resignedNote}</span>}
        {issueButton}
      </Stack>
    );
  }
  return (
    <div data-testid="employees-panel-assets-section">
      <SectionLabel>{L.section}</SectionLabel>
      {body}
    </div>
  );
}
