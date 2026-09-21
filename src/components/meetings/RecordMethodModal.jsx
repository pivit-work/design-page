import ModalShell from '../shared/ModalShell.jsx';
import Icon from '../shared/Icon.jsx';

/**
 * RecordMethodModal — "시작" 클릭 직후 뜨는 기록 방식 선택 모달.
 *
 * Figma node-id=16920-36771. 중앙 정렬 카드. 직접 녹음 / 메모만 작성 2-카드.
 * 모든 데이터/라벨은 caller 주입. 내부 fallback 없음.
 *
 * meeting.participants: "David · Kurt" 문자열 또는 배열 둘 다 지원.
 */
function normalizeParticipants(participants) {
  if (!participants) return [];
  if (Array.isArray(participants)) return participants;
  return String(participants).split(/[·,]/).map((s) => s.trim()).filter(Boolean);
}

export default function RecordMethodModal({ meeting, baseUrl = '', labels, onSelect, onClose }) {
  const participants = normalizeParticipants(meeting?.participants);
  const subtitle = `${meeting.title} · ${meeting.time} ${labels.subtitleSuffix}`;

  // 공용 창 틀(ModalShell)로 그린다 (PW-836) — Esc·막 클릭·닫기 X 는 틀이 onClose 로 부른다.
  // 두 카드가 곧 선택지라 틀의 취소/확인 푸터는 그리지 않는다.
  return (
    <ModalShell
      title={labels.title}
      description={subtitle}
      titleId="mtg-method-title"
      closeLabel={labels.close}
      onClose={() => onClose?.()}
      footer={null}
      zIndex={9000}
      className="mtg-shell"
      bodyClassName="mtg-shell-body"
      testId="mtg-method-modal"
    >
      {participants.length > 0 && (
        <div className="mtg-method-participants">
          {participants.map((p) => (
            <span key={p} className="mtg-progress-pill">{p}</span>
          ))}
        </div>
      )}

      <div className="mtg-method-cards">
        <button type="button" className="mtg-method-card" onClick={() => onSelect('record')}>
          <Icon src="/icons-solid/microphone-01.svg" size={28} color="var(--text-primary)" baseUrl={baseUrl} />
          <span className="mtg-method-card-title">{labels.record.title}</span>
          <span className="mtg-method-card-desc">{labels.record.desc}</span>
        </button>
        <button type="button" className="mtg-method-card" onClick={() => onSelect('memo')}>
          <Icon src="/icons-solid/file-02.svg" size={28} color="var(--text-primary)" baseUrl={baseUrl} />
          <span className="mtg-method-card-title">{labels.memo.title}</span>
          <span className="mtg-method-card-desc">{labels.memo.desc}</span>
        </button>
      </div>

      <p className="mtg-method-footnote">{labels.footnote}</p>
    </ModalShell>
  );
}
