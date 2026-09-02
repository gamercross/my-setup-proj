# ⚙️ 개발 환경 설정 가이드

> Ubuntu Linux에서 AI Computer OS 프로젝트 개발 환경 완전 설정

---

## 📋 체크리스트

이 가이드를 따라하면서 각 단계를 체크하세요:

- [ ] **Section 1: Ubuntu 기본 설정**
- [ ] **Section 2: Node.js + npm**
- [ ] **Section 3: Python 환경**
- [ ] **Section 4: GitHub 설정**
- [ ] **Section 5: 프로젝트 초기화**
- [ ] **Section 6: API 키 설정**
- [ ] **Section 7: 첫 실행**

---

## 1️⃣ Ubuntu 기본 설정

### 시스템 정보 확인

```bash
# Ubuntu 버전 확인
lsb_release -a

# 커널 버전
uname -r

# 시스템 업데이트
sudo apt update
sudo apt upgrade -y
```

**예상 출력:**
```
Release: 26.04 LTS
Kernel: 5.15.x 또는 6.x
```

### 필수 도구 설치

```bash
# 빌드 도구
sudo apt install -y build-essential
sudo apt install -y curl wget git

# 텍스트 편집기
sudo apt install -y gedit vim nano

# 개발 라이브러리
sudo apt install -y libssl-dev libffi-dev
```

### WSL2 (Windows 사용자만)

WSL2를 사용하는 경우:

```bash
# WSL 업데이트
wsl --update --pre-release

# 현재 버전 확인
wsl --version

# Ubuntu 계정 생성
wslc run -it ubuntu:26.04 bash
```

---

## 2️⃣ Node.js + npm 설치

### Node.js 설치 (권장: LTS 버전)

> **버전 정책:** CI는 Node 22로 고정. 로컬은 22 이상이면 된다 (개발 머신은 Homebrew `node`로 26 사용 중). macOS는 `brew install node`.

**방법 1: NodeSource에서 설치 (권장, Ubuntu/WSL)**

```bash
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

**방법 2: apt에서 설치**

```bash
sudo apt install -y nodejs npm
```

### 버전 확인

```bash
node --version  # v18.x.x 또는 v20.x.x
npm --version   # 9.x.x 또는 10.x.x
```

### npm 업그레이드

```bash
# npm 최신 버전으로 업그레이드
npm install -g npm@latest

# yarn 설치 (선택)
npm install -g yarn
```

### 권한 설정 (선택)

npm이 권한 오류를 내면:

```bash
# npm 글로벌 디렉토리 생성
mkdir ~/.npm-global

# npm 설정
npm config set prefix '~/.npm-global'

# PATH에 추가 (~/.bashrc 또는 ~/.zshrc)
export PATH=~/.npm-global/bin:$PATH

# 적용
source ~/.bashrc  # 또는 source ~/.zshrc
```

---

## 3️⃣ Python 환경 설정

### Python 설치

```bash
# Python 3.11+ 설치
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Python 3.12 (최신)
sudo apt install -y python3.12 python3.12-venv python3.12-dev

# 기본 python3가 3.11 이상 가리키도록 설정
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.12 2
```

### pip 업그레이드

```bash
# pip, setuptools, wheel 업그레이드
python3 -m pip install --upgrade pip setuptools wheel
```

### 가상 환경 생성

```bash
# 프로젝트 디렉토리 생성
mkdir -p ~/my-setup-proj
cd ~/my-setup-proj

# 가상 환경 생성
python3 -m venv venv

# 활성화
source venv/bin/activate

# 비활성화 (나중에)
deactivate
```

**확인:**
```bash
which python  # /home/username/my-setup-proj/venv/bin/python
python --version  # Python 3.11.x 또는 3.12.x
```

---

## 4️⃣ GitHub 설정

### Git 설치

```bash
sudo apt install -y git git-lfs
```

### Git 사용자 설정

```bash
# 사용자 정보 설정
git config --global user.name "당신의 이름"
git config --global user.email "당신의이메일@example.com"

# 확인
git config --global user.name
git config --global user.email

