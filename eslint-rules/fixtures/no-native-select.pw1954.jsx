// 표본 — 브라우저 기본 드롭다운을 그리는 모양. 모양 클래스를 입혀도 검사가 막아야 한다 (PW-1954).
// scripts/check-lint.mjs 가 이 파일에서 no-restricted-syntax 오류 1건을 기대한다.
export default function Probe({ value, onChange }) {
  return (
    <select className="admin-inv-select" value={value} onChange={onChange}>
      <option value="a">A</option>
    </select>
  );
}
