/**
 * 화면 코드에 글씨체 이름을 직접 적지 못하게 막는다 (PW-923).
 *
 * 글씨체는 디자인 기준값 `var(--font-family-body)` / `var(--font-family-display)` 하나에서
 * 정해진다. 파일마다 `'DM Mono', monospace`·`'Pretendard','Noto Sans KR',sans-serif` 를
 * 적어 두면 기준값이 바뀌어도 따라가지 않는다 — 실제로 DM Mono 는 불러오는 곳이 없어
 * Courier 로 그려졌고, 아무도 몰랐다.
 *
 * 두 가지를 본다.
 * 1. `fontFamily`·`font` 속성에 적은 문자열 — `inherit` 와 기준값 두 개만 통과한다.
 * 2. 어디에 있든 **글씨체 목록처럼 생긴 문자열** — `const MONO = "'DM Mono',monospace"`
 *    처럼 상수로 빼 두면 1번을 돌아가기 때문이다(이번 사고가 전부 이 모양이었다).
 *
 * pivit-work 저장소에 같은 규칙이 있다(frontend/eslint-rules/). 새 화면이 여기서 들어가므로 양쪽에 둔다.
 */
const ALLOWED_VALUE = /^(inherit|var\(--font-family-(body|display)\))$/

// 글씨체 목록에만 나오는 낱말. 일반 문장과 겹치지 않게 generic family 는 쉼표·따옴표 경계로 본다.
const FAMILY_NAME =
  /\b(Pretendard|DM Mono|Noto Sans|SUIT|Menlo|Courier|Arial|Helvetica|Consolas|Segoe UI|Roboto|SFMono-Regular|BlinkMacSystemFont)\b/
const GENERIC_IN_LIST =
  /(^|[,'"\s])(sans-serif|serif|monospace|ui-monospace|ui-sans-serif|system-ui|-apple-system)\s*(['"]?\s*[,;]|['"]?\s*$)/

function stringValue(node) {
  if (!node) return null
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral') return node.quasis.map((q) => q.value.cooked).join('${}')
  return null
}

function keyName(prop) {
  if (prop.computed) return null
  if (prop.key.type === 'Identifier') return prop.key.name
  if (prop.key.type === 'Literal') return String(prop.key.value)
  return null
}

function looksLikeFontList(text) {
  return FAMILY_NAME.test(text) || GENERIC_IN_LIST.test(text)
}

export default {
  meta: {
    type: 'problem',
    docs: { description: '글씨체 이름을 직접 적지 않고 디자인 기준값을 쓴다 (PW-923)' },
    messages: {
      property:
        "글씨체는 'var(--font-family-body)' · 'var(--font-family-display)' · 'inherit' 만 쓴다 (PW-923). 받은 값: {{value}}",
      literal:
        "글씨체 이름을 직접 적지 않는다 — 'var(--font-family-body)' 를 쓴다. 자릿수를 맞출 숫자는 fontVariantNumeric: 'tabular-nums' (PW-923). 받은 값: {{value}}",
    },
    schema: [],
  },
  create(context) {
    const reported = new WeakSet()
    function check(node, messageId) {
      if (reported.has(node)) return
      reported.add(node)
      context.report({ node, messageId, data: { value: stringValue(node) } })
    }
    return {
      Property(prop) {
        const name = keyName(prop)
        if (name !== 'fontFamily' && name !== 'font') return
        const value = stringValue(prop.value)
        if (value === null) return
        // `font` 는 `font: '12px/1.4 …'` 단축 표기에도 쓰인다 — 글씨체 목록이 든 때만 본다.
        if (name === 'font' && !looksLikeFontList(value) && !/^var\(/.test(value)) return
        if (!ALLOWED_VALUE.test(value.trim())) check(prop.value, 'property')
      },
      'Literal, TemplateLiteral'(node) {
        const value = stringValue(node)
        if (value === null || !looksLikeFontList(value)) return
        // import 경로·JSX 속성 이름 같은 자리는 아니다 — 값 자리만 본다.
        if (node.parent?.type === 'ImportDeclaration') return
        check(node, 'literal')
      },
    }
  },
}
