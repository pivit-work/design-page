import { useFeedbackTextLimit } from './feedbackTextLimit.js';

/**
 * 한도에 닿으면 칸 아래에 「최대 N자」 안내. 모양은 같은 창의 입력칸 아래 오류 문구(작은 빨간 글씨)를 따른다.
 */
export default function FeedbackLengthNote({ text, label, color, testId }) {
  const max = useFeedbackTextLimit();
  if (max == null || String(text ?? '').length < max) return null;
  return (
    <p role="status" data-testid={testId} style={{ margin: '4px 0 0', fontSize: 12, color }}>
      {String(label ?? '').replace('{max}', max.toLocaleString())}
    </p>
  );
}
