/**
 * MarkdownBody — 도움말 글 본문을 그리는 작은 마크다운 풀이기 (PW-1131).
 *
 * 🔴 안전: HTML 문자열을 끼워 넣지 않는다(dangerouslySetInnerHTML 없음). 글자는 전부 React 글자
 * 노드로 들어가서 `<script>` 같은 태그도 그냥 글자로 보인다. 링크 주소는 `/`·`http://`·`https://`
 * 로 시작할 때만 링크가 되고, 그 밖(`javascript:`·`data:` 등)은 글자만 남긴다.
 *
 * 지원: `## `·`### ` 제목 · `- ` 목록 · `1. ` 번호 목록 · `> ` 인용 · `|` 표(머리 줄 + 구분 줄) ·
 * 문단 · 줄 안의 `**굵게**` · `[글자](주소)`.
 * 바깥 링크(http·https)는 새 탭(target=_blank rel=noopener noreferrer)으로 연다.
 * 안쪽 링크(`/`)는 `onInternalLink(href, event)` 를 주면 그것을 부른다(앱 안 이동용).
 *
 * Props: text(마크다운 원문) · onInternalLink? · className?
 */

import { isSafeHref, parseMarkdown } from './markdown.js';

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]*)\)/g;

/** 줄 안의 굵게·링크를 React 조각 배열로 푼다. */
function renderInline(text, { onInternalLink, keyPrefix = 'i' } = {}) {
  const out = [];
  let last = 0;
  let n = 0;
  INLINE.lastIndex = 0;
  let m;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${n++}`;
    if (m[1] !== undefined) {
      out.push(<strong key={key}>{m[1]}</strong>);
    } else {
      const label = m[2];
      const href = m[3].trim();
      if (!isSafeHref(href)) {
        out.push(label);
      } else if (href.startsWith('/')) {
        out.push(
          <a
            key={key}
            className="sup-md-link"
            href={href}
            onClick={
              onInternalLink
                ? (e) => {
                    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                    e.preventDefault();
                    onInternalLink(href, e);
                  }
                : undefined
            }
          >
            {label}
          </a>,
        );
      } else {
        out.push(
          <a key={key} className="sup-md-link" href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>,
        );
      }
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function MarkdownBody({ text, onInternalLink, className = '', ...rest }) {
  const blocks = parseMarkdown(text);
  const inline = (s, k) => renderInline(s, { onInternalLink, keyPrefix: k });
  return (
    <div className={['sup-md', className].filter(Boolean).join(' ')} {...rest}>
      {blocks.map((b, bi) => {
        const k = `b${bi}`;
        switch (b.type) {
          case 'h2':
            return <h2 key={k} className="sup-md-h2">{inline(b.text, k)}</h2>;
          case 'h3':
            return <h3 key={k} className="sup-md-h3">{inline(b.text, k)}</h3>;
          case 'quote':
            return (
              <blockquote key={k} className="sup-md-quote">
                {b.lines.map((l, li) => (
                  <p key={li}>{inline(l, `${k}-${li}`)}</p>
                ))}
              </blockquote>
            );
          case 'ul':
          case 'ol': {
            const Tag = b.type;
            return (
              <Tag key={k} className="sup-md-list">
                {b.items.map((it, li) => (
                  <li key={li}>{inline(it, `${k}-${li}`)}</li>
                ))}
              </Tag>
            );
          }
          case 'table':
            return (
              <div key={k} className="sup-md-table-wrap">
                <table className="sup-md-table">
                  <thead>
                    <tr>
                      {b.header.map((h, hi) => (
                        <th key={hi}>{inline(h, `${k}-h${hi}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((c, ci) => (
                          <td key={ci}>{inline(c, `${k}-${ri}-${ci}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return <p key={k} className="sup-md-p">{inline(b.text, k)}</p>;
        }
      })}
    </div>
  );
}
