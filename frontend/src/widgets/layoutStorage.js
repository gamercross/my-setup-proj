// 레이아웃 영속화 — 주제별 (ADR-0021 / ADR-0032, DO-3)
// - localStorage 에 dashboard.layout.v2 로 저장. 포맷 { version: 2, topics: { [topicId]: Instance[] } }.
// - 프론트만 검증(DO-4), 백엔드/SQLite 없음.
// - dev(vite: http://localhost:5173) 와 prod(Electron: file://) 는 서로 다른 origin 이라
//   localStorage 저장소가 자동 분리된다.
// - 모든 입출력은 try/catch. 손상/버전불일치 시 null(주제 없음) / {} (전체 없음) 로 폴백한다.
// - v1(dashboard.layout.v1, 단일 그리드) 은 최초 로드 시 overview 주제로 1회 마이그레이션한다.

// 순수 메타(widgetMeta.js)만 참조한다 — registry.js 는 JSX view 를 import 하므로
// node --test(.mjs) 에서 이 파일을 직접 검증할 수 있도록 의존을 끊는다.
import { WIDGET_META } from './widgetMeta.js';
import { cloneDefaultInstances } from './defaultLayout.js';
import { DEFAULT_TOPIC_ID } from './topics.js';

function getWidgetMeta(type) {
  return WIDGET_META[type] ?? null;
}

export const STORAGE_KEY = 'dashboard.layout.v2';
export const LEGACY_KEY_V1 = 'dashboard.layout.v1';
export const SCHEMA_VERSION = 2;
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

  // 미등록 타입도 데이터는 보존한다 (FR-WIDGET-08 AC-2).
  const meta = getWidgetMeta(type);
  const minW = meta ? meta.minSize.w : 2;
  const minH = meta ? meta.minSize.h : 2;
  const maxW = meta ? meta.maxSize.w : COLS;

  let x = clampNum(raw.x, 0, COLS - 1, 0);
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

// 주제 맵 { [topicId]: Instance[] } 정규화. 객체 아니면 null.
// - 각 키를 sanitizeInstances 로 통과시키고, 비었거나 null 이면 그 키를 버린다.
// - 미등록 topicId 키는 그대로 보존한다 (FR-WIDGET-08 정신 — 낯선 데이터 파기 금지).
function sanitizeTopicMap(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [topicId, list] of Object.entries(raw)) {
    const instances = sanitizeInstances(list);
    if (!instances || instances.length === 0) continue;
    out[topicId] = instances;
  }
  return out;
}

// v1(단일 그리드) → v2 주제 맵. 마이그레이션 대상 없으면 null (v1 키는 건드리지 않는다).
function migrateV1() {
  const rawStr = window.localStorage.getItem(LEGACY_KEY_V1);
  if (!rawStr) return null;
  const parsed = JSON.parse(rawStr);
  if (!parsed || parsed.version !== 1) return null;
  const instances = sanitizeInstances(parsed.instances);
  if (!instances || instances.length === 0) return null;
  return { [DEFAULT_TOPIC_ID]: instances };
}

// 모듈 캐시 — 로드된 전체 주제 맵. saveTopicLayout 이 여기에 반영 후 통째로 저장한다.
let _cache = null;

// 전체 주제 맵을 읽는다. 손상/없음이면 {} (또는 v1 마이그레이션 결과).
export function loadAllTopics() {
  if (_cache) return _cache;
  try {
    const rawStr = window.localStorage.getItem(STORAGE_KEY);
    if (rawStr) {
      const parsed = JSON.parse(rawStr);
      if (parsed && parsed.version === SCHEMA_VERSION) {
        const map = sanitizeTopicMap(parsed.topics);
        if (map) {
          _cache = map;
          return _cache;
        }
      }
    }

    // v2 가 없거나 손상 → v1 마이그레이션 시도
    const migrated = migrateV1();
    if (migrated) {
      _cache = migrated;
      // v2 저장이 성공한 뒤에만 v1 키를 지운다 (저장 실패 시 원본 유지).
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: SCHEMA_VERSION, topics: _cache })
        );
        window.localStorage.removeItem(LEGACY_KEY_V1);
      } catch (err) {
        console.warn('레이아웃 저장 실패 (무시).', err);
      }
      return _cache;
    }

    _cache = {};
    return _cache;
  } catch (err) {
    console.warn('레이아웃 불러오기 실패 — 기본값으로 폴백합니다.', err);
    _cache = {};
    return _cache;
  }
}

// 한 주제의 저장 레이아웃. 없거나 비었으면 null → 호출측이 기본값으로 폴백.
export function loadTopicLayout(topicId) {
  const map = loadAllTopics();
  const list = map[topicId];
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.map((inst) => ({ ...inst, config: { ...inst.config } }));
}

// 한 주제의 레이아웃을 저장한다. 캐시 갱신 후 전체 맵을 통째로 저장.
export function saveTopicLayout(topicId, instances) {
  try {
    const map = loadAllTopics();
    map[topicId] = Array.isArray(instances) ? instances : [];
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, topics: map })
    );
  } catch (err) {
    console.warn('레이아웃 저장 실패 (무시).', err);
  }
}

// 초기화용 기본 인스턴스 복사본 (주제 스코프).
export function defaultInstancesFor(topicId) {
  return cloneDefaultInstances(topicId);
}

// 테스트용 — 모듈 캐시 리셋.
export function _resetLayoutCache() {
  _cache = null;
}
