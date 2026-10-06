import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseRoutes} from './routes.js';
const root = path.dirname(fileURLToPath(import.meta.url));
try { const env = await readFile(path.join(root, '.env'), 'utf8'); for (const line of env.split(/\r?\n/)) { const match = line.match(/^([A-Z_]+)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, ''); } } catch (error) { if (error.code !== 'ENOENT') throw error; }
const key = process.env.TMAP_API_KEY;
const json = (res, status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
const fail = (res,status,code,message,details={}) => json(res,status,{error:{code,message,...details}});
const validLat = v => v !== null && v !== '' && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 90;
const validLng = v => v !== null && v !== '' && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= 180;
const validSearchDttm = value => {
  if (!/^\d{12}$/.test(value)) return false;
  const year=+value.slice(0,4), month=+value.slice(4,6), day=+value.slice(6,8), hour=+value.slice(8,10), minute=+value.slice(10,12);
  const date=new Date(Date.UTC(year,month-1,day,hour,minute));
  return year>=1900 && year<=9999 && date.getUTCFullYear()===year && date.getUTCMonth()===month-1 && date.getUTCDate()===day && hour<=23 && minute<=59;
};
async function upstream(url, options = {}) {
  const response = await fetch(url, { ...options, headers: {'appKey': key, 'Accept':'application/json', ...options.headers}, signal: AbortSignal.timeout(10000)});
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = [data?.error?.message, data?.error?.detail, data?.message, data?.msg, data?.errorMessage, data?.errorMsg].find(value => typeof value === 'string' && value.trim());
    const error = new Error(`TMAP HTTP ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ' 응답 오류'}`);
    error.status = response.status === 429 ? 429 : 502;
    error.upstreamStatus = response.status;
    throw error;
  }
  if (!data) { const error = new Error('TMAP 응답을 읽을 수 없습니다.'); error.status = 502; throw error; }
  return data;
}
export async function handler(req,res) {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    if (req.method !== 'GET') return fail(res,405,'METHOD_NOT_ALLOWED','GET 요청만 지원합니다.');
    if (!key) return fail(res,503,'KEY_MISSING','서버에 TMAP_API_KEY를 설정해 주세요.');
    try {
      if (url.pathname === '/api/routes') {
        const p = url.searchParams;
        if (!validLat(p.get('startLat')) || !validLng(p.get('startLng')) || !validLat(p.get('endLat')) || !validLng(p.get('endLng'))) return fail(res,400,'INVALID_COORDINATES','올바른 위도와 경도를 입력해 주세요.');
        const searchDttm = p.get('searchDttm');
        if (searchDttm && !validSearchDttm(searchDttm)) return fail(res,400,'INVALID_DEPARTURE_TIME','출발 시각은 YYYYMMDDHHmm 형식으로 입력해 주세요.');
        const body = {startX:p.get('startLng'),startY:p.get('startLat'),endX:p.get('endLng'),endY:p.get('endLat'),count:10,lang:0,format:'json'};
        if (searchDttm) body.searchDttm = searchDttm;
        const data = await upstream('https://apis.openapi.sk.com/transit/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        return json(res,200,{routes:parseRoutes(data)});
      }
      return fail(res,404,'NOT_FOUND','API를 찾을 수 없습니다.');
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') return fail(res,504,'UPSTREAM_TIMEOUT','TMAP 응답 시간이 초과됐습니다. 다시 시도해 주세요.');
      return fail(res,error.status || 502,'UPSTREAM_ERROR',error.message || '외부 API 연결에 실패했습니다.',error.upstreamStatus ? {upstreamStatus:error.upstreamStatus} : {});
    }
  }
  const files = {'/':'index.html','/app.js':'app.js','/destination.js':'destination.js','/style.css':'style.css'};
  if (req.method !== 'GET' || !files[url.pathname]) return fail(res,404,'NOT_FOUND','페이지를 찾을 수 없습니다.');
  const name = files[url.pathname];
  const mime = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html';
  const content = await readFile(path.join(root,'public',name));
  res.writeHead(200,{'Content-Type':`${mime}; charset=utf-8`,'Cache-Control':'no-store'}); res.end(content);
}
if (process.env.NODE_ENV !== 'test') http.createServer((req,res) => { handler(req,res).catch(() => fail(res,500,'SERVER_ERROR','서버 오류가 발생했습니다.')); }).listen(Number(process.env.PORT) || 3000, () => console.log(`http://localhost:${Number(process.env.PORT) || 3000}`));
