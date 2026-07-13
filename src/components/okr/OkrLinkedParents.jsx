/**
 * OkrLinkedParents — 연결된 상위 OKR 섹션.
 * 헤더(제목 + 상위 링크들) + 상위 OKR 요약 카드 2열.
 */
export default function OkrLinkedParents({ links, parents }) {
  return (
    <div className="okr-p-linked">
      <div className="okr-p-linked-head">
        <span className="okr-p-linked-title">연결된 상위 OKR</span>
        {links.map((link) => (
          <span key={link.label} className={`okr-p-linked-link is-${link.tone || 'blue'}`}>{link.label}</span>
        ))}
      </div>
      <div className="okr-p-linked-cards">
        {parents.map((parent) => (
          <div className="okr-p-linked-card" key={parent.label}>
            <p className="okr-p-linked-label">{parent.label}</p>
            <p className="okr-p-linked-name">{parent.title}</p>
            <p className="okr-p-linked-sub">{parent.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
