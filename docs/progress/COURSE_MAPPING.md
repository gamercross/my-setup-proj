# 📚 강의 연결 맵

> AI 컴퓨터 운영체제 실습 강의와 프로젝트의 완벽한 연동

---

## 🎯 개요

이 프로젝트는 학과 강의 **"AI 컴퓨터 운영체제 실습"**의 실습 환경이자 최종 프로젝트입니다.

```
강의 이론 & 실습
    ↓ (적용)
프로젝트 개발
    ↓ (통합)
최종 발표
```

---

## 📖 주별 강의 연결

### **Week 1-3: Linux 기초**

#### 강의 내용
- **강의:** Chapter 01-02
  - WSL2 우분투 설치 및 기본 명령어
  - 디렉토리와 파일 사용법
  
- **학습 명령어:**
  ```bash
  lsb_release -a       # OS 버전 확인
  cat /etc/os-release  # OS 정보
  uname -r            # 커널 버전
  
  pwd                 # 현재 경로
  cd, ls, mkdir       # 파일 관리
  mkdir, rmdir        # 디렉토리 생성/삭제
  cp, mv, rm          # 파일 복사/이동/삭제
  ```

#### 프로젝트 활용
```
당신의 프로젝트:

1. Ubuntu 폴더 구조 생성
   ~/my-setup-proj/
   ├── frontend/
   ├── backend/
   ├── agent/
   └── tests/

2. 파일 관리 실습
   - 스크립트 생성 (touch)
   - 권한 설정 (chmod) - Week 3
   - 디렉토리 정리 (mv, rm)

3. Git 저장소 초기화
   git init
   git add .
   git commit -m "Initial commit"
```

#### 배우게 될 것
- ✅ 터미널 기본 명령어
- ✅ 파일 시스템 구조
- ✅ 경로 개념
- ✅ 파일 권한 (chmod, chown)

---

### **Week 4: 문서 편집 & Node.JS/Next.JS**

#### 강의 내용
- **강의:** Chapter 04
  - vi/vim/gedit 편집기
  - **특별:** Node.JS 및 Next.JS 웹서버 개발
  
- **학습 도구:**
  ```bash
  vi/vim              # 터미널 에디터
  gedit               # GUI 에디터
  
  # 설치
  sudo apt install gedit -y
  sudo apt install nodejs npm -y
  ```

#### 프로젝트 활용
```
당신의 프로젝트:

1. Node.JS 프로젝트 초기화
   cd ~/my-setup-proj/frontend
   npm init
   npm install react react-dom electron

2. 첫 파일 생성 (gedit 사용)
   gedit package.json
   gedit src/App.jsx
   gedit src/index.js

3. 서버 실행
   npm start      # Electron 앱 실행
   npm run dev    # 개발 서버 실행

4. VSCode에서 개발 (선택)
   code .
```

#### 배우게 될 것
- ✅ 문서 편집기 사용법
- ✅ Node.JS 기본 구조
- ✅ npm 패키지 관리
- ✅ 첫 웹 애플리케이션 실행

---

### **Week 5: 셸 사용법 & SQLite**

#### 강의 내용
- **강의:** Chapter 05
  - 셸 환경 변수 (export, set, env)
  - 셸 설정 (alias, history)
  - **특별:** SQLite 활용 DB 프로그래밍
  
- **학습 명령어:**
  ```bash
  type, chsh              # 셸 정보
  echo, export            # 환경 변수
  set, env                # 변수 확인
  alias                   # 명령어 별칭
  history                 # 명령어 히스토리
  
  # SQLite
  sqlite3 mydb.db         # DB 생성
  .tables                 # 테이블 목록
  .schema                 # 스키마 확인
  ```

#### 프로젝트 활용
```
당신의 프로젝트:

1. 환경 변수 설정
   # ~/.bashrc 또는 ~/.zshrc에 추가
   export ANTHROPIC_API_KEY="sk-ant-..."
   export NOTION_API_KEY="..."
   export NODE_ENV="development"
   
   source ~/.bashrc

2. SQLite 데이터베이스 생성
   cd ~/my-setup-proj
   sqlite3 app.db
   
   # 테이블 생성
   CREATE TABLE tasks (
       id INTEGER PRIMARY KEY,
       title TEXT NOT NULL,
       due_date DATE,
       priority TEXT,
       status TEXT
   );
   
   # 데이터 조회
   SELECT * FROM tasks;

3. alias 설정 (선택)
   alias ai-start='cd ~/my-setup-proj && npm start'
   alias ai-db='sqlite3 ~/my-setup-proj/app.db'

4. 셸 스크립트 작성
   # setup.sh
   #!/bin/bash
   cd ~/my-setup-proj
   npm install
   npm start
   
   chmod +x setup.sh
   ./setup.sh
```