# 기본 에디터 설정 (선택)
git config --global core.editor "vim"
```

### SSH 키 생성 (추천)

```bash
# SSH 키 생성 (엔터 4번 누르면 기본값으로)
ssh-keygen -t ed25519 -C "당신의이메일@example.com"

# 생성된 공개 키 확인
cat ~/.ssh/id_ed25519.pub

# 이 키를 GitHub에 등록:
# 1. https://github.com/settings/keys 접속
# 2. "New SSH key" 클릭
# 3. 위의 공개 키 내용 복사해서 붙여넣기
```

### SSH 연결 테스트

```bash
# SSH 에이전트 시작 (이미 켜져있을 수 있음)
eval "$(ssh-agent -s)"

# 키 추가
ssh-add ~/.ssh/id_ed25519

# GitHub 연결 테스트
ssh -T git@github.com

# 예상 출력:
# Hi [username]! You've successfully authenticated...
```

### GitHub 저장소 생성

```bash
# 웹브라우저에서: https://github.com/new

# 저장소명: my-setup-proj
# 설명: Personal productivity AI agent
# 공개/비공개: 비공개
# README: 체크
# .gitignore: Node 선택
# License: MIT

# 클론
git clone git@github.com:YOUR_USERNAME/my-setup-proj.git
cd my-setup-proj
```

---

## 5️⃣ 프로젝트 초기화

### 폴더 구조 생성

```bash
cd ~/my-setup-proj

# 폴더 생성
mkdir -p frontend backend agent tests docs

# 파일 생성
touch frontend/.gitkeep backend/.gitkeep agent/.gitkeep
```

### Node.js 프로젝트 초기화

```bash
# frontend 디렉토리에서
cd frontend
npm create electron-app . --template=webpack
npm install react react-dom
npm install -D tailwindcss postcss autoprefixer
npm install zustand

# 설치 확인
npm list
```

### Python 프로젝트 초기화

```bash
# backend 또는 agent 디렉토리에서
cd ../agent

# 가상 환경이 활성화 되어있는지 확인
which python  # should show venv/bin/python

# 필수 라이브러리 설치
pip install --upgrade pip

# requirements.txt 생성
cat > requirements.txt << EOF
anthropic==0.25.0
google-auth-oauthlib==1.0.0
google-auth-httplib2==0.2.0
google-api-python-client==2.100.0
notion-client==2.2.0
python-dotenv==1.0.0
apscheduler==3.10.0
supabase==2.0.0
pytest==7.4.0
black==23.9.0
flake8==6.1.0
EOF

# 설치
pip install -r requirements.txt
```

### .gitignore 설정

```bash
cd ~/my-setup-proj

cat > .gitignore << EOF
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/
venv/
__pycache__/
*.pyc

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build
dist/
build/
*.egg-info/

# Logs
*.log
npm-debug.log

# Database
*.db
*.sqlite3

# Temporary
tmp/
temp/
.cache/
EOF
```

---

## 6️⃣ API 키 설정

### .env 파일 생성

```bash
# 프로젝트 루트에서
cat > .env << EOF
# Google APIs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Notion
NOTION_API_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_JWT_SECRET=

# Database
DATABASE_URL=sqlite:///./app.db

# App Config
NODE_ENV=development
PORT=3000
PYTHONPATH=$(pwd)/agent
EOF
```

### 각 API 키 발급

#### Claude API
```bash
# 1. https://console.anthropic.com 접속
# 2. 로그인 또는 회원가입
# 3. API Keys 섹션에서 키 생성
# 4. 키를 .env의 ANTHROPIC_API_KEY에 붙여넣기

# 테스트
cat > test_claude.py << 'PYTHON'
from anthropic import Anthropic
import os

api_key = os.getenv("ANTHROPIC_API_KEY")
client = Anthropic(api_key=api_key)

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=100,
    messages=[{"role": "user", "content": "Hello, Claude!"}]
)
print(response.content[0].text)
PYTHON

