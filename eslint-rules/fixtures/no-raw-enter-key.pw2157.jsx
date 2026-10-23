// 표본 — 한글 조합을 확정하는 Enter 까지 받는 맨 비교 (PW-2157).
// scripts/check-lint.mjs 가 이 파일에서 pivit/no-raw-enter-key 오류 1건을 기대한다.
export default function Probe({ onAdd }) {
  return <input onKeyDown={(e) => { if (e.key === 'Enter') onAdd(); }} />;
}
