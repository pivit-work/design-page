import { useRef, useState } from 'react';
import { ReportCanvas } from './components';
import { DEMO_WEEKLY_REPORT } from './components/timeline/weekly-demo-data.js';

/**
 * ReportPage — "리포트" 페이지 demo wrapper.
 *
 * 기존 타임라인 페이지의 Weekly 탭에 있던 demo 데이터/생성 시뮬레이션을
 * 그대로 가져와 별도 페이지로 분리. 4초 가짜 생성 후 DEMO_WEEKLY_REPORT 주입.
 */
export default function ReportPage({ baseUrl }) {
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generateTimerRef = useRef(null);

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    generateTimerRef.current = setTimeout(() => {
      setReport(DEMO_WEEKLY_REPORT);
      setIsGenerating(false);
    }, 4000);
  };

  return (
    <ReportCanvas
      baseUrl={baseUrl}
      count={34}
      report={report}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
    />
  );
}
