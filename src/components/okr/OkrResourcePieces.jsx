import { AiSparkleIcon } from '../resource/resourceIcons.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import rowKey from './rowKey.js';
import { OKR_RESOURCE_DEFAULT_LABELS, statusLabel } from './okrResourceLabels.js';
import { RS_BAR_CAP, RS_OVER_HATCH, rsBarPct, rsBarSegs, rsFillWidth, rsSegLeft, rsSegWidth } from './okrResourceBar.js';

/**
 * OkrResourcePieces — 내 리소스(리소스 투입) 탭의 작은 공용 조각들.
 * Figma 17478:21448(내 입력) / 23383(팀 현황) / 23640(조직 현황) / 24115(팀 모달).
 *
 * SquadPieces 와 같은 관례: 페이지 안에서만 재사용되는 소형 표현 조각 모음.
 * 데이터는 전부 props — 색상은 식별 데이터라 토큰 var() 문자열로 받는다
 * (예: 'var(--utility-success-200)'). 그 외 색은 CSS 토큰으로 처리.
 */

/* 상태 배지 — 여유(blue)/적정(indigo)/쏠림(warning)/과부하(error).
   색은 데이터의 한국어 상태값으로 고르고, 보이는 글자만 labels.status 로 바꾼다. */
const STATUS_TONES = {
  여유: 'blue',
  적정: 'indigo',
  쏠림: 'warn',
  과부하: 'bad',
};

export function RsStatusBadge({ status, labels = OKR_RESOURCE_DEFAULT_LABELS }) {
  const tone = STATUS_TONES[status] ?? 'indigo';
  return <StatusBadge className={`rsx-badge is-${tone}`}>{statusLabel(status, labels)}</StatusBadge>;
}

/* 스탯 카드 — 라벨(12 Semibold) + 값(30 Display Medium). Figma 17478:24237.
   tone: 'brand'(그린 값) | 'bad'(에러 값) | 기본. empty=값 0 카드(밝은 배경+테두리).
   sub: 값 우측 하단 보조 텍스트(예: '투입인력 : 12/12명'), bar: 값 우측 미니 진행바.
   barScaled: 진행바를 투입 막대와 같은 125 눈금으로 — 100 = 바 80% 자리, 100 을 넘은 몫만 빨간 빗금.
   트랙 바탕은 카드 그대로이고 100 눈금은 긋지 않는다(큰 % 숫자가 값을 말한다 · pivit-work PW-3068 §5-9). */
