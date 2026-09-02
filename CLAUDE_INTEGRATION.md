# 🤖 Claude API & MCP 통합 가이드

> Claude를 에이전트로 사용하기 위한 API 설정 및 MCP 연동

---

## 📋 목차

1. [Claude API 기초](#claude-api-기초)
2. [Claude Desktop MCP 설정](#claude-desktop-mcp-설정)
3. [Python에서 Claude API 사용](#python에서-claude-api-사용)
4. [Node.js에서 Claude API 사용](#nodejs에서-claude-api-사용)
5. [Daily Brief 에이전트](#daily-brief-에이전트)
6. [테스트 및 디버깅](#테스트-및-디버깅)

---

## Claude API 기초

### API Key 발급

#### 1단계: 콘솔 접속
```
https://console.anthropic.com
```

#### 2단계: API Keys 섹션
- 좌측 메뉴에서 "API keys" 클릭
- "+ Create Key" 버튼 클릭

#### 3단계: 키 복사
```bash
# 생성된 키를 .env에 저장
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

**⚠️ 주의:** 이 키를 git에 올리지 마세요!

### 환경 변수 설정

#### .env 파일
```bash
# .env (git ignore에 포함)
ANTHROPIC_API_KEY=sk-ant-...
```

#### 로드하기

**Python:**
```python
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("ANTHROPIC_API_KEY")
```

**Node.js:**
```javascript
require('dotenv').config()
const apiKey = process.env.ANTHROPIC_API_KEY
```

### 요금 정책

| 모델 | 입력 | 출력 | 사용 사례 |
|------|------|------|---------|
| **Claude 3.5 Sonnet** | $3/M | $15/M | 일반적 사용 |
| **Claude Opus 4.5** | $15/M | $75/M | 복잡한 작업 |
| **Claude Haiku 4.5** | $0.80/M | $4/M | 빠른 응답 |

> M = 백만 토큰
> 개인 프로젝트로는 프리 크레딧($5)으로 충분

---

## Claude Desktop MCP 설정

### Claude Desktop 설치

#### 다운로드
```
https://claude.ai/download
```

#### 설치 후 확인
```bash
# Mac
ls -la ~/Library/Application\ Support/Claude

# Linux/Ubuntu
ls -la ~/.config/Claude

# Windows
explorer %APPDATA%\Claude
```

### MCP 저장소 추가

#### 설정 파일 위치
```bash
# Mac
~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
~/.config/Claude/claude_desktop_config.json

# Windows
%APPDATA%\Claude\claude_desktop_config.json
```

#### 설정 파일 편집

```json
{
  "mcpServers": {
    "Gmail": {
      "command": "uvicorn",
      "args": ["gmail_mcp:app", "--host", "127.0.0.1", "--port", "8001"]
    },
    "Google Calendar": {
      "command": "uvicorn",
      "args": ["calendar_mcp:app", "--host", "127.0.0.1", "--port", "8002"]
    },
    "Notion": {
      "command": "uvicorn",
      "args": ["notion_mcp:app", "--host", "127.0.0.1", "--port", "8003"]
    },
    "GitHub": {
      "command": "uvicorn",
      "args": ["github_mcp:app", "--host", "127.0.0.1", "--port", "8004"]
    }
  }
}
```

### MCP 도구 설정

#### Gmail MCP
```bash
# 설치
pip install mcp gmail

# 설정
MCP_GMAIL_CREDENTIALS=~/.gmail/credentials.json
```

#### Google Calendar MCP
```bash
# 설치
pip install mcp google-calendar

# 인증
# https://calendar.google.com의 OAuth 인증 필요
```

#### Notion MCP
```bash
# 설치
pip install mcp notion

# API 키 추가
MCP_NOTION_API_KEY=secret_xxx
```

#### GitHub MCP
```bash
# 설치
pip install mcp github

# 토큰 추가
MCP_GITHUB_TOKEN=ghp_xxx
```

### Claude Desktop에서 MCP 사용

예시:
```
당신: "내 Gmail에서 미읽은 이메일 5개 보여줄래?"
  ↓
Claude Desktop MCP 도구 활성화
  ↓
Gmail 읽기 (자동)
  ↓
결과 표시
```

---

## Python에서 Claude API 사용

### 기본 설정

```python
import os
from anthropic import Anthropic
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()
api_key = os.getenv("ANTHROPIC_API_KEY")

# 클라이언트 생성
client = Anthropic(api_key=api_key)
```

### 기본 호출

#### 간단한 메시지
```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "안녕! 너는 뭐하는 AI니?"
        }
    ]
)

print(response.content[0].text)
```

#### 시스템 프롬프트 포함
```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    system="당신은 생산성 코치입니다. 간결하고 실행 가능한 조언을 주세요.",
    messages=[
        {
            "role": "user",
            "content": "내일 할 일이 너무 많아. 어떻게 할까?"
        }
    ]
)

print(response.content[0].text)
```

### 문서 분석

```python
# 할일 리스트 분석
tasks = """
1. 프로젝트 문서 작성 (2시간)
2. 이메일 답장 (30분)
3. 회의 참석 (1시간)
4. 코드 리뷰 (1.5시간)
"""

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": f"""
            다음 할일들을 우선순위별로 정렬해줄래?
            
            {tasks}
            
            각 작업의 우선순위 이유도 설명해줄래.
            """
        }
    ]
)

print(response.content[0].text)
```

### 대화형 에이전트

```python
def chat_with_agent():
    """대화형 에이전트"""
    conversation_history = []
    
    print("Claude 에이전트와 대화 시작 (종료: exit)")
    print("-" * 50)
    
    while True:
        user_input = input("You: ")
        
        if user_input.lower() == "exit":
            break
        
        # 대화 기록 추가
        conversation_history.append({
            "role": "user",
            "content": user_input
        })
        
        # Claude 호출
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            system="당신은 친절한 생산성 어시스턴트입니다.",
            messages=conversation_history
        )
        
        assistant_message = response.content[0].text
        
        # 대화 기록 추가
        conversation_history.append({
            "role": "assistant",
            "content": assistant_message
        })
        
        print(f"Claude: {assistant_message}\n")

# 실행
# chat_with_agent()
```

### Vision (이미지 분석) - 선택사항

```python
import base64

# 이미지를 base64로 인코딩
with open("screenshot.png", "rb") as f:
    image_data = base64.standard_b64encode(f.read()).decode("utf-8")

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data
                    }
                },
                {
                    "type": "text",
                    "text": "이 스크린샷에서 보이는 에러가 뭐야?"
                }
            ]
        }
    ]
)

print(response.content[0].text)
```

---

## Node.js에서 Claude API 사용

### 설치

```bash
npm install @anthropic-ai/sdk
```

### 기본 설정

```javascript
const Anthropic = require("@anthropic-ai/sdk");
require("dotenv").config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

### 메시지 전송

```javascript
async function basicChat() {
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "오늘 해야 할 일을 정리해줄래?"
      }
    ]
  });

  console.log(response.content[0].text);
}

basicChat();
```

### Express에서 API 만들기

```javascript
// backend/routes/agent.js
const express = require("express");
const router = express.Router();
const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic();

// POST /api/agent/analyze
router.post("/analyze", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: "당신은 생산성 코치입니다.",
      messages: [
        {
          role: "user",
          content: `${context}\n\n${prompt}`
        }
      ]
    });

    res.json({
      success: true,
      response: response.content[0].text
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

---

## Daily Brief 에이전트

### 구조

```
agent/
├── daily_brief.py       # 메인 에이전트
├── services/
│   ├── gmail.py         # Gmail 통합
│   ├── calendar.py      # Calendar 통합
│   ├── notion.py        # Notion 통합
│   └── claude.py        # Claude API
└── requirements.txt
```

### 구현

```python
# agent/daily_brief.py
import os
import json
from datetime import datetime, timedelta
from anthropic import Anthropic
from services.gmail import get_unread_emails
from services.calendar import get_today_events
from services.notion import save_to_notion

client = Anthropic()

def get_context():
    """모든 데이터를 수집하고 컨텍스트 생성"""
    
    # 1. 미읽은 이메일
    emails = get_unread_emails(max_results=5)
    email_summary = "\n".join([
        f"- {e['from']}: {e['subject']}"
        for e in emails
    ])
    
    # 2. 오늘 일정
    events = get_today_events()
    event_summary = "\n".join([
        f"- {e['start']} {e['title']}"
        for e in events
    ])
    
    # 3. 컨텍스트 생성
    context = f"""
    📧 **미읽은 이메일:**
    {email_summary or "없음"}
    
    📅 **오늘 일정:**
    {event_summary or "없음"}
    
    {datetime.now().strftime("%Y-%m-%d %H:%M")} 기준
    """
    
    return context, emails, events

def generate_daily_brief():
    """일일 브리핑 생성"""
    
    # 데이터 수집
    context, emails, events = get_context()
    
    # Claude에게 분석 요청
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system="""당신은 생산성 코치입니다.
        사용자의 이메일과 일정을 보고 오늘의 우선순위를 정리해주세요.
        
        다음 형식으로 답변해주세요:
        1. 오늘 우선순위 TOP 3
        2. 각 항목별 예상 시간
        3. 주의할 점
        4. 추천 일정 수정""",
        messages=[
            {
                "role": "user",
                "content": f"""
                오늘 우선순위를 정리해줄래?
                
                {context}
                """
            }
        ]
    )
    
    brief = response.content[0].text
    
    # Notion에 저장
    save_to_notion({
        "title": f"Daily Brief - {datetime.now().strftime('%Y-%m-%d')}",
        "content": brief,
        "date": datetime.now().isoformat()
    })
    
    return brief

if __name__ == "__main__":
    brief = generate_daily_brief()
    print(brief)
```

### Cron 설정 (자동 실행)

```bash
# 매일 아침 8시에 실행
0 8 * * * cd ~/ai-computer-os && source venv/bin/activate && python agent/daily_brief.py

# 또는 APScheduler 사용 (Python)
```

---

## 테스트 및 디버깅

### Python 테스트

```bash
# 가상 환경 활성화
source venv/bin/activate

# 테스트 스크립트 실행
python -m pytest agent/tests/ -v

# 또는 간단한 테스트
python agent/test_claude.py
```

### 테스트 파일

```python
# agent/test_claude.py
import os
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def test_basic_message():
    """기본 메시지 테스트"""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=100,
        messages=[
            {"role": "user", "content": "Hello!"}
        ]
    )
    assert response.content[0].text
    print("✅ Basic message test passed")

def test_system_prompt():
    """시스템 프롬프트 테스트"""
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=100,
        system="You are a helpful assistant.",
        messages=[
            {"role": "user", "content": "Hi"}
        ]
    )
    assert response.content[0].text
    print("✅ System prompt test passed")

if __name__ == "__main__":
    test_basic_message()
    test_system_prompt()
    print("\n✅ All tests passed!")
```

### 디버깅 팁

#### 1. API 키 확인
```bash
# API 키가 올바른지 확인
echo $ANTHROPIC_API_KEY

# 또는
cat .env | grep ANTHROPIC
```

#### 2. 로그 출력
```python
# Python에서 로그 보기
import logging
logging.basicConfig(level=logging.DEBUG)

# Claude API 호출 로그
print(f"Using model: {model}")
print(f"Tokens: {response.usage}")
```

#### 3. 비용 추적
```python
# 사용한 토큰 확인
response = client.messages.create(...)
print(f"Input tokens: {response.usage.input_tokens}")
print(f"Output tokens: {response.usage.output_tokens}")

# 예상 비용 계산
# Opus: $15/M input, $75/M output
input_cost = response.usage.input_tokens * (15 / 1_000_000)
output_cost = response.usage.output_tokens * (75 / 1_000_000)
total = input_cost + output_cost
print(f"Estimated cost: ${total:.4f}")
```

---

## 🔗 참고 자료

### 공식 문서
- **Claude API 문서:** https://docs.anthropic.com
- **API 레퍼런스:** https://docs.anthropic.com/en/api/messages
- **콘솔:** https://console.anthropic.com

### 모델 정보
- **Claude 3.5 Sonnet** - 일반적 사용
- **Claude Opus 4.5** - 복잡한 작업
- **Claude Haiku 4.5** - 빠른 응답

### 추가 자료
- **MCP 스펙:** https://modelcontextprotocol.io
- **예제 코드:** https://github.com/anthropics/anthropic-sdk-python

---

**마지막 업데이트:** 2026-09-02  
**다음 단계:** COURSE_MAPPING.md에서 강의 연결 확인
