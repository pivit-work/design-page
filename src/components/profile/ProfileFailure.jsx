import Button from '../shared/Button.jsx';

/** 탭 안의 «못 받았다» 안내 — 문구와 [다시 시도] 글자는 소비자가 준다. `notice: { message, retryLabel? }`. */
export default function ProfileFailure({ notice, onRetry }) {
  return (
    <div className="profile-failure">
      <p className="profile-failure-text">{notice.message}</p>
      {notice.retryLabel && (
        <Button variant="ghost" size="sm" onClick={() => onRetry?.()}>
          {notice.retryLabel}
        </Button>
      )}
    </div>
  );
}