python test_claude.py
```

#### Google APIs
```bash
# 1. https://console.cloud.google.com 접속
# 2. 새 프로젝트 생성: "my-setup-proj"
# 3. Google Calendar API 활성화
# 4. Google Gmail API 활성화
# 5. OAuth 2.0 동의 화면 설정
# 6. 클라이언트 ID (데스크톱 앱) 생성
# 7. 다운로드한 JSON에서 값 복사
```

#### Supabase
```bash
# 1. https://supabase.com 접속
# 2. 로그인 또는 회원가입
# 3. 새 프로젝트 생성: "my-setup-proj"
# 4. 프로젝트 설정에서 URL과 API Key 복사
# 5. .env에 붙여넣기
```

#### Notion API
```bash
# 1. https://www.notion.so/my-integrations 접속
# 2. "+ Create new integration" 클릭
# 3. 이름: "AI Computer OS"
# 4. 권한: read, update, insert, delete 체크
# 5. 생성된 Internal Integration Token 복사
```

---

## 7️⃣ 첫 실행

### Electron 앱 실행

```bash
cd ~/my-setup-proj/frontend

# 개발 모드로 실행
npm start

# 또는
npm run dev
```

**기대 결과:** Electron 창이 열리고 "Welcome to Electron" 메시지 표시

### Express 서버 실행

```bash
cd ~/my-setup-proj/backend

# 서버 시작
npm start

# 또는 nodemon 설치 후
npm install -D nodemon
npm run dev
```

**확인:**
```bash
curl http://localhost:3000

# 또는
curl http://localhost:3000/api/tasks
```

### Python 에이전트 테스트

```bash
# 가상 환경 활성화
source ~/my-setup-proj/venv/bin/activate

cd ~/my-setup-proj/agent

# 테스트 실행
python test_claude.py

# 또는 pytest
pytest tests/ -v
```

---

## 🔧 트러블슈팅

### Node.js 설치 문제

```bash
# 문제: "command not found: node"
# 해결: 경로 확인
which node
which npm

# 또는 재설치
sudo apt remove -y nodejs npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Python 가상 환경 문제

```bash
# 문제: 가상 환경이 활성화 안 됨
# 해결:
source ~/my-setup-proj/venv/bin/activate

# 확인
which python  # should show venv path
```

### Git SSH 권한

```bash
# 문제: "Permission denied (publickey)"
# 해결:
# 1. SSH 에이전트 확인
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 2. 키 권한 확인
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

### Electron 실행 안 됨

```bash
# 문제: Electron 창이 안 뜸
# 해결:
npm list electron
npm install

# X11 문제 (WSL)
export DISPLAY=:0
npm start
```

---

## ✅ 설정 완료 체크리스트

모든 항목을 완료했나요?

- [ ] Ubuntu 26.04 LTS 확인
- [ ] Node.js v18+ 설치
- [ ] npm 10+ 설치
- [ ] Python 3.11+ 설치
- [ ] pip 최신 버전
- [ ] Git 설정 완료
- [ ] SSH 키 생성 및 GitHub 등록
- [ ] GitHub 저장소 클론
- [ ] .env 파일 생성
- [ ] 모든 API 키 추가
- [ ] Electron 앱 실행 확인
- [ ] Express 서버 실행 확인
- [ ] Python 에이전트 테스트 완료

**모두 완료했다면 다음으로 이동:**
→ [ROADMAP.md](../product/ROADMAP.md) 에서 Phase 1 시작!

---

## 📚 추가 자료

### Ubuntu 명령어 학습
```bash
# 도움말 보기
man ls
man cd
man mkdir

# 온라인 리소스
# - https://wikidocs.net/book/10238
# - https://ubuntu.com/tutorials
```

### Node.js 학습
```bash
# Node.js 공식 문서
# - https://nodejs.org/en/docs/

# NPM 공식 문서
# - https://docs.npmjs.com/
```

### Python 학습
```bash
# Python 공식 문서
# - https://docs.python.org/3/

# Virtual Environment
# - https://docs.python.org/3/tutorial/venv.html
```

---

## 💾 환경 백업

설정을 백업하려면:

```bash
# 현재 설정 내보내기
npm list -g --depth=0 > npm-global.txt
pip freeze > requirements.txt
git config --global -l > git-config.txt

# 복원 (새 머신)
npm install -g $(cat npm-global.txt)
pip install -r requirements.txt
```

---

**마지막 업데이트:** 2026-09-02  
**다음 단계:** 프로젝트 초기화 후 [ROADMAP.md](../product/ROADMAP.md) 참고
