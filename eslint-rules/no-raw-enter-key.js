/**
 * 키 이벤트의 `key` 를 'Enter' 와 바로 비교하지 못하게 막는다 (PW-2157).
 *
 * 한글 조합을 확정하는 Enter 에 칸을 비우거나 저장하면 마지막 글자가 남거나 두 번 들어간다.
 * 칸마다 조합 검사를 따로 넣다 보니 빠뜨린 칸이 열몇 곳 쌓였다(PW-2150 → PW-2157). 그래서 Enter 는
 * 공용 `isEnterKey(e)`(src/components/shared/enterKey.js)로만 묻는다. 버튼·행처럼 조합이 안 생기는
 * 자리도 같은 함수를 쓴다 — 거기서는 결과가 같고, 예외 목록을 두면 그 목록이 다시 샌다.
 *
 * 잡는 모양: `e.key === 'Enter'`·`'Enter' !== key`·`switch (e.key) { case 'Enter': }`·
 * `['Enter', ' '].includes(e.key)`.
 *
 * pivit-work 저장소에 같은 규칙이 있다(frontend/eslint-rules/). 양쪽에 둔다.
 */
const isKeyRef = (node) =>
  !!node &&
  ((node.type === 'Identifier' && node.name === 'key') ||
    (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier' && node.property.name === 'key'))

const isEnter = (node) => !!node && node.type === 'Literal' && node.value === 'Enter'

export default {
  meta: {
    type: 'problem',
    docs: { description: "키 이벤트의 key 를 'Enter' 와 바로 비교하지 않는다 — isEnterKey(e) 를 쓴다" },
    schema: [],
    messages: {
      raw:
        "Enter 는 isEnterKey(e) 로 묻는다 — 맨 비교는 한글 조합을 확정하는 Enter 까지 받아 마지막 글자가 " +
        '남거나 두 번 들어간다 (PW-2157). design-page 는 src/components/shared/enterKey.js, ' +
        "앱은 '@pivit-work/design-page/components/shared/enterKey.js'.",
    },
  },
  create(context) {
    return {
      BinaryExpression(node) {
        if (!['===', '!==', '==', '!='].includes(node.operator)) return
        if ((isKeyRef(node.left) && isEnter(node.right)) || (isEnter(node.left) && isKeyRef(node.right))) {
          context.report({ node, messageId: 'raw' })
        }
      },
      SwitchCase(node) {
        if (isEnter(node.test) && isKeyRef(node.parent.discriminant)) context.report({ node, messageId: 'raw' })
      },
      CallExpression(node) {
        const callee = node.callee
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.name === 'includes' &&
          callee.object.type === 'ArrayExpression' &&
          callee.object.elements.some(isEnter) &&
          isKeyRef(node.arguments[0])
        ) {
          context.report({ node, messageId: 'raw' })
        }
      },
    }
  },
}
