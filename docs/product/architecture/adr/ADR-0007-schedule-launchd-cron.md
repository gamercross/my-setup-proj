# ADR-0007: 스케줄은 launchd(macOS)/cron(Linux)

- 상태: 채택 (2026-09-02)
- 관련: FR-AGENT-05, [AUTOMATION.md](../../../setup/AUTOMATION.md)

## 맥락
Daily Brief 를 매일 아침 자동 실행해야 한다(FR-AGENT-05). 스케줄 방식을 정한다.

## 결정
OS 예약 작업을 쓴다. macOS 는 **launchd** plist, Linux 는 **cron** 항목. 이미 작업로그 EOD 에 쓰는 launchd 패턴(`scripts/com.aicomputeros.worklog.plist`)을 재사용한다.

## 근거
- 별도 상주 프로세스(APScheduler 데몬)를 띄우지 않아도 된다.
- 프로젝트에 이미 launchd 사용 선례가 있어 일관적.
- 강의 Week 6(프로세스·cron)와 연결된다.

## 대안
- **APScheduler 상주 프로세스**: 항상 켜둬야 하고 관리 포인트가 는다.
- **GitHub Actions cron**: 로컬 데이터(SQLite)·OAuth 토큰에 접근 못 한다.

## 결과 / 트레이드오프
- OS별 설치 절차가 갈린다 → 문서화 필요(plist 설치 vs `crontab -e`).
- plist 경로가 하드코딩된다(현재도 그렇다) → 머신 이동 시 수정.
- 앱이 꺼져 있어도 에이전트는 도는데, 백엔드가 안 떠 있으면 UI 조회만 안 될 뿐 브리핑 생성엔 지장 없음(에이전트가 SQLite 에 직접 씀).
