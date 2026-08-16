import { AiSparkleIcon } from '../resource/resourceIcons.jsx';

/**
 * OkrResourcePieces — 내 리소스(리소스 투입) 탭의 작은 공용 조각들.
 * Figma 17478:21448(내 입력) / 23383(팀 현황) / 23640(조직 현황) / 24115(팀 모달).
 *
 * SquadPieces 와 같은 관례: 페이지 안에서만 재사용되는 소형 표현 조각 모음.
 * 데이터는 전부 props — 색상은 식별 데이터라 토큰 var() 문자열로 받는다
 * (예: 'var(--utility-success-200)'). 그 외 색은 CSS 토큰으로 처리.
 */

/* 상태 배지 — 여유(blue)/적정(indigo)/쏠림(warning)/과부하(error). */
const STATUS_TONES = {
  여유: 'blue',
  적정: 'indigo',
  쏠림: 'warn',
  과부하: 'bad',
};

export function RsStatusBadge({ status }) {
  const tone = STATUS_TONES[status] ?? 'indigo';
  return <span className={`rsx-badge is-${tone}`}>{status}</span>;
}

/* 스탯 카드 — 라벨(12 Semibold) + 값(30 Display Medium). Figma 17478:24237.
   tone: 'brand'(그린 값) | 'bad'(에러 값) | 기본. empty=값 0 카드(밝은 배경+테두리).
   sub: 값 우측 하단 보조 텍스트(예: '투입인력 : 12/12명'), bar: 값 우측 미니 진행바. */
export function RsStatCard({ label, value, tone = '', sub, bar, empty = false }) {
  return (
    <div className={`rsx-stat${empty ? ' is-empty' : ''}`}>
      <p className="rsx-stat-label">{label}</p>
      <div className="rsx-stat-row">
        <p className={`rsx-stat-value${tone ? ` is-${tone}` : ''}`}>{value}</p>
        {sub && <p className="rsx-stat-sub">{sub}</p>}
        {bar != null && (
          <span className="rsx-stat-bar"><i style={{ width: `${bar}%` }} /></span>
        )}
      </div>
    </div>
  );
}

/* 스택 투입 바 — 회색 트랙(h12 radius4) 위 색 세그먼트(gap 10). Figma 17478:24216.
   seg.label 이 있으면 hover 시 세그먼트 위에 툴팁으로 노출한다(Figma 17486:22303,
   표시/숨김은 CSS :hover). 툴팁 색은 seg.tipColor(막대 색 계열의 -500 톤) —
   없으면 브랜드 그린 폴백. */
export function RsStackBar({ segments }) {
  return (
    <div className="rsx-stackbar">
      {segments.map((seg, i) => (
        <span className="rsx-stackbar-seg" key={i} style={{ width: `${seg.pct}%`, background: seg.color }}>
          {seg.label && (
            <span className="rsx-bar-tip" role="tooltip" style={seg.tipColor ? { '--tip-color': seg.tipColor } : undefined}>
              <b>{seg.label}</b>
              <i />
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

/* 프로젝트 불릿 리스트 — 색상별 14 Semibold 불릿. Figma 17478:23485. */
export function RsBullets({ items }) {
  return (
    <ul className="rsx-bullets">
      {items.map((item) => (
        <li key={item.text} style={{ color: item.color }}>{item.text}</li>
      ))}
    </ul>
  );
}

/* AI 라벨 — ✦ 아이콘 + 그라데이션 텍스트(보라 계열로 단순화). */
export function RsAiLabel({ children }) {
  return (
    <span className="rsx-ai-label">
      <AiSparkleIcon size={14} />
      <span>{children}</span>
    </span>
  );
}

/* 매니저 코멘트 스레드 — 원 코멘트 + 들여쓴 답글. Figma 17478:22259. */
export function RsCommentThread({ comments }) {
  return (
    <div className="rsx-comments">
      {comments.map((c, i) => (
        <div className={`rsx-comment${c.reply ? ' is-reply' : ''}`} key={`${c.author}-${i}`}>
          <img src={c.avatar} alt={c.author} draggable={false} />
          <div className="rsx-comment-body">
            <div className="rsx-comment-head">
              <span className="rsx-comment-author">{c.author}</span>
              <span className="rsx-comment-date">{c.date}</span>
            </div>
            <p className="rsx-comment-text">{c.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
