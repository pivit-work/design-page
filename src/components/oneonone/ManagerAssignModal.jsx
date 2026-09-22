import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import Icon from '../shared/Icon.jsx';

/**
 * ManagerAssignModal — 마이크 권한 안내 다음 단계, 매니저(퍼실리테이터) 지정 모달.
 * Figma 17416:27850. 650px, AI 추천 배너 + 후보 라디오 리스트 + [나중에 | 확인].
 *
 * candidates: [{ id, name, role, avatar, recommended?: boolean }]
 * 추천 후보가 기본 선택되며, 배너 문구도 추천 후보 이름으로 만든다.
 * onConfirm(candidate) / onLater() / onClose().
 * labels: 고정 문구를 키별로 덮어쓴다(호스트 번역). `aiBanner` 는 추천 후보 이름이 들어가는
 *   함수 `(name) => string` 이다. 안 넘긴 키는 한국어 기본값 (PW-786).
 * renderAvatar(candidate): 호스트 앱의 아바타(이니셜 폴백 등)를 끼울 때. 미지정 시 avatar URL.
 *
 * 공용 창 틀(ModalShell)로 그린다 (PW-836). Esc·막 클릭·닫기 X 는 틀이 onClose 로 부른다.
 */
export const MANAGER_ASSIGN_DEFAULT_LABELS = {
  title: '매니저(퍼실리테이터) 지정',
  desc: 'AI가 대화 내용을 기반으로 역할을 자동 감지합니다. 직접 지정하시면 AI 자동 분류보다 우선 적용됩니다.',
  aiBanner: (name) => `AI 추천: ${name} 님을 매니저로 추천합니다.`,
  aiTag: 'AI 추천',
  later: '나중에 (AI 분류 사용)',
  confirm: '확인',
  close: '닫기',
};

export default function ManagerAssignModal({ candidates = [], icons, baseUrl = '', onClose, onConfirm, onLater, labels, renderAvatar }) {
  const L = { ...MANAGER_ASSIGN_DEFAULT_LABELS, ...(labels || {}) };
  const recommended = candidates.find((c) => c.recommended) ?? candidates[0];
  const [selectedId, setSelectedId] = useState(recommended?.id);

  const selected = candidates.find((c) => c.id === selectedId);

  return (
    <ModalShell
      title={L.title}
      description={L.desc}
      titleId="ons-assign-title"
      closeLabel={L.close}
      onClose={onClose}
      zIndex={1000}
      className="ons-shell"
      bodyClassName="ons-shell-body"
      testId="manager-assign-modal"
      footer={
        <div className="ons-actions">
          <button type="button" className="ons-btn is-outline" onClick={() => onLater?.()}>{L.later}</button>
          <button type="button" className="ons-btn is-brand" onClick={() => onConfirm?.(selected)}>{L.confirm}</button>
        </div>
      }
    >
      {recommended && (
        <div className="ons-ai-banner">
          <Icon src={icons?.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span>{L.aiBanner(recommended.name)}</span>
        </div>
      )}
      <div className="ons-candidates">
        {candidates.map((c) => {
          const isSelected = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              className={`ons-candidate${isSelected ? ' is-selected' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <span className={`ons-radio${isSelected ? ' is-on' : ''}`} />
              <span className="ons-candidate-avatar">
                {renderAvatar
                  ? renderAvatar(c)
                  : c.avatar && <img src={c.avatar} alt="" draggable={false} />}
              </span>
              <span className="ons-candidate-info">
                <b className="ons-candidate-name">{c.name}</b>
                <span className="ons-candidate-role">{c.role}</span>
              </span>
              {c.recommended && (
                <StatusBadge className="ons-ai-tag">
                  <Icon src={icons?.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                  <span>{L.aiTag}</span>
                </StatusBadge>
              )}
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
