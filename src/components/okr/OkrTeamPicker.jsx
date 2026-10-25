import { useRef, useState } from 'react';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { isEnterKey } from '../shared/enterKey.js';
import { CheckGlyph, ChevronDownGlyph } from '../shared/lineIcons.jsx';

/** 팀이 이만큼 이상이면 탭 줄 끝에 「팀 고르기」를 단다 (PW-1876). */
export const TEAM_PICKER_MIN = 8;

/**
 * OkrTeamPicker — 팀 OKR 탭 줄 오른쪽 끝의 「팀 고르기」 (PW-1876).
 *
 * 팀이 수십~수백 개인 회사에서는 탭 줄을 옆으로 굴려 찾기가 사실상 안 된다. 그래서 탭 줄은
 * 그대로 두고, 끝에 지금 고른 팀 이름을 단 버튼을 둔다 — 탭 줄을 어디까지 굴렸든 지금 팀
 * 이름이 늘 보인다. 누르면 검색칸 + 스크롤 목록이 펴진다.
 *
 * 모양은 연도·분기 드롭다운과 같은 디자이너 부품이다(PW-2219) — 트리거 `.okr-select-btn`,
 * 펼친 목록 `.okr-select-menu` + `.okr-select-item-inner`, 고른 팀에 체크(OkrSelectMenu 와 같은
 * 16px · text-brand-tertiary). 검색칸(공용 `.dp-search`)은 디자이너 부품이 없어 지금 모양 그대로
 * 메뉴 맨 위에 둔다(design-review). 팀 이름 칸이 화면 밖으로 잘리지 않게 펼침은 AnchoredLayer 로 띄운다.
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

  const choose = (name) => {
    onChange(name);
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`okr-select-btn okr-team-picker-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={labels.trigger ?? '팀 고르기'}
        title={value}
        onClick={() => (open ? close() : setOpen(true))}
        data-testid="okr-team-picker-trigger"
      >
        <span className="okr-team-picker-value">{value}</span>
        <ChevronDownGlyph size={20} color="var(--text-secondary)" />
      </button>
      {open && (
        <AnchoredLayer
          anchorRef={triggerRef}
          align="right"
          maxHeight={360}
          width={260}
          // .okr-select-menu 의 min-width: 100% 는 화면 고정(fixed) 자리에서 화면 폭이 된다 — 폭과 같게 묶는다.
          minWidth={260}
          panelRef={panelRef}
          className="okr-select-menu okr-team-picker-panel"
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
                <div className="okr-select-item" key={name}>
                  {/* 디자이너 항목은 div 다 — 키보드로도 고를 수 있게 초점·Enter·Space 를 받는다. */}
                  <div
                    role="option"
                    tabIndex={0}
                    aria-selected={name === value}
                    className="okr-select-item-inner"
                    title={name}
                    onClick={() => choose(name)}
                    onKeyDown={(e) => {
                      if (isEnterKey(e) || e.key === ' ') {
                        e.preventDefault();
                        choose(name);
                      }
                    }}
                    data-testid="okr-team-picker-item"
                  >
                    <span className="okr-team-picker-value">{name}</span>
                    {name === value && <CheckGlyph size={16} color="var(--text-brand-tertiary)" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </AnchoredLayer>
      )}
    </>
  );
}
