import useProgressiveList from './useProgressiveList.js';

/**
 * 같은 일을 하는 부품 — 반복문 안처럼 훅을 바로 부를 수 없는 자리용.
 * `<ProgressiveItems items={list} render={(m) => <Card key={m.id} … />} />`
 */
export default function ProgressiveItems({ items, render, first, step }) {
  return useProgressiveList(items, { first, step }).map(render);
}
