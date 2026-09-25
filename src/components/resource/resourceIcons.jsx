/**
 * 리소스 화면 아이콘 — 인라인 SVG.
 *
 * ResourceCanvas 는 icons/baseUrl prop 을 받지 않는(자체 완결형) 캔버스라
 * 공용 <Icon> 대신 인라인 SVG 로 그린다. 색은 SVG 안에 박지 않고 부모의
 * color 를 상속한다(fill="currentColor") — 상태별 색을 감싸는 요소가 준다.
 * 두 곳 이상 쓰는 그림은 design-page `shared/lineIcons.jsx` 한 벌을 부른다(PW-1011).
 */

import { SparkleGlyph } from '../shared/lineIcons.jsx';

/**
 * AI sparkle. `/icons-solid/ai-chat-01.svg` 와 같은 path 로,
 * OKR·매니저의 AI 블록(okr-ai-banner / mgr-ts-ai)이 쓰는 아이콘과 동일하다.
 */
export function AiSparkleIcon({ size = 14 }) {
  return <SparkleGlyph size={size} gradient={false} focusable="false" />;
}
