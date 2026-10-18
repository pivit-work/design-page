import { useRef, useState } from 'react';
import { LockIcon, PauseIcon } from './evalIcons.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import LoadingState from '../shared/LoadingState.jsx';
import TextInput from '../shared/TextInput.jsx';
import Tooltip from '../shared/Tooltip.jsx';

/**
 * EvalCycleManageCanvas — 오픈된 사이클의 «무엇을·어떻게» 를 고치는 화면의 셸
 * (PW-534 ㉮ · 정책 `screen-eval-cycle-hr.policy.md` §4.6).
 *
 * 시안: `pivit-specs/G. 성과평과 & feedback/eval-app.jsx` 의 `CycleManageScreen`.
 *
 * ## 왜 새 셸이 필요했나
 *
 * 종전에는 목록의 `관리` 가 **위자드를 관리 모드로 다시 열었다**(6단계 스테퍼).
 * 위자드는 「빠짐없이 채우게」 만든 도구라 「한 곳만 고치러 들어오는」 운영 동선과
 * 목적이 반대다 — 대상자 한 명을 빼려고 6단계를 처음부터 밟았다.
 *
 * ## 이 컴포넌트가 «안» 하는 것
 *
 * 탭 항목도, 잠금 판정도 여기서 정하지 않는다. 항목은 정책 §4.6.2 의 표가 정하고
 * (호출부가 `toolbar` 로 넘긴다), 잠금은 탭마다 그 설정의 정본이 정한다(호출부가
 * `lockReason` 문장으로 넘긴다). 여기는 **셸의 모양**만 안다.
 *
 * ## 잠긴 탭도 누를 수 있다
 *
 * 잠금은 본문을 읽기 전용으로 만들 뿐 탭을 비활성으로 만들지 않는다 — 비활성으로
 * 만들면 「내용도 못 본다」가 된다(정책 §4.6.6). 그래서 이 셸은 잠금 사유를 배너로
 * 적기만 하고 `children` 을 그대로 그린다.
 */

const DEFAULT_LABELS = {
  /** 화면 머리의 층 표시 — 셸 서브네비와 이름이 겹치는 탭이 둘 있어 필요하다. */
  manageSuffix: '사이클 관리',
  onHold: '일시 중단됨',
  onHoldHint: '재개 전까지 제출이 막혀 있습니다 (설정은 고칠 수 있습니다)',
  loading: '불러오는 중…',
  /** PW-1845 — 이름을 누를 수 있다는 안내(타임라인 그룹 이름 고치기와 같은 말). */
  renameTip: '이름 변경',
  renameAria: '사이클 이름',
};

/**
 * PW-1845 · 정책 §4.6.2 — 「사이클 **이름만** 헤더에서 인라인 수정한다」.
 *
 * 제목을 누르면 그 자리에서 이름 칸(위자드 1단계 이름 칸과 같은 `evc-input`)이 된다. Enter·칸 밖 = 저장,
 * Esc = 취소. 빈 값·같은 값은 보내지 않는다(타임라인 그룹 이름 고치기와 같은 규칙).
 * `onRename(name)` 은 약속을 돌려준다 — 문자열로 풀리면 그 문장을 칸 아래에 적고 칸을 연 채 둔다
 * (입력한 값을 지키려고), 아니면 닫는다.
 */
function CycleTitle({ name, onRename, L }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  if (!onRename) {
    return (
      <h1 className="evc-title" data-testid="evmg-title">
        {name}
      </h1>
    );
  }

  const close = () => {
    setEditing(false);
    setError(null);
  };
  const commit = async () => {
    if (busy.current) return;
    const next = draft.trim();
    if (!next || next === name) {
      close();
      return;
    }
    busy.current = true;
    setSaving(true);
    try {
      const failure = await onRename(next);
      if (typeof failure === 'string' && failure) setError(failure);
      else close();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <h1 className="evc-title" data-testid="evmg-title">
        <Tooltip content={L.renameTip}>
          <button
            type="button"
            className="evc-title-btn"
            data-testid="evmg-title-edit"
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
          >
            {name}
          </button>
        </Tooltip>
      </h1>
    );
  }

  return (
    <div className="evc-title-edit">
      <TextInput
        className="evc-input evc-title-input"
        value={draft}
        autoFocus
        /* 잠그지(disabled) 않는다 — 잠그면 커서가 빠져, 실패 뒤 Esc·Enter 가 칸에 닿지 않는다. */
        readOnly={saving}
        invalid={!!error}
        aria-label={L.renameAria}
        aria-describedby={error ? 'evmg-title-error' : undefined}
        data-testid="evmg-title-input"
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
        }}
      />
      {error && (
        <p id="evmg-title-error" className="evc-wiz-warn" role="alert" data-testid="evmg-title-error">
          {error}
        </p>
      )}
    </div>
  );
}