#### 배우게 될 것
- ✅ 환경 변수 관리
- ✅ 셸 스크립트 기초
- ✅ SQLite 데이터베이스
- ✅ 데이터 정의 언어 (DDL)

---

### **Week 6: 프로세스 관리**

#### 강의 내용
- **강의:** Chapter 06
  - 프로세스와 스레드
  - 프로세스 관리 명령어
  - **특별:** Async Programming & Coroutine
  
- **학습 명령어:**
  ```bash
  ps              # 프로세스 목록
  ps -ef          # 상세 정보
  pgrep           # 프로세스 검색
  kill, pkill     # 프로세스 종료
  
  top, htop       # 프로세스 모니터링
  sleep           # 대기
  jobs            # 백그라운드 작업
  
  at              # 일회성 작업
  crontab -e      # 정기 작업
  ```

#### 프로젝트 활용
```
당신의 프로젝트:

1. Express 서버 관리
   # 서버 실행 (백그라운드)
   npm start &
   
   # 프로세스 확인
   ps aux | grep node
   
   # 포트 확인
   netstat -tlnp | grep 3000
   
   # 프로세스 종료
   kill [PID]
   # 또는
   lsof -ti:3000 | xargs kill -9

2. Daily Brief 자동 실행 (Cron)
   # Cron 작업 추가
   crontab -e
   
   # 매일 아침 8시에 실행
   0 8 * * * cd ~/my-setup-proj && python agent/daily_brief.py
   
   # Cron 작업 확인
   crontab -l

3. 프로세스 모니터링
   # 실시간 모니터링
   top
   
   # Python 프로세스만 보기
   ps aux | grep python
   
   # CPU/메모리 사용량 보기
   htop

4. 백그라운드에서 여러 작업 실행
   # 동시에 여러 서버 실행
   npm start &                    # Electron
   cd backend && npm start &      # Express
   python agent/daily_brief.py &  # Python Agent
   
   # 모든 작업 확인
   jobs
```

#### 배우게 될 것
- ✅ 프로세스 생명주기
- ✅ 포그라운드/백그라운드 작업
- ✅ 정기 작업 스케줄링 (Cron)
- ✅ 시스템 모니터링

---

### **Week 7: 소프트웨어 관리 & 파일 시스템**

#### 강의 내용
- **강의:** Chapter 07-08
  - apt, dpkg, snap 패키지 관리자
  - 파일 압축 (tar, gzip)
  - 디스크 관리 (fdisk, mkfs, mount)
  
- **학습 명령어:**
  ```bash
  # 패키지 관리
  apt search               # 패키지 검색
  apt list --installed     # 설치된 패키지
  apt install             # 설치
  apt remove              # 제거
  apt update && apt upgrade  # 업데이트
  
  # 압축
  tar cvf archive.tar *       # 아카이브 생성
  tar xvf archive.tar         # 추출
  gzip, gunzip                # 압축/해제
  
  # 디스크 관리
  df                      # 디스크 사용량
  du                      # 폴더 용량
  lsblk                   # 블록 디바이스
  mount, umount           # 마운트/언마운트
  ```

#### 프로젝트 활용
```
당신의 프로젝트:

1. 프로젝트 배포 준비
   # 의존성 설치
   sudo apt update
   npm install
   pip install -r requirements.txt
   
   # 불필요한 파일 제거
   rm -rf node_modules/.cache
   rm -rf __pycache__

2. 프로젝트 백업/배포
   # 프로젝트 아카이브 생성
   tar cvf my-setup-proj.tar \
     --exclude=node_modules \
     --exclude=venv \
     --exclude=.git \
     ~/my-setup-proj
   
   # 압축
   gzip my-setup-proj.tar
   
   # 다른 곳에 복사
   cp my-setup-proj.tar.gz /backup/
   
   # 복원
   tar xzf my-setup-proj.tar.gz

3. 디스크 사용량 모니터링
   # 전체 사용량
   df -h
   
   # 폴더별 사용량
   du -sh ~/my-setup-proj/*
   
   # 가장 큰 파일 찾기
   find . -type f -exec ls -lh {} \; | sort -k5 -hr | head -20

4. Docker 이미지 관리 (Week 12+)
   # 디스크 상태 확인
   docker system df
   
   # 불필요한 이미지 제거
   docker image prune
```

#### 배우게 될 것
- ✅ 패키지 관리자 사용법
- ✅ 아카이빙과 압축
- ✅ 디스크 공간 관리
- ✅ 백업 전략

---

### **Week 8: 중간고사 & 과제 발표**

