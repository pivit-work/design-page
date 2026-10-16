import { useRef, useState } from 'react';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';

/** 팀이 이만큼 이상이면 탭 줄 끝에 「팀 고르기」를 단다 (PW-1876). */
export const TEAM_PICKER_MIN = 8;

const ChevronDown = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/**
 * OkrTeamPicker — 팀 OKR 탭 줄 오른쪽 끝의 「팀 고르기」 (PW-1876).
 *
 * 팀이 수십~수백 개인 회사에서는 탭 줄을 옆으로 굴려 찾기가 사실상 안 된다. 그래서 탭 줄은
 * 그대로 두고, 끝에 지금 고른 팀 이름을 단 버튼을 둔다 — 탭 줄을 어디까지 굴렸든 지금 팀
 * 이름이 늘 보인다. 누르면 검색칸 + 스크롤 목록이 펴진다.
 *
 * 면(배경·테두리·그림자)과 항목 모양은 구성원 목록의 «⋯» 펼침 메뉴(`.admin-emp-row-menu`)
 * 값을 따른다. 디자이너 원본이 없는 자리라 design-review 대상이다.
 *
 * labels: { trigger(aria), search(placeholder), empty }
 */
export default function OkrTeamPicker({ teams, value, onChange, labels = {} }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  useDismissLayer(close, panelRef, triggerRef, open);

  const q = query.trim().toLowerCase();
  const shown = q ? teams.filter((name) => name.toLowerCase().includes(q)) : teams;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`okr-team-picker-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.trigger ?? '팀 고르기'}
        title={value}
        onClick={() => (open ? close() : setOpen(true))}
        data-testid="okr-team-picker-trigger"
      >
        <span className="okr-team-picker-value">{value}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <AnchoredLayer
          anchorRef={triggerRef}
          align="right"
          maxHeight={360}
          width={260}
          panelRef={panelRef}
          className="okr-team-picker-panel"
          data-testid="okr-team-picker-panel"
        >
          <SearchInput
            className="dp-search okr-team-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search ?? '팀 이름 검색'}
            autoFocus
            data-testid="okr-team-picker-search"
          />
          <div className="okr-team-picker-list" role="listbox">
            {shown.length === 0 ? (
              <div className="okr-team-picker-empty">{labels.empty ?? '맞는 팀이 없습니다'}</div>
            ) : (
              shown.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="option"
                  aria-selected={name === value}
                  className={`okr-team-picker-item${name === value ? ' is-active' : ''}`}
                  title={name}
                  onClick={() => {
                    onChange(name);
                    close();
                  }}
                  data-testid="okr-team-picker-item"
                >
                  {name}
                </button>
              ))
            )}
          </div>
        </AnchoredLayer>
      )}
    </>
  );
}