export default function EvalCycleManageCanvas({
  cycle = null,
  /** 이미 로컬라이즈된 상태 이름. 없으면 배지를 그리지 않는다. */
  statusLabel = null,
  statusTone = 'neutral',
  onHold = false,
  /** 탭 줄. 헤더 «아래», 본문 칸 안에 선다. */
  toolbar = null,
  /** 이 탭이 왜 잠겼는지. `null` 이면 편집 가능. */
  lockReason = null,
  loading = false,
  /**
   * PW-1845 — 머리에서 이름 고치기. `(name) => Promise<string | null | void>` — 문자열이면 실패 문장.
   * 없으면 제목은 읽기 전용이다.
   */
  onRename = null,
  labels: providedLabels,
  children,
}) {
  const L = { ...DEFAULT_LABELS, ...(providedLabels || {}) };

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div className="evc-manage-head">
          {/* key 를 주지 않는다 — 사이클을 읽기 전·후로 같은 제목 요소가 이어져야 한다. */}
          <CycleTitle
            name={cycle?.name ?? ''}
            onRename={cycle ? onRename : null}
            L={L}
          />
          {/* 「지금 한 사이클 «안» 에 있다」를 항상 보이게 한다 (정책 §4.6.3) —
              셸 서브네비와 이 탭 줄에 같은 이름이 둘(진행 현황 · 리포트) 있다. */}
          <span className="evc-manage-suffix" data-testid="evmg-suffix">
            · {L.manageSuffix}
          </span>
          {/* PW-1116 중단 중에는 단계 배지를 세우지 않는다 — 「중단」은 아래 주황 띠 한 줄에만
              적는다. 제목 옆 배지·띠가 같은 말을 세 번, 그것도 평소 «진행 중» 색으로 했었다. */}
          {statusLabel && !onHold && (
            <StatusBadge className={`evc-status-badge tone-${statusTone}`} data-testid="evmg-status">
              {statusLabel}
            </StatusBadge>
          )}
        </div>
      </header>

      {toolbar && <div className="evc-toolbar">{toolbar}</div>}

      {onHold && (
        <p className="evx-notice is-warn evc-manage-onhold" data-testid="evmg-onhold">
          <PauseIcon size={14} />
          <strong>{L.onHold}</strong>
          <span aria-hidden="true">·</span>
          <span data-testid="evmg-onhold-hint">{L.onHoldHint}</span>
        </p>
      )}

      {/* 왜 잠겼는지를 «적는다». 탭을 비활성으로 만들지 않는다 (정책 §4.6.6). */}
      {lockReason && (
        <p className="evx-notice evc-manage-lock" data-testid="evmg-lock">
          <LockIcon size={14} /> <span>{lockReason}</span>
        </p>
      )}

      <div className="evc-list">
        {loading ? (
          /* 탭 줄은 즉시 그리고 본문만 기다린다 — 탭 줄이 늦게 뜨면 화면이 두 번
             튄다(정책 §4.6.6). */
          <EvalCycleManageBodyLoading label={L.loading} />
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * 틀 안에서 «본문만» 기다릴 때의 자리 (PW-696).
 *
 * 틀이 사이클을 읽는 동안에는 틀이 직접 그리지만, 사이클을 읽은 뒤 탭 본문이 자기 값을
 * 따로 읽는 동안(진행 현황의 구성원 현황 등)은 본문이 이것을 그린다. 틀의 `loading` 으로
 * 돌리면 본문이 닫혔다 다시 열려 읽기를 처음부터 되풀이한다 — 같은 모양을 두 벌 짓지 않으려고
 * 여기서 내보낸다.
 */
export function EvalCycleManageBodyLoading({ label = DEFAULT_LABELS.loading }) {
  return (
    <section className="evc-card" data-testid="evmg-loading">
      <LoadingState>{label}</LoadingState>
    </section>
  );
}
