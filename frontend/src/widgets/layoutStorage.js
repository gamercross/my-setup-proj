// 레이아웃 영속화 (ADR-0021, DO-3)
// - localStorage 에 dashboard.layout.v1 로 저장. 프론트만 검증(DO-4), 백엔드/SQLite 없음.
// - dev(vite: http://localhost:5173) 와 prod(Electron: file://) 는 서로 다른 origin 이라
//   localStorage 저장소가 자동 분리된다 (개발 중 실험 레이아웃이 배포본에 새지 않음).
// - 모든 입출력은 try/catch. 손상/버전불일치 시 null 을 돌려주고 호출측이 기본값으로 폴백한다.

import { getWidgetMeta } from './registry.js';
import { cloneDefaultInstances } from './defaultLayout.js';

export const STORAGE_KEY = 'dashboard.layout.v1';
export const SCHEMA_VERSION = 1;
export const COLS = 12;

// 숫자를 [min, max] 로 clamp. 유효하지 않으면 fallback.
function clampNum(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// 인스턴스 1건 정규화. 유효하지 않으면 null.
function sanitizeOne(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = typeof raw.type === 'string' ? raw.type : null;
  const id = typeof raw.id === 'string' ? raw.id : null;
  if (!type || !id) return null;

  // 미등록 타입도 데이터는 보존한다 (FR-WIDGET-08 AC-2 — 낯선 위젯은 자리표시자로 표시).
  const meta = getWidgetMeta(type);
  const minW = meta ? meta.minSize.w : 2;
  const minH = meta ? meta.minSize.h : 2;
  const maxW = meta ? meta.maxSize.w : COLS;

  let x = clampNum(raw.x, 0, COLS - 1, 0);
  // w 는 [minW, COLS-x]. 만약 x 가 너무 오른쪽이라 minW 도 못 들어가면 x 를 되당긴다.
  if (COLS - x < minW) {
    x = Math.max(0, COLS - minW);
  }
  const w = clampNum(raw.w, minW, Math.max(minW, Math.min(maxW, COLS - x)), minW);
  const y = clampNum(raw.y, 0, Number.MAX_SAFE_INTEGER, 0);
  const h = clampNum(raw.h, 1, 100, Math.max(1, minH));
  const z = clampNum(raw.z, 0, Number.MAX_SAFE_INTEGER, 1);

  const one = {
    id,
    type,
    x,
    y,
    w,
    h,
    z,
    minimized: raw.minimized === true,
    config: raw.config && typeof raw.config === 'object' ? raw.config : {},
  };
  // 최소화 복원용 이전 높이 — 실제 number 일 때만 보존 (null 은 Number(null)=0 이므로 명시적으로 배제)
  if (typeof raw.prevH === 'number' && Number.isFinite(raw.prevH)) {
    one.prevH = clampNum(raw.prevH, 1, 100, h);
  }
  return one;
}

// 배열 정규화 + 중복 id 제거(첫 항목만 유지).
export function sanitizeInstances(list) {
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const one = sanitizeOne(raw);
    if (!one) continue;
    if (seen.has(one.id)) continue;
    seen.add(one.id);
    out.push(one);
  }
  return out;
}

// 저장된 레이아웃을 읽는다. 없거나 손상/버전불일치면 null.
export function loadLayout() {
  try {
    const rawStr = window.localStorage.getItem(STORAGE_KEY);
    if (!rawStr) return null;
    const parsed = JSON.parse(rawStr);
    if (!parsed || parsed.version !== SCHEMA_VERSION) return null;
    const instances = sanitizeInstances(parsed.instances);
    if (!instances || instances.length === 0) return null;
    return instances;
  } catch (err) {
    console.warn('레이아웃 불러오기 실패 — 기본값으로 폴백합니다.', err);
    return null;
  }
}

// 레이아웃을 저장한다. 용량 초과 등은 무시(경고만).
export function saveLayout(instances) {
  try {
    const payload = JSON.stringify({ version: SCHEMA_VERSION, instances });
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    // QuotaExceededError 등 — 저장 실패해도 앱은 계속 동작한다
    console.warn('레이아웃 저장 실패 (무시).', err);
  }
}

// 초기화용 기본 인스턴스 복사본
export function defaultInstances() {
  return cloneDefaultInstances();
}
