import { useMemo, useState } from 'react';
import Avatar from '../shared/Avatar.jsx';
import Chip from '../shared/Chip.jsx';
import SearchInput from '../shared/SearchInput.jsx';

/**
 * 회의록 창 「발언 기록」 탭 안의 발언 목록 (PW-1704).
 *
 * 구글 Meet 녹취로 가져온 발언을 «발언자 원 + 이름, 그 아래 시각 + 문장» 으로 그린다.
 * 같은 사람이 이어 말하면 이름은 한 번만 쓰고 문장만 이어 붙인다 — 30분 회의의 발언 수십 개가
 * 한 덩어리로 붙어 보이지 않게, 줄 수도 줄인다. 번호는 쓰지 않는다(번호 목록이 창 여백 밖으로
 * 삐져나왔었다).
 *
 * 위에 검색칸과 발언자별 보기(전체 / 사람마다)를 둔다. 거르기는 이 부품 안에서 한다.
 * 높이는 감싸는 탭 칸(`MeetingRecordContent` 의 `.mtg-record-tab-pane`)이 정한다.
 *
 * @param {{ speaker: string, time: string, text: string }[]} lines 발언 — 시각은 caller 가 표시 글자로 준다
 * @param {{ searchPlaceholder: string, allSpeakers: string, speakerFilterAria: string, noMatch: string }} labels
 */
export default function MeetingTranscript({ lines, labels }) {
  const [query, setQuery] = useState('');
  const [speaker, setSpeaker] = useState('');

  const speakers = useMemo(() => [...new Set(lines.map((l) => l.speaker))], [lines]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = lines.filter(
      (l) =>
        (!speaker || l.speaker === speaker) &&
        (!q || l.text.toLowerCase().includes(q) || l.speaker.toLowerCase().includes(q)),
    );
    // 거른 뒤에 묶는다 — 사이에 낀 다른 사람 발언이 빠지면 앞뒤가 한 묶음이 된다.
    const out = [];
    for (const l of shown) {
      const last = out[out.length - 1];
      if (last && last.speaker === l.speaker) last.items.push(l);
      else out.push({ speaker: l.speaker, items: [l] });
    }
    return out;
  }, [lines, query, speaker]);

  return (
    <div className="mtg-transcript">
      <div className="mtg-transcript-tools">
        <SearchInput
          value={query}
          placeholder={labels.searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="meet-transcript-search"
        />
        {speakers.length > 1 && (
          <div className="mtg-transcript-speakers" role="group" aria-label={labels.speakerFilterAria}>
            <Chip selected={!speaker} onClick={() => setSpeaker('')}>{labels.allSpeakers}</Chip>
            {speakers.map((s) => (
              <Chip key={s} selected={speaker === s} onClick={() => setSpeaker(s)}>{s}</Chip>
            ))}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mtg-transcript-empty" data-testid="meet-transcript-no-match">{labels.noMatch}</p>
      ) : (
        <ul className="mtg-transcript-list" data-testid="meet-transcript-lines">
          {groups.map((g, gi) => (
            <li key={`${gi}-${g.speaker}`} className="mtg-transcript-group" data-testid="meet-transcript-group">
              {/* 원 안에는 이름 첫 글자만 — 옆에 이름이 적혀 있어 원은 화면 읽기에서 숨긴다. */}
              <Avatar name={g.speaker} text={[...g.speaker.trim()][0] ?? ''} size={24} />
              <div className="mtg-transcript-body">
                <span className="mtg-transcript-speaker">{g.speaker}</span>
                {g.items.map((l, i) => (
                  <p key={i} className="mtg-transcript-line">
                    <span className="mtg-transcript-time">{l.time}</span>
                    {l.text}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
