/**
 * 구성원 상세 페이지 묶음 아래 안내 — 문장마다 한 줄(PW-2895 시안 «안내 세 문장은 문장마다 줄»).
 * 글은 받은 그대로이고 «. » 뒤에서만 줄을 나눈다. 줄 끝 빈칸은 글자로 남겨 읽기 프로그램·복사에서 문장이 붙지 않게 한다.
 */
export default function DetailNoteLines({ text, testId }) {
  const lines = String(text ?? '').split(/(?<=\.)\s+/).filter(Boolean);
  return (
    <div className="admin-emp-detail-notes" data-testid={testId}>
      {lines.map((line, i) => (
        <span key={i}>{line}{i < lines.length - 1 ? ' ' : ''}</span>
      ))}
    </div>
  );
}
