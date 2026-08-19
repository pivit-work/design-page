import { FlagIcon } from './okrIcons.jsx';

/**
 * OkrUnalignedBadge — 「상위에 걸리지 않았다」 배지.
 *
 * 팀 보드 Objective 행과 대시보드 Objective 요약 행이 **같은 배지를 공유한다.**
 * 같은 뜻에 다른 배지를 만들면 사용자가 둘을 구별해야 한다.
 *
 * - `count` 를 주면 `미정렬 {n}`(대시보드 집계), 안 주면 `미정렬`(팀 단건).
 * - `note` 는 뒤에 붙는 보조 문구(팀 배지의 「회사 OKR 미연결」).
 * - `variant='pill'` 은 좁은 요약 행용 — 색·글자 규격은 같고 모서리·패딩만 줄인다.
 */
export default function OkrUnalignedBadge({ count, note, title, variant = 'default' }) {
  return (
    <span
      className={`okr-unaligned-badge${variant === 'pill' ? ' is-pill' : ''}`}
      title={title}
      data-testid="okr-unaligned-badge"
    >
      <FlagIcon size={12} />
      <span>{typeof count === 'number' ? `미정렬 ${count}` : '미정렬'}</span>
      {note && <span className="okr-unaligned-note">{note}</span>}
    </span>
  );
}
