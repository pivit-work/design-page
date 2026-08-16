import { createPortal } from 'react-dom';

/**
 * OkrContextBanner — 화면 최상단 OKR 컨텍스트 설정 안내 바.
 * Figma 17260:22116 (okr설정 프레임): utility-blue-400 풀폭 바, 중앙 800 컬럼,
 * 좌측 타이틀/설명 + 우측 [설정] 보라 버튼. 모달 오버레이 위에도 떠 있다(시안 레이어 순서).
 *
 * 배너 본체는 body 로 포탈한다 — .app 은 transform 컨테이너(fixed 의 기준)라서,
 * 안에 두면 배너 공존 시 .app 을 아래로 내리는 시프트에 배너까지 같이 밀린다.
 * 대신 in-flow 마커(.okr-ctx-banner-flag)를 남겨 `.app:has()` 가 배너 존재를 감지해
 * 셸 전체(사이드바·톱냅·페이지)를 배너 높이(62px)만큼 내린다 — 로고/상단 메뉴를
 * 가리지 않는다.
 *
 * onSetup: [설정] 클릭 핸들러(컨텍스트 설정 화면 진입). 미주입 시 표시만 된다(데모).
 * onDismiss: [오늘 보지 않기] 클릭 핸들러 — 배너 숨김은 호스트가 소유한다
 *   (안 보이게 할지/언제까지 숨길지는 호스트 정책). 미주입 시 표시만 된다.
 * 시안 원문의 '전력'·'등록하면서' 는 오탈자로 판단해 '전략'·'등록하면' 으로 표기.
 */
export default function OkrContextBanner({
  title = 'OKR 컨텍스트 설정',
  desc = '회사 문서, 링크, 전략, 메모를 등록하면 AI 제안 정확도가 높아집니다. (선택 사항)',
  onSetup,
  onDismiss,
}) {
  return (
    <>
      <span className="okr-ctx-banner-flag" hidden />
      {createPortal(
        <div className="okr-ctx-banner">
          <div className="okr-ctx-banner-inner">
            <div className="okr-ctx-banner-texts">
              <p className="okr-ctx-banner-title">{title}</p>
              <p className="okr-ctx-banner-desc">{desc}</p>
            </div>
            <div className="okr-ctx-banner-actions">
              <button type="button" className="okr-ctx-banner-btn" onClick={onSetup}>설정</button>
              <button type="button" className="okr-ctx-banner-btn is-ghost" onClick={onDismiss}>오늘 보지 않기</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