#### 중간고사
```
출제 범위: Chapter 01-07

문제 유형: 단답형 (20문제)

예상 문제:
- chmod 권한 표기 (755, 644 등)
- 파일 경로 관련
- 프로세스 관리 명령어
- 환경 변수 설정
- SQLite 기본 SQL
- apt 명령어

준비:
- Week 1-7 명령어 복습
- SETUP.md의 기본 명령어 다시 보기
```

#### 과제 1 발표: "Ubuntu 환경에서 웹서비스 개발"
```
발표 내용:
1. 프로젝트 개요 (3분)
   - 프로젝트 목표
   - 기술 스택
   
2. 구현 과정 (5분)
   - Week 1-7에서 배운 Linux 명령어 사용
   - 앱 개발 진행도
   - 어려웠던 점과 해결 방법
   
3. 결과 시연 (2분)
   - Electron 앱 실행
   - 기본 기능 시연 (할일 추가, 캘린더 보기 등)
   
4. 배운 Linux 명령어 정리
   - 사용한 명령어 10개 이상
   - 각 명령어의 역할 설명

준비 자료:
- PPT (프로젝트소개_이름.pptx)
- 라이브 데모
- 명령어 정리 문서 (commands.md)
```

---

### **Week 9-11: 고급 주제**

#### Week 9: 리눅스 부팅, AI Computer 개념
```
강의: Chapter 09
명령어: shutdown, halt, poweroff, reboot, init, systemctl

프로젝트:
- 앱 재시작 로직 구현
- 시스템 신호 처리 (SIGTERM, SIGKILL)
- graceful shutdown 구현
```

#### Week 10: 사용자 관리
```
강의: Chapter 10
명령어: useradd, usermod, groupadd, passwd, su, sudo

프로젝트:
- 여러 사용자 지원
- 권한 기반 접근 제어
- 사용자별 저장 데이터 분리

실습:
# 테스트 사용자 생성
sudo useradd -m testuser
sudo passwd testuser
sudo usermod -aG sudoers testuser

# 권한 테스트
sudo -u testuser ~/my-setup-proj/app
```

#### Week 11: 네트워크 & Mini Coding Agent ⭐
```
강의: Chapter 11 + Mini Coding Agent

명령어:
nmcli, ip, route, ping, traceroute
netstat, nmap, ufw

프로젝트 - Claude API 에이전트:
1. 네트워크 요청 관리
   - Gmail API (HTTPS)
   - Calendar API (HTTPS)
   - Notion API (HTTPS)
   - Claude API (HTTPS)

2. Mini Coding Agent 구현
   def generate_daily_brief():
       # 1. 데이터 수집 (네트워크)
       emails = get_unread_emails()
       events = get_today_events()
       
       # 2. Claude API 호출 (네트워크)
       response = claude_api_call(emails, events)
       
       # 3. 결과 저장
       save_to_notion(response)

3. 네트워크 모니터링
   # API 요청 모니터링
   sudo tcpdump -i eth0 'port 443'
   
   # 포트 확인
   netstat -tlnp | grep python
   
   # 방화벽 설정
   sudo ufw allow 3000/tcp
   sudo ufw allow 443/tcp
```

---

### **Week 12-13: 배포 & 최적화**

#### Week 12: 원격 접속, DB 서버, 웹 서버
```
강의: Chapter 12-13

명령어:
scp, ssh                    # 원격 접속
sudo apt install nginx      # 웹 서버
sudo systemctl enable nginx # 서비스 관리

프로젝트 - Docker 배포:
1. Dockerfile 작성
   FROM node:18-alpine
   WORKDIR /app
   COPY . .
   RUN npm install
   CMD ["npm", "start"]

2. 빌드 및 실행
   docker build -t my-setup-proj .
   docker run -p 3000:3000 my-setup-proj

3. Nginx 리버스 프록시
   server {
       listen 80;
       location / {
           proxy_pass http://localhost:3000;
       }
   }
```

#### Week 13: 보안 & 가상화
```
강의: Chapter 14-15

명령어:
sudo ufw                # 방화벽
sudo netstat -tlnp      # 열려있는 포트

보안 체크:
- API 인증 확인
- HTTPS 사용 (모든 API)
- 환경 변수 보안 (.env git ignore)
- 데이터베이스 암호화

가상화:
- Docker 컨테이너
- Docker Compose (다중 서비스)
```

---

### **Week 14-15: 최종 발표 & 기말고사**

#### 기말고사
```
출제 범위: Chapter 01-17 (전체)

문제 유형: 단답형 (30문제)

주요 출제 분야:
- Linux 명령어
- 파일 권한
- 프로세스 관리
- 네트워크 설정
- 보안 개념
- 가상화 기술
```

#### 과제 2 발표: "Ollama 기반 RAG/Agent 개발"

**주제:** Claude API 기반 AI 에이전트

