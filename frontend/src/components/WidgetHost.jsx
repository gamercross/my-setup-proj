// 위젯 호스트 — react-grid-layout 배치 컨테이너 (DO-1).
// - 단일 브레이크포인트 lg 만 사용한다 (breakpoints={{lg:0}}, cols={{lg:12}}).
//   창 폭이 줄면 WidthProvider 가 컨테이너 폭에 맞춰 아이템을 재배치하지만, 저장 레이아웃은 lg 하나뿐이라
//   브레이크포인트 드리프트가 원천적으로 없다 (R4 대응).
// - 편집 모드(editMode)일 때만 드래그·리사이즈 허용 (DO-5).
// - draggableHandle 은 .widget-titlebar, 그 안의 .widget-titlebar-btn 클릭은 드래그에서 제외.

import React from 'react';
// react-grid-layout 2.x 는 TS 재작성으로 최상위 진입점에서 WidthProvider·data-grid 를 뺐다.
// v1 flat props API(WidthProvider(Responsive) + data-grid) 는 공식 호환 경로인 /legacy 에 그대로 있다.
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
// react-resizable 은 RGL 의 전이 의존이지만 여기서 CSS 를 직접 import 하므로 package.json 에 정확 버전으로 명시했다.
import 'react-resizable/css/styles.css';
import WidgetFrame from './WidgetFrame';
import { getWidgetMeta } from '../widgets/registry.js';

// 모듈 스코프에서 1회만 생성한다 (렌더 함수 안에서 만들면 매 렌더 리마운트됨).
const Grid = WidthProvider(Responsive);

// 인스턴스 → RGL 그리드 아이템
function toGridItem(inst, editMode) {
  const meta = getWidgetMeta(inst.type);
  const minW = meta ? meta.minSize.w : 2;
  const minH = meta ? meta.minSize.h : 2;
  const maxW = meta ? meta.maxSize.w : 12;
  const maxH = meta ? meta.maxSize.h : 24;
  return {
    i: inst.id,
    x: inst.x,
    y: inst.y,
    w: inst.w,
    h: inst.h,
    minW,
    minH: inst.minimized ? 1 : minH,
    maxW,
    maxH,
    isResizable: editMode && !inst.minimized,
  };
}

export default function WidgetHost({ instances, editMode, onLayoutChange }) {
  const layout = instances.map((inst) => toGridItem(inst, editMode));

  return (
    <Grid
      className="widget-grid"
      layouts={{ lg: layout }}
      breakpoints={{ lg: 0 }}
      cols={{ lg: 12 }}
      rowHeight={40}
      margin={[12, 12]}
      isDraggable={editMode}
      isResizable={editMode}
      draggableHandle=".widget-titlebar"
      draggableCancel=".widget-titlebar-btn"
      compactType="vertical"
      preventCollision={false}
      onLayoutChange={(current) => onLayoutChange(current)}
    >
      {instances.map((inst) => (
        <div key={inst.id} data-grid={toGridItem(inst, editMode)}>
          <WidgetFrame instance={inst} />
        </div>
      ))}
    </Grid>
  );
}
