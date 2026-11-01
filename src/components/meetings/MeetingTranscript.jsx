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
 * 같은 일정으로 다시 모였거나 녹취를 다시 켠 자리는 그 첫 발언에 `divider`(표시 글자)를 실어 보낸다 (PW-2391).
 * 그 앞에 구분 줄을 긋고, 같은 사람이 경계를 넘어 이어 말해도 묶음을 나눈다. 검색·발언자별 보기로 그 첫 발언이
 * 빠지면 구분 줄은 그 녹취의 다음 보이는 발언 앞으로 옮긴다 — 걸러 봐도 어디서부터 다음 회의인지 남는다.
 *
 * @param {{ speaker: string, time: string, text: string, divider?: string }[]} lines 발언 — 시각·구분 글자는 caller 가 표시 글자로 준다
 * @param {{ searchPlaceholder: string, allSpeakers: string, speakerFilterAria: string, noMatch: string }} labels
 */
export default function MeetingTranscript({ lines, labels }) {
  const [query, setQuery] = useState('');
  const [speaker, setSpeaker] = useState('');

  const speakers = useMemo(() => [...new Set(lines.map((l) => l.speaker))], [lines]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (l) =>
      (!speaker || l.speaker === speaker) &&
      (!q || l.text.toLowerCase().includes(q) || l.speaker.toLowerCase().includes(q));
    // 거른 뒤에 묶는다 — 사이에 낀 다른 사람 발언이 빠지면 앞뒤가 한 묶음이 된다.
    // 구분 줄은 걸러도 남긴다 — 뒤 회의 발언이 다 빠져도 회의가 더 있었던 것이 보이게. 맞는 발언이 없으면 안 그린다.
    const out = [];
    let pending = [];
    for (const l of lines) {
      if (l.divider) pending.push(l.divider);
      if (!matches(l)) continue;
      for (const divider of pending) out.push({ divider });
      pending = [];
      const last = out[out.length - 1];
      if (last && !last.divider && last.speaker === l.speaker) last.items.push(l);
      else out.push({ speaker: l.speaker, items: [l] });
    }
    if (out.length > 0) for (const divider of pending) out.push({ divider });
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
          {groups.map((g, gi) => g.divider ? (
            <li key={`${gi}-divider`} className="mtg-transcript-divider" data-testid="meet-transcript-divider">
              <span className="mtg-transcript-divider-line" aria-hidden="true" />
              <span className="mtg-transcript-divider-text">{g.divider}</span>
              <span className="mtg-transcript-divider-line" aria-hidden="true" />
            </li>
          ) : (
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
