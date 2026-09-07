// 위젯 설정 모달 (C6 — FR-WIDGET-05·06)
// - createPortal 로 document.body 에 중앙 모달 + 백드롭을 그린다 (위젯 프레임 overflow:hidden 클리핑 회피).
// - Esc / 백드롭 클릭으로 닫는다. role="dialog" aria-modal.
// - 자유 텍스트 입력 없음 (AC-6): 색은 input[type=color], 나머지는 select / range / checkbox.
// - 스타일은 인라인(WidgetPicker 패턴). 전역 CSS 변수만 쓴다 — --w-* 는 읽지 않는다(설정 창은 위젯 테마 영향 밖).
// - onChange(patch): patch 는 { theme: {...} } 또는 { display: {...} } — 이미 병합된 하위 객체.
//   updateConfig 의 1단 얕은 병합과 맞물리도록 여기서 instance.config 와 합쳐서 넘긴다.

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { THEME_PRESETS } from '../widgets/themePresets.js';
import { resolveDisplay } from '../widgets/displayConfig.js';

// input[type=color] 는 #rrggbb 만 받는다. 전역 기본값(현재 색과 동일).
const GLOBAL_DEFAULTS = { bg: '#f7f7f5', accent: '#2f6feb', text: '#1a1a1a' };

const BACKDROP_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
};

const CARD_STYLE = {
  width: '340px',
  maxHeight: '80vh',
  overflowY: 'auto',
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--card-radius)',
  padding: '14px',
  color: 'var(--text)',
  fontSize: '13px',
  boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
};

const ROW_STYLE = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' };
const TAB_BTN = (active) => ({
  flex: 1,
  background: active ? 'var(--accent)' : 'transparent',
  color: active ? 'var(--bg)' : 'var(--muted)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '4px 8px',
  fontSize: '12px',
  cursor: 'pointer',
});
const SELECT_STYLE = {
  background: 'var(--bg)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '2px 6px',
  fontSize: '12px',
};

// 유효한 #rrggbb 만 통과 (input[type=color] 초기값 안전)
function hexOrDefault(v, fallback) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

export default function WidgetSettings({ instance, configSchema, onChange, onClose }) {
  const [tab, setTab] = React.useState('theme');
  const theme = instance?.config?.theme && typeof instance.config.theme === 'object' ? instance.config.theme : {};
  const schema = configSchema && typeof configSchema === 'object' ? configSchema : {};
  const display = resolveDisplay(schema, instance?.config?.display);

  // Esc 로 닫기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 테마 한 키 갱신 → 기존 theme 와 병합해 전달
  const patchTheme = (key, value) => {
    onChange({ theme: { ...theme, [key]: value } });
  };
  // 표시 옵션 한 키 갱신
  const patchDisplay = (key, value) => {
    onChange({ display: { ...display, [key]: value } });
  };

  const schemaKeys = Object.keys(schema);

  const body = (
    <div style={BACKDROP_STYLE} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="위젯 설정"
        style={CARD_STYLE}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <strong>위젯 설정</strong>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px' }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button style={TAB_BTN(tab === 'theme')} onClick={() => setTab('theme')}>테마</button>
          <button style={TAB_BTN(tab === 'display')} onClick={() => setTab('display')}>표시</button>
        </div>

        {tab === 'theme' && (
          <div>
            <div style={ROW_STYLE}>
              <span>배경색</span>
              <input
                type="color"
                value={hexOrDefault(theme.bg, GLOBAL_DEFAULTS.bg)}
                onInput={(e) => patchTheme('bg', e.target.value)}
                onChange={(e) => patchTheme('bg', e.target.value)}
              />
            </div>
            <div style={ROW_STYLE}>
              <span>강조색</span>
              <input
                type="color"
                value={hexOrDefault(theme.accent, GLOBAL_DEFAULTS.accent)}
                onInput={(e) => patchTheme('accent', e.target.value)}
                onChange={(e) => patchTheme('accent', e.target.value)}
              />
            </div>
            <div style={ROW_STYLE}>
              <span>글자색</span>
              <input
                type="color"
                value={hexOrDefault(theme.text, GLOBAL_DEFAULTS.text)}
                onInput={(e) => patchTheme('text', e.target.value)}
                onChange={(e) => patchTheme('text', e.target.value)}
              />
            </div>
            <div style={ROW_STYLE}>
              <span>모서리 ({Number.isFinite(Number(theme.radius)) ? Math.round(Number(theme.radius)) : 8}px)</span>
              <input
                type="range"
                min={0}
                max={24}
                step={1}
                value={Number.isFinite(Number(theme.radius)) ? Number(theme.radius) : 8}
                onChange={(e) => patchTheme('radius', Number(e.target.value))}
              />
            </div>
            <div style={ROW_STYLE}>
              <span>밀도</span>
              <select
                style={SELECT_STYLE}
                value={theme.density === 'compact' ? 'compact' : 'comfortable'}
                onChange={(e) => patchTheme('density', e.target.value)}
              >
                <option value="comfortable">여유</option>
                <option value="compact">촘촘</option>
              </select>
            </div>
            <div style={ROW_STYLE}>
              <span>타이틀바</span>
              <select
                style={SELECT_STYLE}
                value={['solid', 'ghost', 'hidden'].includes(theme.titlebar) ? theme.titlebar : 'solid'}
                onChange={(e) => patchTheme('titlebar', e.target.value)}
              >
                <option value="solid">기본</option>
                <option value="ghost">투명</option>
                <option value="hidden">숨김</option>
              </select>
            </div>

            <div style={{ marginTop: '14px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>프리셋</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onChange({ theme: { ...p.theme } })}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      padding: '6px 4px',
                      color: 'var(--text)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: '10px', height: '10px', borderRadius: '999px', background: p.theme.accent, display: 'inline-block' }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onChange({ theme: {} })}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '5px',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                테마 초기화
              </button>
            </div>
          </div>
        )}

        {tab === 'display' && (
          <div>
            {schemaKeys.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>표시 옵션 없음</p>
            ) : (
              schemaKeys.map((key) => {
                const spec = schema[key];
                const val = display[key];
                if (spec.type === 'enum') {
                  return (
                    <div key={key} style={ROW_STYLE}>
                      <span>{spec.label || key}</span>
                      <select style={SELECT_STYLE} value={val} onChange={(e) => patchDisplay(key, e.target.value)}>
                        {spec.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (spec.type === 'bool') {
                  return (
                    <div key={key} style={ROW_STYLE}>
                      <span>{spec.label || key}</span>
                      <input type="checkbox" checked={!!val} onChange={(e) => patchDisplay(key, e.target.checked)} />
                    </div>
                  );
                }
                if (spec.type === 'number') {
                  return (
                    <div key={key} style={ROW_STYLE}>
                      <span>{spec.label || key} ({val})</span>
                      <input
                        type="range"
                        min={spec.min}
                        max={spec.max}
                        step={spec.step || 1}
                        value={val}
                        onChange={(e) => patchDisplay(key, Number(e.target.value))}
                      />
                    </div>
                  );
                }
                return null;
              })
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
