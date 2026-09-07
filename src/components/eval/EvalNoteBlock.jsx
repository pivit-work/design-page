/**
 * [PW-602 ③④] 평가지 안의 «글» 을 그리는 단 하나의 렌더러.
 *
 * 두 자리가 이것을 나눠 쓴다 — **설명 항목의 본문**(§5.11-F)과 **항목 가이드 문구**
 * (§5.11-D). 기획서가 둘을 같은 필드(`description`)에 담기로 정했으므로, 렌더러도
 * 하나만 둔다. 두 곳에 다른 부분집합을 두면 어드민이 같은 글을 두 화면에서 다르게 본다.
 *
 * ## 정화(sanitize)는 «렌더 시점 한 곳» — 여기다
 *
 * 저장은 원문 그대로(`TEXT`) 둔다. 저장할 때 정화하면 원문을 되돌릴 수 없고, 규칙이
 * 바뀌었을 때 이미 저장된 값을 고칠 수 없다. 그래서 위험한 것을 «지우는» 자리가 아니라
 * «안전하게 그리는» 자리를 하나 두었다.
 *
 * 🔴 **이 파일은 `dangerouslySetInnerHTML` 을 쓰지 않는다.** 문자열을 HTML 로 조립해
 * 넣는 방식은 정규식 하나가 어긋나는 순간 그대로 주입 경로가 된다. 대신 토큰으로 갈라
 * React 엘리먼트를 만든다 — React 가 텍스트를 이스케이프하므로 원시 HTML 은 **저절로**
 * 글자 그대로 그려진다. 지우지 않는 것이 규정이다(쓴 사람이 무엇을 썼는지 알아야 한다).
 *
 * ## 허용 · 불허 (policy §5.11-F)
 *
 * | | |
 * |---|---|
 * | 허용 | 굵게 · 기울임 · 목록(순서 없음/있음) · 표(GFM) · 링크 · 인라인 코드 · 문단/줄바꿈 |
 * | 불허 | 이미지 · 원시 HTML · 제목(`#`) · 인용 · 수평선 |
 *
 * - **제목을 막는 이유**: 평가지에 이미 섹션 제목이 있다. `#` 을 열면 설명 블록이 섹션처럼
 *   보여 시각 위계가 두 벌이 된다. 블록 제목이 필요하면 항목 제목(`title`)을 쓴다.
 * - **이미지를 막는 이유**: 저장·용량·외부 URL 추적이 함께 따라온다. 이번 요구(강조·표)에 없다.
 * - **링크는 `http(s)` 만**: `javascript:` 를 막는다.
 *
 * ## 줄바꿈은 그대로 보존한다
 *
 * 한 문단 안의 홑 줄바꿈을 «공백»으로 눕히지 않고 줄바꿈으로 그린다. 정통 마크다운은
 * 눕히지만, 이 자리에서 어드민이 요구한 것은 「여러 줄로 적게 해 달라」(§5.11-D)이고
 * TC-EVAL-185 가 「줄바꿈이 보존된다. 한 줄로 붙으면 버그다」로 못박았다.
 */

