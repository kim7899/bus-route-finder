# 버스길

브라우저 GPS, 카카오 주소·장소 검색, TMAP 대중교통 API를 연결한 버스 중심 길찾기 서비스입니다. Node.js 20 이상이 필요합니다.

## 실행

1. `.env.example`을 `.env`로 복사하고 `TMAP_API_KEY`에 TMAP 대중교통 경로 API 키를 입력합니다.
2. `public/destination.js`의 `KAKAO_JS_KEY`에 카카오 JavaScript 키를 입력하고, Kakao Developers의 Web 플랫폼 도메인에 `http://localhost:3000`을 등록합니다.
3. `npm start`를 실행하고 `http://localhost:3000`을 엽니다. 배포 시 GPS 사용을 위해 HTTPS가 필요합니다. localhost는 브라우저 보안 컨텍스트로 허용됩니다.
4. `npm test`로 응답 변환 테스트를 실행합니다.

주소와 장소 검색은 카카오 JavaScript SDK의 주소 검색과 키워드 검색으로 처리하며, 결과를 고른 뒤 위도·경도를 TMAP 경로 API에 전달합니다. 출발 시각 입력값은 `searchDttm`(`YYYYMMDDHHmm`)으로 전달되어 해당 시각의 대중교통 운행 여부를 기준으로 경로를 조회합니다. 카카오 키는 웹용 키로 브라우저에서 사용되므로 Kakao Developers에서 허용 도메인을 등록하세요. 서버는 `GET /api/routes?startLat=...&startLng=...&endLat=...&endLng=...`를 제공합니다. TMAP 키는 서버 환경변수에만 두며 위치 좌표 및 조회 결과는 DB나 서버 캐시에 저장하지 않습니다. 경로 점수는 소요시간(초) + 환승당 300초 + 도보시간의 20% + 도보거리(m)의 10%이며 버스를 포함한 경로만 비교합니다. 지도는 좌표 기반 개요로 실제 지도 배경이나 실시간 버스 도착 정보를 표시하지 않습니다.
