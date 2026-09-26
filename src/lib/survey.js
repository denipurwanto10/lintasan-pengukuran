// survey.js — Inti perhitungan geodesi / topografi (X=Timur, Y=Utara)
export const DEG2RAD = Math.PI / 180
export const RAD2DEG = 180 / Math.PI
export const M2_PER_HA = 10000

export const round = (v, d=2) => { const f=10**d; return Math.round((v+Number.EPSILON)*f)/f }
export const fmt = (v,d=2) => Number.isFinite(v) ? v.toLocaleString('id-ID',{minimumFractionDigits:d, maximumFractionDigits:d}) : '\u2014'
export const hitungJarak = (a,b) => Math.hypot(b.x-a.x, b.y-a.y)
export const hitungAzimuth = (a,b) => { const az=(Math.atan2(b.x-a.x,b.y-a.y)*RAD2DEG+360)%360; return round(az,4) }
export const azimuthKeKuadran = (az) => { const a=((az%360)+360)%360; if(a<90) return 'U '+a.toFixed(1)+'\u00B0 T'; if(a<180) return 'T '+(180-a).toFixed(1)+'\u00B0 S'; if(a<270) return 'S '+(a-180).toFixed(1)+'\u00B0 B'; return 'B '+(360-a).toFixed(1)+'\u00B0 U' }
export const hitungSudut = (a,b,c) => { const v1={x:a.x-b.x,y:a.y-b.y}, v2={x:c.x-b.x,y:c.y-b.y}; const n1=Math.hypot(v1.x,v1.y), n2=Math.hypot(v2.x,v2.y); if(!n1||!n2) return null; const cos=(v1.x*v2.x+v1.y*v2.y)/(n1*n2); return round(Math.acos(Math.max(-1,Math.min(1,cos)))*RAD2DEG,2) }
export const azimuthKeDelta = (jarak,az) => { const r=az*DEG2RAD; return {dx:jarak*Math.sin(r), dy:jarak*Math.cos(r)} }
export const hitungLuasPoligon = (pts) => { if(pts.length<3) return 0; let s=0; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; s+=a.x*b.y-a.y*b.x } return Math.abs(s)/2 }
export const hitungCentroid = (pts) => { if(pts.length<3) return null; let cx=0,cy=0,area2=0; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; const cr=a.x*b.y-a.y*b.x; area2+=cr; cx+=(a.x+b.x)*cr; cy+=(a.y+b.y)*cr } if(Math.abs(area2)<1e-9) return null; return {x:cx/(3*area2), y:cy/(3*area2)} }
export const isTertutup = (pts) => pts.length>=3 && hitungJarak(pts[0], pts[pts.length-1])<0.001
export const analisisLintasan = (pts) => {
  const n=pts.length
  const empty={ total:0, segments:[], luas:0, luasHa:0, keliling:0, centroid:null, tertutup:false, error:null, angles:[], titikAwal:null, titikAkhir:null }
  if(n<2) return {...empty, titikAwal:pts[0]??null, titikAkhir:pts[0]??null}
  const segments=[];
  for(let i=0;i<n-1;i++){ const a=pts[i], b=pts[i+1]; const j=hitungJarak(a,b); if(j<1e-9) continue; const az=hitungAzimuth(a,b); segments.push({index:i, id:'S'+(segments.length+1), from:a,to:b, distance:round(j,4), azimuth:az, kuadran:azimuthKeKuadran(az), deltaX:round(b.x-a.x,4), deltaY:round(b.y-a.y,4)}) }
  const total=round(segments.reduce((s,x)=>s+x.distance,0),4)
  const tertutup=isTertutup(pts)
  const luas=tertutup?round(hitungLuasPoligon(pts.slice(0,-1)),4):0
  const centroid=tertutup?hitungCentroid(pts.slice(0,-1)):null
  const first=pts[0], last=pts[n-1]
  const eX=round(last.x-first.x,6), eY=round(last.y-first.y,6), eDist=round(Math.hypot(eX,eY),6)
  const error={ dx:eX, dy:eY, distance:eDist, konvergen:eDist<0.001 }
  const angles=[];
  if(tertutup && n>=4){ const ring=pts.slice(0,-1); for(let i=0;i<ring.length;i++){ const pr=ring[(i-1+ring.length)%ring.length], cur=ring[i], nx=ring[(i+1)%ring.length]; angles.push({at:cur,label:String(i+1),nilai:hitungSudut(pr,cur,nx)}) } }
  return { total, segments, luas, luasHa:luas/M2_PER_HA, keliling:total+(tertutup?0:hitungJarak(first,last)), centroid, tertutup, error, angles, titikAwal:first, titikAkhir:last }
}
export const CONTOH_POLIGON=[{x:0,y:0},{x:120,y:0},{x:180,y:95},{x:95,y:175},{x:0,y:120}]
export const CONTOH_TERBUKA=[{x:0,y:0},{x:80,y:25},{x:160,y:10},{x:250,y:120},{x:330,y:95}]