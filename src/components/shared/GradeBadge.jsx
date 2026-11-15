import StatusBadge from './StatusBadge.jsx';

/* 평가 등급 딱지 — 디자이너 점수 딱지(manager.css .mgr-ts-score: 연한 바탕 · 진한 글자 · r10 · 14/500)의 모양.
   전에는 기획 시안의 등급별 색 상자(44 정사각, 18px 800, 색 6벌 hex)였다. 색은 공용 딱지 뜻(tone)으로 고른다 —
   상위 등급은 «충족», 중간은 «중립», 하위는 «주의»·«위험». 표에 없는 라벨(템플릿이 정한 「탁월」 등)은 중립.
   딱지가 글자 폭만큼 늘어나 긴 라벨도 넘치지 않는다(예전 글자 크기 줄이기 계산이 필요 없다).
   내 설정 «성과 정보»와 어드민 구성원 상세 «성과» 묶음(pivit-work PW-2818)이 같은 출처의 같은 값을 보여서 같은 딱지를 쓴다. */
const GRADE_TONE = { S: 'success', 'A+': 'success', A: 'success', 'B+': 'neutral', B: 'neutral', C: 'warning', D: 'danger' };

export default function GradeBadge({ grade, ...rest }) {
  return (
    <StatusBadge tone={GRADE_TONE[grade] || 'neutral'} className="msc-grade-badge" {...rest}>
      {grade}
    </StatusBadge>
  );
}
