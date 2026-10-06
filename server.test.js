import test from 'node:test';
import assert from 'node:assert/strict';
process.env.TMAP_API_KEY = 'test-key';
process.env.NODE_ENV = 'test';
const {handler} = await import('./server.js');
async function request(url, method='GET') {
 const response={status:0,headers:{},body:'',writeHead(status,headers){this.status=status;this.headers=headers;},end(body=''){this.body=body;}};
 await handler({url,method},response);
 return response;
}
test('routes API maps X to longitude and Y to latitude without exposing the app key',async()=>{
 const original=global.fetch;let call;
 global.fetch=async (url,options)=>{call={url,options};return new Response(JSON.stringify({metaData:{plan:{itineraries:[]}}}),{status:200,headers:{'Content-Type':'application/json'}});};
 try {
  const response=await request('/api/routes?startLat=35.1&startLng=128.1&endLat=35.2&endLng=128.2');
  assert.equal(response.status,200);assert.deepEqual(JSON.parse(response.body),{routes:[]});
  assert.deepEqual(JSON.parse(call.options.body),{startX:'128.1',startY:'35.1',endX:'128.2',endY:'35.2',count:10,lang:0,format:'json'});
  assert.equal(call.options.headers.appKey,'test-key');
  const js=await request('/app.js');assert.equal(js.body.includes('test-key'),false);
 } finally {global.fetch=original;}
});
test('invalid coordinates are rejected before upstream requests',async()=>{
 const response=await request('/api/routes?startLat=999&startLng=128&endLat=35&endLng=128');assert.equal(response.status,400);
});

test('upstream errors preserve TMAP status and diagnostic message',async()=>{
 const original=global.fetch;
 global.fetch=async()=>new Response(JSON.stringify({error:{message:'Invalid app key'}}),{status:401});
 try {
  const response=await request('/api/routes?startLat=35.1&startLng=128.1&endLat=35.2&endLng=128.2');
  const body=JSON.parse(response.body);
  assert.equal(response.status,502);assert.equal(body.error.upstreamStatus,401);assert.match(body.error.message,/TMAP HTTP 401: Invalid app key/);
 } finally {global.fetch=original;}
});

test('departure time is forwarded to TMAP in yyyymmddhhmm format',async()=>{
 const original=global.fetch;let body;
 global.fetch=async (_url,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({metaData:{plan:{itineraries:[]}}}),{status:200});};
 try {
  const response=await request('/api/routes?startLat=35.1&startLng=128.1&endLat=35.2&endLng=128.2&searchDttm=202610061345');
  assert.equal(response.status,200);assert.equal(body.searchDttm,'202610061345');
 } finally {global.fetch=original;}
});
test('invalid departure time is rejected',async()=>{
 const response=await request('/api/routes?startLat=35.1&startLng=128.1&endLat=35.2&endLng=128.2&searchDttm=202602301299');
 assert.equal(response.status,400);assert.equal(JSON.parse(response.body).error.code,'INVALID_DEPARTURE_TIME');
});
