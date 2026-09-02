# 🤖 개인 생산성 AI Agent (AI Computer OS)

> Windows/Mac/Linux 모두 지원하는 생산성 대시보드 + Claude AI 에이전트

**프로젝트 시작일:** 2026-09-02  
**목표 완성일:** 2026-11-30 (강의 14주 종료 전)  
**학과:** 우숭대학교 컴퓨터정보보안학과  
**강의:** AI 컴퓨터 운영체제 실습

---

## 📋 프로젝트 개요

### 🎯 목표
- ✅ **단일 앱**으로 모든 생산성 도구 통합
- ✅ **클라우드 기반** 데이터 (어디서든 접속)
- ✅ **AI 에이전트** 기반 자동 스케줄링
- ✅ **강의 실습 프로젝트** 동시 진행

### 🔗 핵심 통합
- 📧 **Email** (Gmail, Outlook 등 여러 개)
- 📅 **Google Calendar** (일정 자동 동기화)
- 📝 **Notion** (프로젝트, 기록 관리)
- 🤖 **Claude AI** (에이전트 기반 분석)
- ☁️ **Supabase** (클라우드 백엔드)

### 🎯 핵심 기능 (우선순위)
1. **오늘/내일 할 일 정리** - 아침에 자동 브리핑
2. **프로젝트 진행도 추적** - Notion 연동
3. **이메일 통합 관리** - 여러 계정 한 곳에서
4. **캘린더 일정 확인** - 실시간 동기화

---

## 🗂️ 문서 구조

이 프로젝트의 모든 계획은 다음 마크다운 파일들에 정리되어 있습니다:

| 파일 | 용도 | 수정 빈도 |
|------|------|---------|
| **README.md** | 프로젝트 개요 (이 파일) | 주 1회 |
| **ARCHITECTURE.md** | 기술 스택 및 구조 | 필요시 |
| **ROADMAP.md** | 개발 로드맵 & 일정 | 주 1회 |
| **SETUP.md** | 개발 환경 설정 가이드 | 초기 1회 |
| **CLAUDE_INTEGRATION.md** | Claude API/MCP 설정 | 필요시 |
| **COURSE_MAPPING.md** | 강의 내용 연결 | 주 1회 |
| **PROGRESS.md** | 주간 진행 상황 | 매주 업데이트 |

---

## ⚡ 빠른 시작

### 1️⃣ 환경 확인
```bash
# Ubuntu 버전 확인
lsb_release -a

# 기본 도구 설치
sudo apt update && sudo apt upgrade -y
```

→ 자세한 내용은 **SETUP.md** 참고

### 2️⃣ 프로젝트 구조 생성
```bash
mkdir ~/ai-computer-os
cd ~/ai-computer-os
git init
```

→ GitHub 연동은 **SETUP.md** 참고

### 3️⃣ Claude 설정
```bash
# Claude API Key 설정
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

→ 상세한 MCP 설정은 **CLAUDE_INTEGRATION.md** 참고

---

## 📊 프로젝트 상태

### 현재 진행 상황
- ✅ 개념 설계 완료
- ✅ 강의 연결 매핑 완료
- ⏳ 개발 환경 설정 (진행 중)
- ⏳ 백엔드 구축 (예정)
- ⏳ 프론트엔드 구축 (예정)
- ⏳ AI 에이전트 통합 (예정)

→ 상세한 진행 상황은 **PROGRESS.md** 참고

---

## 🛠️ 기술 스택

**요약 (전체는 ARCHITECTURE.md에서 확인)**

### 프론트엔드
- **Electron** (데스크톱)
- **React** (UI)
- **Tailwind CSS** (스타일링)

### 백엔드
- **Node.js + Express** (API 서버)
- **Python** (AI 에이전트)

### 데이터베이스
- **SQLite** (로컬)
- **Supabase/PostgreSQL** (클라우드)

### AI & 통합
- **Claude API** (에이전트)
- **Google Calendar API**
- **Gmail API**
- **Notion API**

### DevOps
- **Docker** (배포)
- **GitHub Actions** (자동 테스트)
- **GitHub** (버전 관리)

---

## 📅 강의와의 연결

이 프로젝트는 **AI 컴퓨터 운영체제 실습** 강의와 직접 연결됩니다:

| 주차 | 강의 주제 | 앱 개발 | 상태 |
|-----|---------|--------|-----|
| 1-3주 | Linux 기초 | 개발 환경 설정 | ⏳ |
| 4주 | Node.JS/Next.JS | 웹 UI 구축 | ⏳ |
| 5주 | SQLite | DB 설계 | ⏳ |
| 6주 | 프로세스 관리 | 자동 동기화 | ⏳ |
| 7주 | 패키지 관리 | Docker 구축 | ⏳ |
| 11주 | Mini Coding Agent | Claude API 통합 | ⏳ |
| 13주 | DB/웹 서버 | API 배포 | ⏳ |
| 14주 | 가상화/AI | 최종 통합 | ⏳ |

→ 자세한 내용은 **COURSE_MAPPING.md** 참고

---

## 🚀 다음 단계

### 이번 주 (Week 1)
- [ ] SETUP.md 읽고 환경 구축
- [ ] GitHub 저장소 생성
- [ ] Claude API Key 설정
- [ ] Supabase 프로젝트 생성

### 이다음주 (Week 2-3)
- [ ] Electron + React 기초 구축
- [ ] Supabase 테이블 설계
- [ ] Google Calendar API 연동 테스트

→ 상세한 로드맵은 **ROADMAP.md** 참고

---

## 💡 수정 가이드

### 이 문서를 어떻게 수정할까요?

1. **각 섹션의 내용 변경**
   ```markdown
   # 기존
   - ✅ 개념 설계 완료
   
   # 변경
   - ✅ 개념 설계 완료 (2026-09-15)
   ```

2. **일정 변경**
   ```markdown
   # ROADMAP.md 에서
   이다음주 → 2주 뒤로 변경
   ```

3. **기능 추가/제거**
   ```markdown
   # 새 기능 추가
   5. **다크 모드** - 야간 사용성
   ```

4. **진행 상황 업데이트**
   ```markdown
   # PROGRESS.md 에서
   매주 완료된 항목 체크
   ```

---

## 📞 참고 자료

- **강의:** AI 컴퓨터 운영체제 실습 (김태원 교수)
- **교재:** IT CookBook, 우분투 리눅스 (2026년 4판)
- **Claude 문서:** https://docs.claude.com
- **강의 자료:** https://wikidocs.net/book/10238

---

## 📝 라이선스

개인 학습 목적 프로젝트

---

**마지막 업데이트:** 2026-09-02  
**다음 검토:** 2026-09-09

> 💡 **팁:** 각 MD 파일을 VSCode에서 열어서 "Markdown Preview"로 보면 더 보기 좋습니다!
> Ctrl+Shift+V (또는 Cmd+Shift+V on Mac)
