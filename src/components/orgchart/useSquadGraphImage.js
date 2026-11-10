import { useState } from 'react';
import exportOrgChartImage, { buildFontEmbedCSS } from './exportOrgChartImage.js';
import { pad2, toIso } from './asOfDate.js';

/**
 * 스쿼드 그림(«구조»·«연결») 툴바의 [이미지로 다운] — 조직도 트리 탭과 같은 버튼·같은 받기
 * (pivit-work PW-2599 4회차 · 2026-11-10 커트 결정).
 *
 * 호스트가 `onDownloadImage({ element, branch })` 를 주면 그것을 부른다 — pivit-work 는 조직도 트리 탭과 같은
 * 받기(PNG · 이용 정지 회사 막기 · 실패 안내)를 쓴다. 안 주면 여기서 바로 JPG 로 뜬다(조직도 OrgChartViewport 와 같다).
 * `element` 는 그림 전체(배율·이동을 걷어 낸 원래 크기로 뜬다), `branch` 는 'tree'(구조) | 'link'(연결).
 * 뜨는 동안 버튼을 잠근다 — 두 번 눌러 두 장 받지 않게.
 *
 * 호스트에는 `fontEmbedCSS`(그림이 쓰는 글꼴을 심은 CSS)도 함께 넘긴다. 글꼴을 안 심고 뜨면 대체 글꼴이 화면 글꼴보다 넓어
 * 카드 폭은 그대로인데 글자만 늘어, 카드 이름이 «…»로 잘리고 스쿼드 카드 둘째 줄이 꺾여 접기 단추에 가렸다(4회차 브라우저 확인).
 * 글꼴을 못 받으면 빈 값이다 — 그때도 그림은 나온다.
 */
export default function useSquadGraphImage({ onDownloadImage, L }) {
  const [exporting, setExporting] = useState(false);
  const download = async (element, branch) => {
    if (exporting || !element) return;
    setExporting(true);
    try {
      if (onDownloadImage) {
        let fontEmbedCSS = '';
        try { fontEmbedCSS = await buildFontEmbedCSS(element); } catch { fontEmbedCSS = ''; }
        await onDownloadImage({ element, branch, fontEmbedCSS });
      } else {
        const now = new Date();
        const time = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
        const key = branch === 'link' ? 'squad.graph.imageFileName' : 'squad.struct.imageFileName';
        await exportOrgChartImage({ element, fileName: L(key, { date: toIso(now), time }) });
      }
    } finally {
      setExporting(false);
    }
  };
  return { download, exporting };
}