export function RsStatCard({ label, value, tone = '', sub, bar, barScaled = false, empty = false }) {
  return (
    <div className={`rsx-stat${empty ? ' is-empty' : ''}`}>
      <p className="rsx-stat-label">{label}</p>
      <div className="rsx-stat-row">
        <p className={`rsx-stat-value${tone ? ` is-${tone}` : ''}`}>{value}</p>
        {sub && <p className="rsx-stat-sub">{sub}</p>}
        {bar != null && !barScaled && (
          <span className="rsx-stat-bar"><i style={{ width: `${bar}%` }} /></span>
        )}
        {bar != null && barScaled && (
          <span className={`rsx-stat-bar is-scaled${bar > RS_BAR_CAP ? ' is-over' : ''}`} data-testid="rsx-stat-bar">
            <i style={{ width: `${rsBarPct(Math.min(bar, RS_BAR_CAP))}%` }} />
            {bar > RS_BAR_CAP && (
              <b
                className="rsx-stat-bar-over"
                style={{ left: `${rsBarPct(RS_BAR_CAP)}%`, width: `${rsBarPct(bar) - rsBarPct(RS_BAR_CAP)}%`, background: RS_OVER_HATCH }}
              />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/* 스택 투입 바 — 회색 트랙(h12 radius4) 위 색 세그먼트(gap 10). Figma 17478:24216.
   seg.label 이 있으면 마우스를 올린 세그먼트 위에 공용 말풍선(Tooltip)으로 띄운다
   (Figma 17486:22303 · PW-1123). 말풍선 색은 seg.tipColor(막대 색 계열의 -500 톤) —
   없으면 브랜드 그린.
   total 을 주면 125 고정 눈금(pivit-work PW-3068 · §5-9): 100 = 트랙 80% 자리 · 100 ~ 125 여유 칸은 흰 바탕 ·
   누적 100 을 넘은 몫은 항목 색 대신 빨간 빗금 · total 이 100 을 넘으면 100 자리에 빨간 눈금 · 125 에서 멈춘다.
   seg.pct 는 그 항목의 값(%p) 그대로 받는다. total 이 없으면 종전대로 seg.pct 를 트랙 폭 % 로 그린다. */
export function RsStackBar({ segments, total }) {
  if (total == null) {
    return (
      <div className="rsx-stackbar">
        {segments.map((seg, i) => (
          <Tooltip
            key={i}
            content={seg.label}
            color={seg.tipColor || undefined}
            tone={seg.tipColor ? undefined : 'brand'}
          >
            <span className="rsx-stackbar-seg" style={{ width: `${seg.pct}%`, background: seg.color }} />
          </Tooltip>
        ))}
      </div>
    );
  }
  const segs = rsBarSegs(segments, total);
  return (
    <div className="rsx-stackbar is-scaled" data-testid="rsx-stackbar">
      {segs.map((seg, i) => (
        <Tooltip
          key={i}
          content={seg.label}
          color={seg.tipColor || undefined}
          tone={seg.tipColor ? undefined : 'brand'}
        >
          <span className="rsx-stackbar-seg is-split" style={{ left: rsSegLeft(seg.s), width: rsSegWidth(seg.w, i < segs.length - 1) }}>
            {seg.fill > 0 && (
              <i className="rsx-stackbar-fill" style={{ width: rsFillWidth(seg.fill, seg.w, i < segs.length - 1), background: seg.color }} />
            )}
            {seg.over > 0 && <i className="rsx-stackbar-over" style={{ background: RS_OVER_HATCH }} />}
          </span>
        </Tooltip>
      ))}
      {total > RS_BAR_CAP && <span className="rsx-stackbar-mark" style={{ left: `${rsBarPct(RS_BAR_CAP)}%` }} aria-hidden="true" />}
    </div>
  );
}

/*
 * 프로젝트 불릿 리스트 — 색상별 14 Semibold 불릿. Figma 17478:23485.
 * `onOpenProject(projectId)` 를 주면 `projectId` 가 있는 줄(원장이 있는 프로젝트)만 눌린다 — 프로젝트 상세로 간다
 * (PW-1865 · 기획서 screen-project-detail.policy.md §3 진입점 4행). 눌리는 모양은 내 입력의 프로젝트 이름(`rsx-entry-name.is-link`)과 같다.
 * `canOpen === false` 인 줄(원장을 열 수 없는 프로젝트)은 글자로만 두고 말풍선에 `cannotOpenTitle` 한 줄 — 판정은 서버 값만 본다
 * (PW-2321 · 원장 정책서 v1.8 §3 「팀 현황」 · 조직도 스쿼드 카드 PW-2278 과 같은 방식).
 */
export function RsBullets({ items, onOpenProject, openTitle, cannotOpenTitle }) {
  return (
    <ul className="rsx-bullets">
      {items.map((item, i) => (
        <li key={rowKey(item, i, 'text')} style={{ color: item.color }}>
          {item.projectId && item.canOpen === false ? (
            <span data-testid={`rsx-bullet-closed-${item.projectId}`} data-can-open="false" title={cannotOpenTitle}>{item.text}</span>
          ) : onOpenProject && item.projectId ? (
            <button
              type="button"
              className="rsx-bullet-link"
              data-testid={`rsx-bullet-open-${item.projectId}`}
              title={openTitle}
              onClick={() => onOpenProject(item.projectId)}
            >{item.text}</button>
          ) : item.text}
        </li>
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
        <div className={`rsx-comment${c.reply ? ' is-reply' : ''}`} key={rowKey(c, i, 'author')}>
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
