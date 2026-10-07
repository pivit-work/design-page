import { useState } from 'react';
import Chip from '../shared/Chip.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import TextInput from '../shared/TextInput.jsx';

/**
 * 쉼표로 적은 말을 태그로 바꾼다 — 앞뒤 공백을 떼고, 빈 말·이미 있는 말은 버리고, 상한에서 자른다.
 * 기획서 «개인 입력 3종»: 쉼표 단위로 태그 분리 · kind별 최대 10개 · 넘친 것은 저장하지 않는다.
 */
function addTags(current, text, max) {
  const next = [...current];
  for (const raw of String(text).split(',')) {
    const tag = raw.trim();
    if (!tag || next.includes(tag)) continue;
    if (next.length >= max) break;
    next.push(tag);
  }
  return next;
}

/**
 * 개인 입력 태그 칸 하나 — 업무 전문 분야 · 스킬셋 · 수행 중인 주요 업무 (기획서 코어 §1-3-g D ·
 * 내 설정 정책서, 시안 `K. 내-설정/settings-app.jsx`).
 *
 * - 쉼표나 Enter 를 누르면 그때까지 적은 말이 태그가 된다. 칸을 떠날 때도 남은 말을 태그로 만든다.
 * - 태그마다 「미승인」 딱지를 붙인다 — 조직장 승인은 2차(OPEN-10)라 지금은 모든 값이 승인 전이다.
 *   승인 전이어도 값은 그대로 보인다(담당자 조회가 목적이라 묶어 두면 기능이 죽는다).
 * - 상한(`max`)에 닿으면 더 받지 않고 카운터가 `10 / 10` 으로 알린다.
 *
 * @param {string[]} value 지금 태그
 * @param {(next: string[]) => void} onChange
 * @param {string} label 칸 이름(입력 칸의 aria-label 도 이것)
 * @param {string} [placeholder]
 * @param {string} unapprovedLabel 「미승인」
 * @param {string} removeLabel X 버튼 이름 뒤에 붙는 말 — 「HR SaaS 지우기」 꼴로 읽힌다
 * @param {number} [max] 태그 개수 상한(기획서 kind별 10개)
 * @param {number} [maxLength] 태그 한 개 길이 — 서버와 같은 값(pivit-work `INPUT_LIMITS.personalTags`)
 * @param {string} testId 이 칸 묶음 testid — 태그는 `${testId}-tag`, 카운터는 `${testId}-count`
 */
export default function PersonalTagsField({
  value,
  onChange,
  label,
  placeholder,
  unapprovedLabel,
  removeLabel,
  max = 10,
  maxLength = 100,
  testId,
}) {
  const tags = Array.isArray(value) ? value : [];
  const [text, setText] = useState('');
  const full = tags.length >= max;

  const commit = (raw) => {
    if (raw.trim()) onChange(addTags(tags, raw, max));
    setText('');
  };

  return (
    <div data-testid={testId}>
      {tags.length > 0 && (
        <div className="msc-tags-list">
          {tags.map((tag) => (
            <Chip
              key={tag}
              onRemove={() => onChange(tags.filter((t) => t !== tag))}
              removeLabel={`${tag} ${removeLabel}`}
              data-testid={`${testId}-tag`}
            >
              {tag}
              <StatusBadge tone="warning" className="msc-tags-unapproved">
                {unapprovedLabel}
              </StatusBadge>
            </Chip>
          ))}
        </div>
      )}
      <TextInput
        className="admin-emp-input"
        value={text}
        maxLength={maxLength}
        disabled={full}
        placeholder={full ? '' : placeholder}
        aria-label={label}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(',')) commit(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(text);
          }
        }}
        onBlur={() => commit(text)}
      />
      <div className="msc-char-count" data-testid={`${testId}-count`}>
        {tags.length} / {max}
      </div>
    </div>
  );
}