/** 인라인 서식 한 벌. 순서가 곧 우선순위다 — 코드가 먼저라 코드 안의 `**` 는 서식이 아니다. */
const INLINE = [
  { kind: 'code', re: /`([^`\n]+)`/ },
  { kind: 'link', re: /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/ },
  { kind: 'strong', re: /\*\*([^*\n]+)\*\*/ },
  { kind: 'em', re: /\*([^*\n]+)\*/ },
];

/**
 * 한 줄을 인라인 토큰으로 가른다. 남는 것은 전부 평문이며, 평문은 React 가 이스케이프한다.
 * — 그래서 `<script>` 는 «지워지지 않고» 글자 그대로 나온다.
 */
function inlineNodes(line, keyPrefix) {
  const out = [];
  let rest = String(line ?? '');
  let n = 0;
  while (rest) {
    let best = null;
    for (const rule of INLINE) {
      const m = rule.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { rule, m };
    }
    if (!best) {
      out.push(rest);
      break;
    }
    const { rule, m } = best;
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const key = `${keyPrefix}-i${n}`;
    n += 1;
    if (rule.kind === 'code') out.push(<code key={key}>{m[1]}</code>);
    else if (rule.kind === 'strong') out.push(<strong key={key}>{m[1]}</strong>);
    else if (rule.kind === 'em') out.push(<em key={key}>{m[1]}</em>);
    else
      out.push(
        // rel 을 빼면 새 탭이 opener 를 잡는다. 어드민이 쓴 글이 전 구성원에게 렌더된다.
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer">
          {m[1]}
        </a>,
      );
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const LIST_RE = /^\s*(?:[-*]|\d+\.)\s+/;
const ORDERED_RE = /^\s*\d+\.\s+/;
const TABLE_DIVIDER_RE = /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/;

const tableCells = (row) =>
  row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

/** 줄 목록 → 블록 목록. 문단·목록·표 셋뿐이다(제목·인용·수평선은 열지 않았다). */
function parseBlocks(text) {
  const lines = String(text ?? '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }
    // 표 — 머리줄 + 구분줄이 짝을 이룰 때만 표다. 구분줄이 없으면 그냥 문단이다.
    if (line.includes('|') && TABLE_DIVIDER_RE.test(lines[i + 1] ?? '')) {
      const head = tableCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(tableCells(lines[i]));
        i += 1;
      }
      blocks.push({ t: 'table', head, rows });
      continue;
    }
    if (LIST_RE.test(line)) {
      const ordered = ORDERED_RE.test(line);
      const items = [];
      while (i < lines.length && LIST_RE.test(lines[i])) {
        items.push(lines[i].replace(LIST_RE, ''));
        i += 1;
      }
      blocks.push({ t: 'list', ordered, items });
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_RE.test(lines[i]) &&
      !(lines[i].includes('|') && TABLE_DIVIDER_RE.test(lines[i + 1] ?? ''))
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push({ t: 'p', lines: para });
  }
  return blocks;
}

/** 마크다운 부분집합 렌더. 본문이 비면 아무것도 그리지 않는다. */
export function EvalMarkdownLite({ text, className = 'evc-md', testId }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  return (
    <div className={className} data-testid={testId}>
      {blocks.map((b, k) => {
        if (b.t === 'p') {
          return (
            <p key={k}>
              {b.lines.map((ln, m) => (
                // 홑 줄바꿈을 공백으로 눕히지 않는다 — TC-EVAL-185.
                <span key={m}>
                  {m > 0 && <br />}
                  {inlineNodes(ln, `p${k}-${m}`)}
                </span>
              ))}
            </p>
          );
        }
        if (b.t === 'list') {
          const items = b.items.map((it, m) => <li key={m}>{inlineNodes(it, `l${k}-${m}`)}</li>);
          return b.ordered ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>;
        }
        // 표는 «블록 안에서만» 가로 스크롤한다 — 평가지 본문이 가로로 밀리면 안 된다.
        return (
          <div key={k} className="evc-md-tablewrap">
            <table>
              <thead>
                <tr>
                  {b.head.map((c, m) => (
                    <th key={m}>{inlineNodes(c, `th${k}-${m}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, m) => (
                  <tr key={m}>
                    {r.map((c, n) => (
                      <td key={n}>{inlineNodes(c, `td${k}-${m}-${n}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 설명 항목 한 개 — 작성 화면·미리보기 공용.
 *
 * **번호를 매기지 않는다.** 문항이 아니라 글이다(policy §5.11-F 「작성 화면」).
 * 본문이 비면 **그리지 않는다** — 저장은 막지 않으므로(작성 중일 수 있다) 빌더 쪽에서만
 * `(본문 없음)` 으로 남는다.
 */
export default function EvalNoteBlock({ item, testId }) {
  const body = String(item?.description ?? '').trim();
  if (!body) return null;
  const title = item?.text || item?.label || '';
  return (
    <div className="evc-note" data-testid={testId ?? `evc-note-${item?.id ?? 'x'}`}>
      {title && <div className="evc-note-title">{title}</div>}
      <EvalMarkdownLite text={item.description} />
    </div>
  );
}
