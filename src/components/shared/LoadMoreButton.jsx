/**
 * 목록 맨 아래 [더 보기] — 누르면 그 전 것을 아래에 이어 붙인다 (pivit-work PW-1941).
 *
 * 생김새는 디자이너가 그린 조직도 구성원 표의 [더 보기](`orgchart/MemberTable.jsx` 의
 * `.pj-btn-more`, `src/org_project.css`) 값 그대로다 — `src/load-more.css`.
 *
 * 더 남았는지·문구는 호스트가 정한다. 남은 것이 없으면 호스트가 이 부품을 그리지 않는다.
 * 불러오는 동안은 누를 수 없고 `loadingLabel` 이 보인다. 실패했을 때도 같은 버튼이
 * 「다시 시도」 문구(`label`)로 남는다 — 호스트가 문구만 바꿔 넘긴다.
 *
 * @param {string} label           평소 문구(「더 보기」) 또는 실패 뒤 문구
 * @param {string} [loadingLabel]  불러오는 동안의 문구
 * @param {boolean} [loading]
 * @param {() => void} [onClick]
 * @param {string} [className]     자리 잡기용 클래스를 덧붙인다
 */
export default function LoadMoreButton({ label, loadingLabel, loading = false, onClick, className = '' }) {
  return (
    <div className={['dp-load-more', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="dp-load-more__btn"
        disabled={loading}
        aria-busy={loading || undefined}
        onClick={() => onClick?.()}
      >
        {loading && loadingLabel ? loadingLabel : label}
      </button>
    </div>
  );
}
