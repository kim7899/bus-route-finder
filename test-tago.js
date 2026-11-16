
import 'dotenv/config';

const API_KEY = process.env.TAGO_API_KEY;
const BASE = 'https://apis.data.go.kr/1613000';

if (!API_KEY) {
  console.error('TAGO_API_KEY가 .env에 없습니다.');
  process.exit(1);
}

// Encoding 키(%2B, %2F 등)를 넣었을 때도 처리
function normalizeKey(key) {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

async function callTago(service, operation, params = {}) {
  const url = new URL(`${BASE}/${service}/${operation}`);

  url.searchParams.set('serviceKey', normalizeKey(API_KEY));
  url.searchParams.set('_type', 'json');
  url.searchParams.set('numOfRows', '100');
  url.searchParams.set('pageNo', '1');

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  console.log(`\n호출: ${service}/${operation}`);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${raw.slice(0, 500)}`);
  }

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `JSON 응답이 아닙니다:\n${raw.slice(0, 700)}`
    );
  }

  const header = data.response?.header;

  if (header && String(header.resultCode) !== '00') {
    throw new Error(
      `TAGO 오류 ${header.resultCode}: ${header.resultMsg}`
    );
  }

  const items = data.response?.body?.items?.item;

  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function main() {
  // 1. 도시코드 조회
  const cities = await callTago(
    'BusRouteInfoInqireService',
    'getCtyCodeList'
  );

  const jinju = cities.find(city =>
    String(city.cityname ?? city.cityName ?? '').includes('진주')
  );

  console.log('\n[진주시 도시 정보]');
  console.log(jinju ?? '진주시를 찾지 못했습니다.');

  if (!jinju) return;

  const cityCode = jinju.citycode ?? jinju.cityCode;

  // 2. 진주 120번 노선 조회
  const routes = await callTago(
    'BusRouteInfoInqireService',
    'getRouteNoList',
    {
      cityCode,
      routeNo: '120'
    }
  );

  console.log('\n[120번 검색 결과]');
  console.table(routes.map(route => ({
    노선번호: route.routeno,
    노선ID: route.routeid,
    출발지: route.startnodenm,
    종점: route.endnodenm
  })));

  const routes120= routes.filter(
    r => String(r.routeno ?? '').trim() === '120'
  );

  if (routes120.length === 0) {
    console.log('120번 노선을 찾지 못했습니다.');
    return;
  }

  console.log(`\n120번 노선 ${routes120.length}개 위치 조회 시작`);

  let totalBuses = 0;

  for (const route of routes120) {
    console.log(
      `\n노선: ${route.routeno} | ${route.routeid}`
    );

    try {
      const positions = await callTago(
        'BusLcInfoInqireService',
        'getRouteAcctoBusLcList',
        {
          cityCode,
          routeId: route.routeid
        }
      );

      console.log(`조회된 버스: ${positions.length}대`);

      if (positions.length > 0) {
        console.dir(positions, { depth: 4 });

        console.table(
          positions.map(bus => ({
            차량번호: bus.vehicleno ?? bus.vehiclenum ?? '',
            정류장: bus.nodenm ?? '',
            위도: bus.gpslati ?? '',
            경도: bus.gpslong ?? ''
          }))
        );
      }

      totalBuses += positions.length;

    } catch (error) {
      console.error(
        `${route.routeid} 조회 실패: ${error.message}`
      );
    }
  }

  console.log('\n=========================');
  console.log(`120번 전체 조회 버스: ${totalBuses}대`);
  console.log('=========================');
}

main().catch(error => {
  console.error('테스트 실패:', error.message);
  process.exitCode = 1;
});



