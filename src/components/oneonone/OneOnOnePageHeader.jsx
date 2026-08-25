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
export default function OneOnOnePageHeader({
  title = '1on1',
  managerName,
  teamCount,
  managerLabel = '매니저',
  teamCountLabel,
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
          </div>
        )}
      </div>
      {children}
    </header>
  );
}
