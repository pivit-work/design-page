import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrComposeFullModal — 개인 OKR 작성 풀스크린 모달.
 *
 * 좌측: 팀 OKR 미니맵(회사 OKR + 팀 Objective 그룹/KR). KR 의 + 버튼을
 * 누르면 해당 팀 KR 에 연결된 Objective/KR 편집 카드가 우측에 추가되고
 * 미니맵 행이 초록으로 하이라이트된다. 우측: 비어 있으면 빈 상태 안내,
 * [직접추가/Objective 추가]로 편집 카드를 추가한다.
 *
 * minimap: { company: { label, title }, title, groups: [{ q, title,
 *   krs: [{ id, title, percent }] }] }
 */
const METHODS = [
  { key: 'rate1', label: '% 달성률', desc: '0~100% 직접 입력' },
  { key: 'rate2', label: '% 달성률', desc: '0~100% 직접 입력' },
  { key: 'count', label: '개수 달성', desc: 'n/ 목표 개수' },
];

let objectiveSeq = 0;

function emptyObjective(linkedKr) {
  objectiveSeq += 1;
  return {
    key: `obj-${objectiveSeq}`,
    linkedKr: linkedKr || null,
    krs: linkedKr ? [{ key: `kr-${objectiveSeq}-1`, linked: linkedKr.title }] : [],
  };
}

export default function OkrComposeFullModal({ minimap, icons, baseUrl = '', onClose }) {
  const [objectives, setObjectives] = useState([]);
  const [linkedIds, setLinkedIds] = useState({});

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addObjective = (linkedKr) => setObjectives((prev) => [...prev, emptyObjective(linkedKr)]);
  const removeObjective = (key) => setObjectives((prev) => prev.filter((o) => o.key !== key));
  const addKr = (objKey) => setObjectives((prev) => prev.map((o) => (
    o.key === objKey ? { ...o, krs: [...o.krs, { key: `${objKey}-kr-${o.krs.length + 1}` }] } : o
  )));
  const removeKr = (objKey, krKey) => setObjectives((prev) => prev.map((o) => (
    o.key === objKey ? { ...o, krs: o.krs.filter((k) => k.key !== krKey) } : o
  )));
  const linkTeamKr = (groupIdx, krIdx, kr) => {
    setLinkedIds((prev) => ({ ...prev, [`${groupIdx}-${krIdx}`]: true }));
    addObjective(kr);
  };

  return (
    <div className="okr-modal-overlay">
      <div className="okr-cf-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>

        <div className="okr-cf-header">
          <p className="okr-cf-eyebrow">팀 OKR 미니맵</p>
          <p className="okr-cf-title">{minimap.title}</p>
        </div>

        <div className="okr-cf-body">
          <div className="okr-cf-minimap">
            <div className="okr-cf-company">
              <p className="okr-cf-company-label">{minimap.company.label}</p>
              <p className="okr-cf-company-title">{minimap.company.title}</p>
            </div>
            {minimap.groups.map((group, gi) => (
              <div className="okr-cf-group" key={group.title}>
                <div className="okr-cf-group-head">
                  <span className="okr-cf-group-q">{group.q}</span>
                  <span className="okr-cf-group-title">{group.title}</span>
                </div>
                {group.krs.map((kr, ki) => (
                  <div className={`okr-cf-kr${linkedIds[`${gi}-${ki}`] ? ' is-linked' : ''}`} key={kr.id + kr.title}>
                    <button className="okr-cf-kr-add" onClick={() => linkTeamKr(gi, ki, kr)}>
                      <Icon src={icons.plus} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
                    </button>
                    <div className="okr-cf-kr-main">
                      <p className="okr-cf-kr-title"><b>{kr.id}</b> {kr.title}</p>
                      <div className="okr-cf-kr-progress">
                        <OkrProgressBar percent={kr.percent} variant="success" />
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="okr-cf-editor">
            <div className="okr-cf-editor-head">
              <p className="okr-cf-hint">좌측 팀 OKR 미니맵에서 + 를 클릭하면 해당 팀 KR에 연결된 개인 KR이 자동 추가됩니다.</p>
              <button className="okr-cf-add-btn" onClick={() => addObjective()}>
                <Icon src={icons.plus} size={18} color="var(--text-white)" baseUrl={baseUrl} />
                <span>{objectives.length ? 'Objective 추가' : '직접추가'}</span>
              </button>
            </div>

            {objectives.length === 0 ? (
              <div className="okr-cf-empty">
                <p className="okr-cf-empty-title">개인 OKR을 시작해보세요</p>
                <p className="okr-cf-empty-desc">우측 팀 OKR 미니맵에서 + 를 클릭하거나<br />AI 생성 · 직접 추가로 시작하세요</p>
              </div>
            ) : (
              objectives.map((objective) => (
                <div className="okr-cf-objective" key={objective.key}>
                  <div className="okr-cf-obj-head">
                    <span className="okr-p-caret is-open">
                      <Icon src={icons.chevronDown} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                    </span>
                    <span className="okr-cf-obj-label">Objective</span>
                    <input className="okr-cf-input" placeholder="Objective 내용" defaultValue={objective.linkedKr ? `${objective.linkedKr.title} 기여` : ''} />
                    <button className="okr-cf-x" onClick={() => removeObjective(objective.key)}>
                      <Icon src={icons.xClose} size={18} color="var(--text-tertiary)" baseUrl={baseUrl} />
                    </button>
                  </div>
                  <div className="okr-cf-obj-meta">
                    <input className="okr-cf-input is-sm" placeholder="가중치 %" />
                    <span className="okr-cf-unit">%</span>
                    <div className="okr-cf-select">담당자 <span className="okr-cf-select-caret">⌄</span></div>
                    <div className="okr-cf-select is-wide">• 팀 Objective 연결 (선택)</div>
                  </div>

                  {objective.krs.map((kr) => (
                    <div className="okr-cf-kr-card" key={kr.key}>
                      <div className="okr-cf-kr-card-head">
                        <span className="okr-cf-bullet" />
                        <input className="okr-cf-input" placeholder="KR 내용" defaultValue={kr.linked || ''} />
                        <span className="okr-cf-improve">개선</span>
                        <button className="okr-cf-x" onClick={() => removeKr(objective.key, kr.key)}>
                          <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                        </button>
                      </div>
                      <div className="okr-cf-methods">
                        {METHODS.map((method, mi) => (
                          <div className={`okr-cf-method${mi === 2 ? ' is-active' : ''}`} key={method.key}>
                            <p className="okr-cf-method-label">{method.label}</p>
                            <p className="okr-cf-method-desc">{method.desc}</p>
                          </div>
                        ))}
                      </div>
                      <div className="okr-cf-kr-meta">
                        <input className="okr-cf-input is-sm" placeholder="100" />
                        <input className="okr-cf-input is-sm" placeholder="개" />
                        <input className="okr-cf-input is-sm" placeholder="가중치" />
                        <span className="okr-cf-unit">%</span>
                        <div className="okr-cf-select">담당자 <span className="okr-cf-select-caret">⌄</span></div>
                        <div className="okr-cf-select">{(objective.linkedKr?.title || '팀 KR 연결').slice(0, 12)}… <span className="okr-cf-select-caret">⌄</span></div>
                      </div>
                    </div>
                  ))}

                  <button className="okr-cf-kr-add-btn" onClick={() => addKr(objective.key)}>
                    <Icon src={icons.plus} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
                    <span>KR 직접추가</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
