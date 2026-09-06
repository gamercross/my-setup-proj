// Supabase 클라이언트 부트스트랩 — ADR-0008 후속. 연결 배선만 한다.
// SQLite 가 진실의 원천(ADR-0015). 이 모듈은 앱 부팅·요청 경로에 관여하지 않는다.
// 동기화 로직은 backend/src/services/sync.js 로 분리 예정(E2). 여기서는 클라이언트 제공까지만.

let createClient = null;
try {
  // @supabase/supabase-js 는 선택적 의존성처럼 취급한다(미설치여도 앱은 뜬다).
  ({ createClient } = require('@supabase/supabase-js'));
} catch (err) {
  createClient = null;
}

// 연결 프로브용 가짜 테이블 이름. 실제로 만들지 않는다(없어도 정상으로 판정).
const PROBE_TABLE = '_connection_probe';

// 모듈 스코프 상태(지연 생성 싱글턴 + 1회 경고).
let cached = null;
let warned = false;
// fetch 래퍼가 참조하는 현재 연결 확인의 cap 신호(best-effort). 실제 취소 보장은
// checkConnection 지역 controller + .abortSignal() 로 한다.
let capSignalRef = null;

// 네트워크 도달 실패로 볼 상류 에러 패턴(대소문자 무시).
const NET_RE = /abort|aborted|fetch failed|network|ENOTFOUND|EAI_AGAIN|getaddrinfo|ECONNREFUSED|timeout|timed out/i;

// SUPABASE_URL·SUPABASE_KEY 가 둘 다 비어있지 않은 문자열이면 설정된 것으로 본다.
function isConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  return typeof url === 'string' && url.trim() !== '' && typeof key === 'string' && key.trim() !== '';
}

// 타임아웃(ms). 미설정·비정상 값이면 기본 3000.
function timeoutMs() {
  const raw = Number(process.env.SUPABASE_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 3000;
}

// 지연 생성 싱글턴. 미설정이거나 패키지 미설치면 null + 프로세스당 1회 경고(test 환경은 무음).
function getSupabaseClient() {
  if (cached) return cached;
  if (!isConfigured() || !createClient) {
    if (!warned && process.env.NODE_ENV !== 'test') {
      console.warn('[supabase] SUPABASE_URL/SUPABASE_KEY 미설정 — 동기화 비활성 (앱 동작에는 영향 없음)');
      warned = true;
    }
    return null;
  }
  try {
    cached = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        // 매 요청에 타임아웃을 건다(무한 대기 방지). cap 신호로 전체 확인도 취소 가능.
        fetch: (input, init = {}) => {
          const signals = [AbortSignal.timeout(timeoutMs())];
          if (capSignalRef) signals.push(capSignalRef);
          return fetch(input, { ...init, signal: AbortSignal.any(signals) });
        },
      },
    });
    return cached;
  } catch (err) {
    if (!warned && process.env.NODE_ENV !== 'test') {
      console.warn('[supabase] 클라이언트 생성 실패:', err && err.message);
      warned = true;
    }
    return null;
  }
}

// SUPABASE_URL 에서 host 만 추출(로그·응답에 원본 URL/키를 노출하지 않기 위함).
function safeHost() {
  try {
    return new URL(process.env.SUPABASE_URL).host;
  } catch (err) {
    return null;
  }
}

// 연결 확인. status ∈ 'ok' | 'unconfigured' | 'error'.
// 반환: { status, detail, host? }
async function checkConnection() {
  if (!isConfigured()) {
    // 네트워크에 접촉하지 않는다.
    return { status: 'unconfigured', detail: 'SUPABASE_URL/SUPABASE_KEY 미설정' };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { status: 'error', detail: 'Supabase 클라이언트를 만들 수 없습니다 (@supabase/supabase-js 미설치 가능)' };
  }

  const host = safeHost();
  // supabase-js 는 네트워크 오류 시 내부적으로 재시도한다. 전체 소요를 한 번 더 캡핑하고,
  // cap 초과 시 지역 controller 로 진행 중/이후 요청을 즉시 끊는다.
  const controller = new AbortController();
  const capMs = timeoutMs() * 2 + 500;
  const capTimer = setTimeout(() => controller.abort(), capMs);
  capTimer.unref();
  capSignalRef = controller.signal;
  try {
    const { error } = await client
      .from(PROBE_TABLE)
      .select('id', { head: true, count: 'exact' })
      .abortSignal(controller.signal);
    if (!error) {
      return { status: 'ok', detail: '연결됨', host };
    }

    const code = String(error.code || '');
    const msg = String(error.message || '');

    // 1) 테이블·스키마 없음 → 연결 자체는 성공(정상)
    if (code === 'PGRST205' || code === '42P01' || /does not exist|schema cache/i.test(msg)) {
      return { status: 'ok', detail: '연결됨 (프로브 테이블 없음 — 정상)', host };
    }
    // 2) 인증 실패
    if (/Invalid API key|\b401\b|\b403\b/i.test(msg) || error.status === 401 || error.status === 403) {
      return { status: 'error', detail: '인증 실패 — SUPABASE_KEY 확인', host };
    }
    // 3) 네트워크 도달 불가/시간 초과 (상류 에러 문자열)
    if (NET_RE.test(msg)) {
      return { status: 'error', detail: '네트워크 도달 불가 또는 시간 초과', host };
    }
    // 4) 그 외 오류 — 메시지 앞 200자만
    return { status: 'error', detail: msg.slice(0, 200) || '알 수 없는 오류', host };
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (NET_RE.test(msg) || (err && (err.name === 'AbortError' || err.name === 'TimeoutError'))) {
      return { status: 'error', detail: '네트워크 도달 불가 또는 시간 초과', host };
    }
    return { status: 'error', detail: msg.slice(0, 200) || '알 수 없는 오류', host };
  } finally {
    clearTimeout(capTimer);
    if (capSignalRef === controller.signal) capSignalRef = null;
  }
}

module.exports = { isConfigured, getSupabaseClient, checkConnection };
