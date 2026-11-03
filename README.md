# Bus Route Finder

현재 위치와 목적지를 기반으로 대중교통 경로를 검색하고, 버스 예약 기능을 제공하는 웹 애플리케이션입니다.

## 주요 기능

- **버스 경로 검색:** TMAP API를 활용한 대중교통 경로 탐색
- **실제 지도 표시:** Kakao Maps API를 이용해 검색된 경로를 지도에 표시
- **현재 위치 확인:** 브라우저 위치 정보 기능 활용
- **목적지 검색:** 카카오 장소 및 주소 검색
- **회원가입 및 로그인:** 사용자 인증 기능
- **버스 예약:** MySQL 데이터베이스를 이용한 예약 정보 저장

## 기술 스택

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MySQL
- Maps: Kakao Maps JavaScript API
- Route Search: TMAP API

## 설치 및 실행

### 1. 프로젝트 다운로드

```bash
git clone https://github.com/kim7899/bus-route-finder.git
cd bus-route-finder
```

### 2. 라이브러리 설치

```bash
npm ci
```

`package-lock.json`이 없는 경우 `npm install`을 사용합니다.

### 3. 환경 변수 설정


프로젝트 루트의 `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 다음 명령어를 사용합니다.

```powershell
Copy-Item .env.example .env
```

생성된 `.env` 파일에 자신의 TMAP API 키와 MySQL 연결 정보를 입력합니다.

실제 API 키와 비밀번호가 포함된 `.env` 파일은 GitHub에 업로드하지 않습니다.

실제 비밀번호와 API 키는 GitHub에 업로드하지 않습니다.

### 4. 카카오맵 API 설정

`public/destination.js` 파일에서 카카오 JavaScript 키를 설정합니다.

```javascript
export const KAKAO_JS_KEY = 'YOUR_KAKAO_JAVASCRIPT_KEY';
```

카카오 개발자 콘솔에서 웹사이트 도메인도 등록해야 합니다.

- `http://localhost:3000`
- `http://127.0.0.1:3000`

### 5. 서버 실행

```bash
node server.js
```

브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:3000
```

## 사용 방법

1. 회원가입 또는 로그인합니다.
2. 현재 위치 사용을 허용합니다.
3. 목적지를 검색하고 선택합니다.
4. 버스 경로를 검색합니다.
5. 검색 결과를 카카오맵에서 확인합니다.
6. 원하는 경로의 예약 기능을 이용합니다.

## 보안 및 주의사항
- `node_modules/`는 업로드하지 않으며, 설치 명령어로 복원합니다.
- 카카오 JavaScript 키는 허용 웹 도메인을 제한해야 합니다.
- 로컬 MySQL 연결 설정은 실행 환경에 맞게 변경해야 합니다.
