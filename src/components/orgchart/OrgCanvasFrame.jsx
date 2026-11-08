import React from 'react';
import Icon from '../shared/Icon.jsx';
import {
  CornerAngleGlyph,
  CornerSmoothGlyph,
  ContractVerticalGlyph,
  ExpandVerticalGlyph,
} from '../shared/lineIcons.jsx';
import { useOrgLabels } from './orgchart-labels.jsx';

/**
 * OrgCanvasFrame — 조직도를 그리는 **판**(흰 판 · 점 무늬 · 안쪽 위 툴바 자리).
 *
 * 모양은 `OrgChartViewport` 에 있던 것을 그대로 떼어 냈다(stesslee 818e4785 · 1e4e63f9).
 * 조회 조직도와 pivit-work 어드민 «조직단위 설정»(PW-2645)이 같은 판을 쓴다 — 판·툴바를 고치면
 * 두 화면이 함께 바뀐다.
 *
 * 팬·줌 값(`usePanZoom`)은 쓰는 쪽이 갖고 넘긴다. 배율은 `transform: scale` 이 아니라 CSS `zoom` 으로
 * 건다 — `scale` 은 그려 둔 그림을 늘이고 줄여 글자가 흐려졌다(PW-2645). `zoom` 은 그 크기로 글자를
 * 다시 그린다. 이동(`translate`)은 바깥 상자에 따로 건다: `zoom` 이 걸린 요소의 이동값은 배율만큼
 * 함께 줄어들기 때문이다(Chrome 실측). 두 상자를 합친 모습은 예전 `translate(x,y) scale(s)`
 * (원점 0 0)과 같아, 화면 좌표로 재고 이동값에 더하는 계산은 그대로 맞는다.
 *
 * - `embedded` — 화면 고정 자리(`position: fixed`, 조직도 탭 자리) 대신 놓인 자리를 채운다. 높이는 쓰는 쪽이 준다.
 * - `toolbarLeft` · `toolbarRight` — 안쪽 위 16px 의 왼쪽·오른쪽 줄. 없으면 그 줄을 그리지 않는다.
 * - `children` — 트리. 점 무늬와 함께 움직이고 커진다.
 */
export default function OrgCanvasFrame({
  canvasRef,
  canvasProps,
  isDragging = false,
  scale = 1,
  translate = { x: 0, y: 0 },
  innerRef,
  className = '',
  embedded = false,
  style,
  testId,
  innerTestId,
  toolbarLeft,
  toolbarRight,
  toolbarLeftTestId = 'org-toolbar-left',
  toolbarRightTestId = 'org-toolbar-right',
  children,
}) {
  return (
    <div
      className={`canvas-area${embedded ? ' is-embedded' : ''}${className ? ` ${className}` : ''}`}
      ref={canvasRef}
      {...canvasProps}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', ...style }}
      data-testid={testId}
    >
      <div
        data-canvas-pan=""
        data-scale={scale}
        style={{ transform: `translate(${translate.x}px, ${translate.y}px)` }}
      >
        <div className="canvas-inner" ref={innerRef} data-testid={innerTestId} style={{ zoom: scale, position: 'relative' }}>
          {children}
        </div>
      </div>
      {toolbarLeft && (
        <div className="org-toolbar org-toolbar-left" data-testid={toolbarLeftTestId}>
          {toolbarLeft}
        </div>
      )}
      {toolbarRight && (
        <div className="org-toolbar org-toolbar-right" data-testid={toolbarRightTestId}>
          {toolbarRight}
        </div>
      )}
    </div>
  );
}

/** 툴바 버튼 하나 — 36×36 · 옅은 바탕(`.org-tool-btn`). 툴팁(`title`)과 읽기 이름(`aria-label`)을 함께 단다. */
export function OrgToolButton({ label, title, children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`org-tool-btn${className ? ` ${className}` : ''}`}
      title={title ?? label}
      aria-label={label}
      {...rest}
    >
      {children}
    </button>
  );
}

/** 오른쪽 툴바의 버튼 묶음(간격 11). */
export function OrgToolbarGroup({ children }) {
  return <div className="org-toolbar-group">{children}</div>;
}

/** 확대 · 축소 — 아이콘은 조직도와 같은 그림 파일(`icons.plus`·`icons.minus`). */
export function OrgZoomButtons({ onZoomIn, onZoomOut, icons, baseUrl = '', L: labels, zoomInProps, zoomOutProps }) {
  const fallback = useOrgLabels();
  const L = labels ?? fallback;
  return (
    <>
      <OrgToolButton label={L('org.zoomIn')} onClick={onZoomIn} data-action="zoom-in" {...zoomInProps}>
        <Icon src={icons.plus} size={20} color="var(--fg-primary)" baseUrl={baseUrl} />
      </OrgToolButton>
      <OrgToolButton label={L('org.zoomOut')} onClick={onZoomOut} data-action="zoom-out" {...zoomOutProps}>
        <Icon src={icons.minus} size={20} color="var(--fg-primary)" baseUrl={baseUrl} />
      </OrgToolButton>
    </>
  );
}

/** 연결선 모양 토글 — 아이콘은 «지금» 모양을 그린다(직각이면 꺾인 모서리). */
export function OrgLineStyleToggle({ lineStyle, onChange, label, L: labels, ...rest }) {
  const fallback = useOrgLabels();
  const L = labels ?? fallback;
  const ortho = lineStyle === 'ortho';
  return (
    <OrgToolButton
      label={label}
      title={L(ortho ? 'org.lineStyleOrtho' : 'org.lineStyleCurve')}
      aria-pressed={ortho}
      data-line-style={lineStyle}
      onClick={() => onChange(ortho ? 'curve' : 'ortho')}
      {...rest}
    >
      {ortho ? <CornerAngleGlyph size={20} /> : <CornerSmoothGlyph size={20} />}
    </OrgToolButton>
  );
}

/** 전체 펼치기/접기 토글 — 아이콘은 지금 상태, 이름·속성은 «누르면 할 일». */
export function OrgExpandAllToggle({ allCollapsed, onExpandAll, onCollapseAll, L: labels, ...rest }) {
  const fallback = useOrgLabels();
  const L = labels ?? fallback;
  return (
    <OrgToolButton
      label={L(allCollapsed ? 'org.expandAll' : 'org.collapseAll')}
      aria-pressed={allCollapsed}
      data-action={allCollapsed ? 'expand-all' : 'collapse-all'}
      onClick={allCollapsed ? onExpandAll : onCollapseAll}
      {...rest}
    >
      {allCollapsed ? <ExpandVerticalGlyph size={20} /> : <ContractVerticalGlyph size={20} />}
    </OrgToolButton>
  );
}
