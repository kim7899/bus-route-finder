import { KAKAO_JS_KEY } from './destination.js';
const $ = id => document.getElementById(id);
let origin = null, destination = null, routes = [];
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const minutes = seconds => `${Math.ceil(seconds / 60)}분`;
const won = amount => amount ? `${amount.toLocaleString('ko-KR')}원` : '정보 없음';
const buttonState = () => { $('route-button').disabled = !origin || !destination; };
const departureInput = $('departure-time');
const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
departureInput.value = localNow.toISOString().slice(0,16);
async function api(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || '요청에 실패했습니다.');
  return body;
}
function locate() {
  if (!navigator.geolocation) return status('이 브라우저에서는 위치 확인을 지원하지 않습니다.', true);
  $('locate').disabled = true; status('위치 권한을 확인하고 있어요…');
  navigator.geolocation.getCurrentPosition(position => {
    origin = {lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy};
    console.info('현재 위치:', {latitude:origin.lat, longitude:origin.lng, accuracy:origin.accuracy});
    $('location-label').textContent = `${origin.lat.toFixed(5)}, ${origin.lng.toFixed(5)}`;
    $('accuracy').textContent = `정확도 약 ${Math.round(origin.accuracy)}m`;
    $('locate').disabled = false; status(destination ? '버스 경로를 찾을 준비가 됐어요.' : '목적지를 검색해 주세요.'); buttonState();
  }, error => {
    $('locate').disabled = false;
    const messages = {1:'위치 권한이 거부됐습니다. 브라우저 설정에서 허용해 주세요.',2:'현재 위치를 확인할 수 없습니다. GPS 또는 네트워크를 확인해 주세요.',3:'위치 확인 시간이 초과됐습니다. 다시 시도해 주세요.'};
    status(messages[error.code] || '위치 확인 중 오류가 발생했습니다.', true);
  }, {enableHighAccuracy:true, timeout:12000, maximumAge:0});
}
$('locate').addEventListener('click',locate);
let kakaoServices = null;
const kakaoReady = new Promise((resolve,reject) => {
  if (!KAKAO_JS_KEY || KAKAO_JS_KEY.includes('여기에_')) { reject(new Error('public/destination.js에 카카오 JavaScript 키를 입력해 주세요.')); return; }
  const script = document.createElement('script');
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&libraries=services&autoload=false`;
  script.onload = () => window.kakao.maps.load(() => {
    kakaoServices = {geocoder:new window.kakao.maps.services.Geocoder(), places:new window.kakao.maps.services.Places()};
    resolve(kakaoServices);
  });
  script.onerror = () => reject(new Error('카카오 지도 SDK를 불러오지 못했습니다. JavaScript 키와 등록 도메인을 확인해 주세요.'));
  document.head.append(script);
});
void kakaoReady.catch(() => {});
function callbackSearch(run) {
  return new Promise(resolve => run((data, resultStatus) => resolve({data, resultStatus})));
}
function searchAddress(query, services) {
  return callbackSearch(done => services.geocoder.addressSearch(query, done)).then(({data,resultStatus}) => {
    if (resultStatus !== window.kakao.maps.services.Status.OK) return [];
    return data.map(item => ({id:`address-${item.address_name}-${item.x}-${item.y}`,name:item.address_name || query,address:item.road_address?.address_name || item.address?.address_name || item.address_name || '',lat:Number(item.y),lng:Number(item.x)}));
  });
}
function searchKeyword(query, services) {
  return callbackSearch(done => services.places.keywordSearch(query, done)).then(({data,resultStatus}) => {
    if (resultStatus !== window.kakao.maps.services.Status.OK) return [];
    return data.map(item => ({id:`place-${item.id}`,name:item.place_name,address:item.road_address_name || item.address_name || '',lat:Number(item.y),lng:Number(item.x)}));
  });
}
$('query').addEventListener('input',() => { destination = null; $('selected').hidden = true; $('places').hidden = true; buttonState(); });
$('search-form').addEventListener('submit',async event => {
  event.preventDefault(); const query = $('query').value.trim(); if (query.length < 2) return;
  destination = null; buttonState(); $('places').hidden = true; status('카카오에서 주소와 장소를 검색하고 있어요…'); $('search-form').querySelector('button').disabled = true;
  try {
    const services = await kakaoReady;
    const results = await Promise.all([searchAddress(query,services),searchKeyword(query,services)]);
    const unique = new Map();
    results.flat().filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng) && Math.abs(item.lat)<=90 && Math.abs(item.lng)<=180).forEach(item => {
      const key = `${item.lat.toFixed(6)},${item.lng.toFixed(6)}`;
      if (!unique.has(key)) unique.set(key,item);
    });
    const places = [...unique.values()];
    if (!places.length) { status('검색 결과가 없습니다. 주소나 장소명을 확인해 주세요.',true); return; }
    $('places').replaceChildren();
    places.forEach(place => {
      const option = document.createElement('button'); option.type = 'button'; option.className = 'place';
      const name = document.createElement('strong'); name.textContent = place.name;
      const address = document.createElement('small'); address.textContent = place.address || `${place.lat}, ${place.lng}`;
      option.append(name,address); option.addEventListener('click',() => {
        destination = place; $('query').value = place.name; $('places').hidden = true;
        $('selected').textContent = `선택한 목적지: ${place.name} · 위도 ${place.lat}, 경도 ${place.lng}`;
        $('selected').hidden = false; buttonState(); status(origin ? '버스 경로를 찾을 준비가 됐어요.' : '현재 위치를 확인해 주세요.');
      }); $('places').append(option);
    });
    $('places').hidden = false; status(`${places.length}개의 주소·장소가 검색됐어요. 정확한 목적지를 선택해 주세요.`);
  } catch(error) { status(error.message,true); }
  finally { $('search-form').querySelector('button').disabled = false; }
});
$('route-button').addEventListener('click',async () => {
  if (!origin || !destination) return;
  $('route-button').disabled = true; $('results').hidden = true; status('버스 경로를 비교하고 있어요…');
  const params = new URLSearchParams({startLat:origin.lat,startLng:origin.lng,endLat:destination.lat,endLng:destination.lng});
  if (departureInput.value) params.set('searchDttm', departureInput.value.replace(/\D/g,''));
  status(`${departureInput.value.replace('T',' ')} 출발 기준으로 버스 경로를 비교하고 있어요…`);
  try {
    ({routes} = await api(`/api/routes?${params}`));
    if (!routes.length) { $('map-empty').hidden = false; $('map-paths').replaceChildren(); $('map-markers').replaceChildren(); return status('이 구간에서 버스 경로를 찾지 못했습니다. 목적지를 바꾸거나 잠시 후 다시 시도해 주세요.',true); }
    renderRoutes(); status(`${routes.length}개의 버스 경로를 찾았어요.`);
  } catch(error) { status(error.message,true); }
  finally { buttonState(); }
});
function addText(parent,tag,value,className) { const el=document.createElement(tag); el.textContent=value; if(className) el.className=className; parent.append(el); return el; }
function renderRoutes() {
  const list=$('route-list'); list.replaceChildren(); $('results').hidden=false;
  if(routes.length>1) addText(list,'h3','다른 경로도 비교해 보세요','alternatives-title');
  routes.forEach((route,index) => {
    const card=document.createElement('article'); card.className=`route-card${index===0?' recommended':''}`;
    const head=addText(card,'div','','route-head'); const summary=addText(head,'div','');
    if(index===0) addText(summary,'span','추천 경로','badge');
    addText(summary,'h3',`약 ${minutes(route.totalTime)}`);
    addText(summary,'p',route.segments.filter(s=>s.type==='BUS').map(s=>`${s.busNumber || '버스'}번`).join(' → ') || '버스 경로');
    const show=addText(head,'button',index===0?'지도에 표시':'이 경로 지도 보기'); show.type='button'; show.addEventListener('click',()=>drawMap(route));
    const reserve = addText(head, 'button', '이 경로 예약하기');
reserve.type = 'button';

reserve.addEventListener('click', async () => {
  if (!confirm('선택한 버스 경로를 예약할까요?')) return;

  reserve.disabled = true;

  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startName: '현재 위치',
        startLat: origin.lat,
        startLng: origin.lng,
        endName: destination.name,
        endLat: destination.lat,
        endLng: destination.lng,
        departureTime: departureInput.value,
        route
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || '예약 실패');
    }

    status(`예약 완료! 예약 번호: ${result.reservationId}`);
  } catch (error) {
    status(error.message, true);
  } finally {
    reserve.disabled = false;
  }
});
    const stats=addText(card,'div','','stats');
    [['환승',route.transferCount ? `${route.transferCount}회`:'없음'],['도보 시간',minutes(route.totalWalkTime)],['도보 거리',`${Math.round(route.totalWalkDistance)}m`],['예상 요금',won(route.totalFare)]].forEach(([label,value])=>{const item=addText(stats,'span',label);addText(item,'strong',value);});
    const timeline=addText(card,'ol','','timeline'); addText(timeline,'li','현재 위치');
    route.segments.forEach(s=>{
      if(s.type==='WALK') {const li=addText(timeline,'li',`도보 ${minutes(s.time)} · ${Math.round(s.distance)}m`,'walk'); addText(li,'small',s.to || '다음 지점까지');}
      else if(s.type==='BUS') {const board=addText(timeline,'li',`${s.from || '승차 정류장'} 승차`);addText(board,'small',`${s.busNumber || '버스'}번 버스${s.alternatives.length > 1 ? ` (대체 노선: ${s.alternatives.join(', ')})`:''}`);const ride=addText(timeline,'li',`${s.busNumber || '버스'}번 · ${minutes(s.time)}`);addText(ride,'small',s.stopCount ? `${s.stopCount}개 정류장 이동` : '버스 이동');addText(timeline,'li',`${s.to || '하차 정류장'} 하차`);}
      else {const li=addText(timeline,'li',`${s.type} · ${minutes(s.time)}`);addText(li,'small',`${s.from} → ${s.to}`);}
    });
    addText(timeline,'li',destination.name); list.append(card);
  });
  const first=list.querySelector('.route-card'); list.prepend(first); drawMap(routes[0]);
}
const ns='http://www.w3.org/2000/svg';
function svg(tag,attributes,parent) {const node=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([k,v])=>node.setAttribute(k,String(v)));parent.append(node);return node;}
function drawMap(route) {
  const paths=$('map-paths'),markers=$('map-markers'); paths.replaceChildren();markers.replaceChildren();$('map-empty').hidden=true;
  const points=[origin,destination,...route.segments.flatMap(s=>[s.start,s.end,...s.stops.map(x=>x.point),...s.paths.flat()])].filter(Boolean);
  const minLng=Math.min(...points.map(p=>p.lng)),maxLng=Math.max(...points.map(p=>p.lng));
  const minLat=Math.min(...points.map(p=>p.lat)),maxLat=Math.max(...points.map(p=>p.lat));
  const midLat=(minLat+maxLat)/2*Math.PI/180, scaleX=Math.cos(midLat);
  const width=Math.max((maxLng-minLng)*scaleX,.0001),height=Math.max(maxLat-minLat,.0001);
  const factor=Math.min(500/width,290/height), offsetX=(600-width*factor)/2,offsetY=(390-height*factor)/2;
  const xy=p=>({x:offsetX+(p.lng-minLng)*scaleX*factor,y:390-offsetY-(p.lat-minLat)*factor});
  route.segments.forEach(s=>{
    const color=s.type==='WALK'?'#e49b45':'#118b61';
    const lines=s.paths.length?s.paths:(s.start&&s.end?[[s.start,s.end]]:[]);
    lines.forEach(line=>{if(line.length<2)return;svg('polyline',{points:line.map(p=>{const v=xy(p);return `${v.x},${v.y}`;}).join(' '),fill:'none',stroke:color,'stroke-width':s.type==='WALK'?4:6,'stroke-linecap':'round','stroke-linejoin':'round','stroke-dasharray':s.type==='WALK'?'2 8':'none'},paths);});
    if(s.type==='BUS') [[s.start,'승차'],[s.end,'하차']].forEach(([p,label])=>{if(p)mark(p,label,'#187d5c');});
  });
  mark(origin,'출발','#183e31');mark(destination,'도착','#dc8036');
  function mark(point,label,color){const p=xy(point);svg('circle',{cx:p.x,cy:p.y,r:8,fill:color,stroke:'#fff','stroke-width':3},markers);const text=svg('text',{x:p.x+11,y:p.y-10,fill:'#24372c','font-size':12,'font-weight':700,stroke:'#fff','stroke-width':3,'paint-order':'stroke'},markers);text.textContent=label;}
}
