import { useState } from 'react';
import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrBoard from './OkrBoard.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';

/**
 * OkrPersonalCanvas — 개인 OKR 탭 콘텐츠 (스크롤 페이지).
 *
 * data: { person, periodLabel, links, parents, banner?, insights, overall,
 *   theme, objectives, history } — 데모 데이터는 wrapper(OkrPage)가 소유한다.
 * 기간 칩(현재/히스토리) 전환과 프로필·연결된 상위 OKR 를 담당하고,
 * 보드(인사이트·달성률·테이블·모달)는 공용 OkrBoard 가 처리한다. banner 는
 * team/company 처럼 OkrBoard 로 전달해 라벨·새로고침 표시를 커스터마이즈한다.
 */
export default function OkrPersonalCanvas({ data, icons, baseUrl = '', onKrUpdate, onSubmitFeedback, onSubmitReply, onRequestFeedback }) {
  const { person, periodLabel, links, parents, banner, insights, overall, theme, objectives, history } = data;
  const [periodTab, setPeriodTab] = useState('current'); // 'current' | 'history'

  return (
    <div className="okr-personal-area">
      <div className="okr-p-profile">
        <img className="okr-p-avatar" src={person.avatar} alt={person.name} draggable={false} />
        <div>
          <p className="okr-p-name">{person.name}</p>
          <p className="okr-p-role">{person.role}</p>
        </div>
      </div>

      <div className="okr-p-period">
        <button className={`okr-p-period-btn${periodTab === 'current' ? ' is-active' : ''}`} onClick={() => setPeriodTab('current')}>{periodLabel}</button>
        <button className={`okr-p-period-btn${periodTab === 'history' ? ' is-active' : ''}`} onClick={() => setPeriodTab('history')}>히스토리</button>
      </div>

      {periodTab === 'history' ? (
        <div className="okr-h-list">
          {history?.map((quarter) => (
            <OkrHistoryQuarter key={quarter.label} quarter={quarter} icons={icons} baseUrl={baseUrl} />
          ))}
        </div>
      ) : (
        <>
          <OkrLinkedParents links={links} parents={parents} />
          <OkrBoard board={{ banner, insights, overall, theme, objectives }} icons={icons} baseUrl={baseUrl} onKrUpdate={onKrUpdate} onSubmitFeedback={onSubmitFeedback} onSubmitReply={onSubmitReply} onRequestFeedback={onRequestFeedback} />
        </>
      )}
    </div>
  );
}
