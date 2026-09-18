import CustomSelect from '../timeline/CustomSelect.jsx';

/**
 * 1on1 페이지 상단 제목 줄 — 타이틀 + 「매니저 · 팀원 N명」 메타 + 우측 슬롯.
 *
 * `OneOnOneCanvasV2` 안에 있던 헤더를 그대로 떼어낸 것이다. 모양은 바뀌지 않는다 —
 * 옮기는 것이 목적이다.
 *
 * 발단(PW-477): 같은 제목 줄이 두 군데서 그려지고 있었다. 1on1 목록 화면은 이
 * 캔버스를, 진행 화면(pivit-work `/one-on-one`)은 자기 파일에 손으로 다시 그린
 * 사본을 썼고, 모양이 맞아 보인 것은 클래스 이름(`ono-page-header`·`ono-title`·
 * `ono-meta`)만 빌려 썼기 때문이었다. 한쪽이 움직이는 순간 어긋난다.
 *
 * 우측 슬롯(`children`)에 목록 화면은 「1on1 일정 추가」 버튼을, 진행 화면은 경과
 * 시간 타이머를 끼운다. `.ono-page-header` 가 `justify-content: space-between`
 * 이라 슬롯이 비면 제목 줄만 남는다.
 *
 * 라벨은 소비처가 번역해 넘길 수 있다(`managerLabel`·`teamCountLabel`). 안 넘기면
 * 캔버스가 쓰던 한국어 그대로라 기존 화면은 변화가 없다.
 */
/*
 * 팀 필터 (PW-720 · 기획 policy §20.3 · arch-design-tokens §9-O-2).
 *
 * 놓을 자리는 기획이 정했다 — 「팀원 N명」 오른쪽, 같은 줄. 그 줄이 이미 «범위»를 말하는
 * 줄이고, 오른쪽 위는 [1on1 일정 추가] 가, 제목 줄은 제목 글자가 차지한다.
 * 부품은 새로 만들지 않고 공용 드롭다운(`CustomSelect`)을 쓴다 — 그 기본 모양은
 * `styles/timeline.css` 에 있으니 이 헤더에 필터를 넘기는 화면은 그 스타일도 불러야 한다.
 *
 * `scopeFilter` = { value, options: [{value,label}], onChange, ariaLabel }
 * `scopeNotice` = 넓혀 본 상태를 알리는 글자(예: 「담당 밖까지 보는 중」). 넘기면 필터 옆에
 *   경고색으로 붙는다 — 넓힌 상태가 평소 화면과 구별돼야 한다(policy P-Q3).
 * 둘 다 안 넘기면 종전과 같은 화면이다.
 */
export default function OneOnOnePageHeader({
  title = '1on1',
  managerName,
  teamCount,
  managerLabel = '매니저',
  teamCountLabel,
  scopeFilter,
  scopeNotice,
  children,
}) {
  return (
    <header className="ono-page-header">
      <div className="ono-title-block">
        <h1 className="ono-title">{title}</h1>
        {managerName && (
          <div className="ono-meta">
            <span className="ono-meta-name">{managerName} {managerLabel}</span>
            <span className="ono-meta-divider">∙</span>
            <span className="ono-meta-count">
              {teamCountLabel ?? `팀원 ${teamCount}명`}
            </span>
            {scopeFilter && (
              <span className={`ono-meta-scope ${scopeNotice ? 'is-widened' : ''}`}>
                <CustomSelect
                  value={scopeFilter.value}
                  onChange={scopeFilter.onChange}
                  options={scopeFilter.options}
                  ariaLabel={scopeFilter.ariaLabel}
                  size="sm"
                />
              </span>
            )}
            {scopeNotice && (
              <span className="ono-meta-scope-notice" role="status">
                {scopeNotice}
              </span>
            )}
          </div>
        )}
      </div>
      {children}
    </header>
  );
}
