#!/usr/bin/env node
// 데모↔실서버 경로 패리티 자동 검사 (ADR-0026 부록)
//
//   node scripts/check-demo-parity.mjs          대조 판정
//   node scripts/check-demo-parity.mjs --list    양쪽 라우트 목록만 출력
//
// 백엔드 express 라우터(backend/src/routes/api.js)를 introspection 으로 열거하고,
// frontend/src/api/demoClient.js 의 DEMO_ROUTES 테이블과 대조한다.
//
// 종료 코드 (scripts/smoke.sh 규약):
//   0  패리티 OK (또는 --list)
//   1  불일치 / 썩은 예외 / introspection 실패
//   2  SKIP (backend/node_modules 없음)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// ── 예외 목록 ──────────────────────────────────────────────────────────
// backend 에만 있고 정당한 사유로 데모 목을 만들지 않은 경로.
const BACKEND_ONLY_ALLOW = new Map([
  ['GET /tasks/:id', '프런트 미사용 (useTaskStore 는 목록만 조회)'],
  ['GET /projects/:id', '프런트 미사용'],
  ['GET /sync/health', '프런트 미사용 (UI 는 /agent/activity 사용)'],
  ['GET /docs', '경로 누락 400 스텁 — 목 대상 아님'],
]);
// demoClient 에만 있고 정당한 경로 (현재 없음).
const DEMO_ONLY_ALLOW = new Map();

// ── 1. 가드 ───────────────────────────────────────────────────────────
if (!existsSync(resolve(ROOT, 'backend/node_modules'))) {
  console.log('⏭️  backend/node_modules 없음 (bash setup.sh) — 데모 패리티 검사 건너뜀');
  process.exit(2);
}

// ── 2. 백엔드 라우트 열거 (introspection) ──────────────────────────────
// 서비스가 require 시 SQLite 를 연다 → require 전에 반드시 설정.
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

// express 4 의 layer.regexp.source 에서 마운트 접두사(/tasks 등)를 뽑는다.
// 예: "^\\/tasks\\/?(?=\\/|$)" → "/tasks"
function extractPrefix(regexp) {
  const src = String(regexp.source).replace(/\\\//g, '/');
  const m = src.match(/^\^(\/[^?]*?)\/\?\(\?=\/\|\$\)$/);
  if (!m) {
    throw new Error('라우트 접두사 추출 실패 — express 버전 변경? layer.regexp=' + regexp.source);
  }
  return m[1];
}

// route.path + 접두사를 합쳐 express 경로 문자열로 정규화한다.
function joinPath(prefix, routePath) {
  if (routePath === '/' || routePath === '') return prefix;
  return prefix + routePath;
}

function collectRoutes(stack, prefix, out) {
  for (const layer of stack) {
    if (layer.route) {
      const rp = layer.route.path;
      const paths = Array.isArray(rp) ? rp : [rp];
      for (const one of paths) {
        for (const method of Object.keys(layer.route.methods)) {
          out.add(`${method.toUpperCase()} ${joinPath(prefix, one)}`);
        }
      }
    } else if (layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
      const sub = extractPrefix(layer.regexp);
      collectRoutes(layer.handle.stack, prefix + sub, out);
    }
  }
}

function backendRoutes() {
  const apiRouter = require(resolve(ROOT, 'backend/src/routes/api.js'));
  if (!apiRouter || !Array.isArray(apiRouter.stack)) {
    throw new Error('backend/src/routes/api.js 가 express 라우터(.stack) 를 export 하지 않음');
  }
  const out = new Set();
  collectRoutes(apiRouter.stack, '', out);
  return out;
}

// ── 3. 데모 라우트 열거 ───────────────────────────────────────────────
async function demoRoutes() {
  const mod = await import(resolve(ROOT, 'frontend/src/api/demoClient.js'));
  if (!Array.isArray(mod.DEMO_ROUTES)) {
    throw new Error('frontend/src/api/demoClient.js 가 DEMO_ROUTES 배열을 export 하지 않음');
  }
  return mod.DEMO_ROUTES.map((r) => `${r.method} ${r.spec}`);
}

// ── 실행 ─────────────────────────────────────────────────────────────
async function main() {
  const listOnly = process.argv.includes('--list');

  let backend;
  let demoList;
  try {
    backend = backendRoutes();
    demoList = await demoRoutes();
  } catch (e) {
    console.error('❌ 라우트 열거 실패:', e.message);
    process.exit(1);
  }

  const demo = new Set(demoList);

  if (listOnly) {
    console.log('▶ 백엔드 라우트 (' + backend.size + '건)');
    for (const r of [...backend].sort()) console.log('  ' + r);
    console.log('▶ 데모 라우트 (' + demo.size + '건)');
    for (const r of [...demo].sort()) console.log('  ' + r);
    process.exit(0);
  }

  // DEMO_ROUTES 자체 중복 검사
  const dupes = demoList.filter((r, i) => demoList.indexOf(r) !== i);
  const problems = [];
  if (dupes.length) {
    problems.push('DEMO_ROUTES 중복 항목: ' + [...new Set(dupes)].join(', '));
  }

  const demoOnly = [...demo].filter((r) => !backend.has(r));
  const backendOnly = [...backend].filter((r) => !demo.has(r));

  const badDemoOnly = demoOnly.filter((r) => !DEMO_ONLY_ALLOW.has(r));
  const badBackendOnly = backendOnly.filter((r) => !BACKEND_ONLY_ALLOW.has(r));

  // 썩은 예외: 예외 목록에 있으나 실제로는 더 이상 어긋나지 않는 항목
  const staleBackend = [...BACKEND_ONLY_ALLOW.keys()].filter((r) => !backendOnly.includes(r));
  const staleDemo = [...DEMO_ONLY_ALLOW.keys()].filter((r) => !demoOnly.includes(r));

  if (badDemoOnly.length) {
    problems.push('데모에만 있고 백엔드에 없음 (허용 안 됨):\n    ' + badDemoOnly.join('\n    '));
  }
  if (badBackendOnly.length) {
    problems.push('백엔드에만 있고 데모 목 없음 (예외 미등록):\n    ' + badBackendOnly.join('\n    '));
  }
  if (staleBackend.length) {
    problems.push('썩은 예외 (BACKEND_ONLY_ALLOW 에 있으나 실제 불일치 아님):\n    ' + staleBackend.join('\n    '));
  }
  if (staleDemo.length) {
    problems.push('썩은 예외 (DEMO_ONLY_ALLOW 에 있으나 실제 불일치 아님):\n    ' + staleDemo.join('\n    '));
  }

  if (problems.length) {
    console.error('❌ 데모↔실서버 경로 패리티 실패');
    for (const p of problems) console.error('  - ' + p);
    process.exit(1);
  }

  const matched = [...backend].filter((r) => demo.has(r)).length;
  console.log(
    `🎉 데모↔실서버 경로 패리티 OK (일치 ${matched}건 / 예외 ${BACKEND_ONLY_ALLOW.size + DEMO_ONLY_ALLOW.size}건)`
  );
  process.exit(0);
}

main();
