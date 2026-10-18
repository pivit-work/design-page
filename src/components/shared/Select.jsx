import { Children, Fragment, isValidElement } from 'react';
import SearchSelect from './SearchSelect.jsx';

/**
 * Select — 목록에서 하나 고르는 칸 (PW-1012). 쓰는 법·모양 규칙은 `TextInput` 과 같다.
 *
 * 처음엔 브라우저 기본 목록(`<select>`)을 그대로 썼는데, 펼친 목록을 운영체제가 그려 디자이너 모양이
 * 아니고 데모 영상에도 안 찍혔다. 이제 속은 공용 `SearchSelect` 다 (PW-1954). 부르는 쪽이 고칠 것이 없게
 * 겉 약속은 그대로 둔다 — `onChange` 는 여전히 `e.target.value`(문자열)로 받고, `<option>`·`<optgroup>`
 * 자식도 받는다(자식은 그리지 않고 선택지 목록으로만 읽는다).
 *
 *   <Select value={v} onChange={(e) => setV(e.target.value)} options={[{ value, label }]} />
 *   <Select value={v} onChange={…}><option …/></Select>     // 무리(optgroup)가 필요할 때
 *
 * Props: `options`([{ value, label, disabled }]) · `placeholder`(값이 없을 때 칸에 보일 글 — 고를 수 없다) ·
 *        `invalid` · `ref`(칸 버튼) · `searchable`(검색칸, 기본 끔) · `name` · `disabled` · `id` ·
 *        `aria-*` · `data-*` · `className`. `required` 는 칸에 그대로 붙지만 막지는 않는다 — 막는 것은 저장 쪽 검사다.
 */
export default function Select({
  options,
  children,
  onChange,
  name,
  searchable = false,
  ...rest
}) {
  const list = options
    ? options.map((o) => ({ value: String(o.value), label: o.label, disabled: o.disabled }))
    : optionsFromChildren(children);
  const emit = (value) => {
    const target = { value: String(value), name };
    onChange?.({ target, currentTarget: target });
  };
  return <SearchSelect {...rest} name={name} options={list} searchable={searchable} onChange={emit} />;
}

/** `<option>`·`<optgroup>` 자식을 선택지 목록으로 읽는다 — 무리 이름은 고를 수 없는 묶음 머리가 된다. */
function optionsFromChildren(children) {
  const out = [];
  const walk = (nodes) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      const { props } = child;
      if (child.type === 'optgroup') {
        out.push({ value: `group:${props.label}`, label: props.label, group: true });
        walk(props.children);
      } else if (child.type === 'option') {
        const label = Children.toArray(props.children).join('');
        out.push({ value: String(props.value ?? label), label, disabled: props.disabled });
      } else if (child.type === Fragment) {
        walk(props.children);
      }
    });
  };
  walk(children);
  return out;
}
