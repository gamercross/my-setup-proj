// 테스트용 인메모리 localStorage 스텁 — node --test 환경엔 window 가 없다.
export function installFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  const fake = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
  };
  globalThis.window = { localStorage: fake };
  return fake;
}