```
발표 내용:

1. AI Agent 개요 (3분)
   - Daily Brief 에이전트 설명
   - 기능: 일정 분석, 우선순위 정리, 자동화
   
2. Claude API 통합 (3분)
   - API 호출 방법
   - Prompt 엔지니어링
   - 결과 처리

3. 자동화 구현 (2분)
   - Cron 작업 설정
   - 백그라운드 프로세스 관리
   - 에러 처리

4. 라이브 데모 (2분)
   - Daily Brief 자동 생성 시연
   - Notion에 저장된 결과 확인

준비 자료:
- PPT (AI에이전트_이름.pptx)
- 코드 데모
- 학습 내용 정리

학습 내용 정리:
- Linux 명령어 요약
- Python/Node.js 개발 경험
- API 통합 경험
- 앞으로의 목표
```

---

## 📊 강의 연결도

```
Week 1-3: Linux 기초
    ↓
    App 폴더 구조 생성
    파일 관리 실습
    
Week 4: Node.JS
    ↓
    Electron + React 앱 구축
    첫 화면 띄우기
    
Week 5: SQLite
    ↓
    데이터베이스 테이블 설계
    로컬 저장소 구현
    
Week 6: 프로세스 관리
    ↓
    서버/에이전트 백그라운드 실행
    Cron 작업 스케줄링
    
Week 7: 패키지/압축
    ↓
    배포 준비 (Docker)
    프로젝트 백업
    
Week 8: 중간고사 + 과제 1
    ↓
    반반 완성된 프로젝트 발표
    
Week 9-11: 고급 주제
    ↓
    사용자 관리
    네트워크 설정
    Claude API 에이전트 (핵심!)
    
Week 12-13: 배포/최적화
    ↓
    Docker 배포
    보안 강화
    성능 최적화
    
Week 14-15: 기말고사 + 과제 2
    ↓
    완성된 프로젝트 최종 발표
```

---

## ✅ 실습 체크리스트

각 주차별로 완료한 내용을 체크하세요:

### Week 1-3
- [ ] Ubuntu 버전 확인 (lsb_release, uname)
- [ ] 폴더 구조 생성 (mkdir, cd)
- [ ] 파일 생성 및 관리 (touch, cp, mv, rm)
- [ ] 권한 설정 (chmod 755, 644)
- [ ] Git 저장소 초기화

### Week 4
- [ ] Node.js 설치 (npm -v)
- [ ] Electron 프로젝트 생성
- [ ] React 컴포넌트 작성
- [ ] 첫 앱 실행 (npm start)

### Week 5
- [ ] 환경 변수 설정 (.bashrc, export)
- [ ] SQLite 데이터베이스 생성
- [ ] 테이블 정의 (CREATE TABLE)
- [ ] 데이터 조회 (SELECT)

### Week 6
- [ ] Express 서버 실행 (백그라운드)
- [ ] 프로세스 모니터링 (ps, top)
- [ ] Cron 작업 설정 (Daily Brief)
- [ ] 포트 확인 (netstat)

### Week 7
- [ ] npm 패키지 설치 (npm install)
- [ ] 프로젝트 아카이빙 (tar, gzip)
- [ ] 디스크 사용량 확인 (df, du)

### Week 8
- [ ] 중간고사 준비
- [ ] 과제 1 PPT 작성
- [ ] 라이브 데모 준비
- [ ] 명령어 정리 문서 작성

### Week 9-11
- [ ] 다중 사용자 테스트
- [ ] 네트워크 모니터링 설정
- [ ] Claude API 에이전트 구현
- [ ] Daily Brief 자동화

### Week 12-13
- [ ] Docker 이미지 빌드
- [ ] 컨테이너 실행 및 테스트
- [ ] 보안 검토 (권한, API 인증)
- [ ] 성능 최적화

### Week 14-15
- [ ] 기말고사 준비
- [ ] 과제 2 PPT 작성
- [ ] 최종 데모 준비
- [ ] 배운 내용 정리

---

## 🎯 최종 결과물

프로젝트 완료 후:

```
my-setup-proj/
├── README.md (프로젝트 설명)
├── ARCHITECTURE.md (기술 스택)
├── ROADMAP.md (개발 계획)
├── frontend/ (Electron + React)
├── backend/ (Express API)
├── agent/ (Claude AI 에이전트)
├── tests/ (테스트 코드)
├── Dockerfile (배포)
└── .github/
    └── workflows/ (CI/CD)

배포 결과:
- Docker 이미지
- GitHub Releases (바이너리)
- 문서 (README, 명령어 정리)
- 최종 발표 자료 (PPT)
```

---

**마지막 업데이트:** 2026-09-02  
**다음 단계:** [PROGRESS.md](PROGRESS.md) 에서 주간 진행 상황 추적
