import Tooltip from '../shared/Tooltip.jsx';

/** 눌리지 않는 행(진행자가 아닌 1on1 출처 등)에 마우스를 올리면 이유를 보인다 (pivit-work PW-2486). */
export default function withLockedHint(item, row) {
  return item.lockedHint ? <Tooltip key={item.id} content={item.lockedHint}>{row}</Tooltip> : row;
}
