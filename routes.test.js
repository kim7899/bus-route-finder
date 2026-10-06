import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoutes,parsePlaces,linePoints} from './routes.js';
const walk = (time,distance) => ({mode:'WALK',sectionTime:time,distance,start:{name:'출발지',lat:37.5,lon:127},end:{name:'정류장',lat:37.501,lon:127.001},steps:[{description:'직진',linestring:'127,37.5 127.001,37.501'}]});
const bus = (route='160') => ({mode:'BUS',route,routeId:'abc',sectionTime:800,distance:3000,start:{name:'승차',lat:37.501,lon:127.001},end:{name:'하차',lat:37.52,lon:127.02},passStopList:{stations:[{stationName:'승차',lat:'37.501',lon:'127.001'},{stationName:'중간',lat:'37.51',lon:'127.01'},{stationName:'하차',lat:'37.52',lon:'127.02'}]},passShape:{linestring:'127.001,37.501 127.02,37.52'}});
test('WGS84 POI entrance coordinates and singleton responses',()=>{assert.deepEqual(parsePlaces({searchPoiInfo:{pois:{poi:{id:'1',name:'청사',frontLat:'35.1',frontLon:'128.1',noorLat:'35.2',noorLon:'128.2'}}}})[0],{id:'1',name:'청사',address:'',lat:35.1,lng:128.1});});
test('bus routes are ranked, walking and stop geometries are normalized',()=>{
 const data={metaData:{plan:{itineraries:[{totalTime:1100,totalWalkTime:300,totalWalkDistance:350,transferCount:1,fare:{regular:{totalFare:1450}},legs:[walk(300,350),bus()]},{totalTime:1200,totalWalkTime:100,totalWalkDistance:120,transferCount:0,fare:{regular:{totalFare:1500}},legs:[walk(100,120),bus('161')]},{totalTime:300,legs:[walk(300,400)]}]}}};
 const result=parseRoutes(data); assert.equal(result.length,2);assert.equal(result[0].recommended,true);assert.equal(result[0].segments[1].busNumber,'161');assert.equal(result[0].segments[1].stopCount,2);assert.deepEqual(result[0].segments[1].paths[0][0],{lat:37.501,lng:127.001});assert.equal(result[0].totalFare,1500);assert.equal(result[1].recommended,false);
});
test('invalid shape points are omitted',()=>assert.deepEqual(linePoints('127,37 bad 999,30'),[{lat:37,lng:127}]));
