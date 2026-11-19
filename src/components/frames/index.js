/**
 * 공용 틀 — 디자이너 화면 값을 담은 틀. pivit-work 앱 화면과 design-page 화면이 함께 쓴다(PW-2994 → PW-3139 에서 옮김).
 * 쓰는 법은 pivit-work docs/standards/frontend.md «공용 틀로 새 화면 짜기».
 * 스타일시트는 쓰는 쪽이 불러온다 — frames.css · okr.css · modal-shell.css · timeline.css · meetings.css · org_list.css · manager.css
 * (pivit-work 는 frontend/src/components/frames/index.ts 가 부른다).
 * 배럴(`components/index.js`)에 싣지 않고 이 경로로만 가져다 쓴다 — 이름이 겹치지 않게, 앱 선언 파일도 따로 둔다.
 */
export { FormModal } from './FormModal.jsx';
export { Panel } from './Panel.jsx';
export { NoticeLines } from './NoticeLines.jsx';
export { FrameTable } from './FrameTable.jsx';
export { PanelSection } from './PanelSection.jsx';
export { PageHead } from './PageHead.jsx';
export { SaveBar } from './SaveBar.jsx';
export { StatStrip } from './StatStrip.jsx';
export { FRAME_ONE_LINE, FRAME_NO_SHRINK, FRAME_TEXT_CLAMP_TWO, FRAME_TEXT_WRAP, FRAME_TABLE } from './frameValues.js';
