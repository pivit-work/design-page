import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badCloseLabels, closeLabelExprs } from './check-close-labels.mjs';

test('X 이름에 취소 문구를 넘기면 잡는다', () => {
  const src = [
    '<ModalShell closeLabel={L.cancel} />',
    '<ModalShell closeLabel={L.cancel || \'취소\'} />',
    '<ModalShell closeLabel={labels.cancelButton} />',
    '<ModalShell closeLabel={L(\'board.cancel\')} />',
    '<ModalShell closeLabel={L.exportCancel} />',
    '<ModalShell closeLabel={L.leaveStay} />',
    '<ModalShell closeLabel="취소" />',
  ].join('\n');
  assert.deepEqual(badCloseLabels(src).map((b) => b.line), [1, 2, 3, 4, 5, 6, 7]);
});

test('닫기 문구는 통과한다', () => {
  const src = '<A closeLabel={L.close} />\n<B closeLabel={L.close || \'닫기\'} />\n<C closeLabel={fill(L.x, { a: 1 })} />\n<D closeLabel="닫기" />';
  assert.equal(badCloseLabels(src).length, 0);
  assert.deepEqual(closeLabelExprs(src).map((e) => e.expr), ['L.close', "L.close || '닫기'", 'fill(L.x, { a: 1 })', '"닫기"']);
});
