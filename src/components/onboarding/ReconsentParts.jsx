/**
 * 약관 재동의 창 안쪽 부품 (pivit-work PW-2992 · 개발 추가 · design-review).
 *
 * 창 틀은 디자이너 «그룹 추가» 창(ModalShell · 제목 30 · 둘레 48) 그대로. 안쪽은 가입 화면 동의 묶음을 창에 옮긴 것이라
 * 원본이 없어, 커트가 11-18 검토한 시안(pivit-work worklog/meeting-import-reconsent-designer-2026-11-18 B1~B3)을 설계도로 삼았다.
 *   - 체크 20px — 회의록 공유 창 체크(.mtg-share-checkbox) = ModalCheck
 *   - 링크 — 가입 화면 약관 링크(.login-link.is-legal)의 brand 600, 문장 끝에 이어 붙인다
 *   - 접는 칸 — 가입 화면 안내 상자(.login-notice)처럼 머리줄 오른쪽에 [접기]/[펼치기]
 * 가입 화면은 이 부품을 쓰지 않는다(가입 화면 모양 보존). 모양은 onboarding.css «약관 재동의 창 안쪽» 절.
 */
import { useId } from 'react';
import Button from '../shared/Button.jsx';
import { ModalCheck } from '../meetings/TranscriptImportParts.jsx';

const cx = (...xs) => xs.filter(Boolean).join(' ');

/**
 * 동의 줄 하나 — 20px 체크 + 14/22 문구. inline(링크·[보기])은 문구 끝에 이어 붙고, children(보조 줄·펼친 표·아래 단계 줄)은
 * 문구 시작선 아래에 쌓인다. 문구(label)는 화면이 굵게 할 곳을 <b> 로 감싸 넘긴다.
 */
export function ReconsentCheckRow({ checked, onChange, disabled = false, label, inline, children, testId }) {
  const id = useId();
  return (
    <div className="onb-rc-row">
      <ModalCheck id={id} checked={checked} onChange={onChange} disabled={disabled} testId={testId} />
      <div className="onb-rc-text">
        <div>
          <label htmlFor={id} className="onb-rc-label">
            {label}
          </label>
          {inline}
        </div>
        {children}
      </div>
    </div>
  );
}

/** 문장 끝 링크 — href 면 새 탭 링크, 아니면 글자 버튼(펼치기·[보기]). */
export function ReconsentLink({ href, onClick, children, testId, ...rest }) {
  if (href) {
    return (
      <a className="onb-rc-link" href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Button className="onb-rc-link" onClick={onClick} data-testid={testId} {...rest}>
      {children}
    </Button>
  );
}

/** 링크 여럿을 문장 끝에 — 줄이 넘치면 링크 단위로 다음 줄로 간다. */
export function ReconsentLinks({ children, testId }) {
  return (
    <span className="onb-rc-links" data-testid={testId}>
      {children}
    </span>
  );
}

/** 글 한 줄 — sub(12/18 흐린 보조 줄) · error(12/18 오류) · body(13/20 본문 회색) · note(고지 칸 안 12/19). */
export function ReconsentText({ tone = 'sub', role, testId, children }) {
  return (
    <p className={cx('onb-rc-text-line', `is-${tone}`)} role={role} data-testid={testId}>
      {children}
    </p>
  );
}

/** 위 테두리로 나눈 구역 — 국외 이전 안내 + 처리위탁계약. */
export function ReconsentSection({ children, testId }) {
  return (
    <div className="onb-rc-section" data-testid={testId}>
      {children}
    </div>
  );
}

/** 구분선 한 줄 — 「전체 동의」 아래. */
export function ReconsentDivider() {
  return <hr className="onb-rc-divider" />;
}

/**
 * 테두리 칸 — 머리줄(제목 · 작은 글 · 오른쪽 [접기]/[펼치기]) + 본문. 본문은 접혀도 보이는 줄이 있으면 화면이 넘긴다.
 * toggleLabel 이 없으면 머리줄에 링크를 두지 않는다.
 */
export function ReconsentFold({ title, note, open, onToggle, toggleLabel, toggleTestId, testId, children }) {
  return (
    <div className="onb-rc-fold" data-testid={testId}>
      <div className="onb-rc-fold-head">
        <b className="onb-rc-fold-title">
          {title}
          {note && <small className="onb-rc-fold-note">{note}</small>}
        </b>
        {toggleLabel && (
          <ReconsentLink onClick={onToggle} aria-expanded={open} testId={toggleTestId}>
            {toggleLabel}
          </ReconsentLink>
        )}
      </div>
      {children}
    </div>
  );
}

/** 펼친 안내 글 칸 — [해지 안내]를 누르면 나오는 단락. */
export function ReconsentBox({ testId, children }) {
  return (
    <p className="onb-rc-box" data-testid={testId}>
      {children}
    </p>
  );
}
