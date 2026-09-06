// 표시 옵션 해석 (C6 — FR-WIDGET-06 AC-3 단일 구현)
// - configSchema 에 정의된 키만, 타입·범위를 통과한 값만 채택하고 나머지는 default.
// - 순수 함수. 스키마 밖 키는 완전히 무시한다.
//
// 스키마 엔트리 형태:
//   { type: 'enum', options: [...], default, label }
//   { type: 'bool', default, label }
//   { type: 'number', min, max, step, default, label }

export function resolveDisplay(configSchema, display) {
  const schema = configSchema && typeof configSchema === 'object' ? configSchema : {};
  const src = display && typeof display === 'object' && !Array.isArray(display) ? display : {};
  const out = {};

  for (const key of Object.keys(schema)) {
    const spec = schema[key];
    if (!spec || typeof spec !== 'object') continue;
    const raw = src[key];

    if (spec.type === 'enum') {
      out[key] = Array.isArray(spec.options) && spec.options.includes(raw) ? raw : spec.default;
    } else if (spec.type === 'bool') {
      out[key] = typeof raw === 'boolean' ? raw : spec.default;
    } else if (spec.type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        const min = Number.isFinite(spec.min) ? spec.min : -Infinity;
        const max = Number.isFinite(spec.max) ? spec.max : Infinity;
        let v = Math.max(min, Math.min(max, n));
        // step 스냅 — 손상된 localStorage 방어 (min 기준 격자에 맞춤)
        const step = Number.isFinite(spec.step) && spec.step > 0 ? spec.step : 0;
        if (step > 0 && Number.isFinite(min)) {
          v = Math.round((v - min) / step) * step + min;
          v = Math.max(min, Math.min(max, v));
        }
        out[key] = v;
      } else {
        out[key] = spec.default;
      }
    } else {
      out[key] = spec.default;
    }
  }

  return out;
}
