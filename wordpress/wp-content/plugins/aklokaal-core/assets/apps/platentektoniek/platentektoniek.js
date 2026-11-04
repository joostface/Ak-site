/*
 * Platentektoniek in lagen: rekenkern en 3D-simulatie (oorspronkelijk een losse pagina).
 * Ingebouwd in de site: alles werkt binnen het element #pt, zodat het niet botst met de rest van de pagina.
 * Vereist three.js r128 en OrbitControls (worden vooraf geladen).
 */
(function(){"use strict";
// ================= hulpfuncties =================
const ROOT=document.getElementById('pt');if(!ROOT)return;
const IMGBASE=ROOT.dataset.img||'';
const $=s=>ROOT.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,f)=>a+(b-a)*f;
const sstep=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
const bell=u=>Math.exp(-u*u);
const rad=d=>d*Math.PI/180;
const PI=Math.PI;
function wrapA(a){while(a>PI)a-=2*PI;while(a<=-PI)a+=2*PI;return a}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash2(i,j){let h=(Math.imul(i,374761393)+Math.imul(j,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
const fmt=(v,d=1)=>v.toFixed(d).replace('.',',');
const oceanDepth=age=>2.6+0.33*Math.sqrt(Math.max(age,0));          // km, Parsons & Sclater-achtig
const oceanLith=age=>Math.min(95,10*Math.sqrt(Math.max(age,0)+0.15)); // km, halfruimte-afkoeling
// geomagnetische ompolingen (pseudo-willekeurig, vaste reeks)
const CHRONS=(()=>{const r=mulberry32(11);const b=[];let tt=-500,p=1;while(tt<400){b.push([tt,p]);tt+=0.18+r()*1.3;p=-p}return b})();
function polarity(tf){let lo=0,hi=CHRONS.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(CHRONS[m][0]<=tf)lo=m;else hi=m-1}return CHRONS[lo][1]>0}

// ================= materialen =================
const ID={AIR:0,WATER:1,SED0:2,SED1:3,SED2:4,SED3:5,SED4:6,SED5:7,SEDM:8,YOUNG:9,YOUNG2:10,ACCR:11,OC:12,OCN:13,OCR:14,
  CCU:15,CCL:16,CCU2:17,CCL2:18,LITHO:19,LITHC:20,LITHC2:21,ASTH:22,TZ:23,LM:24,PMELT:25,MAGMA:26,WEDGE:27,VOLC:28,PLUME:29,ARC:30,OPH:31,YOUNGB:32};
const PAL=[];
const NAMES=[];
function mat(id,rgb,onder,boven){PAL[id]=rgb;NAMES[id]=[onder,boven||onder]}
mat(ID.AIR,[223,236,245],'Lucht');
mat(ID.WATER,[86,146,198],'Zeewater');
mat(ID.SED0,[176,84,58],'Gesteentelagen (rode herkenningslaag)','Sedimentgesteente – rode merklaag');
mat(ID.SED1,[234,214,158],'Gesteentelagen (zandsteen, kalksteen)','Sedimentgesteente (gelaagd)');
mat(ID.SED2,[208,182,128],'Gesteentelagen (zandsteen, kalksteen)','Sedimentgesteente (gelaagd)');
mat(ID.SED3,[188,156,108],'Gesteentelagen (zandsteen, kalksteen)','Sedimentgesteente (gelaagd)');
mat(ID.SED4,[226,200,146],'Gesteentelagen (zandsteen, kalksteen)','Sedimentgesteente (gelaagd)');
mat(ID.SED5,[198,170,120],'Gesteentelagen (zandsteen, kalksteen)','Sedimentgesteente (gelaagd)');
mat(ID.SEDM,[212,186,134],'Gesteentelagen','Sedimentgesteente (te dun om lagen te zien)');
mat(ID.YOUNG,[246,222,150],'Jonge afzettingen (zand, klei)','Jonge afzettingen (bekkenvulling)');
mat(ID.YOUNG2,[178,170,132],'Oude zeebodem-afzettingen','Flysch / oceanische sedimenten');
mat(ID.YOUNGB,[230,203,128],'Jonge afzettingen (zand, klei)','Jonge afzettingen (bekkenvulling)');
mat(ID.ACCR,[166,150,120],'Afgeschraapt gesteente','Accretiewig / sutuurzone (mélange)');
mat(ID.OC,[66,80,96],'Oceaankorst (basalt)','Oceanische korst (basalt, gabbro)');
mat(ID.OCN,[40,54,72],'Oceaankorst – magnetisch noord','Oceanische korst – normale magnetisatie');
mat(ID.OCR,[136,152,168],'Oceaankorst – magnetisch omgekeerd','Oceanische korst – omgekeerde magnetisatie');
mat(ID.CCU,[206,142,108],'Continentale korst (boven)','Continentale bovenkorst (graniet, gneis)');
mat(ID.CCL,[164,108,86],'Continentale korst (onder)','Continentale onderkorst (granuliet)');
mat(ID.CCU2,[184,160,124],'Continentale korst andere plaat (boven)','Bovenkorst tweede continent');
mat(ID.CCL2,[140,120,96],'Continentale korst andere plaat (onder)','Onderkorst tweede continent');
mat(ID.LITHO,[102,138,104],'Stijve mantel onder de oceaan','Lithosferische mantel (oceanisch)');
mat(ID.LITHC,[78,112,88],'Stijve mantel onder het continent','Lithosferische mantel (continentaal)');
mat(ID.LITHC2,[96,112,84],'Stijve mantel andere plaat','Lithosferische mantel tweede continent');
mat(ID.ASTH,[238,172,112],'Mantel: heet en kneedbaar','Asthenosfeer / bovenmantel');
mat(ID.TZ,[226,144,94],'Mantel (overgangszone)','Overgangszone (410–660 km)');
mat(ID.LM,[200,116,80],'Ondermantel','Ondermantel (> 660 km)');
mat(ID.PMELT,[230,96,64],'Deels gesmolten mantel','Gedeeltelijke smelt (enkele procenten)');
mat(ID.MAGMA,[196,30,34],'Magma','Magma(kamer)');
mat(ID.WEDGE,[92,158,150],'Mantel met water uit de plaat','Gehydrateerde (verrijkte) mantelwig');
mat(ID.VOLC,[92,66,62],'Vulkaangesteente','Vulkanisch gesteente (lava, as)');
mat(ID.PLUME,[247,128,74],'Mantelpluim (extra heet)','Mantelpluim');
mat(ID.ARC,[150,92,104],'Gestold magma in de korst','Intrusies / batholiet (graniet, dioriet)');
mat(ID.OPH,[56,88,74],'Opgeschoven oceaanbodem','Ophioliet (geobduceerde oceaanlithosfeer)');
const SEDS=[ID.SED0,ID.SED1,ID.SED2,ID.SED3,ID.SED4,ID.SED5];
function sedBand(d,lod){if(lod>0.42)return ID.SEDM;const b=Math.floor(d/0.72);return SEDS[((b%6)+6)%6]}
let DLOD=1.4;const dith=(x,z,p)=>hash2(Math.floor(x/DLOD)+7919,Math.floor(z/DLOD)+104729)<p;
function blob(x,z,cx,cz,rx,rz,seed){const dx=(x-cx)/rx,dz=(z-cz)/rz;const e=dx*dx+dz*dz;if(e>1.6)return false;const a=Math.atan2(dz,dx);return e<1+0.22*Math.sin(3*a+seed)+0.12*Math.sin(5*a+seed*2.3)}
const mantleId=z=>z<410?ID.ASTH:z<660?ID.TZ:ID.LM;
const isMantle=id=>id===ID.ASTH||id===ID.TZ||id===ID.LM||id===ID.WEDGE;
const isRock=id=>id>1;

// ================= pad-geometrie (plaat-oppervlak, breuken) =================
class Path{
  constructor(x,z,a){this.segs=[];this.x=x;this.z=z;this.a=a;this.s=0}
  line(L){if(L<=0)return this;const c=Math.cos(this.a),sn=Math.sin(this.a);
    this.segs.push({k:0,x:this.x,z:this.z,c,sn,L,s0:this.s});this.x+=L*c;this.z+=L*sn;this.s+=L;return this}
  arc(R,dA){if(Math.abs(dA)<1e-7)return this;const a0=this.a,nx=-Math.sin(a0),nz=Math.cos(a0);let cx,cz;
    if(dA>0){cx=this.x+R*nx;cz=this.z+R*nz}else{cx=this.x-R*nx;cz=this.z-R*nz}
    const L=R*Math.abs(dA);this.segs.push({k:1,cx,cz,R,a0,dA,L,s0:this.s});const a1=a0+dA;
    if(dA>0){this.x=cx+R*Math.sin(a1);this.z=cz-R*Math.cos(a1)}else{this.x=cx-R*Math.sin(a1);this.z=cz+R*Math.cos(a1)}
    this.a=a1;this.s+=L;return this}
  project(px,pz,o){let bn=1e9,bs=0;const g=this.segs,last=g.length-1;
    for(let i=0;i<=last;i++){const q=g[i];
      if(q.k===0){const dx=px-q.x,dz=pz-q.z,al=dx*q.c+dz*q.sn;if((al<0&&i>0)||(al>q.L&&i<last))continue;
        const n=-dx*q.sn+dz*q.c;if(Math.abs(n)<Math.abs(bn)){bn=n;bs=q.s0+al}}
      else{const vx=px-q.cx,vz=pz-q.cz,r=Math.sqrt(vx*vx+vz*vz);let phi,n,s;
        if(q.dA>0){phi=wrapA(Math.atan2(vx,-vz)-q.a0);if(phi<0||phi>q.dA)continue;s=q.s0+q.R*phi;n=q.R-r}
        else{phi=wrapA(Math.atan2(-vx,vz)-q.a0);if(phi>0||phi<q.dA)continue;s=q.s0-q.R*phi;n=r-q.R}
        if(Math.abs(n)<Math.abs(bn)){bn=n;bs=s}}}
    o.s=bs;o.n=bn;return o}
  pointAt(s,n,o){const g=this.segs;let q=g[g.length-1];if(s<0)q=g[0];else for(let i=0;i<g.length;i++){if(s<=g[i].s0+g[i].L){q=g[i];break}}
    const ds=s-q.s0;
    if(q.k===0){o.x=q.x+ds*q.c-n*q.sn;o.z=q.z+ds*q.sn+n*q.c}
    else if(q.dA>0){const a=q.a0+ds/q.R,sa=Math.sin(a),ca=Math.cos(a);o.x=q.cx+q.R*sa-n*sa;o.z=q.cz-q.R*ca+n*ca}
    else{const a=q.a0-ds/q.R,sa=Math.sin(a),ca=Math.cos(a);o.x=q.cx-q.R*sa-n*sa;o.z=q.cz+q.R*ca+n*ca}
    return o}
  buildX(step=1){const xs=[],zs=[],ss=[],o={};for(let s=0;s<=this.s;s+=step){this.pointAt(s,0,o);if(xs.length&&o.x<=xs[xs.length-1])break;xs.push(o.x);zs.push(o.z);ss.push(s)}this.xs=xs;this.zs=zs;this.ss=ss;return this}
  zAtX(x){const xs=this.xs;if(x<=xs[0])return this.zs[0];if(x>=xs[xs.length-1])return 1e9;let lo=0,hi=xs.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(xs[m]<=x)lo=m;else hi=m}
    const f=(x-xs[lo])/(xs[hi]-xs[lo]);return this.zs[lo]+f*(this.zs[hi]-this.zs[lo])}
  sAtDepth(z){const zs=this.zs;for(let i=0;i<zs.length;i++)if(zs[i]>=z)return this.ss[i];return this.ss[this.ss.length-1]}
}
// Opschuivingsbreuk met trap (ramp-flat), in (s,d)-coördinaten: d = diepte onder het oorspronkelijke oppervlak
class Thrust{
  constructor(sA,dB){this.sA=sA;this.dB=dB;this.c=Math.cos(rad(30));this.sn=Math.sin(rad(30));this.Lr=dB/this.sn;this.sB=sA+this.Lr*this.c}
  project(s,d,o){let bn=1e9,bs=0;const {sA,sB,dB,c,sn,Lr}=this;
    if(s<=sA){bn=d;bs=s-sA}
    const rs=s-sA,al=rs*c+d*sn,nr=-rs*sn+d*c;
    if(al>=0&&al<=Lr){if(Math.abs(nr)<Math.abs(bn)){bn=nr;bs=al}}
    else if(al<0&&s>sA){const dd=-Math.hypot(rs,d);if(Math.abs(dd)<Math.abs(bn)){bn=dd;bs=0}}
    if(s>=sB){const n2=d-dB;if(Math.abs(n2)<Math.abs(bn)){bn=n2;bs=Lr+s-sB}}
    else if(al>Lr){const dd=Math.hypot(s-sB,d-dB);if(Math.abs(dd)<Math.abs(bn)){bn=dd;bs=Lr}}
    o.s=bs;o.n=bn;return o}
  pointAt(sig,n,o){const {sA,sB,dB,c,sn,Lr}=this;
    if(sig<0){o.x=sA+sig;o.z=n}else if(sig<=Lr){o.x=sA+sig*c-n*sn;o.z=sig*sn+n*c}else{o.x=sB+sig-Lr;o.z=dB+n}return o}
}
const PR={s:0,n:0},PR2={s:0,n:0},PT={x:0,z:0},PT2={x:0,z:0};

// ================= scenario's =================
const SC={};
const cacheOf=()=>({key:'',s:null,n:null});
function fillCache(c,key,path,vp){
  if(c.key===key)return;const N=vp.cw*vp.ch;if(!c.s||c.s.length!==N){c.s=new Float32Array(N);c.n=new Float32Array(N)}
  for(let j=0;j<vp.ch;j++){const z=vp.zAt(j);for(let i=0;i<vp.cw;i++){const x=vp.x0+(i+0.5)*vp.ckx;path.project(x,z,PR);const k=j*vp.cw+i;c.s[k]=PR.s;c.n[k]=PR.n}}
  c.key=key}

// ---------- 1. Mid-oceanische rug ----------
SC.rug={
  name:'Mid-oceanische rug',defView:'lithosfeer',chip:'Rug (uit elkaar)',color:'#3f7fb5',t0:0,t1:30,rate:1.1,width:1600,zBot:720,
  u:25,vr:10,xr0:650,xr(t){return this.xr0+this.vr*t},
  timeLabel:t=>`${fmt(t)} miljoen jaar`,
  focus(v,t){return v==='overzicht'?800:this.xr(t)},
  legend:[ID.WATER,ID.OCN,ID.OCR,ID.OC,ID.LITHO,ID.ASTH,ID.TZ,ID.LM,ID.PMELT,ID.MAGMA],
  sample(x,z,t,lod){
    const dx=x-this.xr(t),age=Math.abs(dx)/this.u,sd=oceanDepth(age);
    if(z<sd)return z<0?ID.AIR:ID.WATER;
    const d=z-sd;
    if(d<7){if(Math.abs(dx)<2.4&&d>1.3&&d<3.2)return ID.MAGMA;if(d<1.6&&lod<1.3)return polarity(t-age)?ID.OCN:ID.OCR;return ID.OC}
    if(d<oceanLith(age))return ID.LITHO;
    if(z<74){const hw=(z-3)*1.3,ad=Math.abs(dx);if(ad<hw*0.7||(ad<hw&&dith(x,z,0.55-0.5*(ad/hw-0.7)/0.3)))return ID.PMELT}
    return mantleId(z)},
  quakeRate:5,
  quake(r,t){const x=this.xr(t)+(r()-0.5)*18;return{x,z:2.8+r()*7,m:2.5+r()*2.8}},
  vents(t){return[{x:this.xr(t),z:2.6,sub:true}]},
  overlay(O,t){
    const xr=this.xr(t),u=this.u,vr=this.vr;
    // plaatmerkers: punten die op t-k gevormd zijn en meebewegen met de plaat
    if(state.tog.markers){for(let k=-40;k<=40;k++){const tf=Math.floor(t/3)*3-3*Math.abs(k);if(k===0)continue;const age=t-tf;if(age<=0)continue;
      const side=k<0?-1:1,xm=this.xr(tf)+(side<0?(vr-u):(vr+u))*age;const sd=oceanDepth(age);
      plateTick(O,xm,sd,`${Math.round(age)} Ma`)}}
    O.ghostLine(this.xr0,-12,this.xr0,40,'rug bij t = 0');
    const wv=O.W*O.kpx;
    label(O,['Mid-oceanische rug','Mid-oceanische rug (spreidingsas)'],xr,2.4,{dy:-30});
    {const xl=xr-wv*0.28;label(O,['Nieuwe oceaankorst (basalt)','Oceanische korst ±7 km'],xl,oceanDepth(Math.abs(xl-xr)/u)+3.5,{dx:-30,dy:state.view==='korst'?40:-26})}
    {const xq=xr+wv*0.3,ag=Math.abs(xq-xr)/u;label(O,['Plaat wordt dikker als hij afkoelt','Lithosfeer: dikte ≈ 10 km × √ouderdom'],xq,oceanDepth(ag)+oceanLith(ag)-2,{dx:30,dy:28})}
    label(O,['Mantel smelt een beetje (lagere druk)','Decompressiesmelten: enkele % smelt'],xr+12,state.view==='korst'?40:52,{dx:150,dy:20,tone:'warm'});
    label(O,['Mantel (heet, kneedbaar)','Asthenosfeer – beweegt nauwelijks mee'],vx(O,0.2),O.wz(O.H*0.62),{});
    label(O,[null,'Overgangszone 410–660 km'],vx(O,0.75),535,{});
    label(O,['Ondermantel','Ondermantel'],vx(O,0.2),690,{});
    if(state.view!=='overzicht'){label(O,['Magmakamer','Axiale magmalens (±1,5–3 km)'],xr,oceanDepth(0)+2.3,{dx:-110,dy:18,tone:'warm'})}
    if(state.tog.forces){
      const xl=Math.min(xr-40*O.kpx,vx(O,0.3)),xR=Math.max(xr+40*O.kpx,vx(O,0.62));
      const zl=oceanDepth(Math.abs(xl-xr)/u)+Math.min(oceanLith(Math.abs(xl-xr)/u)*0.5,state.view==='korst'?4:40)+1,zr=oceanDepth(Math.abs(xR-xr)/u)+Math.min(oceanLith(Math.abs(xR-xr)/u)*0.5,state.view==='korst'?4:40)+1;
      motionArrow(O,xl,zl,-1,{len:70,w:7,below:true,color:'#1e6b72',label:['Plaat: 1,5 cm/jaar','1,5 cm/jaar t.o.v. mantel']});
      motionArrow(O,xR,zr,1,{len:110,w:7,below:true,color:'#1e6b72',label:['Plaat: 3,5 cm/jaar','3,5 cm/jaar t.o.v. mantel']});
      arrow(O,xr-6,-8,xr+60,-8,{w:3,color:'#8a3b16',ldx:150,label:['De rug schuift ook!','Rug: 1 cm/jaar t.o.v. mantel'],screenMin:34});
      if(state.view==='overzicht'){const zR=oceanDepth(16)+18;arrow(O,xr+380,zR,xr+520,zR+5,{w:3,color:'#b8481f',label:['duw van de rug','ridge push ±10%']});arrow(O,xr-380,zR,xr-520,zR+5,{w:3,color:'#b8481f'})}
      else{const xp2=xr+wv*0.16,ag=(xp2-xr)/u;motionArrow(O,xp2,oceanDepth(ag)+oceanLith(ag)*0.35,1,{len:46,w:3,color:'#b8481f',label:['duw van de rug','ridge push ±10%']})}
    }
  }
};
SC.rug.syms=()=>['ticks'];
SC.rug.phases=[{t0:0,t1:30,title:'Zeebodemspreiding',
  onder:'<p>Twee oceaanplaten bewegen uit elkaar. In de spleet stijgt heet mantelgesteente langzaam op. Omdat de druk daar lager wordt, smelt een klein deel ervan. Dat magma stolt tot nieuwe oceaanbodem van <b>basalt</b>.</p><p>Hoe verder van de rug, hoe ouder en kouder de plaat. Koud gesteente is zwaarder: de plaat wordt <b>dikker</b> en ligt <b>dieper</b>. Daarom ligt de rug zelf 2–3 km hoger dan de diepzeevlakte.</p><p>Kijk naar de <b>stipjes in de mantel</b>: die blijven bijna stil liggen. De platen schuiven eroverheen, en zelfs de rug schuift langzaam op. Er draait dus geen vaste ‘convectiestroom’ onder de rug.</p>',
  boven:'<p>Divergente plaatgrens. De asthenosfeer welt <b>passief</b> op: de platen worden elders weggetrokken (slab pull) en de mantel vult het gat. Door drukverlaging smelt 10–20% (decompressiesmelten); dat levert MORB-basalt en een oceanische korst van ±7 km.</p><p>De lithosfeer koelt conductief af en wordt dikker met de wortel van de ouderdom (±10 km·√Ma, tot ±90–100 km). Dichtheid en zeediepte nemen toe (±2,6 km bij de rug, >5 km bij 80 Ma). Doordat de plaat schuin op de asthenosfeer ligt, glijdt hij van de rug af: <b>ridge push</b>, ±10% van de aandrijving.</p><p>De rug verplaatst zich t.o.v. de mantel (hier 1 cm/jaar). De magnetische strepen (zoom in op ‘Korst’) zijn het klassieke bewijs voor zeebodemspreiding: elke ompoling van het aardmagnetisch veld wordt in de afkoelende basalt vastgelegd.</p>'}];
SC.rug.effects={onder:[['eq','Kleine, ondiepe aardbevingen (minder dan 10 km diep) vlak bij de rug.'],['volc','Vulkanisme onder water: kussenlava en ‘black smokers’ (heet water vol mineralen).'],['mtn','Een onderzeese bergketen van 2–3 km hoog, rond de hele aarde.']],
  boven:[['eq','Ondiepe bevingen (<10 km), meestal M<6, langs de as en vooral langs transforme breuken.'],['volc','Basaltische spleeteruptie onder water; boven water alleen waar een hotspot meedoet (IJsland).'],['mtn','Rugtopografie volgt de afkoeling: diepte ≈ 2,6 + 0,33·√ouderdom (km).']]};
SC.rug.notes=['Oceanische korst (7 km) is in ‘Hele bovenmantel’ maar een paar pixels: zo dun is hij echt. Zoom in voor de magnetische strepen.','Smeltgebied rood gekleurd; in werkelijkheid zit er maar enkele procenten smelt tussen de korrels.'];

// ---------- 2. Slenk → jonge oceaan ----------
(function(){
  const NF=8,Fx=[],st=[],en=[],rate=0.85,FP=[];
  for(let k=0;k<NF;k++){Fx.push(690+28*k);st.push(0.8+0.35*k);en.push(7+1.6*k)}
  for(let k=0;k<NF;k++){const tanA=Math.tan(rad(60));const p=new Path(Fx[k]-4.5/tanA,-5,rad(60));p.line(11/Math.sin(rad(60))).arc(20,-rad(60)).line(4000);FP.push(p)}
  const slip=(k,t)=>rate*clamp(t-st[k],0,en[k]-st[k]);
  const tb=24,us=15;
  const E1=t=>{let e=0;for(let k=0;k<NF;k++)e+=slip(k,t);return e};
  const E2=t=>150*sstep(14,24,t);
  function uX(X,t){return E1(t)*sstep(700,980,X)+E2(t)*sstep(780,880,X)}
  let tab={t:-1,xs:null,Xs:null,bs:null};
  function buildTab(t){if(tab.t===t)return;const N=3200,X0=-400;const xs=new Float32Array(N),Xs=new Float32Array(N),bs=new Float32Array(N);
    const e1=E1(t),e2=E2(t);for(let i=0;i<N;i++){const X=X0+i;Xs[i]=X;xs[i]=X+e1*sstep(700,980,X)+e2*sstep(780,880,X)}
    for(let i=0;i<N;i++){const a=i>0?i-1:i,b=i<N-1?i+1:i;bs[i]=(xs[b]-xs[a])/(Xs[b]-Xs[a])}tab={t,xs,Xs,bs}}
  function inv(x){const xs=tab.xs;let lo=0,hi=xs.length-1;if(x<=xs[0])return[x-(xs[0]-tab.Xs[0]),1];if(x>=xs[hi])return[x-(xs[hi]-tab.Xs[hi]),1];
    while(hi-lo>1){const m=(lo+hi)>>1;if(xs[m]<=x)lo=m;else hi=m}const f=(x-xs[lo])/(xs[hi]-xs[lo]);return[lerp(tab.Xs[lo],tab.Xs[hi],f),lerp(tab.bs[lo],tab.bs[hi],f)]}
  const fillTop=t=>t<11?-0.25:-0.25+(t-11)*0.11;
  let xSplit=0;
  function contSample(x,z,tau,lod,tNow){
    // regionale isostatische daling
    const [Xd,beta]=inv(x);const S=2.2*(1-1/beta);const ze=z-S;const bb=1+Math.max(0,beta-1.6)*0.6;
    const post=tNow!==undefined&&tNow>tb;const cool=post?1-Math.exp(-(tNow-tb)/35):0;
    if(ze<16){
      let X=x,Z=ze;for(let k=0;k<NF;k++){const sl=slip(k,tau);if(sl<=0)continue;FP[k].project(X,Z,PR);if(PR.n<0){FP[k].pointAt(PR.s-sl,PR.n,PT);X=PT.x;Z=PT.z}}
      if(Z<-0.5){ // gat: bekken of lucht
        const cone=volcCone(x,z,tau);if(cone)return cone;
        if(z>fillTop(tau)){const b=Math.floor((z+8)/0.8);return b%2?ID.YOUNG:ID.YOUNGB}
        return z<0?ID.AIR:ID.WATER}
      const d=(Z+0.5)*bb;if(d<3)return sedBand(d/bb,lod);if(d<18.5)return ID.CCU;if(d<35.5)return ID.CCL;if(d<120.5)return ID.LITHC;return mantleId(z)}
    const Zr=16*bb+(ze-16)*beta;
    if(Zr<18.5)return ID.CCU;if(Zr<35.5)return ID.CCL;if(Zr<120.5)return ID.LITHC;
    const LAB=16+(120.5-16*bb)/beta+S;
    if(post&&z<Math.max(LAB,oceanLith(tNow-tb)+1))return ID.LITHC;
    if((!post||tNow-tb<1.5)&&LAB<80){const th=(80-LAB)*0.55;if(z>LAB&&z<LAB+th&&dith(x,z,1.25-(z-LAB)/th))return ID.PMELT}
    return mantleId(z)}
  function volcCone(x,z,tau){const xv=640,H=3.8*sstep(4,14,tau),R=22;if(H>0.05&&Math.abs(x-xv)<R&&z>-0.5-H*(1-Math.abs(x-xv)/R)&&z<-0.4)return ID.VOLC;return 0}
  const ths=(dist,t)=>1.5*(1-Math.exp(-(t-tb)/15))*Math.exp(-dist/120);
  const sc=SC.slenk={
    name:'Slenk wordt oceaan',defView:'lithosfeer',chip:'Slenk → oceaan',color:'#c58b2f',t0:0,t1:36,rate:1.3,width:1600,zBot:720,
    timeLabel:t=>`${fmt(t)} miljoen jaar`,
    focus(v,t){if(v==='overzicht')return 900;if(t<tb)return v==='korst'?820:860;return xSplit+us*(t-tb)},
    legend:[ID.SED1,ID.SED0,ID.YOUNG,ID.WATER,ID.CCU,ID.CCL,ID.LITHC,ID.OC,ID.LITHO,ID.ASTH,ID.PMELT,ID.VOLC],
    prepare(t){buildTab(Math.min(t,tb));if(t>=tb){if(tab.t!==tb)buildTab(tb)}if(!xSplit){const tt=tab.t;buildTab(tb);xSplit=830+uX(830,tb);buildTab(tt)}},
    sample(x,z,t,lod){
      if(z<-14)return ID.AIR;
      if(t<tb)return contSample(x,z,t,lod);
      const D=2*us*(t-tb),xR=xSplit+D/2,ageB=t-tb;
      const ocean=(age,x)=>{const sd=oceanDepth(age);if(z<sd)return z<0?ID.AIR:ID.WATER;const d=z-sd;
        if(d<7)return(d<1.6&&lod<1.3)?(polarity(t-age)?ID.OCN:ID.OCR):ID.OC;if(d<oceanLith(age))return ID.LITHO;
        const ad=Math.abs(x-xR);if(z<74){const hw=(z-3)*1.3;if(ad<hw*0.7||(ad<hw&&dith(x,z,0.4)))return ID.PMELT}return mantleId(z)};
      if(x<xSplit){const dl=xSplit-x;if(dl<70&&z>dl*0.75+0.5)return ocean(ageB,x);return contSample(x,z-ths(dl,t),tb,lod,t)}
      if(x>xSplit+D){const dr=x-xSplit-D;if(dr<70&&z>dr*0.75+0.5)return ocean(ageB,x);return contSample(x-D,z-ths(dr,t),tb,lod,t)}
      return ocean(Math.abs(x-xR)/us,x)},
    faultTrace(k,t){const tau=Math.min(t,tb);const pts=[];if(tau<st[k])return null;for(let s=5.2;s<=34;s+=1.5){FP[k].pointAt(s,0,PT2);let X=PT2.x,Z=PT2.z;
        for(let j=k-1;j>=0;j--){const sl=slip(j,tau);if(sl<=0)continue;FP[j].project(X,Z,PR2);if(PR2.n<0){FP[j].pointAt(PR2.s+sl,PR2.n,PT2);X=PT2.x;Z=PT2.z}}
        buildTab(tau);const b=inv(X)[1];Z+=2.2*(1-1/b);if(t>=tb){const D=2*us*(t-tb);if(X>xSplit)X+=D;Z+=ths(Math.abs(X-xSplit),t)}pts.push([X,Z])}
      buildTab(Math.min(t,tb));return{pts,active:t>st[k]&&t<en[k]}},
    quakeRate:6,
    quake(r,t){if(t<tb){const act=[];for(let k=0;k<NF;k++)if(t>st[k]&&t<en[k])act.push(k);if(!act.length)return null;const k=act[Math.floor(r()*act.length)];
        const tr=this.faultTrace(k,t);const p=tr.pts[Math.floor(r()*Math.min(tr.pts.length,14))];return{x:p[0],z:Math.max(1,p[1]),m:2.5+r()*3.5}}
      const xR=xSplit+us*(t-tb);return{x:xR+(r()-0.5)*16,z:3+r()*6,m:2.5+r()*2.5}},
    vents(t){const v=[];if(t>4&&t<17)v.push({x:640,z:-0.5-3.8*sstep(4,14,t)});if(t>=tb)v.push({x:xSplit+us*(t-tb),z:oceanDepth(0),sub:true});else if(t>15){buildTab(t);v.push({x:900+uX(900,t),z:0.2,sub:fillTop(t)>0})}return v},
    overlay(O,t){
      if(state.tog.labels||true){for(let k=0;k<NF;k++){const tr=this.faultTrace(k,t);if(!tr)continue;O.poly(tr.pts,tr.active?'#c0281b':'rgba(40,30,30,.75)',tr.active?2.2:1.3,tr.active?[6,3]:null)}}
      if(t<tb){
        const ph=t<12?0:1;
        label(O,ph===0?['Slenk: blokken zakken weg','Halfslenken met syn-rift sedimenten']:['Zee stroomt de slenk in','Smalle zee (Rode Zee-stadium)'],880,1.5,{dy:-30});
        label(O,['Breuk (afschuiving)','Listrische afschuiving'],Fx[0]+3,4,{dx:-80,dy:-34});
        label(O,[null,'Glijvlak (detachment) ±16 km'],760,16,{dx:-120,dy:24});
        label(O,['Dieper rekt de korst uit als kauwgom','Ductiele uitdunning (pure shear, β)'],900,30,{dx:170,dy:20});
        label(O,['Mantel stijgt mee omhoog','Asthenosfeer stijgt passief op'],920,110,{dx:160,dy:30});
        if(t>4&&t<17)label(O,['Vulkaan op de slenkrand','Riftvulkaan (bijv. Kilimanjaro)'],640,-2,{dx:-90,dy:-26,tone:'warm'});
      }else{
        const xR=xSplit+us*(t-tb);
        label(O,['Nieuwe oceaan met rug','Mid-oceanische rug: breakup voltooid'],xR,2.5,{dy:-30});
        label(O,['Rand van het continent','Passieve rand (thermische daling)'],xSplit-60,2,{dx:-90,dy:-28});
        label(O,['Rand van het continent','Passieve rand'],xSplit+2*us*(t-tb)+60,2,{dx:90,dy:-28});
      }
      if(state.tog.forces){const L=t<tb?560:Math.max(380,xSplit-260);arrow(O,L,60,L-180,60,{w:4,color:'#1e6b72',label:['Platen trekken uit elkaar','Extensie: trek van plaatrand elders']});
        const R=t<tb?1120:xSplit+2*us*(t-tb)+260;arrow(O,R,60,R+180,60,{w:4,color:'#1e6b72'})}
    }
  };
  sc.syms=()=>['fault'];
  sc.phases=[
    {t0:0,t1:12,title:'1 · Slenk (riftvorming)',
     onder:'<p>Een continent wordt uit elkaar getrokken. De bovenste, harde korst <b>breekt</b> langs schuine breuken. Hele blokken zakken weg en <b>kantelen</b>; de lagen in de blokken kantelen mee. Zo ontstaat een <b>slenk</b> die volloopt met zand en klei.</p><p>Dieper in de korst is het gesteente warm: dat breekt niet, maar rekt uit als kauwgom. De mantel eronder stijgt mee omhoog en smelt een beetje: er ontstaan vulkanen. Voorbeelden: de Oost-Afrikaanse slenk en de Rijnslenk.</p>',
     boven:'<p>Extensie van continentale lithosfeer. De brosse bovenkorst (tot ±15 km) vervormt langs <b>listrische afschuivingen</b> die uitkomen op een horizontaal glijvlak (detachment). De hangende blokken glijden naar beneden en kantelen (rollover); de ruimte wordt opgevuld met syn-rift sedimenten.</p><p>Onder het glijvlak dunnen onderkorst en lithosferische mantel ductiel uit (pure shear, rekfactor β). De asthenosfeer stijgt passief op; waar de lithosfeer dun wordt treedt decompressiesmelten op → riftvulkanisme. De rek wordt veroorzaakt door krachten aan plaatranden elders, niet door een opwellende ‘convectiecel’.</p>'},
    {t0:12,t1:24,title:'2 · Smalle zee',
     onder:'<p>De korst is zo dun geworden dat de slenk onder zeeniveau zakt. De zee loopt naar binnen, zoals nu in de <b>Rode Zee</b>. Steeds nieuwe breuken ontstaan dichter bij het midden.</p>',
     boven:'<p>β > 2: de korst is lokaal nog ±20 km dik. Isostatische daling brengt de slenkbodem onder zeeniveau. De vervorming concentreert zich in een smalle zone (necking); breukactiviteit verschuift naar de as. De lithosfeer is hier nog maar ±50 km dik.</p>'},
    {t0:24,t1:36,title:'3 · Jonge oceaan',
     onder:'<p>Het continent scheurt helemaal. In het midden ontstaat een <b>mid-oceanische rug</b> met nieuwe oceaanbodem. De oude slenkranden worden de kusten van twee continenten, zoals West-Afrika en Brazilië ooit één geheel waren.</p>',
     boven:'<p>Breakup: de lithosfeer is doorgebroken en zeebodemspreiding neemt het over. De gekantelde blokken blijven bewaard onder de <b>passieve continentranden</b>, die verder dalen door afkoeling (thermische subsidentie) en dikke sedimentpakketten opvangen – vaak plekken met olie en gas.</p>'}];
  sc.effects={onder:[['eq','Ondiepe aardbevingen langs de breuken (tot ±15 km diep).'],['volc','Vulkanen op de randen en in de slenk.'],['mtn','Een diepe, langgerekte vallei met steile randen; later een smalle zee.']],
    boven:[['eq','Ondiepe bevingen langs afschuivingen, tot ±M7 (bijv. Oost-Afrika).'],['volc','Basaltisch en alkalisch riftvulkanisme door decompressiesmelten.'],['mtn','Slenkschouders licht opgeheven; slenkbodem daalt isostatisch.']]};
  sc.notes=['De breukblokken liggen op ware schaal: een slenk van 40 km breed is in ‘Hele bovenmantel’ een smalle deuk. Zoom in op ‘Korst’ om de gekantelde lagen te zien.','Vereenvoudigd: één reeks breuken met dezelfde helling (asymmetrische halfslenken); echte slenken wisselen vaak van polariteit.'];
})();

// ---------- 3/4. Subductie ----------
function makeSub(cfg){
  const sd=oceanDepth(cfg.ageIn),dip=rad(cfg.dip);
  const P=new Path(-2500,sd,0);P.line(cfg.xT+2500);const sT=P.s;P.arc(cfg.R1,dip);
  const drop2=cfg.R2*(1-Math.cos(dip));const Lmid=(cfg.zFlat-drop2-P.z)/Math.sin(dip);
  P.line(Lmid).arc(cfg.R2,-dip).line(cfg.Lflat).arc(220,0.75).line(900);P.buildX(1);
  let xArc=cfg.xT;for(let x=cfg.xT;x<cfg.xT+800;x+=1){if(P.zAtX(x)>=110){xArc=x;break}}
  const o={P,sT,sd,xArc,xT:cfg.xT,H:cfg.H,v:cfg.v,kind:cfg.kind,ids:cfg.ids||{cu:ID.CCU,cl:ID.CCL,lm:ID.LITHC},vH:cfg.kind==='oo'?1.9:2.3,vR:cfg.kind==='oo'?13:16,magOn:true,g:1,sTip:1e9,zTip:1e9,grow:!!cfg.grow,L0:cfg.L0||120,tC:null};
  o.sMag=P.sAtDepth(112)+20;
  o.tAt=d=>(P.sAtDepth(d)-sT-o.L0)/o.v;o.tMag=(o.sMag-sT-o.L0)/o.v;
  o.setT=t=>{if(!o.grow||o.tC===t)return;o.tC=t;o.sTip=sT+o.L0+o.v*t;P.pointAt(Math.min(o.sTip,P.s),0,PT2);o.zTip=PT2.z;o.xTip=PT2.x;
    o.magOn=o.sTip>o.sMag;o.g=sstep(o.tMag,o.tMag+13,t)};
  const rel=cfg.relief??3.8,root=cfg.root??28;
  if(cfg.kind==='oc'){
    o.topOver=x=>{const dx=x-o.xT;let top;if(dx<100)top=lerp(sd+4.2,2.0,dx/100);else if(dx<175)top=lerp(2.0,-0.6,(dx-100)/75);else top=-0.6;return top-rel*o.g*bell((x-(xArc+45))/120)};
    o.moho=x=>35+root*o.g*bell((x-(xArc+45))/130);
    o.lithBase=x=>x<xArc-40?1e9:clamp(62+0.35*(x-xArc+40),62,115);
  }else{
    const xBA=xArc+230;o.xBA=xBA;const ageO=x=>0.3+Math.abs(x-xBA)/25;o.ageO=ageO;
    o.topOver=x=>{const dx=x-o.xT;const base=oceanDepth(ageO(x));let top=dx<80?lerp(sd+4.6,base,dx/80):base;return lerp(top,-0.5,o.g*bell((x-xArc)/38))};
    o.moho=x=>o.topOver(x)+7+17*o.g*bell((x-xArc)/55);
    o.lithBase=x=>x<xArc-30?1e9:o.topOver(x)+Math.max(oceanLith(ageO(x)),40*bell((x-xArc)/120));
  }
  return o}
function overOC(x,z,o,slabTop,sN){
  const top=o.topOver(x);const vg=clamp(o.g*4,0,1);
  if(z<top){if(o.magOn&&Math.abs(x-o.xArc)<o.vR*(0.5+0.5*vg)){const ht=top-o.vH*vg*(1-Math.abs(x-o.xArc)/(o.vR*(0.5+0.5*vg)));if(z>=ht)return ID.VOLC}return z<0?ID.AIR:ID.WATER}
  const M=o.moho(x),cb=Math.min(M,slabTop);
  if(z<cb){
    if(o.kind==='oc'&&x<o.xT+50*(0.45+0.55*(o.grow?sstep(0,12,o.tC):1))+1.0*z)return ID.ACCR;
    if(o.magOn){let ex=(x-o.xArc)/7,ez=(z-(top+9))/3.2;if(ex*ex+ez*ez<1)return ID.MAGMA;ex=(x-o.xArc)/11;ez=(z-(M-10))/5;if(ex*ex+ez*ez<1)return ID.MAGMA}
    const th=M-top,sc=(o.kind==='oc'?1:0.6)*(0.2+0.8*o.g);if(o.magOn&&(o.g>0.04)&&blob(x,z,o.xArc-30*sc,top+th*0.28,17*sc,th*0.12,1)||blob(x,z,o.xArc+6*sc,top+th*0.42,22*sc,th*0.15,2.4)||blob(x,z,o.xArc+42*sc,top+th*0.22,13*sc,th*0.1,4.1)||blob(x,z,o.xArc+18*sc,top+th*0.62,15*sc,th*0.09,5.7))return ID.ARC;
    if(o.kind==='oo')return ID.OC;
    return z<(top+M)*0.5?o.ids.cu:o.ids.cl}
  if(o.magOn&&z>M&&z<slabTop-3){const xc=o.xArc+3*Math.sin(z/14),hw=3.2+2*Math.sin(z/9+1.3)+1.3*Math.sin(z/3.7)+(z-M)*0.05,ad=Math.abs(x-xc);if(ad<hw||(ad<hw+6&&dith(x,z,0.3)))return ID.PMELT}
  const LB=Math.min(o.lithBase(x),slabTop);
  if(z<LB)return o.kind==='oo'?ID.LITHO:o.ids.lm;
  if(!o.noWedge&&z>55&&z<215&&(sN===undefined||sN<=o.sTip)){const dd=slabTop-z;if(dd<48&&dith(x,z,1.15-dd/48-Math.max(0,z-170)/60))return ID.WEDGE}
  return mantleId(z)}
function subSample(o,x,z,t,lod,s,n){
  o.setT(t);
  if(n>=0){if(n<=o.H&&s<=o.sTip){const xi=s-o.v*t;if(n<0.45&&lod<0.4&&s<o.sT+80)return ID.YOUNG2;if(n<7.45){if(n<2&&lod<1.3)return polarity(xi/o.v)?ID.OCN:ID.OCR;return ID.OC}return ID.LITHO}return mantleId(z)}
  if(x<=o.xT)return z<0?ID.AIR:ID.WATER;
  return overOC(x,z,o,o.P.zAtX(x),s)}
function subQuake(o,r,shallowOnly){
  const u=r();if(u<0.12)return{x:o.xT+50+r()*320,z:3+r()*28,m:2.5+r()*3};
  const w=r();let depth;if(w<0.58)depth=5+r()*65;else if(w<0.86)depth=70+r()*230;else depth=300+r()*360;if(shallowOnly&&depth>120)depth=20+r()*80;
  if(depth>o.zTip-8)depth=5+r()*Math.max(5,o.zTip-15);
  const s=o.P.sAtDepth(depth);const n=depth<60?r()*6:2+r()*26;o.P.pointAt(s,n,PT2);
  let m=depth<60?(r()<0.035?7.6+r()*1.4:3+r()*3):3+r()*3.2;return{x:PT2.x,z:PT2.z,m}}
function subOverlay(O,o,t,isOO){
  const P=o.P;o.setT(t);const zT=o.zTip;
  if(state.tog.markers){for(let k=-30;k<30;k++){const s=((k*100+o.v*t)%3000+3000)%3000+o.sT-1500;if(s<0||s>o.sTip-20)continue;P.pointAt(s,0,PT2);plateTick(O,PT2.x,PT2.z,null)}}
  if(o.grow&&zT<640){P.pointAt(o.sTip,45,PT2);label(O,['Punt van de duikende plaat','Slabpunt: zakt ±5 cm/jaar verder'],PT2.x,PT2.z,{dx:90,dy:30})}
  if(o.grow&&!isOO&&o.g>0.05&&o.g<0.97)label(O,['Gebergte groeit: korst wordt dikker','Korstverdikking door magma en inkorting'],o.xArc+70,o.topOver(o.xArc+70),{dx:110,dy:-40});
  if(o.grow&&!o.magOn)label(O,['Nog geen vulkanen: plaat is nog niet diep genoeg','Nog geen smelt: slab < ±110 km diep'],o.xArc,-1,{dy:-40,tone:'warm'});
  label(O,['Oceaanplaat','Oceanische lithosfeer (±90 km)'],o.xT-420,45,{});
  label(O,['Diepzeetrog','Trog'],o.xT+26,o.sd+2,{dy:-34});
  if(!isOO)label(O,['Afgeschraapt gesteente','Accretiewig'],o.xT+62,10,{dx:20,dy:28});
  if(o.magOn)label(O,isOO?['Vulkanische eilanden','Eilandboog (stratovulkanen)']:['Vulkanen (zoals de Andes)','Vulkanische boog (stratovulkanen)'],o.xArc,o.topOver(o.xArc)-o.vH,{dy:-34,tone:'warm'});
  if(zT>100)label(O,['Water uit de plaat → mantel smelt','Dehydratie → fluxsmelten in de mantelwig'],o.xArc-10,o.P.zAtX(o.xArc)-30,{dx:160,dy:10,tone:'blue'});
  {const dl=Math.min(360,zT*0.6);if(dl>60){P.pointAt(P.sAtDepth(dl),45,PT2);label(O,['Duikende plaat (slab)','Slab: koud, dicht, ±90 km dik'],PT2.x,PT2.z,{dx:-150,dy:0})}}
  if(zT>180){P.pointAt(P.sAtDepth(Math.min(250,zT*0.6)),-6,PT2);label(O,[null,'Wadati-Benioffzone (bevingen tot ±660 km)'],PT2.x,PT2.z,{dx:150,dy:-10})}
  if(zT>=630)label(O,['Slab blijft hangen en zakt verder','Slab stagneert in de overgangszone, zinkt dan naar de ondermantel'],o.xT+760,650,{dy:-24});
  label(O,isOO?['Tweede oceaanplaat','Overrijdende oceaanplaat']:['Continent','Continentale lithosfeer'],o.xT+560,30,{});
  if(isOO&&o.g>0.5)label(O,[null,'Back-arc spreidingsrug (trog rolt terug)'],o.xBA,o.topOver(o.xBA),{dy:-30,dx:30});
  if(state.tog.forces){if(zT>110){const a=Math.min(230,zT*0.35),b=Math.min(430,zT*0.82);P.pointAt(P.sAtDepth(a),45,PT);P.pointAt(P.sAtDepth(b),45,PT2);arrow(O,PT.x,PT.z,PT2.x,PT2.z,{w:4+9*clamp(zT/450,0,1),color:'#b8481f',label:['Trekkracht van de zinkende plaat (groeit als de plaat dieper zinkt)','slab pull ±90% (neemt toe met slablengte)']})}
    arrow(O,o.xT-620,70,o.xT-470,70,{w:3,below:true,color:'#b8481f',label:['kleine duw (rug ligt buiten beeld)','ridge push ±10%']});
    arrow(O,o.xT-330,40,o.xT-150,40,{w:5,color:'#1e6b72',label:[`${o.v/10} cm/jaar`,`${o.v/10} cm/jaar t.o.v. mantel`]})}
}
function fluidSpawn(o,r){if(o.zTip<85)return null;const d=80+r()*Math.min(90,o.zTip-85);const s=o.P.sAtDepth(d);o.P.pointAt(s,-2,PT2);return{x:PT2.x,z:PT2.z}}
(function(){
  const o=makeSub({kind:'oc',xT:700,ageIn:80,dip:45,R1:200,R2:180,zFlat:640,Lflat:260,H:90,v:50,grow:true});
  const tM=Math.round(o.tMag*10)/10,t6=Math.round(o.tAt(600)*10)/10;
  const cache=cacheOf();
  const sc=SC.sub={name:'Subductie: oceaan onder continent',chip:'Subductie oceaan–continent',color:'#b8481f',t0:0,t1:t6+7,rate:1.1,width:1600,zBot:720,o,
    timeLabel:t=>`${fmt(t)} miljoen jaar`,
    focus(v){return v==='overzicht'?820:v==='lithosfeer'?o.xT+120:o.xT+60},
    legend:[ID.WATER,ID.YOUNG2,ID.ACCR,ID.OCN,ID.OCR,ID.OC,ID.LITHO,ID.CCU,ID.CCL,ID.LITHC,ID.ARC,ID.MAGMA,ID.VOLC,ID.WEDGE,ID.PMELT,ID.ASTH,ID.TZ,ID.LM],
    prepare(t,vp){fillCache(cache,'sub'+vp.key,o.P,vp)},
    sample(x,z,t,lod,idx){let s,n;if(idx>=0&&cache.s){s=cache.s[idx];n=cache.n[idx]}else{o.P.project(x,z,PR);s=PR.s;n=PR.n}return subSample(o,x,z,t,lod,s,n)},
    quakeRate:9,quake(r,t){o.setT(t);return subQuake(o,r)},vents(t){o.setT(t);return o.magOn?[{x:o.xArc,z:o.topOver(o.xArc)-o.vH*clamp(o.g*4,0,1)}]:[]},fluids:(r,t)=>{o.setT(t);return fluidSpawn(o,r)},
    overlay(O,t){subOverlay(O,o,t,false)}};
  sc.syms=()=>['ticks','fluids'];
  sc.phases=[{t0:0,t1:tM,title:'1 · De plaat begint te duiken',
    onder:'<p>De oude, zware oceaanplaat begint bij de diepzeetrog onder het continent te duiken. Het stuk dat al in de mantel hangt is nog kort. Er zijn al wel <b>aardbevingen</b>, maar nog <b>geen vulkanen</b>: de plaat is nog niet diep genoeg om de mantel te laten smelten. Het continent is nog een laag kustgebied.</p>',
    boven:'<p>Beginfase (vereenvoudigd: in werkelijkheid duurt het opstarten van subductie miljoenen jaren). De slab is nog kort en reikt minder dan ±110 km diep. De slab pull is nog klein. Er is nog geen dehydratie op de diepte waar fluxsmelten optreedt, dus nog geen boogvulkanisme.</p>'},
   {t0:tM,t1:t6,title:'2 · Vulkanen en gebergte groeien',
    onder:'<p>Een oude oceaanplaat is koud en daardoor <b>zwaarder</b> dan de mantel eronder. Bij de diepzeetrog duikt hij schuin de diepte in. Het zinkende stuk (de <b>slab</b>) trekt de rest van de plaat achter zich aan, zoals een tafelkleed dat van tafel glijdt. Dat is de belangrijkste motor van platentektoniek.</p><p>Uit de duikende plaat komt <b>water</b> vrij. Daardoor smelt de mantel erboven; het magma stijgt op en vormt vulkanen op het continent. Een deel van het magma stolt in de korst. Samen met het samendrukken van de rand wordt de korst <b>dikker</b> en rijst er een <b>gebergte</b> op, zoals de Andes. Onder het gebergte groeit een dikke korstwortel.</p><p>Let op de witte driehoekjes: die bewegen mee met de plaat. De stipjes in de mantel blijven liggen.</p>',
    boven:'<p>Convergente plaatgrens (Andes-type). De slab duikt onder ±45° en buigt met een straal van ±200–250 km. <b>Slab pull</b> levert ±90% van de aandrijvende kracht (Lithgow-Bertelloni 2014); mantelstroming is grotendeels een gevolg, geen oorzaak.</p><p>Bij ±80–150 km diepte dehydreert de slab (o.a. amfiboliet → eklogiet). Het water verlaagt het smeltpunt van de mantelwig (<b>fluxsmelten</b>): calc-alkalien magma vormt stratovulkanen ±100–120 km boven de slab en batholieten in de korst, die verdikt tot ±60 km.</p><p>Bevingen volgen de slab in de <b>Wadati-Benioffzone</b> tot ±660 km. De korst verdikt door magmatische toevoeging (batholieten) en tektonische inkorting tot ±60–70 km; isostasie laat het gebergte opheffen.</p>'},
   {t0:t6,t1:t6+7,title:'3 · Slab bereikt de overgangszone',
    onder:'<p>De duikende plaat is nu bijna 700 km diep. Daar wordt de mantel stijver: de plaat blijft even <b>hangen</b> en buigt af. Op den duur zakt hij verder naar de ondermantel. Hoe langer de plaat, hoe harder hij trekt.</p>',
    boven:'<p>In de overgangszone (410–660 km) vlakt de slab vaak af en zinkt daarna door naar de ondermantel (±1–2 cm/jaar). Zulke oude slabs zijn met seismische tomografie terug te vinden (‘Atlas of the Underworld’). Bevingen reiken tot ±660 km; dieper komen ze niet voor.</p>'}];
  sc.effects={onder:[['eq','Zware aardbevingen en tsunami’s (Chili 1960: M9,5). Ook diepe bevingen tot ±700 km.'],['volc','Explosieve vulkanen met taaie lava en veel as (stratovulkanen).'],['mtn','Diepzeetrog tot ±8 km diep en een hoog gebergte (Andes).']],
    boven:[['eq','Megathrust-bevingen tot M9+, tsunami’s; intermediaire en diepe bevingen in de slab.'],['volc','Andesitisch/dacitisch magma, explosief (stratovulkanen); porfier-koper-gouderts.'],['mtn','Trog, accretiewig, voorboogbekken, vulkanische boog en verdikte korst.']]};
  sc.notes=['De slab is 90 km dik en duikt onder 45°: dat is op ware schaal. Schoolboekplaatjes tekenen de plaat vaak veel dunner of de mantel veel ondieper.','Het begin van subductie is vereenvoudigd: de plaat duikt hier meteen met 5 cm/jaar.','De trog ligt hier vast t.o.v. de mantel; in werkelijkheid kan hij terugrollen (rollback) of oprukken.'];
})();
(function(){
  const o=makeSub({kind:'oo',xT:650,ageIn:130,dip:62,R1:170,R2:150,zFlat:630,Lflat:240,H:95,v:60,grow:true});
  const tM=Math.round(o.tMag*10)/10,t6=Math.round(o.tAt(600)*10)/10;
  const cache=cacheOf();
  const sc=SC.boog={name:'Subductie: oceaan onder oceaan',chip:'Eilandboog oceaan–oceaan',color:'#7d5aa6',t0:0,t1:t6+6,rate:1.0,width:1600,zBot:720,o,
    timeLabel:t=>`${fmt(t)} miljoen jaar`,
    focus(v){return v==='overzicht'?800:v==='lithosfeer'?o.xT+110:o.xT+90},
    legend:[ID.WATER,ID.OCN,ID.OCR,ID.OC,ID.LITHO,ID.ARC,ID.MAGMA,ID.VOLC,ID.WEDGE,ID.PMELT,ID.ASTH,ID.TZ,ID.LM],
    prepare(t,vp){fillCache(cache,'boog'+vp.key,o.P,vp)},
    sample(x,z,t,lod,idx){let s,n;if(idx>=0&&cache.s){s=cache.s[idx];n=cache.n[idx]}else{o.P.project(x,z,PR);s=PR.s;n=PR.n}
      o.setT(t);if(n<0&&x>o.xT&&o.g>0.5){const xb=o.xBA;if(Math.abs(x-xb)<60){const top=o.topOver(x);if(z>top+7&&z<70&&Math.abs(x-xb)<(z-top)*1.0&&z<o.lithBase(x)+15&&z>o.lithBase(x)-1)return ID.PMELT}}
      return subSample(o,x,z,t,lod,s,n)},
    quakeRate:9,quake(r,t){o.setT(t);const q=subQuake(o,r);if(q.x>o.xT+50&&q.z<40&&r()<0.6)q.z=3+r()*12;return q},vents(t){o.setT(t);return o.magOn?[{x:o.xArc,z:o.topOver(o.xArc)-o.vH*clamp(o.g*4,0,1),sub:o.g<0.35}]:[]},fluids:(r,t)=>{o.setT(t);return fluidSpawn(o,r)},
    overlay(O,t){subOverlay(O,o,t,true)}};
  sc.syms=()=>['ticks','fluids'];
  sc.phases=[{t0:0,t1:tM,title:'1 · De plaat begint te duiken',
    onder:'<p>De oudste en zwaarste oceaanplaat begint onder de andere te duiken. Er ontstaat een diepzeetrog en er zijn aardbevingen, maar nog geen vulkanen: de plaat is nog niet diep genoeg.</p>',
    boven:'<p>Beginfase (vereenvoudigd). De slab reikt nog niet tot ±110 km; er is nog geen fluxsmelten in de mantelwig.</p>'},
   {t0:tM,t1:t6+6,title:'2 · Een eilandboog groeit',
    onder:'<p>Twee oceaanplaten komen samen. De <b>oudste</b> plaat is het koudst en zwaarst; die duikt steil de mantel in. Boven de duikende plaat smelt de mantel door water dat uit de plaat komt. De vulkanen groeien uit tot een rij eilanden in een boog: een <b>eilandboog</b>, zoals Japan, de Marianen of de Kleine Antillen.</p><p>Bij de Marianen ligt de diepste plek van de oceaan: de Marianentrog, bijna 11 km diep.</p>',
    boven:'<p>Intra-oceanische subductie. Oude (±130 Ma), dichte lithosfeer subduceert steil (±60°, Marianen-type). Fluxsmelten in de mantelwig bouwt een boogkorst van ±20–25 km dik op.</p><p>Steile, oude slabs hebben de neiging terug te rollen (<b>slab rollback</b>): de trog verschuift richting de duikende plaat en achter de boog rekt de plaat uit. Daar ontstaat een <b>back-arc bekken</b> met een eigen spreidingsrug. Ook hier is de aandrijving de zinkende slab, niet een convectiecel.</p>'}];
  sc.effects={onder:[['eq','Veel aardbevingen, ondiep tot heel diep (±700 km).'],['volc','Explosieve vulkaaneilanden in een boog.'],['mtn','Zeer diepe trog (Marianen ±11 km).']],
    boven:[['eq','Wadati-Benioffzone, steil; megathrust-bevingen (Japan 2011, M9,1).'],['volc','Boogvulkanisme (basalt–andesiet); back-arc spreiding met MORB-achtig basalt.'],['mtn','Trog, eilandboog, back-arc bekken.']]};
  sc.notes=['Op ware schaal is een vulkaaneiland van 2 km hoog nauwelijks te zien: kijk naar het hoogteprofiel boven de doorsnede.'];
})();

// ---------- 5. Botsing (India – Azië) ----------
(function(){
  const xT=900,x0=-2600,vPre=100,vPost=20,tc=20,ageIn=110,sdo=oceanDepth(ageIn),TAU=1.5;
  const tbo=tc+3,tm1=tbo+6,tTh0=tm1+0.5;           // afbreken, einde opveren, eerste stuwbreuk
  const D=t=>t<=tc?vPre*t:vPre*tc+vPost*(t-tc)+(vPre-vPost)*TAU*(1-Math.exp(-(t-tc)/TAU));
  const vel=t=>t<=tc?vPre:vPost+(vPre-vPost)*Math.exp(-(t-tc)/TAU);
  const Lmid0=(()=>{const z1=sdo+220*(1-Math.cos(rad(45))),drop2=180*(1-Math.cos(rad(45)));return(640-drop2-z1)/Math.sin(rad(45))})();
  // één padsjabloon: f=0 is de duikende plaat (45°), f=1 is India dat flauw onder Tibet schuift
  function buildT(f){const L=(a,b)=>lerp(a,b,f),R=(a,b)=>Math.exp(lerp(Math.log(a),Math.log(b),f));
    const P=new Path(x0,L(sdo,12),0);
    P.line(L(xT-x0,xT-280-x0)).arc(R(220,1500),rad(L(45,3.5))).line(L(Lmid0,120)).arc(R(180,400),rad(L(-45,10.5))).line(L(300,135))
     .arc(R(220,300),L(0.7,-rad(14))).line(L(900,260)).arc(250,rad(L(0,45))).line(L(0,1500));P.buildX(1);return P}
  const Ps=buildT(0),PIfin=buildT(1);
  Ps.project(xT,sdo+0.01,PR);const sT=PR.s;
  const xiM=sT-D(tc),sNeck=xiM+D(tbo)+30;
  const fM=t=>sstep(tbo,tm1,t),dOff=f=>lerp(sdo,12,f);
  const oPre=makeSub({kind:'oc',xT,ageIn,dip:45,R1:220,R2:180,zFlat:640,Lflat:300,H:95,v:vPre,ids:{cu:ID.CCU2,cl:ID.CCL2,lm:ID.LITHC2},relief:1.8,root:12});
  oPre.P=Ps;
  const xArcPre=oPre.xArc;
  let PIc=Ps,PIkey='',curC=null,curDO=sdo;
  const cachePs=cacheOf(),cachePI=cacheOf(),cacheM=cacheOf();
  // opschuivingen (piggyback, naar het voorland)
  const TH=[];{PIfin.project(xT-12,30,PR);let r=PR.s;for(let k=0;k<8;k++){TH.push({t:tTh0+5.4*k,P:new Thrust(r-20.26,11.7),r});r=r-20.26-26}}
  const nAct=t=>{let a=0;for(const h of TH)if(h.t<=t)a++;return a};
  const FILL=99;
  const fmOf=xi=>clamp((xi-(xiM-160))/160,0,1);
  function indiaCol(dd,fm,lod){const sedT=5+3*fm,Ct=29*(1-0.7*fm);
    if(dd<sedT)return sedBand(dd,lod);if(dd<sedT+Ct*0.42)return ID.CCU;if(dd<sedT+Ct)return ID.CCL;if(dd<155-60*fm)return ID.LITHC;return 0}
  function oceanAt(xi,n,lod){if(n>95)return 0;if(n<7.4){if(n<2&&lod<1.3)return polarity(xi/vPre)?ID.OCN:ID.OCR;return ID.OC}return ID.LITHO}
  function upperLayer(xi,d,lod,dO){
    if(d<0)return ID.AIR;
    if(xi>xiM)return ID.ACCR;
    const fm=fmOf(xi),dTop=dO*fm;
    if(d<dTop)return FILL;
    return indiaCol(d-dTop,fm,lod)||ID.LITHC}
  function wedgeEval(s,d,t,lod){
    const a=nAct(t);let S=s,Dd=d;
    for(let k=a-1;k>=0;k--){const tk=TH[k].t,tEnd=k===a-1?t:TH[k+1].t,dt=tEnd-tk;S-=vPost*dt;TH[k].P.project(S,Dd,PR2);
      if(PR2.n<0){TH[k].P.pointAt(PR2.s+vPost*dt,PR2.n,PT2);S=PT2.x;Dd=PT2.z}}
    const t1=a?TH[0].t:t;return upperLayer(S-D(t1),Dd,lod,12)}
  const xbs=z=>xT+15+0.8*z;
  const zcap=(x,t)=>-(0.3+5.8*sstep(tTh0-2,tTh0+12,t)*sstep(xT-330,xT-60,x));
  const zFill=t=>(sdo+2)*(1-sstep(tc+1,tc+18,t));
  const fillConv=(z,t)=>z<0?ID.AIR:(t<tc||z<zFill(t))?ID.WATER:ID.YOUNG;
  const asiaTop0=x=>-0.4-1.6*bell((x-xArcPre-30)/110);
  oPre.topOver=(base=>x=>{const dx=x-xT;if(dx<175)return base(x);return asiaTop0(x)})(oPre.topOver);
  function detached(x,z,t){
    if(t<tbo)return 0;const dz=15*(t-tbo);if(x<xT-200||x>xT+1300||z-dz<20)return 0;
    Ps.project(x,z-dz,PR2);if(PR2.n>=0&&PR2.n<=95&&PR2.s>sNeck)return PR2.n<7.4?ID.OC:ID.LITHO;return 0}
  const mantleOr=(x,z,t)=>detached(x,z,t)||mantleId(z);
  function asia(x,z,t,slabZ){
    let r;
    if(t<tbo)r=overOC(x,z,oPre,slabZ);
    else{const g=sstep(tbo,tc+38,t),prof=sstep(xT+950,xT+620,x),th=1+1.05*g*prof,e=(th-1)*35*0.145,top0=oPre.topOver(x),top=top0-e;
      if(z<top)r=ID.WATER;else r=overOC(x,top0+(z-top)/th,oPre,top0+(slabZ-top)/th)}
    if(r===ID.WATER||r===ID.AIR)return fillConv(z,t);
    if(r===ID.ASTH||r===ID.TZ||r===ID.LM)return mantleOr(x,z,t);
    return r}
  function setAsia(t){oPre.magOn=t<tc+1.5;oPre.noWedge=t>tc+1.5}
  function sampleAll(x,z,t,lod,s,n){
    if(z<-14)return ID.AIR;
    setAsia(t);
    const xi=s-D(t),dO=curDO;
    if(n>=0){
      if(xi<=xiM){const fm=fmOf(xi);return indiaCol(dO+n-dO*fm,fm,lod)||mantleOr(x,z,t)}
      if(t<tbo||xi<=xiM+30){const o=oceanAt(xi,n,lod);if(o)return o}
      return mantleOr(x,z,t)}
    if(x<=xbs(z)){
      const d=dO+n;let id=d<-45?ID.AIR:(t>=tTh0?wedgeEval(s,d,t,lod):upperLayer(xi,d,lod,dO));
      if(id===ID.ACCR&&z<oPre.topOver(x))id=FILL;
      if(id>1&&id!==FILL&&z<zcap(x,t))id=ID.AIR;
      if(id===FILL||id===ID.AIR)return fillConv(z,t);
      return id}
    if(xi<xiM){const fm=fmOf(xi),dd=dO+n-dO*fm;if(dd>=0)return indiaCol(dd,fm,lod)||ID.LITHC}
    return asia(x,z,t,PIc.zAtX(x))}
  const sc=SC.botsing={name:'Continentale botsing (India – Azië)',chip:'Botsing continent–continent',color:'#8b5e34',t0:0,t1:70,rate:2.6,width:1600,zBot:720,
    timeLabel:t=>`${fmt(70-t)} Ma geleden`,
    focus(v,t){if(v==='overzicht')return 820;const k=sstep(tc,tTh0,t);return v==='korst'?lerp(xT+20,xT-200,k):lerp(xT+60,xT-20,k)},
    legend:[ID.SED1,ID.SED0,ID.YOUNG,ID.YOUNG2,ID.ACCR,ID.CCU,ID.CCL,ID.LITHC,ID.CCU2,ID.CCL2,ID.LITHC2,ID.ARC,ID.OC,ID.LITHO,ID.WEDGE,ID.PMELT,ID.ASTH,ID.TZ,ID.LM],
    prepare(t,vp){
      const f=fM(t);curDO=dOff(f);
      if(f<=0){PIc=Ps;fillCache(cachePs,'ps'+vp.key,Ps,vp);curC=cachePs}
      else if(f>=1){PIc=PIfin;fillCache(cachePI,'pi'+vp.key,PIfin,vp);curC=cachePI}
      else{const k='f'+f.toFixed(3);if(PIkey!==k){PIc=buildT(+f.toFixed(3));PIkey=k}fillCache(cacheM,'pf'+k+vp.key,PIc,vp);curC=cacheM}},
    sample(x,z,t,lod,idx){
      let s,n;if(idx>=0&&curC&&curC.s&&idx<curC.s.length){s=curC.s[idx];n=curC.n[idx]}else{PIc.project(x,z,PR);s=PR.s;n=PR.n}
      return sampleAll(x,z,t,lod,s,n)},
    thrustTraces(t){const a=nAct(t),out=[];const P=PIc;
      for(let k=0;k<a;k++){const pts=[];const h=TH[k];for(let sg=-12;sg<=60;sg+=1.5){h.P.pointAt(sg,0,PT2);let s=PT2.x,d=PT2.z;
          const tEk=k===a-1?t:TH[k+1].t;s+=vPost*(tEk-h.t);
          for(let j=k+1;j<a;j++){const tE=j===a-1?t:TH[j+1].t,dt=tE-TH[j].t;TH[j].P.project(s,d,PR2);if(PR2.n<0){TH[j].P.pointAt(PR2.s-vPost*dt,PR2.n,PT2);s=PT2.x;d=PT2.z}s+=vPost*dt}
          P.pointAt(s,d-12,PT2);if(PT2.z<zcap(PT2.x,t)-0.2||PT2.x>xbs(PT2.z))continue;pts.push([PT2.x,PT2.z])}
        out.push({pts,active:k===a-1})}return out},
    quakeRate:8,
    quake(r,t){if(t<tbo){const q=subQuake(oPre,r);if(t>=tc&&q.z>120)q.z=20+r()*80;if(q.x>xT+50&&q.z<40&&r()<0.4)q.x=xT+60+r()*400;return q}
      const u=r();const a=nAct(t);
      if(!a){if(u<0.6){PIc.pointAt(sT-60+r()*260,-r()*6,PT2);return{x:PT2.x,z:Math.max(2,PT2.z),m:3+r()*3.2}}if(u<0.8)return{x:xT+60+r()*520,z:3+r()*18,m:3+r()*2.5};return null}
      if(u<0.5&&a){const sA=TH[a-1].r-25,sB=TH[0].r+70;PIc.pointAt(lerp(sA,sB,r()),-r()*3,PT2);return{x:PT2.x,z:PT2.z,m:r()<0.05?7.3+r()*1.0:3+r()*3}}
      if(u<0.7){PIc.pointAt(PIfin.sAtDepth(72)+r()*230,8+r()*30,PT2);return{x:PT2.x,z:PT2.z,m:3+r()*2.5}}
      if(u<0.9)return{x:xT+60+r()*520,z:3+r()*18,m:3+r()*3};
      return{x:xT-300+r()*280,z:2+r()*10,m:2.5+r()*2.5}},
    vents(t){return t<tc+1.5?[{x:xArcPre,z:oPre.topOver(xArcPre)-oPre.vH}]:[]},
    fluids(r,t){return t<tc?fluidSpawn(oPre,r):null},
    overlay(O,t){
      const v=vel(t);
      if(t<tbo&&state.tog.markers){for(let k=-40;k<40;k++){const s=((k*100+D(t))%4000+4000)%4000+sT-2000;Ps.pointAt(s,0,PT2);if(s-D(t)<xiM&&PT2.x<xT)plateTick(O,PT2.x,0,null);else plateTick(O,PT2.x,PT2.z,null)}}
      const xEdge=x0+xiM+D(t);
      if(t<tc){
        label(O,['India (continent)','Indiase continentale lithosfeer'],Math.max(xEdge-260,60),60,{});
        label(O,['Oceaan (Tethys) verdwijnt','Neo-Tethys subduceert'],Math.max(xEdge+120,xT-300),sdo,{dy:-34});
        label(O,['Azië','Euraziatische plaat'],xT+520,40,{});
        label(O,['Vulkanen op de rand van Azië','Andes-type boog (Gangdese)'],xArcPre,-1.5,{dy:-34,tone:'warm'});
        label(O,['Zinkende oceaanplaat','Slab'],xT+260,300,{dx:-90});
      }else if(t<tbo){
        label(O,['Continent wordt de trog in getrokken','Continentale subductie (beperkt: korst is drijvend)'],xT+40,30,{dx:-140,dy:30,tone:'warm'});
        label(O,['Botsing: India loopt vast','Continent bereikt de trog'],xT,-1,{dy:-36,tone:'warm'});
        label(O,['Azië','Euraziatische plaat'],xT+520,40,{});
        label(O,['Oceaanplaat trekt nog, maar de “nek” rekt uit','Slab necking: break-off op handen'],(()=>{Ps.pointAt(sNeck,45,PT2);return PT2.x})(),PT2.z,{dx:150,dy:0});
      }else{
        Ps.pointAt(sNeck+220,45,PT2);const dz=15*(t-tbo);
        if(PT2.z+dz<O.wz(O.H)-20)label(O,['Afgebroken oceaanplaat zinkt weg','Slab break-off: slab zinkt (±1,5 cm/jaar)'],PT2.x,PT2.z+dz,{dx:120,dy:0});
        if(t<tTh0){label(O,['Zonder de zware plaat veert India op','Isostatisch opveren na break-off'],xT+120,60,{dx:-60,dy:-60,tone:'warm'});label(O,['Azië','Euraziatische plaat'],xT+520,40,{})}
      }
      if(t>=tTh0){
        const tr=this.thrustTraces(t);for(const q of tr)O.poly(q.pts,q.active?'#c0281b':'rgba(35,25,25,.8)',q.active?2.4:1.3,q.active?[6,3]:null);
        const pts=[];for(let s=(nAct(t)?TH[nAct(t)-1].r:TH[0].r+20)-25;s<PIfin.sAtDepth(72)+260;s+=4){PIc.pointAt(s,0,PT2);pts.push([PT2.x,PT2.z])}O.poly(pts,'rgba(192,40,27,.55)',1.6,[2,4]);
        PIc.pointAt(TH[0].r+40,0,PT2);label(O,['Glijvlak onder het gebergte','Main Himalayan Thrust (basaal glijvlak)'],PT2.x,PT2.z,{dx:110,dy:36});
        label(O,['Himalaya','Himalaya: gestapelde dekbladen'],xT-90,-5,{dy:-36});
        if(state.view!=='overzicht'){const a=nAct(t);if(a){const h=TH[a-1];h.P.pointAt(4,0,PT2);PIc.pointAt(PT2.x+vPost*(t-h.t),PT2.z-12,PT2);label(O,['Nieuwste breuk','Actieve stuwbreuk (frontaal)'],PT2.x,PT2.z,{dx:-60,dy:-40,tone:'warm'})}
          label(O,['Rode laag: zie hoe hij plooit en breekt','Rode merklaag: volg plooiing en verschuiving'],xT-240,-3,{dx:-40,dy:-56})}
      }
      if(t>=tc+4)label(O,['Zand en klei vullen het lage land','Voorlandbekken (Ganges) vult op'],xT-330,1,{dx:-70,dy:-30});
      if(t>tc+15)label(O,['Tibet: ±5 km hoog, korst ±70 km dik','Tibet-plateau (korst ±70 km, isostasie)'],xT+380,-5,{dy:-30});
      if(t>tm1)label(O,['India schuift onder Azië','Indiase lithosfeer schuift onder Tibet'],xT+330,120,{});
      if(state.tog.forces){
        if(t<tbo){const k=t<tc?1:1-(t-tc)/(tbo-tc)*0.6;Ps.pointAt(Ps.sAtDepth(230),45,PT);Ps.pointAt(Ps.sAtDepth(430),45,PT2);arrow(O,PT.x,PT.z,PT2.x,PT2.z,{w:13*k,color:'#b8481f',label:['Trekkracht zinkende plaat','slab pull']})}
        const vt=`${fmt(v/10,1)} cm/jaar`;
        arrow(O,t<tc?Math.max(60,xEdge-420):80,t<tc?70:90,t<tc?Math.max(60,xEdge-420)+180:260,t<tc?70:90,{w:6,color:'#1e6b72',label:[`India: ${vt}${t<tc?'!':''}`,`India ${vt} t.o.v. Azië`]});
        if(t>=tc)arrow(O,xT+620,20,xT+500,20,{w:5,color:'#7a2b10',label:['Tegendruk van Azië','Botsingsweerstand']})}
    }};
  sc.syms=t=>t<tc?['ticks','fluids']:t<tbo?['ticks']:t>=tTh0?['fault']:[];
  sc.phases=[
    {t0:0,t1:tc,title:'1 · Oceaan sluit',
     onder:'<p>Tussen India en Azië ligt een oceaan, de <b>Tethys</b>. Die verdwijnt in een subductiezone onder Azië. Op de rand van Azië staan vulkanen. India wordt meegetrokken door de zinkende plaat en beweegt heel snel: wel 10 cm per jaar.</p>',
     boven:'<p>De Neo-Tethys subduceert noordwaarts onder Azië; een Andes-type boog vormt de Gangdese-batholiet (Transhimalaya). Slab pull trekt de Indiase plaat met ±10–18 cm/jaar noordwaarts: veel sneller dan nu.</p><p>Op de passieve rand van India liggen dikke sedimentpakketten (gelaagd). Volg de <b>rode merklaag</b> in de zoom ‘Korst’: straks wordt die geplooid en opgestapeld.</p>'},
    {t0:tc,t1:tbo,title:'2 · Continent loopt vast',
     onder:'<p>De oceaan is verdwenen: nu komt het <b>continent</b> van India bij de trog aan. De zinkende oceaanplaat trekt het nog een stukje mee naar beneden. Maar continentaal gesteente is <b>licht</b>: het wil niet zinken. India remt daardoor sterk af, van 10 naar een paar cm per jaar. De vulkanen op Azië doven uit.</p>',
     boven:'<p>Continentale korst (ρ ≈ 2,7–2,8 g/cm³) bereikt de trog en wordt nog tot ±60–100 km diep meegetrokken (continentale subductie; daar ontstaan UHP-gesteenten). Het drijfvermogen van de korst werkt de slab pull tegen: de convergentie vertraagt. Zonder nieuwe oceanische lithosfeer stopt het fluxsmelten en dooft de boog uit. De ‘nek’ tussen continent en slab rekt uit.</p>'},
    {t0:tbo,t1:tTh0,title:'3 · Plaat breekt af, India veert op',
     onder:'<p>De zware oceaanplaat <b>scheurt los</b> van het continent en zakt langzaam de mantel in. Het stuk India dat naar beneden was getrokken is nu niet meer verzwaard en <b>veert op</b>: het gaat onder een flauwe hoek liggen. Vanaf nu schuift India vrijwel plat onder Azië.</p>',
     boven:'<p><b>Slab break-off</b> (±50–45 Ma voor India): de dichte oceanische slab scheidt zich af en zinkt door (±1–2 cm/jaar). De ontlaste continentale lithosfeer veert isostatisch op en gaat over in flauwe <i>underthrusting</i> onder Azië. Recent modelwerk (2025) laat zien dat de huidige convergentie vooral wordt aangedreven door slab pull bij de Soenda-trog (Sumatra–Java), aan dezelfde Indo-Australische plaat; de botsing zelf remt.</p>'},
    {t0:tTh0,t1:70,title:'4 · Gebergtevorming',
     onder:'<p>India schuift <b>onder</b> Azië door. De bovenste lagen worden eraf geschraapt en als dakpannen op elkaar <b>gestapeld</b>. Waar ze over een trap in de breuk schuiven, buigen de lagen mee: ze <b>plooien</b>. Zo ontstaat de Himalaya.</p><p>Regen, ijs en rivieren halen boven veel gesteente weg (erosie); dat zand komt in het lage land ervoor terecht. De korst wordt twee keer zo dik: Tibet drijft daardoor ±5 km hoog. Vulkanen zijn er bijna niet, aardbevingen wel.</p>',
     boven:'<p>Opschuivingen ontstaan op volgorde richting het voorland (<b>piggyback</b>): elke nieuwe stuwbreuk vormt vóór de vorige en draagt de oudere dekbladen mee. Boven de ramp plooien de lagen mee (<b>fault-bend folds</b>). Alle stuwbreuken wortelen in het basale glijvlak (Main Himalayan Thrust), de bron van grote bevingen (Gorkha 2015, M7,8).</p><p>Erosie verwijdert tientallen kilometers gesteente, waardoor diepe metamorfe dekbladen aan het oppervlak komen. De buiging van de Indiase plaat vormt het <b>voorlandbekken</b> (Ganges). Onder Tibet ligt Indiase lithosfeer; de korst is ±70 km dik (isostasie → plateau ±5 km).</p>'}];
  sc.effects={onder:[['eq','Zware, ondiepe aardbevingen langs de grote breuken (Nepal 2015).'],['volc','Bijna geen vulkanen: er duikt geen oceaanplaat meer.'],['mtn','Het hoogste gebergte op aarde en een heel hoog plateau.']],
    boven:[['eq','Ondiep (MHT, M7–8+), intermediair onder Tibet (±70–100 km); geen diepe bevingen.'],['volc','Na de botsing nauwelijks magmatisme (wel smelten van korst: leucograniet).'],['mtn','Dekbladen, plooien, korstwortel, isostatisch plateau, voorlandbekken.']]};
  sc.notes=['De drie stappen (vastlopen, afbreken, opveren) duren hier samen ±10 miljoen jaar en zijn vereenvoudigd tot één doorsnede.','De convergentie na de botsing is hier 2 cm/jaar: zo snel kort de Himalaya nu in. India beweegt zelf ±4–5 cm/jaar; de rest wordt elders in Azië opgevangen.','Plooien en breuken zijn kinematisch berekend (lagen schuiven over trappen en buigen mee). Erosie is benaderd met een maximale hoogte van ±6 km.','Zoom in op ‘Korst’ en zet Verticaal op ×2 om de geplooide lagen goed te zien.'];
})();

// ---------- 6. Transforme breuk (bovenaanzicht) ----------
SC.transform={name:'Transforme breuk (San Andreas)',chip:'Transforme breuk',color:'#2f8a57',map:true,t0:0,t1:900,rate:40,
  timeLabel:t=>state.mode==='geo'?`${fmt(t/90,1)} miljoen jaar`:`${Math.round(t)} jaar`,
  legend:[],
  quakeTimes:[0,138,302,447,610,752],syms:()=>['mapfault'],
  phases:[{t0:0,t1:900,title:'Platen schuiven langs elkaar',
    onder:'<p>Twee platen schuiven langs elkaar. Er komt geen gesteente bij en er verdwijnt niets. Maar de breuk zit <b>vast</b> door wrijving. Het land vlak bij de breuk buigt langzaam, net als een liniaal die je verbuigt (kijk naar de wegen en hekken).</p><p>Wordt de spanning te groot, dan schiet de breuk in één keer los: een <b>aardbeving</b>. Wegen, hekken en rivieren liggen daarna een stuk verschoven. Daarna begint het opnieuw.</p><p>Kies ‘Geologisch’ om te zien wat er in miljoenen jaren gebeurt.</p>',
    boven:'<p>Transforme (conservatieve) plaatgrens, rechtsdraaiend (dextraal), ±35 mm/jaar. Volgens de <b>elastische terugvering</b> (Reid, 1910) is de breuk tot ±15 km diep vergrendeld; de vervorming tussen bevingen volgt u(y) = (V·t/π)·arctan(y/D). Bij een beving komt de opgebouwde verplaatsing in één keer vrij: enkele meters.</p><p>De San Andreasbreuk en de Noord-Amerikaanse en Pacifische plaat bewegen samen ook westwaarts over de mantel. Dat vraagt om tegengesteld stromende convectiestromen naast elkaar én een derde dwars daarop: het klassieke convectiemodel loopt hier vast. In oceanen verbinden transforme breuken stukken mid-oceanische rug.</p>'}],
  effects:{onder:[['eq','Ondiepe, soms zware aardbevingen (San Francisco 1906: M7,9).'],['volc','Geen vulkanen.'],['mtn','Verschoven wegen, hekken en rivieren; een smalle breukvallei.']],
    boven:[['eq','Ondiep (<20 km), tot ±M8; vaak in clusters langs segmenten.'],['volc','Geen magmatisme (geen smelt: geen decompressie of water).'],['mtn','Verzette rivieren, drukruggen en trekbekkens (pull-apart) bij bochten.']]},
  notes:['Aardbevingscyclus: verplaatsingen ×1500 overdreven, anders zie je een sprong van 5 meter niet op een kaart van 100 km.','Geologische tijdschaal: verplaatsingen op ware schaal (35 km per miljoen jaar).'],
};

// ---------- 7. Hotspot ----------
(function(){
  const v=80,xp0=520,vp=-5,xp=t=>xp0+vp*t;const r=mulberry32(5);const VOL=[];
  for(let i=0;i<34;i++){const tf=-30+i*1.25+(r()-0.5)*0.35;VOL.push({tf,Hm:10.4+r()*2,R:78+r()*22,id:i})}
  const AG=x=>30+x/80;
  let flex=null,topV=null,tabX0=0,tabT=-1;
  function volcState(V,t){const age=t-V.tf;if(age<0)return null;const x=xp(V.tf)+v*age;const grow=sstep(0,1.1,age);const end=V.tf+1.2;const since=Math.max(0,t-end);
    const H=V.Hm*grow;const cap=-2.6*Math.exp(-since/2.2)*(since>0?1:1)+0.35*Math.sqrt(since);const sink=0.32*Math.sqrt(since);return{x,H,R:V.R,cap:since>0?cap:-99,sink,active:age<1.25,age}}
  function prep(t){if(tabT===t)return;tabT=t;const N=2400;tabX0=-400;flex=new Float32Array(N);topV=new Float32Array(N).fill(99);
    const st=VOL.map(V=>volcState(V,t)).filter(Boolean);
    for(const s of st){const L=0.16*s.H;const al=85;for(let i=0;i<N;i++){const dx=Math.abs(tabX0+i-s.x)/al;if(dx>6)continue;flex[i]+=L*Math.exp(-dx)*(Math.cos(dx)+Math.sin(dx))}}
    for(let i=0;i<N;i++){const x=tabX0+i;flex[i]-=1.0*bell((x-xp(t)-150)/420);const base=oceanDepth(AG(x))+flex[i];let top=99;
      for(const s of st){const rr=Math.abs(x-s.x)/s.R;if(rr>=1)continue;let z=base+s.sink-s.H*Math.pow(1-rr,1.25);if(z<s.cap)z=s.cap;if(z<top)top=z}topV[i]=top}}
  const tab=(arr,x)=>{const i=Math.round(x-tabX0);return arr[clamp(i,0,arr.length-1)]};
  const sc=SC.hotspot={name:'Hotspot (Hawaï)',chip:'Hotspot',color:'#d9612a',t0:0,t1:20,rate:0.9,width:1600,zBot:720,
    timeLabel:t=>`${fmt(t)} miljoen jaar`,
    focus(vw,t){return vw==='overzicht'?800:xp(t)+80},
    legend:[ID.WATER,ID.VOLC,ID.MAGMA,ID.OC,ID.LITHO,ID.PLUME,ID.PMELT,ID.ASTH,ID.TZ,ID.LM],
    prepare(t){prep(t)},
    sample(x,z,t,lod){
      const fl=tab(flex,x),sd=oceanDepth(AG(x))+fl;
      if(z<sd){const top=tab(topV,x);if(z>=top){for(const V of VOL){const s=volcState(V,t);if(s&&s.active){const ex=(x-s.x)/6,ez=(z-(sd-s.H*0.45))/2.2;if(ex*ex+ez*ez<1)return ID.MAGMA}}return ID.VOLC}return z<0?ID.AIR:ID.WATER}
      const d=z-sd,L=oceanLith(AG(x))-14*bell((x-xp(t)-150)/220);
      if(d<7)return ID.OC;if(z<sd+L)return ID.LITHO;
      const Lb=sd+L,c0=xp(t)+22*Math.sin(Lb/140),dx=x-c0;
      {const ex=(x-c0-25)/78,ez=(z-(Lb+13))/13;if(ex*ex+ez*ez<1)return ID.PMELT}
      const T=dx>=0?58*Math.exp(-dx/360):58*Math.sqrt(Math.max(0,1-(dx/185)*(dx/185)));
      if(z>=Lb&&z<Lb+T)return(z>Lb+T-6&&dith(x,z,0.5))?mantleId(z):ID.PLUME;
      const cc=xp(t)+22*Math.sin(z/140)+(z>300?(z-300)*0.05:0),hw=48+10*Math.sin(z/55)+(z>600?10:0),ad=Math.abs(x-cc);
      if(ad<hw)return(ad>hw-6&&dith(x,z,0.5))?mantleId(z):ID.PLUME;
      return mantleId(z)},
    quakeRate:3,quake(r,t){const s=VOL.map(V=>volcState(V,t)).filter(q=>q&&q.active);if(!s.length)return null;const q=s[0];return{x:q.x+(r()-0.5)*40,z:1+r()*40,m:2.5+r()*3.2}},
    vents(t){return VOL.map(V=>volcState(V,t)).filter(q=>q&&q.active&&q.H>1).map(q=>({x:q.x,z:tab(topV,q.x),sub:tab(topV,q.x)>0}))},
    overlay(O,t){
      const st=VOL.map(V=>volcState(V,t)).filter(Boolean).filter(q=>q.x>-50&&q.x<1700);
      for(const q of st){if(q.age<0.3)continue;const top=tab(topV,q.x);const ag=Math.round(q.age*10)/10;
        if(state.tog.markers)plateTick(O,q.x,top,ag<1?null:`${fmt(q.age,0)} Ma`)}
      const act=st.find(q=>q.active);
      label(O,['Actieve vulkaan boven de pluim','Actieve schildvulkaan (Big Island)'],act?act.x:xp(t),act?tab(topV,act.x)-1:0,{dy:-36,tone:'warm'});
      const old=st.filter(q=>!q.active&&q.age>6).sort((a,b)=>a.x-b.x)[0];
      if(old)label(O,['Oude vulkaan: gezakt en afgesleten','Guyot/atol: geërodeerd en gedaald'],old.x,tab(topV,old.x),{dy:-36});
      label(O,['Mantelpluim: heet gesteente stijgt op','Mantelpluim (staart ±100 km breed)'],xp(t),420,{dx:120});
      label(O,['Pluim spreidt uit onder de plaat','Pluimkop wordt door de plaat meegesleept'],xp(t)+260,120,{dx:40,dy:30});
      label(O,['Plaat buigt door onder het gewicht','Flexuur van de lithosfeer'],act?act.x+150:600,45,{dx:60,dy:-10});
      if(state.tog.forces){arrow(O,1000,60,1250,60,{w:5,color:'#1e6b72',label:['Plaat: 8 cm/jaar','8 cm/jaar t.o.v. mantel']});
        arrow(O,xp(t)+20,600,xp(t)-60,600,{w:2.5,color:'#7a2b10',label:['pluim schuift heel langzaam','pluim ±0,5 cm/jaar']})}
    }};
  sc.syms=()=>['ticks'];
  sc.phases=[{t0:0,t1:20,title:'Vulkanen midden op een plaat',
    onder:'<p>Diep uit de mantel stijgt een kolom extra heet gesteente op: een <b>mantelpluim</b>. Waar die onder de plaat komt, smelt een deel en ontstaat een vulkaan.</p><p>De plaat schuift eroverheen, maar de pluim blijft bijna op zijn plek. De vulkaan wordt meegenomen en dooft uit, en boven de pluim groeit een nieuwe. Zo ontstaat een <b>keten van steeds oudere vulkanen</b>, zoals Hawaï. Oude vulkanen zakken weg en slijten af tot ze onder water verdwijnen.</p>',
    boven:'<p>Intraplaat-vulkanisme. Een mantelpluim stijgt op (mogelijk vanaf de kern-mantelgrens), spreidt uit onder de lithosfeer en wordt door de plaat meegesleept. Decompressiesmelten levert schildvulkanen van basalt (Mauna Kea: ±10 km boven de zeebodem, flanken van maar 5–10°). De last <b>buigt de lithosfeer</b> (flexuur, enkele km).</p><p>De ouderdom van de vulkanen neemt toe met de afstand: plaatsnelheid = afstand / ouderdom (±8 cm/jaar). Pluimen bewegen zelf maar enkele mm/jaar; daarom gebruiken geologen ze als referentiekader voor de ‘absolute’ plaatbeweging. De knik in de Hawaï-Emperorketen (±47 Ma) laat een koerswijziging van de Pacifische plaat zien – te snel voor een grote convectiecel.</p>'}];
  sc.effects={onder:[['eq','Kleine aardbevingen onder de actieve vulkaan.'],['volc','Rustige uitbarstingen met dunne lava (schildvulkaan).'],['mtn','Een keten van vulkaaneilanden en onderzeese bergen.']],
    boven:[['eq','Ondiepe tot middeldiepe bevingen door magma en de last van de vulkaan.'],['volc','Basaltisch, effusief; ouderdomsprogressie langs de keten.'],['mtn','Eilanden → atollen → guyots door erosie en daling.']]};
  sc.notes=['Een schildvulkaan van 9 km hoog en 160 km breed is op ware schaal een flauwe bult: kijk naar het hoogteprofiel.','De vorm en diepte van de pluimstaart zijn onzeker; tomografie laat brede, soms schuine pluimen zien.'];
})();

// ---------- 8. Nieuw-Guinea-recept ----------
(function(){
  const v=60,xm0=300,tS0=5,tS1=25,xTr=3050,H=80,vIn=55;
  const xm=t=>xm0+v*t;
  const keel=Xd=>Xd<0?72:92+128*sstep(0,260,Xd);
  function invKeel(z){if(z<=92)return 0;let lo=0,hi=260;for(let i=0;i<24;i++){const m=(lo+hi)/2;if(keel(m)<z)lo=m;else hi=m}return hi}
  const PA=new Path(xTr+400,5.2,PI).line(400).arc(220,-rad(50)).line(900);const sTr=400;
  const Ls=t=>Math.min(560,vIn*(t-tS0));
  const s80=(()=>{for(let s=sTr;s<PA.s;s+=1){PA.pointAt(s,0,PT);if(PT.z>=80)return s}return sTr})();
  PA.pointAt(s80,0,PT);const P80={x:PT.x,z:PT.z};
  function detPath(t){const p=sstep(25,50,t);return new Path(lerp(P80.x,xTr-190,p),lerp(P80.z,470,p),lerp(rad(130),rad(171),p)).line(400)}
  const LE=t=>new Path(xm0+40,100+15*t,rad(62)).line(360);
  const HAL=new Path(3330,548,0).line(320);
  // deeltjes: verrijkte mantelwig en gewone mantel
  const rr=mulberry32(21);const WP=[],DP=[];
  while(WP.length<360){const x=xTr-330+rr()*330,z=78+rr()*136;PA.project(x,z,PR);if(PR.n>3&&PR.n<62&&PR.s>sTr&&PR.s<sTr+560){WP.push({x0:x,z0:z,ten:tS0+(PR.s-sTr)/vIn+0.6,j:rr(),j2:rr(),ore:rr()<0.12})}}
  for(let x=1300;x<3560;x+=48)for(let z=88;z<216;z+=26){const xx=x+(rr()-0.5)*20,zz=z+(rr()-0.5)*10;PA.project(xx,zz,PR);if(PR.n>3&&PR.n<66&&PR.s>sTr&&xx<xTr)continue;if(xx>xTr-20&&xx<xTr+200&&zz<100)continue;DP.push({x0:xx,z0:zz,j:rr(),j2:rr()})}
  function partPos(p,t,enr){
    if(p.z0>=220||p.z0<74)return{x:p.x0,z:p.z0,st:0};
    const XdZ=invKeel(p.z0);const tcn=(p.x0+XdZ-xm0)/v;if(t<=tcn)return{x:p.x0,z:p.z0,st:0};
    const d=(t-tcn)*v;const zn=Math.max(80+p.j*10,p.z0-0.55*d);
    if(enr){const dm=Math.max(0,(p.z0-100)/0.55);const tm=tcn+dm/v;if(t>tm){const q=(t-tm)/1.6;if(q<1){return{x:xm(t)+(1-q)*(8+p.j*10)-4,z:lerp(Math.min(100,p.z0),6,q),st:2}}
        return{x:xm(t)-6-p.j*16,z:3+p.j2*9,st:3,since:t-tm-1.6}}}
    const xn=xm(t)-invKeel(zn)+6+p.j*12;const fade=enr?1:clamp(1-(d-120)/120,0,1);return{x:xn,z:zn,st:1,fade}}
  const sc=SC.ng={name:'Het Nieuw-Guinea-recept',chip:'Nieuw-Guinea (nieuw!)',color:'#c49a1a',t0:0,t1:50,rate:2,width:2900,zBot:920,noMarkers:true,
    timeLabel:t=>`${fmt(50-t)} Ma geleden`,
    focus(vw,t){return vw==='overzicht'?(t<25?1700:clamp(xm(t)-450,1700,2150)):(t<38?Math.min(xm(t)+300,xTr-150):xm(t)-80)},
    legend:[ID.OPH,ID.CCU,ID.CCL,ID.LITHC,ID.OC,ID.LITHO,ID.VOLC,ID.ASTH,ID.TZ,ID.LM],
    sample(x,z,t,lod){
      const Xd=xm(t)-x;
      if(Xd>0){const top=-0.4-1.7*bell((Xd-70)/45);
        if(z<top){if(t>43.5){const xv=xm(t)-14,Hh=1.6*sstep(43.5,47,t);if(Math.abs(x-xv)<10&&z>top-Hh*(1-Math.abs(x-xv)/10))return ID.VOLC}return ID.AIR}
        const d=z-top;if(Xd<120&&d<3.5*(1-Xd/160))return ID.OPH;if(d<19)return ID.CCU;if(d<38)return ID.CCL;if(z<keel(Xd))return ID.LITHC}
      else{let sd=5.0;if(t>=tS0&&t<tS1)sd+=2.8*bell((x-xTr-12)/22);
        if(z<sd){if(t>=tS0+1.5&&t<tS1){const xv=xTr-120,dv=Math.abs(x-xv);if(dv<16&&z>=lerp(-1.2,sd,dv/16))return ID.VOLC}return z<0?ID.AIR:ID.WATER}
        if(z<sd+7)return ID.OC;if(z<72)return ID.LITHO}
      if(t>=tS0&&t<tS1&&x>xTr-520&&x<xTr+460&&z<720){PA.project(x,z,PR);if(PR.n<=0&&PR.n>=-H&&PR.s<=sTr+Ls(t))return PR.n>-7?ID.OC:ID.LITHO}
      if(t>=tS1&&x>xTr-700&&x<xTr+200&&z>40){const P=this._det;P.project(x,z,PR);if(PR.n<=0&&PR.n>=-H&&PR.s>=0&&PR.s<=400)return PR.n>-7?ID.OC:ID.LITHO}
      if(x<xm0+800&&z>60){const P=this._le;P.project(x,z,PR);if(PR.n>=0&&PR.n<=85&&PR.s>=0&&PR.s<=360)return PR.n<7?ID.OC:ID.LITHO}
      if(t>=34&&x>3300&&z>520&&z<640){HAL.project(x,z,PR);if(PR.n>=0&&PR.n<=70&&PR.s>=0&&PR.s<=320)return PR.n<7?ID.OC:ID.LITHO}
      return mantleId(z)},
    prepare(t){this._det=detPath(t);this._le=LE(t)},
    quakeRate:6,
    quake(r,t){if(t>=tS0&&t<tS1&&r()<0.75){const s=sTr+r()*Ls(t);PA.pointAt(s,-r()*20,PT2);return{x:PT2.x,z:PT2.z,m:3+r()*3}}
      if(t>=tS1)return{x:xm(t)+(r()-0.5)*20,z:2+r()*28,m:3+r()*3.5};return{x:xm(t)-r()*120,z:3+r()*20,m:2.5+r()*2}},
    vents(t){const v=[];if(t>=tS0+1.5&&t<tS1)v.push({x:xTr-120,z:-1.2});if(t>43.5)v.push({x:xm(t)-14,z:-0.4-1.7*bell((14-70)/45)-1.6*sstep(43.5,47,t)});return v},
    fluids(r,t){if(t<tS0+1||t>=tS1)return null;const s=sTr+80+r()*Math.min(200,Ls(t)-80);if(s<sTr+80)return null;PA.pointAt(s,3,PT2);return{x:PT2.x,z:PT2.z}},
    overlay(O,t){
      // deeltjes
      const ctx=O.ctx;
      for(const p of DP){const q=partPos(p,t,false);const a=q.st===1?q.fade:1;if(a<=0.02)continue;const X=O.sx(q.x),Y=O.sy(q.z);if(X<-5||X>O.W+5||Y<-5||Y>O.H+5)continue;ctx.globalAlpha=0.75*a;ctx.fillStyle='#5f5a55';ctx.beginPath();ctx.arc(X,Y,2,0,7);ctx.fill()}
      ctx.globalAlpha=1;let melts=0,intr=[];
      for(const p of WP){if(t<p.ten)continue;const q=partPos(p,t,true);const X=O.sx(q.x),Y=O.sy(q.z);if(X<-5||X>O.W+5||Y<-5||Y>O.H+5)continue;
        if(q.st===3){intr.push([X,Y,p]);continue}
        ctx.fillStyle=q.st===2?'#d0241c':'#1f8f86';ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=0.6;ctx.beginPath();ctx.arc(X,Y,q.st===2?2.8:2.4,0,7);ctx.fill();ctx.stroke();if(q.st===2)melts++}
      for(const [X,Y,p] of intr){ctx.fillStyle='rgba(150,30,40,.9)';ctx.beginPath();ctx.arc(X,Y,2.6,0,7);ctx.fill();if(p.ore&&t>45.5){drawStar(ctx,X,Y-1,4.5,'#e3b23c')}}
      // transforme breuk
      if(t>=tS1){const x=xm(t);O.poly([[x,-3],[x,95]],'#c0281b',2.2,[6,3]);const X=O.sx(x);
        ctx.fillStyle='#fff';ctx.strokeStyle='#c0281b';ctx.lineWidth=1.6;const Y=O.sy(25);ctx.beginPath();ctx.arc(X-10,Y,6,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#c0281b';ctx.beginPath();ctx.arc(X-10,Y,1.8,0,7);ctx.fill();
        ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(X+10,Y,6,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(X+6,Y-4);ctx.lineTo(X+14,Y+4);ctx.moveTo(X+14,Y-4);ctx.lineTo(X+6,Y+4);ctx.stroke();
        label(O,['Grote breuk: platen schuiven langs elkaar (de doorsnede in en uit)','Transforme breuk (oost–west) = opstijgweg'],x,-2,{dy:-40,dx:30})}
      label(O,['Australië','Australische lithosfeer (craton >200 km)'],Math.max(xm(t)-900,200),110,{});
      label(O,['Dikke “kiel” ploegt door de mantel','Lithosfeerrand ploegt (absolute beweging)'],xm(t)-130,190,{dx:-140,dy:30});
      label(O,['← Zuid','← Zuid'],O.wx(110),O.wz(O.H-16),{noAnchor:true,force:true});label(O,['Noord →','Noord →'],O.wx(O.W-230),O.wz(O.H-16),{noAnchor:true,force:true});
      if(t>=tS0&&t<tS1){label(O,['Oceaanplaat duikt de mantel in','Intra-oceanische subductie (zuidwaarts)'],xTr,6,{dy:-36,dx:30});label(O,['Vulkaaneilanden','Eilandboog (drijft later westwaarts weg)'],xTr-120,-1,{dy:-56,dx:-40,tone:'warm'})}
      if(t>=tS0+3&&t<42)label(O,['Mantel met water uit de plaat (groen)','Verrijkte mantelwig – blijft liggen!'],xTr-150,140,{dx:150,dy:-50,tone:'blue'});
      if(t>=tS1){const P=this._det;P.pointAt(200,-40,PT2);label(O,['Afgebroken plaat zinkt','Arafura-slab (nu ±600 km diep)'],PT2.x,PT2.z,{dx:120,dy:30})}
      {const P=this._le;P.pointAt(180,40,PT2);if(PT2.z<O.wz(O.H))label(O,['Oude afgebroken plaat','Lake Eyre-slab (nu ±3000 km zuidelijker)'],PT2.x,PT2.z,{dx:110,dy:0})}
      if(t>=34)label(O,[null,'Halmahera-slab (meegesleept)'],3480,590,{dy:-34});
      if(t>=25&&t<42)label(O,['Gewone, droge mantel: smelt niet','Verarmde mantel: ploegen zonder smelt'],xm(t)+120,150,{dx:60,dy:40});
      if(melts>0||t>44)label(O,['Opgeduwd → lagere druk → smelt','Decompressie van verrijkt materiaal → smelt'],xm(t)+20,90,{dx:150,dy:-30,tone:'warm'});
      if(t>45.5)label(O,['Koper en goud (Grasberg)','Cu-Au porfier (Grasberg, Ok Tedi)'],xm(t)-10,8,{dx:-150,dy:-30,tone:'gold'});
      if(state.tog.forces){arrow(O,xm(t)-700,130,xm(t)-420,130,{w:6,below:true,color:'#1e6b72',label:['6 cm/jaar naar het noorden','6 cm/jaar t.o.v. de mantel']})}
    }};
  sc.syms=t=>t<5?['ngparts']:t<25?['ngparts','fluids']:t<42?['ngparts','fault']:['ngparts','fault','ore'];
  sc.phases=[
    {t0:0,t1:5,title:'1 · Breuk en afbraak bij Australië',
     onder:'<p>Australië schuift naar het noorden, <b>over de mantel heen</b>. Ongeveer 50 miljoen jaar geleden stopte een subductiezone aan de rand van Australië. Een stuk oceaanbodem werd op het continent geschoven (ophioliet). Het afgebroken stuk plaat zakt recht naar beneden weg.</p><p>Let op de grijze stipjes: de mantel blijft liggen. Australië schuift eroverheen.</p>',
     boven:'<p>Eocene ophiolietobductie op de noordrand van Australië. De Lake Eyre-slab breekt af (±50 Ma) en zinkt bijna verticaal (±1–2 cm/jaar). Omdat Australië met ±6 cm/jaar noordwaarts beweegt t.o.v. de mantel, ligt die slab nu ±3000 km zuidelijker dan Nieuw-Guinea, in de ondermantel onder Lake Eyre.</p>'},
    {t0:5,t1:25,title:'2 · Subductie ver in het noorden',
     onder:'<p>Ver ten noorden van Australië duikt een oceaanplaat de mantel in. Water uit die plaat <b>verandert de mantel</b> erboven: die wordt ‘verrijkt’ (groene stipjes). Er ontstaan vulkaaneilanden. Australië is nog zo’n 1000 km ver weg.</p>',
     boven:'<p>Zuidwaarts duikende intra-oceanische subductie (±45–25 Ma). Dehydratie van de Arafura-slab metasomatiseert de mantelwig: verrijkt in grote ionen (LILE) t.o.v. HFSE – de chemische ‘vingerafdruk’ van subductie.</p>'},
    {t0:25,t1:42,title:'3 · Afbraak; Australië ploegt door gewone mantel',
     onder:'<p>De subductie stopt. De duikende plaat breekt af en zinkt. De eilanden drijven weg (ze liggen nu bij de Filipijnen). De <b>verrijkte mantel blijft gewoon liggen</b>. Australië ploegt met zijn dikke ‘kiel’ door gewone, droge mantel. Daar smelt niets: de grijze stipjes worden alleen opzij geduwd.</p>',
     boven:'<p>Subductie stopt ±30–25 Ma; de Arafura-slab breekt af en ligt nu in de overgangszone (±600 km) – zichtbaar in seismische tomografie. Langs Noord-Nieuw-Guinea ontstaat een links-laterale transforme plaatgrens. De >200 km dikke Australische lithosfeer ploegt door verarmde, droge mantel: geen smelt.</p>'},
    {t0:42,t1:50,title:'4 · Ploegen door de oude mantelwig',
     onder:'<p>Australië bereikt de oude, verrijkte mantel. De kiel duwt dat gesteente <b>omhoog</b>. Omdat de druk daar lager is en er water in zit, <b>smelt</b> het. Het magma stijgt op langs de grote breuk en vormt vulkanen en ertsen met <b>koper en goud</b> (Grasberg).</p><p>Dit lijkt op vulkanisme bij subductie, maar er is hier helemaal geen subductie! Conclusie van Utrechtse onderzoekers (2020): de mantel beweegt veel langzamer dan de platen.</p>',
     boven:'<p>Vanaf ±9–6 Ma beweegt Nieuw-Guinea boven de oude Arafura-mantelwig. De kiel ‘schept’ het verrijkte materiaal omhoog → decompressie → smelt met subductie-signatuur. De transforme breuk biedt een trans-lithosferisch pad: Grasberg-Ertsberg en Ok Tedi (Cu-Au, <7 Ma).</p><p><b>Nieuw-Guinea-recept</b>: (i) een continentale lithosfeerrand die (ii) door absolute plaatbeweging (iii) door een oude verrijkte mantelwig ploegt, met (iv) een actieve breuk als opstijgweg. Het recept werkt ook voor Fiji, Californië en Colombia. Implicatie: de bovenmantel convecteert veel langzamer dan de platen bewegen (Van Hinsbergen e.a., 2020).</p>'}];
  sc.effects={onder:[['eq','Ondiepe aardbevingen langs de grote breuk.'],['volc','Vulkanen zonder subductie: “post-subductie”-magma.'],['ore','Enorme koper- en goudertsen (Grasberg, een van de grootste goudmijnen).']],
    boven:[['eq','Ondiepe bevingen langs de transforme plaatgrens; Benioffzone alleen tijdens fase 2.'],['volc','Calc-alkalien tot ultrakalium magma (<7 Ma) met subductie-signatuur.'],['ore','Porfier Cu-Au: Grasberg-Ertsberg, Ok Tedi.']]};
  sc.notes=['Doorsnede van 3600 km breed en 920 km diep, alles in het referentiekader van de mantel: de mantel ligt stil, de plaat beweegt.','De stippen zijn symbolische ‘mantelbrokjes’: groen = verrijkt, grijs = gewone mantel, rood = smelt. Grijze brokjes die lang voor de kiel uit worden geduwd, wijken zijwaarts uit (buiten de doorsnede).','Gebaseerd op figuur 2 van Van Hinsbergen e.a. (2020); afstanden en tijden afgerond.'];
})();

const INSB={onder:'Onder Nieuw-Guinea zit mantelgesteente dat lang geleden is veranderd door een duikende plaat. Die plek is al miljoenen jaren niet verschoven: Australië schoof eroverheen. De mantel beweegt dus veel langzamer dan de platen erboven.',boven:'Mantel die ±25 Ma geleden door subductie verrijkt werd, ligt nog op dezelfde plek. Nieuw-Guinea ploegde er later overheen en leverde subductie-achtig magma zonder subductie. De bovenmantel convecteert dus veel langzamer dan de platen bewegen (Van Hinsbergen e.a., 2020).'};
const ORDER=['rug','slenk','sub','boog','botsing','transform','hotspot','ng'];
const INSIGHTS={
  onder:['Platen worden vooral <b>getrokken</b> door zware, zinkende platen (slab pull, ±90%) en een beetje <b>geduwd</b> vanaf de rug (±10%).','Bewegingen in de mantel zijn vooral een <b>gevolg</b> van bewegende platen, geen oorzaak. Het oude plaatje met draaiende ‘convectiecellen’ klopt niet.','De mantel onder de platen ligt <b>bijna stil</b>; de platen schuiven eroverheen. Daarom zie je in de doorsnede stipjes die blijven liggen.','Oude, gezonken platen liggen nog diep in de mantel. Met aardbevingsgolven kunnen we ze ‘zien’.'],
  boven:['<b>Slab pull</b> (±90%) en <b>ridge push</b> (±10%) zijn de belangrijkste drijvende krachten (Lithgow-Bertelloni 2014). Hoe de trekkracht precies wordt doorgegeven (via trog-topografie, drukgradiënten in de mantel of ‘slab suction’) is in 2025–2026 nog onderwerp van debat.','Mantelconvectie is grotendeels <b>passief</b>: een gevolg van zinkende slabs en uiteenwijkende platen, in steeds wisselende patronen.','De bovenmantel beweegt veel langzamer dan de platen (Van Hinsbergen e.a. 2020): lithosfeer en onderliggende mantel kunnen een heel andere geschiedenis hebben. Zie het Nieuw-Guinea-recept.','Plaatbewegingen moet je ook <b>absoluut</b> bekijken (t.o.v. de mantel), niet alleen relatief tussen platen. Slabs in de mantel (‘Atlas of the Underworld’) zijn daarbij een ijkpunt.']};

// ================= toestand & UI =================
const state={sc:'sub',t:0,playing:false,speed:1,level:'onder',view:'overzicht',depth:720,dim:'3d',relief:'auto',ve:1,mode:'cyclus',pan:{x:0,z:0},tog:{eq:false,volc:false,forces:true,markers:true,labels:false}};
let cur=SC[state.sc];
const cv=$('#cv'),cv2d=cv.getContext('2d');let ctx=cv2d;const glc=$('#gl'),lab=$('#lab'),labctx=lab.getContext('2d');const tcv=$('#topo'),tctx=tcv.getContext('2d'),wrap=$('#wrap'),tip=$('#tip');
const off=document.createElement('canvas'),octx=off.getContext('2d');
let W=800,H=400,DPR=1,TOPOH=72,vp=null,img=null,rasterKey='',topoKey='';
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

const viewOf=d=>d>=350?'overzicht':d>=105?'lithosfeer':'korst';
const DMIN=20;
function depthSpan(){const d=state.depth;return{d,span:Math.min(cur.width,Math.max(110,d*2.25)),zTop0:-(8+d*0.01)}}
function focusNow(){const t=state.t,d=state.depth,fO=cur.focus('overzicht',t),fL=cur.focus('lithosfeer',t),fK=cur.focus('korst',t);
  const l=Math.log(d),a=Math.log(62),b=Math.log(230),c=Math.log(Math.max(cur.zBot,300));
  if(l<=a)return fK;if(l<=b)return lerp(fK,fL,sstep(a,b,l));if(l<=c)return lerp(fL,fO,sstep(b,c,l));return fO}
function reliefNow(){if(state.relief!=='auto')return +state.relief;const d=state.depth;return d>=350?10:d>=150?4:1}
function setupCanvas(){
  W=wrap.clientWidth;const narrow=W<640;let aspect;
  if(state.dim==='3d'&&three){setup3D();return}
  const {d,span,zTop0}=depthSpan();
  if(cur.map)aspect=narrow?0.85:0.52;
  else aspect=clamp((d-zTop0)/span,narrow?0.55:0.27,0.9);
  H=Math.round(W*aspect);DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cv.style.height=H+'px';
  tcv.width=Math.round(W*DPR);tcv.height=Math.round(TOPOH*DPR);tcv.style.height=TOPOH+'px';
  rasterKey='';topoKey=''}
function computeVP(){
  const {d,zTop0}=depthSpan();const zTop=zTop0+state.pan.z;
  const kpx=(d-zTop0)/H;const widthKm=kpx*W;
  const cx=focusNow()+state.pan.x;
  const cellPx=Math.max(1.5,W/640)*(state.playing?1.35:1);
  const cw=Math.ceil(W/cellPx),ch=Math.ceil(H/cellPx);
  const x0=cx-widthKm/2;
  const ckz=kpx*cellPx/state.ve;
  return{x0,zTop,mTop:zTop,R:1,kpx,ve:state.ve,cellPx,cw,ch,ckx:kpx*cellPx,ckz,zAt:j=>zTop+(j+0.5)*ckz,key:[x0.toFixed(2),zTop.toFixed(2),kpx.toFixed(5),state.ve,cw,ch].join('|')}}

// rastertekening
function raster(){
  const p=vp;if(off.width!==p.cw||off.height!==p.ch){off.width=p.cw;off.height=p.ch;img=null}
  if(!img)img=octx.createImageData(p.cw,p.ch);const dat=img.data;
  if(cur.prepare)cur.prepare(state.t,p);
  const lod=p.ckx,t=state.t;DLOD=Math.max(0.25,p.ckx);
  const d3=state.dim==='3d'&&three;const CNT=new Uint32Array(64);
  for(let j=0;j<p.ch;j++){const z=p.zAt(j);
    for(let i=0;i<p.cw;i++){const x=p.x0+(i+0.5)*p.ckx;const k=j*p.cw+i;const id=cur.sample(x,z,t,Math.max(lod,p.ckz),k);
      const c=(id===ID.PMELT&&hash2(i*3+1,j*7+5)<0.42)?PAL[ID.ASTH]:(PAL[id]||[255,0,255]);let r=c[0],g=c[1],b=c[2];
      if(id===ID.AIR){const f=clamp(-z/14,0,1);r=lerp(232,196,f);g=lerp(240,222,f);b=lerp(246,240,f)}
      else if(id===ID.WATER){const f=clamp(z/11,0,1);r=lerp(110,40,f);g=lerp(168,92,f);b=lerp(214,160,f)}
      else{if(id===ID.ASTH||id===ID.TZ||id===ID.LM){const f=clamp(z/900,0,1)*0.16;r*=1-f;g*=1-f*1.25;b*=1-f*1.3}
        const nz=(hash2(Math.floor(x/Math.max(lod,0.25)),Math.floor(z/Math.max(p.ckz,0.25)))-0.5)*12;r+=nz;g+=nz;b+=nz}
      CNT[id]++;const o=k*4;dat[o]=r;dat[o+1]=g;dat[o+2]=b;dat[o+3]=d3?(id===ID.AIR?0:id===ID.WATER?150:255):255}}
  octx.putImageData(img,0,0);
  const thr=Math.max(6,p.cw*p.ch*0.0004);const ids=[];for(let i=1;i<64;i++)if(CNT[i]>=thr)ids.push(i);
  const k=ids.join(',');if(k!==legKey){legKey=k;legIds=ids;updLegend()}}
let legKey='',legIds=[];

// hoogteprofiel
let surfId=0;
function surfaceAt(x){const t=state.t;let zPrev=-13;for(let z=-13;z<=15;z+=0.5){const id=cur.sample(x,z,t,0.6,-1);if(isRock(id)){let lo=zPrev,hi=z;for(let i=0;i<5;i++){const m=(lo+hi)/2;if(isRock(cur.sample(x,m,t,0.6,-1)))hi=m;else lo=m}surfId=cur.sample(x,hi+0.25,t,0.6,-1);return -hi}zPrev=z}surfId=0;return -15}
let topoEx=1;
function drawTopo(){
  const p=vp;if(cur.map){tcv.hidden=true;return}
  const step=3;const pts=[];let mn=99,mx0=-99;for(let sx=0;sx<=W+step;sx+=step){const e=surfaceAt(p.x0+sx*p.kpx);pts.push([sx,e]);mn=Math.min(mn,e);mx0=Math.max(mx0,e)}
  let lo=Math.min(mn,0)-0.6,hi=Math.max(mx0,0)+0.8;if(mx0<-1.8){lo=mn-0.5;hi=mx0+0.9}const minS=mx0<-1.8?2.6:6;if(hi-lo<minS){const c=(hi+lo)/2;lo=c-minS/2;hi=c+minS/2}
  topoEx=(TOPOH-24)/(hi-lo)*p.kpx;const show=topoEx>1.4;tcv.hidden=!show;if(!show)return;
  const g=tctx;g.setTransform(DPR,0,0,DPR,0,0);g.clearRect(0,0,W,TOPOH);
  g.fillStyle='#eef3f6';g.fillRect(0,0,W,TOPOH);
  const yOf=e=>20+(hi-e)*(TOPOH-24)/(hi-lo);const y0=yOf(0);
  g.fillStyle='#7fb2dc';g.beginPath();g.moveTo(0,y0);for(const[sx,e]of pts)g.lineTo(sx,Math.max(y0,yOf(e)));g.lineTo(W,y0);g.closePath();
  {const yS=Math.max(0,y0);g.fillStyle='#79acd6';g.beginPath();g.moveTo(0,yS);for(const[sx,e]of pts)g.lineTo(sx,Math.max(yS,yOf(Math.min(0,e))));g.lineTo(W,yS);g.fill()}
  g.fillStyle='#b79574';g.beginPath();g.moveTo(0,TOPOH);for(const[sx,e]of pts)g.lineTo(sx,yOf(e));g.lineTo(W,TOPOH);g.closePath();g.fill();
  g.strokeStyle='#5a4532';g.lineWidth=1.2;g.beginPath();pts.forEach(([sx,e],i)=>i?g.lineTo(sx,yOf(e)):g.moveTo(sx,yOf(e)));g.stroke();
  if(y0>0){g.strokeStyle='rgba(30,60,90,.6)';g.setLineDash([4,3]);g.beginPath();g.moveTo(0,y0);g.lineTo(W,y0);g.stroke();g.setLineDash([])}
  const mx=mx0;
  g.font='600 11px system-ui, sans-serif';g.fillStyle='#1d2a2c';
  const txt=`Hoogteprofiel · ${Math.round(topoEx)}× overdreven in de hoogte`;pill(g,txt,8,4,'left','#ffffffd9');
  if(y0>14&&y0<TOPOH)pill(g,`zeeniveau`,W-8,y0-9,'right','#ffffffb3');else pill(g,`zeeniveau ligt hoger (alles onder water)`,W-8,TOPOH-21,'right','#ffffffb3');
  if(mx>0.3)pill(g,`hoogste punt ±${fmt(mx,1)} km`,W-8,4,'right','#ffffffd9');
  g.strokeStyle='rgba(0,0,0,.18)';g.beginPath();g.moveTo(0,TOPOH-0.5);g.lineTo(W,TOPOH-0.5);g.stroke();
  if(Math.round(topoEx)!==lastEx){lastEx=Math.round(topoEx);updScale()}}
let lastEx=-1;
function pill(g,txt,x,y,align,bg){const w=g.measureText(txt).width+12;const X=align==='right'?x-w:align==='center'?x-w/2:x;g.fillStyle=bg;rr(g,X,y,w,17,8);g.fill();g.fillStyle='#1d2a2c';g.textBaseline='middle';g.fillText(txt,X+6,y+9)}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}

// ================= overlay-gereedschap =================
let placed=[];
const mOf=(z,R)=>z<0?z*R:z;
function makeO(){const p=vp;return{ctx,W,H,kpx:p.kpx,ve:p.ve,
  sx:x=>(x-p.x0)/p.kpx,sy:z=>(mOf(z,p.R)-p.mTop)*p.ve/p.kpx,wx:sx=>p.x0+sx*p.kpx,wz:sy=>{const m=p.mTop+sy*p.kpx/p.ve;return m<0?m/p.R:m},
  poly(pts,color,w,dash){if(!pts||pts.length<2)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=w;if(dash)ctx.setLineDash(dash);ctx.lineJoin='round';ctx.beginPath();pts.forEach((q,i)=>{const X=this.sx(q[0]),Y=this.sy(q[1]);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)});ctx.stroke();ctx.restore()},
  ghostLine(x,z1,x2,z2,txt){if(state.level!=='boven'&&!state.tog.labels)return;const X=this.sx(x);if(X<0||X>W)return;ctx.save();ctx.strokeStyle='rgba(30,40,40,.45)';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(X,0);ctx.lineTo(X,this.sy(z2));ctx.stroke();ctx.restore();
    if(state.tog.labels){ctx.font='600 11px system-ui, sans-serif';pill(ctx,txt,X+4,this.sy(z2)-4,'left','#ffffffb3')}}}}
let LABELS=null;
function label(O,txt,x,z,opt={}){
  if(!state.tog.labels&&!opt.force)return;
  if(Array.isArray(txt))txt=state.level==='onder'?txt[0]:txt[1];if(!txt)return;
  if(LABELS){LABELS.push({txt,x,z,opt});return}
  drawLabel(O.ctx,O.W,O.H,txt,O.sx(x),O.sy(z),opt,cur.map?4:70)}
function drawLabel(g,LW,LH,txt,ax,ay,opt,lmin){
  if(ax<-80||ax>LW+80||ay<-60||ay>LH+60)return;
  const O={W:LW,H:LH};
  const sm=LW<640;g.font=sm?'600 10.5px system-ui, sans-serif':'600 12px system-ui, sans-serif';const tw=g.measureText(txt).width;const w=tw+(sm?12:16),h=sm?18:21;
  let lx=ax+(opt.dx||0)-w/2,ly=ay+(opt.dy||0)-h/2;
  lx=clamp(lx,lmin,O.W-w-4);ly=clamp(ly,4,O.H-h-4);
  for(let tries=0;tries<7;tries++){let hit=false;for(const r of placed){if(lx<r[0]+r[2]+4&&lx+w+4>r[0]&&ly<r[1]+r[3]+3&&ly+h+3>r[1]){hit=true;break}}if(!hit)break;ly+=((opt.dy||0)<0?-1:1)*(h+4);ly=clamp(ly,4,O.H-h-4)}
  placed.push([lx,ly,w,h]);
  const anchor=!opt.noAnchor&&(opt.dx||opt.dy);
  if(anchor&&ax>=0&&ax<=O.W&&ay>=0&&ay<=O.H){g.strokeStyle='rgba(20,28,30,.7)';g.lineWidth=1.2;g.beginPath();g.moveTo(ax,ay);g.lineTo(clamp(ax,lx,lx+w),clamp(ay,ly,ly+h));g.stroke();g.fillStyle='#1b2729';g.beginPath();g.arc(ax,ay,2.6,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=1;g.stroke()}
  const tones={warm:['#fff3ee','#9a2f10'],blue:['#eef7fb','#174e7a'],gold:['#fff8e3','#7a5a06']};const tn=tones[opt.tone]||['rgba(255,255,255,.92)','#1b2729'];
  g.fillStyle=tn[0];rr(g,lx,ly,w,h,10.5);g.fill();g.strokeStyle='rgba(0,0,0,.18)';g.lineWidth=1;g.stroke();
  g.fillStyle=tn[1];g.textBaseline='middle';g.fillText(txt,lx+(sm?6:8),ly+h/2+0.5)}
function arrow(O,x1,z1,x2,z2,opt={}){
  const g=O.ctx;let X1=O.sx(x1),Y1=O.sy(z1),X2=O.sx(x2),Y2=O.sy(z2);const L=Math.hypot(X2-X1,Y2-Y1);
  if(opt.screenMin&&L<opt.screenMin){const f=opt.screenMin/Math.max(L,0.01);X2=X1+(X2-X1)*f;Y2=Y1+(Y2-Y1)*f}
  if(Math.max(X1,X2)<-20||Math.min(X1,X2)>O.W+20||Math.max(Y1,Y2)<-20||Math.min(Y1,Y2)>O.H+20)return;
  const a=Math.atan2(Y2-Y1,X2-X1),w=opt.w||4,hl=Math.max(10,w*2.2);
  g.save();g.translate(X1,Y1);g.rotate(a);const len=Math.hypot(X2-X1,Y2-Y1);
  g.fillStyle=opt.color||'#1e6b72';g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.5;
  g.beginPath();g.moveTo(0,-w/2);g.lineTo(len-hl,-w/2);g.lineTo(len-hl,-w/2-hl*0.45);g.lineTo(len,0);g.lineTo(len-hl,w/2+hl*0.45);g.lineTo(len-hl,w/2);g.lineTo(0,w/2);g.closePath();g.stroke();g.fill();g.restore();
  if(opt.label){const mx=(x1+x2)/2,mz=(z1+z2)/2;label(O,opt.label,mx,mz,{force:true,dx:opt.ldx||0,dy:opt.below?(w/2+16):-(w/2+16),tone:opt.color==='#b8481f'||opt.color==='#7a2b10'?'warm':undefined})}}
function motionArrow(O,x,z,dir,opt={}){const len=opt.len||80;const X=O.sx(x),Y=O.sy(z);const x2=x+dir*len*O.kpx;arrow(O,x,z,x2,z,opt)}
function vx(O,f){return O.wx(O.W*f)}
function plateTick(O,x,z,txt){const X=O.sx(x),Y=O.sy(z);if(X<-10||X>O.W+10||Y<-10||Y>O.H+10)return;const g=O.ctx;g.fillStyle='#fff';g.strokeStyle='#1b2729';g.lineWidth=1.2;g.beginPath();g.moveTo(X,Y-1);g.lineTo(X-5,Y-10);g.lineTo(X+5,Y-10);g.closePath();g.fill();g.stroke();
  if(txt&&state.tog.labels&&state.level==='boven'){g.font='600 10px system-ui, sans-serif';g.fillStyle='#1b2729';g.textAlign='center';g.fillText(txt,X,Y-15);g.textAlign='left'}}
function drawStar(g,x,y,r,col){g.save();g.fillStyle=col;g.strokeStyle='#5a3e00';g.lineWidth=0.8;g.beginPath();for(let i=0;i<10;i++){const a=-PI/2+i*PI/5,rr2=i%2?r*0.45:r;g.lineTo(x+rr2*Math.cos(a),y+rr2*Math.sin(a))}g.closePath();g.fill();g.stroke();g.restore()}

// as, schaalstok, mantelmerkers
function drawAxes(O){
  const g=O.ctx;const p=vp;const step=depthStep();
  g.font='600 10.5px system-ui, sans-serif';g.textBaseline='middle';
  for(let z=0;z<3000;z+=step){const Y=O.sy(z);if(Y<8)continue;if(Y>O.H-6)break;g.strokeStyle='rgba(20,30,30,.55)';g.lineWidth=1;g.beginPath();g.moveTo(0,Y);g.lineTo(7,Y);g.stroke();
    g.fillStyle='rgba(255,255,255,.82)';const t=`${z} km`;const w=g.measureText(t).width+8;rr(g,9,Y-8,w,16,7);g.fill();g.fillStyle='#1b2729';g.fillText(t,13,Y+0.5)}
  for(const zz of[410,660]){const Y=O.sy(zz);if(Y<0||Y>O.H)continue;g.save();g.strokeStyle='rgba(60,30,20,.35)';g.setLineDash([8,6]);g.beginPath();g.moveTo(0,Y);g.lineTo(O.W,Y);g.stroke();g.restore()}
  // schaalstok
  const nice=[1,2,5,10,20,25,50,100,200,250,500,1000];let L=nice[0];for(const n of nice){if(n/p.kpx<=W*0.16)L=n}
  const Lpx=L/p.kpx,X=W-Lpx-16,Y=O.H-16;g.fillStyle='rgba(255,255,255,.88)';rr(g,X-8,Y-14,Lpx+16,24,9);g.fill();
  g.fillStyle='#1b2729';g.fillRect(X,Y+2,Lpx,4);g.fillStyle='#fff';g.fillRect(X+Lpx/2,Y+3,Lpx/2,2);g.fillStyle='#1b2729';g.textAlign='center';g.fillText(`${L} km`,X+Lpx/2,Y-5);g.textAlign='left';
}
function drawMarkers(O){
  if(!state.tog.markers||cur.noMarkers)return;const p=vp;const sp=state.view==='overzicht'?(cur.width>2000?140:80):state.view==='lithosfeer'?28:9;const g=O.ctx;
  const i0=Math.floor(p.x0/sp)-1,i1=Math.ceil((p.x0+W*p.kpx)/sp)+1;const zEnd=O.wz(H);
  for(let i=i0;i<=i1;i++)for(let j=Math.max(1,Math.floor(Math.max(0,p.zTop)/sp));j*sp<zEnd+sp;j++){
    const x=i*sp+(hash2(i,j)-0.5)*sp*0.5,z=j*sp+(hash2(j,i)-0.5)*sp*0.5;const id=cur.sample(x,z,state.t,1,-1);if(!(id===ID.ASTH||id===ID.TZ||id===ID.LM))continue;
    const X=O.sx(x),Y=O.sy(z);if(X<0||X>W||Y<0||Y>H)continue;g.fillStyle='rgba(70,40,25,.55)';g.beginPath();g.arc(X,Y,2.3,0,7);g.fill()}}

// aardbevingen, vulkanen, vloeistoffen
const QS=[];let qAcc=0;const rngQ=mulberry32(99);const PUFF=[];const FL=[];let puffAcc=0,flAcc=0;
const qColor=z=>z<70?'#d7301f':z<300?'#f39c12':'#2c7fb8';
function updEvents(dt){
  if(state.tog.eq&&cur.quake&&!cur.map){qAcc+=dt*cur.quakeRate*1.4;while(qAcc>1){qAcc--;const q=cur.quake(rngQ,state.t);if(q)QS.push({...q,age:0})}}
  for(const q of QS)q.age+=dt;while(QS.length&&QS[0].age>3.2)QS.shift();
  if(state.tog.volc&&cur.vents&&!cur.map){puffAcc+=dt*14;while(puffAcc>1){puffAcc--;for(const v of cur.vents(state.t))PUFF.push({x:v.x,z:v.z,sub:v.sub,age:0,dx:(rngQ()-0.5)*14,r:rngQ()})}}
  for(const p of PUFF)p.age+=dt;while(PUFF.length&&PUFF[0].age>2.6)PUFF.shift();
  if(state.tog.volc&&cur.fluids&&!cur.map){flAcc+=dt*10;while(flAcc>1){flAcc--;const f=cur.fluids(rngQ,state.t);if(f)FL.push({...f,age:0})}}
  for(const f of FL)f.age+=dt;while(FL.length&&FL[0].age>2.2)FL.shift()}
function drawEvents(O){
  const g=O.ctx;
  if(state.tog.volc){for(const f of FL){const X=O.sx(f.x),Y=O.sy(f.z)-f.age*16;if(X<0||X>W||Y<0||Y>H)continue;g.globalAlpha=1-f.age/2.2;g.fillStyle='#2b7bd0';g.beginPath();g.arc(X,Y,2,0,7);g.fill()}
    g.globalAlpha=1;
    for(const p of PUFF){const X=O.sx(p.x),Y=O.sy(p.z);if(X<-30||X>W+30||Y<-30||Y>H+30)continue;
      if(p.sub){g.globalAlpha=Math.max(0,0.7-p.age/2.6);g.fillStyle='#ff6a3d';g.beginPath();g.arc(X+p.dx*0.3,Y-2-p.age*4,3+p.age*2,0,7);g.fill()}
      else{const a=p.age;g.globalAlpha=Math.max(0,0.65-a/2.6*0.65);g.fillStyle=a<0.25?'#ff5a1f':'#6d6763';g.beginPath();g.arc(X+p.dx*a,Y-6-a*26,3+a*5,0,7);g.fill()}}
    g.globalAlpha=1}
  if(state.tog.eq){for(const q of QS){const X=O.sx(q.x),Y=O.sy(q.z);if(X<-10||X>W+10||Y<-10||Y>H+10)continue;const r=1.8+Math.max(0,q.m-2.5)*1.9;const a=1-q.age/3.2;
    g.globalAlpha=a;g.fillStyle=qColor(q.z);g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=0.8;g.beginPath();g.arc(X,Y,r,0,7);g.fill();g.stroke();
    if(q.age<0.6){g.globalAlpha=(0.6-q.age)/0.6;g.strokeStyle=qColor(q.z);g.lineWidth=2;g.beginPath();g.arc(X,Y,r+q.age*28,0,7);g.stroke()}}g.globalAlpha=1}}

// ================= transforme breuk: kaartweergave =================
function drawTransform(){
  const g=ctx;g.setTransform(DPR,0,0,DPR,0,0);const geo=state.mode==='geo';const t=state.t;
  const KM=geo?600:100,kpx=KM/W,cy=H*0.47;const toX=x=>x/kpx,toY=y=>cy-y/kpx;
  const Vm=0.035;// m/jaar
  const E=geo?1:1500;
  const QT=SC.transform.quakeTimes;let last=0,S=0;for(let i=1;i<QT.length;i++){if(QT[i]<=t){S+=Vm*(QT[i]-QT[i-1]);last=QT[i]}}
  const tau=t-last;const Dlock=15;
  const tGeoMa=t/90;
  const disp=y=>geo?(Math.sign(y)*35*tGeoMa/2):((Math.sign(y)*S/2+(Vm*tau/PI)*Math.atan(y/Dlock))*E/1000);
  g.fillStyle='#e9e2cf';g.fillRect(0,0,W,cy);g.fillStyle='#dfe6cf';g.fillRect(0,cy,W,H-cy);
  // raster van perceelgrenzen
  g.strokeStyle='rgba(90,80,60,.13)';g.lineWidth=1;for(let y=-KM;y<=KM;y+=KM/12){g.beginPath();g.moveTo(0,toY(y));g.lineTo(W,toY(y));g.stroke()}
  function warpLine(x0,col,w,dash,amp){g.save();g.strokeStyle=col;g.lineWidth=w;if(dash)g.setLineDash(dash);g.beginPath();let first=true;const yMax=KM*H/W;
    for(let sy=0;sy<=H;sy+=2){const y=(cy-sy)*kpx;const xx=x0+(amp?amp(y):0)+disp(y);const X=toX(xx);if(first){g.moveTo(X,sy);first=false}else if(Math.abs(y)<kpx*1.2){g.lineTo(X,sy)}else g.lineTo(X,sy)}g.stroke();g.restore()}
  if(geo){// graniet-lichaam doorgesneden
    for(const side of[1,-1]){g.save();g.beginPath();if(side>0)g.rect(0,0,W,cy);else g.rect(0,cy,W,H-cy);g.clip();const xc=300+disp(side*1);g.fillStyle='#c98e6e';g.strokeStyle='#7a4a33';g.lineWidth=1.5;g.beginPath();g.ellipse(toX(xc),cy,40/kpx,28/kpx,0,0,7);g.fill();g.stroke();g.restore()}
    label(OT,['Eén stuk graniet, nu in tweeën','Eén gesteentelichaam, nu in tweeën (vgl. Pinnacles–Neenach, ±315 km)'],300+disp(1),15,{dy:-60});
  }
  for(const xf of geo?[120,240,480]:[20,45,80])warpLine(xf,'rgba(110,90,60,.8)',1.4,[5,3]);
  warpLine(geo?360:60,'#4a4a4a',5,null);warpLine(geo?360:60,'#f7d64a',1.2,[8,8]);
  warpLine(geo?150:30,'#2f78c4',3,null,y=>(geo?12:2.5)*Math.sin(y/(geo?40:6)));
  // breuk
  g.strokeStyle='#c0281b';g.lineWidth=3;g.beginPath();g.moveTo(0,cy);g.lineTo(W,cy);g.stroke();
  // pijlen relatieve beweging
  const OT2=OT;arrow(OT2,KM*0.08,KM*0.32*H/W,KM*0.22,KM*0.32*H/W,{w:6,color:'#1e6b72',label:['Noord-Amerikaanse plaat','Noord-Amerikaanse plaat']});
  arrow(OT2,KM*0.92,-KM*0.32*H/W,KM*0.78,-KM*0.32*H/W,{w:6,color:'#1e6b72',label:['Pacifische plaat','Pacifische plaat']});
  label(OT,['Breuk (San Andreas)','San Andreasbreuk (dextraal)'],KM*0.5,0,{dy:-26,dx:-120,tone:'warm'});
  label(OT,['Weg','Weg'],(geo?360:60)+disp(KM*0.3*H/W),KM*0.3*H/W,{dx:40});
  label(OT,['Rivier','Rivier (verzet bij elke beving)'],(geo?150:30)+disp(-KM*0.25*H/W),-KM*0.25*H/W,{dx:-50});
  label(OT,['Hekken','Hekken'],(geo?240:45)+disp(KM*0.36*H/W),KM*0.36*H/W,{dx:30});
  // schaal
  const nice=geo?[50,100,200]:[10,20,25];let L=nice[0];for(const n of nice)if(n/kpx<W*0.2)L=n;const Lpx=L/kpx;g.fillStyle='rgba(255,255,255,.9)';rr(g,W-Lpx-24,H-38,Lpx+16,26,9);g.fill();g.fillStyle='#1b2729';g.fillRect(W-Lpx-16,H-20,Lpx,4);g.font='600 10.5px system-ui, sans-serif';g.textAlign='center';g.fillText(`${L} km`,W-Lpx/2-16,H-28);g.textAlign='left';

  // aardbeving
  if(!geo){let qi=-1;for(let i=1;i<QT.length;i++)if(t>=QT[i]&&t<QT[i]+14)qi=i;
    if(qi>0&&state.tog.eq){const age=(t-QT[qi])/14;g.save();g.translate((Math.random()-0.5)*8*(1-age),(Math.random()-0.5)*8*(1-age));g.restore();const X=W*0.5,Y=cy;for(let k=0;k<3;k++){g.strokeStyle=`rgba(215,48,31,${(1-age)*0.8})`;g.lineWidth=3;g.beginPath();g.arc(X,Y,20+age*240+k*30,0,7);g.stroke()}
      drawStar(g,X,Y,14,'#d7301f');label(OT,['AARDBEVING! De breuk schiet los','Aardbeving: ±5 m verschuiving in seconden'],KM*0.5,0,{dy:40,tone:'warm',force:true})}
    // spanningsgrafiek
    const gx=14,gy=H-70,gw=Math.min(260,W*0.4),gh=54;g.fillStyle='rgba(255,255,255,.9)';rr(g,gx-6,gy-20,gw+12,gh+28,10);g.fill();g.font='600 10.5px system-ui, sans-serif';g.fillStyle='#1b2729';g.fillText(state.level==='onder'?'Opgebouwde spanning in de breuk':'Opgebouwde elastische rek (zaagtand)',gx,gy-10);
    g.strokeStyle='#999';g.beginPath();g.moveTo(gx,gy+gh);g.lineTo(gx+gw,gy+gh);g.stroke();g.strokeStyle='#b8481f';g.lineWidth=2;g.beginPath();
    for(let k=0;k<=gw;k++){const tt=k/gw*900;if(tt>t)break;let l=0;for(let i=1;i<QT.length;i++)if(QT[i]<=tt)l=QT[i];const v=(tt-l)/170;const Y=gy+gh-v*gh;k?g.lineTo(gx+k,Y):g.moveTo(gx+k,Y)}g.stroke()}
  else{for(let i=0;i<3;i++){const X=Math.random()*W;g.fillStyle='rgba(215,48,31,.7)';g.beginPath();g.arc(X,cy+(Math.random()-0.5)*6,3+Math.random()*3,0,7);g.fill()}}
  // inzet: doorsnede
  const ix=W-176,iy=34,iw=160,ih=86;if(W>560&&state.dim!=='3d'){g.fillStyle='rgba(255,255,255,.93)';rr(g,ix-8,iy-22,iw+16,ih+30,10);g.fill();g.font='600 10.5px system-ui, sans-serif';g.fillStyle='#1b2729';g.textBaseline='alphabetic';g.fillText('Doorsnede dwars op de breuk',ix,iy-8);
    g.fillStyle=`rgb(${PAL[ID.CCU]})`;g.fillRect(ix,iy,iw,ih*0.32);g.fillStyle=`rgb(${PAL[ID.CCL]})`;g.fillRect(ix,iy+ih*0.32,iw,ih*0.28);g.fillStyle=`rgb(${PAL[ID.LITHC]})`;g.fillRect(ix,iy+ih*0.6,iw,ih*0.4);
    g.strokeStyle='#c0281b';g.lineWidth=2.5;g.beginPath();g.moveTo(ix+iw/2,iy);g.lineTo(ix+iw/2,iy+ih);g.stroke();
    g.fillStyle='#fff';g.strokeStyle='#1b2729';g.lineWidth=1.4;g.beginPath();g.arc(ix+iw/2-22,iy+16,8,0,7);g.fill();g.stroke();g.fillStyle='#1b2729';g.beginPath();g.arc(ix+iw/2-22,iy+16,2.2,0,7);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(ix+iw/2+22,iy+16,8,0,7);g.fill();g.stroke();g.beginPath();g.moveTo(ix+iw/2+17,iy+11);g.lineTo(ix+iw/2+27,iy+21);g.moveTo(ix+iw/2+27,iy+11);g.lineTo(ix+iw/2+17,iy+21);g.stroke();
    g.font='600 9.5px system-ui, sans-serif';g.fillStyle='#fff';g.fillText('naar je toe',ix+4,iy+ih*0.5);g.fillText('van je af',ix+iw/2+6,iy+ih*0.5);g.fillText('bevingen tot ±15–20 km',ix+4,iy+ih-6)}
  g.textBaseline='alphabetic'}
let OT=null;


// ================= 3D-blokdiagram =================
const three=(()=>{try{if(!window.THREE||!THREE.OrbitControls)return null;const c=document.createElement('canvas');return !!(c.getContext('webgl')||c.getContext('experimental-webgl'))}catch(e){return null}})();
const T3={ready:false};
const texC=document.createElement('canvas'),texCtx=texC.getContext('2d');
const sideLC=document.createElement('canvas'),sideRC=document.createElement('canvas'),sideBC=document.createElement('canvas');
let LW=800,LH=500,H3=500,last3D=0,key3D='',LAB3=[],vp3=null,camShake=0;
const NX=180,NY=44,YD=4.4;
function noise2(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);return lerp(lerp(a,b,u),lerp(c,d,u),v)*2-1}
function ridged(x,y){let s=0,a=0.6,f=1;for(let o=0;o<4;o++){s+=a*(1-Math.abs(noise2(x*f+o*17.3,y*f-o*9.1)));a*=0.5;f*=2.1}return s-0.55}
function init3D(){
  if(T3.ready||!three)return;
  const R=new THREE.WebGLRenderer({canvas:glc,antialias:true,alpha:true});R.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const cam=new THREE.PerspectiveCamera(32,1.6,0.1,300);
  const ctl=new THREE.OrbitControls(cam,glc);ctl.enableDamping=true;ctl.dampingFactor=0.09;ctl.minDistance=5;ctl.maxDistance=45;ctl.rotateSpeed=0.7;
  scene.add(new THREE.HemisphereLight(0xeef5fb,0x5a4636,0.85));
  const sun=new THREE.DirectionalLight(0xffffff,0.95);sun.position.set(-6,11,7);scene.add(sun);
  const mk=(cnv)=>{const t=new THREE.CanvasTexture(cnv);t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;t.anisotropy=4;return t};
  const texF=mk(texC),texL=mk(sideLC),texR=mk(sideRC),texO=mk(off);
  const faceMat=new THREE.MeshBasicMaterial({map:texF,transparent:true,alphaTest:0.04,side:THREE.DoubleSide});
  const backMat=new THREE.MeshBasicMaterial({map:texO,transparent:true,alphaTest:0.04,side:THREE.DoubleSide});
  const front=new THREE.Mesh(new THREE.PlaneGeometry(1,1),faceMat),back=new THREE.Mesh(new THREE.PlaneGeometry(1,1),backMat);
  const left=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texL,transparent:true,alphaTest:0.04,side:THREE.DoubleSide}));
  const right=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texR,transparent:true,alphaTest:0.04,side:THREE.DoubleSide}));
  const bottom=new THREE.Mesh(new THREE.PlaneGeometry(10,YD),new THREE.MeshBasicMaterial({color:0x8a4a30,side:THREE.DoubleSide}));bottom.rotation.x=-PI/2;
  scene.add(front,back,left,right,bottom);
  // terrein
  const nv=(NX+1)*(NY+1);const tg=new THREE.BufferGeometry();const pos=new Float32Array(nv*3),col=new Float32Array(nv*3);
  for(let i=0;i<=NX;i++)for(let j=0;j<=NY;j++){const k=i*(NY+1)+j;pos[k*3]=-5+i*10/NX;pos[k*3+2]=-j*YD/NY}
  const idx=[];for(let i=0;i<NX;i++)for(let j=0;j<NY;j++){const a=i*(NY+1)+j,b=(i+1)*(NY+1)+j,c=a+1,d=b+1;idx.push(a,c,b,b,c,d)}
  tg.setIndex(idx);tg.setAttribute('position',new THREE.BufferAttribute(pos,3));tg.setAttribute('color',new THREE.BufferAttribute(col,3));
  const terrain=new THREE.Mesh(tg,new THREE.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:0.92,metalness:0,side:THREE.DoubleSide}));scene.add(terrain);
  // water
  const wg=new THREE.PlaneGeometry(10,YD,70,30);wg.rotateX(-PI/2);wg.translate(0,0,-YD/2);
  wg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(wg.attributes.position.count*3),3));
  const water=new THREE.Mesh(wg,new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:0.7,roughness:0.12,metalness:0.15,side:THREE.DoubleSide,depthWrite:false}));water.renderOrder=2;scene.add(water);
  // kaart (transforme breuk)
  const mapTop=new THREE.Mesh(new THREE.PlaneGeometry(10,1),new THREE.MeshBasicMaterial({map:texF}));mapTop.rotation.x=-PI/2;scene.add(mapTop);
  // randen
  const edges=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x1b2729,transparent:true,opacity:0.55}));scene.add(edges);
  // deeltjes
  const NP=500;const pg=new THREE.BufferGeometry();const pp=new Float32Array(NP*3),pc=new Float32Array(NP*4),ps=new Float32Array(NP);
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('col',new THREE.BufferAttribute(pc,4));pg.setAttribute('size',new THREE.BufferAttribute(ps,1));
  const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    vertexShader:'attribute float size;attribute vec4 col;varying vec4 vC;void main(){vC=col;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*(420.0/-mv.z);gl_Position=projectionMatrix*mv;}',
    fragmentShader:'varying vec4 vC;void main(){vec2 p=gl_PointCoord-0.5;float d=length(p);if(d>0.5)discard;gl_FragColor=vec4(vC.rgb,vC.a*smoothstep(0.5,0.15,d));}'});
  const points=new THREE.Points(pg,pm);points.frustumCulled=false;points.renderOrder=3;scene.add(points);
  const parts=[];
  // ringen (aardbevingen)
  const rings=[];for(let i=0;i<12;i++){const m=new THREE.Mesh(new THREE.RingGeometry(0.86,1,48,1,0,PI),new THREE.MeshBasicMaterial({color:0xd7301f,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));m.rotation.x=-PI/2;m.visible=false;m.renderOrder=4;scene.add(m);rings.push({m,age:9})}
  Object.assign(T3,{ready:true,faceMat,backMat,texO,R,scene,cam,ctl,texF,texL,texR,front,back,left,right,bottom,terrain,tg,pos,col,water,wg,mapTop,edges,points,pg,pp,pc,ps,parts,rings,heights:new Float32Array(nv),Hb:4,vTop:0,vBot:-4,yCam:-2});
  resetCam();
  glc.addEventListener('pointermove',hover3D);glc.addEventListener('pointerleave',()=>{tip.hidden=true});
  glc.addEventListener('pointerdown',()=>{$('#hint3d').hidden=true});
}
function resetCam(){if(!T3.ready)return;const narrow=LW<640;const bx=cur.map?(T3.mapYd||5):10,bz=cur.map?10:YD;const diag=Math.hypot(bx,T3.Hb,bz);const r=diag*(cur.map?1.55:narrow?1.02:1.22)*Math.max(1,1.5/(LW/LH));const pol=rad(cur.map?58:narrow?60:64),az=rad(cur.map?24:narrow?-14:-24);
  const ty=(T3.vTop+T3.vBot)/2;T3.ctl.target.set(0,ty,-bz/2);T3.yCam=ty;
  T3.cam.position.set(r*Math.sin(pol)*Math.sin(az),ty+r*Math.cos(pol),-bz/2+r*Math.sin(pol)*Math.cos(az));T3.ctl.update()}
function setup3D(){
  init3D();const narrow=W<640;H3=Math.round(W*(narrow?0.9:0.68));LW=W;LH=H3;DPR=Math.min(2,window.devicePixelRatio||1);
  T3.R.setPixelRatio(DPR);T3.R.setSize(W,H3,false);glc.style.height=H3+'px';
  lab.width=Math.round(W*DPR);lab.height=Math.round(H3*DPR);lab.style.height=H3+'px';
  T3.cam.aspect=W/H3;T3.cam.updateProjectionMatrix();key3D='';rasterKey='';T3.needReset=true}
function computeVP3(){
  if(cur.prepare)cur.prepare(state.t,{cw:1,ch:1,x0:0,ckx:1,zAt:()=>0,key:'pre'+state.t});
  const {d,span}=depthSpan();const cx=focusNow();const x0=cx-span/2;const R=reliefNow();
  const e=new Float32Array(NX+1),ids=new Uint8Array(NX+1);let mx=0;
  for(let i=0;i<=NX;i++){const x=x0+(i/NX)*span;e[i]=surfaceAt(x);ids[i]=surfId;if(e[i]>mx)mx=e[i]}
  const pad=Math.max(1.2,0.025*d);const mTop=-(R*mx+pad);const ve=state.ve;
  const TW=W<640?768:1024;const kpx=span/TW;const TH=Math.min(2600,Math.round((d-mTop)*ve/kpx));
  const cellPx=state.playing?2:1.6;const cw=Math.ceil(TW/cellPx),ch=Math.ceil(TH/cellPx);const ckz=kpx*cellPx/ve;
  return{x0,span,zTop:mTop,mTop,R,kpx,ve,cellPx,cw,ch,ckx:kpx*cellPx,ckz,TW,TH,zBot:d,e,ids,mx,
    zAt:j=>{const m=mTop+(j+0.5)*ckz;return m<0?m/R:m},key:[x0.toFixed(2),span,mTop.toFixed(2),ve,cw,ch,R].join('|')}}
function landColor(ee,id,n){
  let c;
  if(ee<=0){const f=clamp(-ee/6,0,1);c=id===ID.VOLC?[lerp(0.42,0.2,f),lerp(0.44,0.24,f),lerp(0.42,0.28,f)]:[lerp(0.56,0.20,f),lerp(0.62,0.30,f),lerp(0.56,0.40,f)]}
  else if(id===ID.VOLC)c=ee>3.6?[0.9,0.9,0.92]:ee>2.4?[0.5,0.47,0.46]:[0.33,0.27,0.26];
  else if((id===ID.YOUNG||id===ID.YOUNGB)&&ee<0.6)c=[0.80,0.73,0.48];
  else if(ee<0.15)c=[0.84,0.78,0.56];
  else if(ee<1.2){const f=(ee-0.15)/1.05;c=[lerp(0.45,0.50,f),lerp(0.62,0.55,f),lerp(0.32,0.30,f)]}
  else if(ee<2.8){const f=(ee-1.2)/1.6;c=[lerp(0.50,0.52,f),lerp(0.55,0.44,f),lerp(0.30,0.36,f)]}
  else if(ee<5.3){const f=(ee-2.8)/2.5;c=[lerp(0.52,0.6,f),lerp(0.44,0.55,f),lerp(0.36,0.5,f)]}
  else if(ee<5.7){const f=(ee-5.3)/0.4;c=[lerp(0.6,0.95,f),lerp(0.55,0.96,f),lerp(0.5,0.98,f)]}
  else c=[0.95,0.96,0.98];
  const j=n*0.035;return[c[0]+j,c[1]+j,c[2]+j]}
function build3D(){
  const p=vp3,s=10/p.span,ve=p.ve,R=p.R;T3.s=s;
  const vTop=-p.mTop*ve*s,vBot=-p.zBot*ve*s,Hb=vTop-vBot;T3.vTop=vTop;T3.vBot=vBot;T3.Hb=Hb;
  const cy=(vTop+vBot)/2;
  T3.front.scale.set(10,Hb,1);T3.front.position.set(0,cy,0.002);
  T3.back.scale.set(10,Hb,1);T3.back.position.set(0,cy,-YD-0.002);
  T3.left.scale.set(YD,Hb,1);T3.left.rotation.y=-PI/2;T3.left.position.set(-5.002,cy,-YD/2);
  T3.right.scale.set(YD,Hb,1);T3.right.rotation.y=PI/2;T3.right.position.set(5.002,cy,-YD/2);
  T3.bottom.position.set(0,vBot,-YD/2);const bc=PAL[mantleId(p.zBot)];T3.bottom.material.color.setRGB(bc[0]/320,bc[1]/320,bc[2]/320);
  const V=e=>(e>0?e*R:e)*ve*s;
  const pos=T3.pos,col=T3.col,hs=T3.heights;let anyWater=false;
  for(let i=0;i<=NX;i++){let e=p.e[i];const id=p.ids[i];if(e<0)anyWater=true;
    let base=e;if(id===ID.VOLC){let a=i,b=i;while(a>0&&p.ids[a]===ID.VOLC)a--;while(b<NX&&p.ids[b]===ID.VOLC)b++;base=Math.min(p.e[a],p.e[b])}
    for(let j=0;j<=NY;j++){const k=i*(NY+1)+j,Z=-j*YD/NY;const tap=Math.pow(Math.sin(PI*j/NY),0.7);let ee=e,n=0;
      if(id===ID.VOLC){const vf=0.18+0.82*Math.pow(Math.abs(Math.cos(PI*Z/(YD/3))),2.2);ee=base+(e-base)*vf}
      else if(e>0.05){n=ridged((-5+i*10/NX)*1.5+state.sc.length,Z*1.5);ee=e*(1+0.45*n*tap*sstep(0.05,0.8,e))}
      const y=V(ee);pos[k*3+1]=y;hs[k]=y;const c=landColor(ee,id,noise2(i*0.7,j*0.7));col[k*3]=c[0];col[k*3+1]=c[1];col[k*3+2]=c[2]}}
  T3.tg.attributes.position.needsUpdate=true;T3.tg.attributes.color.needsUpdate=true;T3.tg.computeVertexNormals();T3.tg.computeBoundingSphere();
  T3.water.visible=anyWater;T3.terrain.visible=true;T3.mapTop.visible=false;T3.eProf=p.e;
  {const a=T3.wg.attributes.position,wc=T3.wg.attributes.color;for(let k=0;k<a.count;k++){const i=clamp(Math.round((a.getX(k)+5)/10*NX),0,NX);const dd=-p.e[i];
    const f=clamp((dd-2.0)/3.6,0,1),f0=clamp(dd/2,0,1);const c=dd<2?[lerp(0.62,0.44,f0),lerp(0.95,0.86,f0),lerp(0.9,0.88,f0)]:[lerp(0.44,0.06,f),lerp(0.86,0.25,f),lerp(0.88,0.58,f)];
    wc.setXYZ(k,c[0],c[1],c[2])}wc.needsUpdate=true}
  // randlijnen
  const eL=V(p.e[0]),eR=V(p.e[NX]);const L=[-5,vBot,0,-5,eL,0, 5,vBot,0,5,eR,0, -5,vBot,-YD,-5,eL,-YD, 5,vBot,-YD,5,eR,-YD, -5,vBot,0,5,vBot,0, -5,vBot,-YD,5,vBot,-YD, -5,vBot,0,-5,vBot,-YD, 5,vBot,0,5,vBot,-YD];
  T3.edges.geometry.setAttribute('position',new THREE.Float32BufferAttribute(L,3));
  if(Math.abs(T3.yCam-cy)>0.01){const dy=cy-T3.yCam;T3.ctl.target.y+=dy;T3.cam.position.y+=dy;T3.yCam=cy}
  if(T3.needReset){T3.needReset=false;resetCam()}
}
function sideTex(){T3.texO.needsUpdate=true;
  for(const [cnv,col] of [[sideLC,0],[sideRC,vp3.cw-1]]){cnv.width=4;cnv.height=vp3.ch;const g=cnv.getContext('2d');g.clearRect(0,0,4,vp3.ch);g.drawImage(off,col,0,1,vp3.ch,0,0,4,vp3.ch)}
  T3.texL.needsUpdate=true;T3.texR.needsUpdate=true}
function mapFaces3D(){ // transforme breuk: bovenkant = kaart (breuk loopt van voor naar achter), voorkant = doorsnede dwars op de breuk
  const KM=state.mode==='geo'?600:100,s=10/KM,dep=40*s,Yd=10*texC.height/texC.width;T3.s=s;T3.mapYd=Yd;
  T3.terrain.visible=false;T3.water.visible=false;T3.mapTop.visible=true;
  T3.mapTop.rotation.set(0,0,0);T3.mapTop.rotateY(PI/2);T3.mapTop.rotateX(-PI/2);T3.mapTop.scale.set(1,Yd,1);T3.mapTop.position.set(0,0.02,-5);
  T3.vTop=0;T3.vBot=-dep;T3.Hb=dep;
  const QT=SC.transform.quakeTimes,t=state.t;let qa=-1;if(state.mode!=='geo')for(let i=1;i<QT.length;i++)if(t>=QT[i]&&t<QT[i]+14)qa=(t-QT[i])/14;
  const lay=(g,w,h,fault,sym)=>{g.clearRect(0,0,w,h);const f=[[0,15,ID.CCU],[15,35,ID.CCL],[35,40,ID.LITHC]];for(const[a,b,id]of f){g.fillStyle=`rgb(${PAL[id]})`;g.fillRect(0,a/40*h,w,(b-a)/40*h)}
    if(!fault)return;const X=w*fault;g.strokeStyle='#c0281b';g.lineWidth=4;g.beginPath();g.moveTo(X,0);g.lineTo(X,h);g.stroke();
    if(sym){const s1=(x,cross)=>{g.fillStyle='#fff';g.strokeStyle='#1b2729';g.lineWidth=2.5;g.beginPath();g.arc(x,h*0.22,16,0,7);g.fill();g.stroke();
        if(cross){g.beginPath();g.moveTo(x-9,h*0.22-9);g.lineTo(x+9,h*0.22+9);g.moveTo(x+9,h*0.22-9);g.lineTo(x-9,h*0.22+9);g.stroke()}else{g.fillStyle='#1b2729';g.beginPath();g.arc(x,h*0.22,4.5,0,7);g.fill()}};
      s1(X-60,sym>0);s1(X+60,sym<0);
      g.fillStyle='rgba(255,255,255,.9)';g.font='600 15px system-ui, sans-serif';g.textAlign='center';g.fillText('vergrendeld tot ±15 km',X,h*0.405);g.textAlign='left';
      g.setLineDash([6,5]);g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=2;g.beginPath();g.moveTo(X-140,h*0.375);g.lineTo(X+140,h*0.375);g.stroke();g.setLineDash([]);
      if(qa>=0){for(let k=0;k<3;k++){g.strokeStyle=`rgba(255,220,80,${(1-qa)*0.9})`;g.lineWidth=4;g.beginPath();g.arc(X,h*0.25,10+qa*190+k*26,0,7);g.stroke()}drawStar(g,X,h*0.25,15,'#d7301f')}}};
  sideBC.width=512;sideBC.height=Math.round(512*dep/Yd);lay(sideBC.getContext('2d'),512,sideBC.height,0.5,1);
  sideLC.width=sideRC.width=512;sideLC.height=sideRC.height=Math.round(512*dep/10);lay(sideLC.getContext('2d'),512,sideLC.height,0);lay(sideRC.getContext('2d'),512,sideRC.height,0);
  T3.texL.needsUpdate=true;T3.texR.needsUpdate=true;
  if(!T3.texB){T3.texB=new THREE.CanvasTexture(sideBC);T3.texB.minFilter=THREE.LinearFilter;T3.mapFaceMat=new THREE.MeshBasicMaterial({map:T3.texB,side:THREE.DoubleSide})}else T3.texB.needsUpdate=true;
  T3.front.material=T3.back.material=T3.mapFaceMat;
  const cy=-dep/2;T3.front.scale.set(Yd,dep,1);T3.front.position.set(0,cy,0.002);T3.back.scale.set(Yd,dep,1);T3.back.position.set(0,cy,-10.002);
  T3.left.scale.set(10,dep,1);T3.left.rotation.y=-PI/2;T3.left.position.set(-Yd/2-0.002,cy,-5);T3.right.scale.set(10,dep,1);T3.right.rotation.y=PI/2;T3.right.position.set(Yd/2+0.002,cy,-5);
  T3.bottom.position.set(0,-dep,-5);T3.bottom.scale.set(Yd/10,10/YD,1);
  T3.edges.geometry.setAttribute('position',new THREE.Float32BufferAttribute([-Yd/2,-dep,0,-Yd/2,0,0,Yd/2,-dep,0,Yd/2,0,0,-Yd/2,-dep,-10,-Yd/2,0,-10,Yd/2,-dep,-10,Yd/2,0,-10],3));
  if(T3.needReset){T3.needReset=false;resetCam()}}
function restoreSectionMats(){if(T3.front.material!==T3.faceMat){T3.front.material=T3.faceMat;T3.back.material=T3.backMat;T3.bottom.scale.set(1,1,1);T3.mapTop.rotation.set(-PI/2,0,0)}}
function draw3D(dt){
  const now=performance.now();const sv={ctx,W,H,DPR};
  const due=!state.playing||now-last3D>(cur.map?40:70);
  if(due){last3D=now;try{
    ctx=texCtx;DPR=1;placed=[];LABELS=[];
    if(cur.map){texC.width=W<640?768:1024;texC.height=Math.round(texC.width*0.52);W=texC.width;H=texC.height;
      OT={ctx,W,H,kpx:1,sx:x=>x/((state.mode==='geo'?600:100)/W),sy:y=>H*0.47-y/((state.mode==='geo'?600:100)/W),wx:X=>X*((state.mode==='geo'?600:100)/W),wz:Y=>(H*0.47-Y)*((state.mode==='geo'?600:100)/W)};
      drawTransform();mapFaces3D();vp3=null}
    else{restoreSectionMats();
      const k=state.sc+'|'+state.t.toFixed(4)+'|'+state.depth+'|'+state.ve+'|'+reliefNow()+'|'+state.playing+'|'+W;
      if(k!==key3D||!vp3){vp3=computeVP3();vp=vp3;W=vp3.TW;H=vp3.TH;raster();key3D=k;build3D();sideTex()}
      vp=vp3;W=vp3.TW;H=vp3.TH;if(texC.width!==W||texC.height!==H){texC.width=W;texC.height=H}
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,vp.cw,vp.ch,0,0,W,H);
      const O=makeO();drawMarkers(O);drawEvents(O);cur.overlay(O,state.t);drawAxes(O)}
    LAB3=LABELS;T3.texF.needsUpdate=true}
    finally{LABELS=null;ctx=sv.ctx;W=sv.W;H=sv.H;DPR=sv.DPR}}
  step3D(dt);
  if(camShake>0.002){const o=new THREE.Vector3((Math.random()-0.5)*camShake,(Math.random()-0.5)*camShake,0);T3.cam.position.add(o);T3.ctl.update();T3.R.render(T3.scene,T3.cam);T3.cam.position.sub(o);camShake*=0.9}
  else{T3.ctl.update();T3.R.render(T3.scene,T3.cam)}
  drawLabels3D()}
function proj3(X,Y,Z){const v=new THREE.Vector3(X,Y,Z).project(T3.cam);if(v.z>1||v.z<-1)return null;return[(v.x+1)/2*LW,(1-v.y)/2*LH]}
function drawLabels3D(){
  const g=labctx;g.setTransform(DPR,0,0,DPR,0,0);g.clearRect(0,0,LW,LH);placed=[];
  const camBack=T3.cam.position.z<-(cur.map?10:YD)/2;
  for(const L of LAB3){let A;
    if(cur.map){const sx=OT.sx(L.x),sy=OT.sy(L.z),Yd=T3.mapYd;A=proj3(-Yd/2+sy/texC.height*Yd,0.05,-10*sx/texC.width)}
    else{const s=T3.s;A=proj3(-5+(L.x-vp3.x0)*s,-mOf(L.z,vp3.R)*vp3.ve*s,camBack?-YD:0)}
    if(!A)continue;drawLabel(g,LW,LH,L.txt,A[0],A[1],L.opt,4)}}
function heightAt(X,Z){const i=clamp(Math.round((X+5)/10*NX),0,NX),j=clamp(Math.round(-Z/YD*NY),0,NY);return T3.heights[i*(NY+1)+j]}
let pAcc=0;
function step3D(dt){
  const tt=performance.now()/1000;
  // golven
  if(T3.water.visible&&T3.eProf){const a=T3.wg.attributes.position,amp=0.01,E=T3.eProf;for(let k=0;k<a.count;k++){const x=a.getX(k),z=a.getZ(k);const i=clamp(Math.round((x+5)/10*NX),0,NX);
    a.setY(k,E[i]>0?-0.06:amp*(Math.sin(x*5+tt*1.6)+Math.sin(z*6.5-tt*1.3+x)))}a.needsUpdate=true;T3.wg.computeVertexNormals()}
  // deeltjes uitstoten
  const P=T3.parts;
  if(state.tog.volc&&!cur.map&&cur.vents&&vp3){pAcc+=dt*(state.playing?26:14);
    while(pAcc>1){pAcc--;for(const v of cur.vents(state.t)){const X=-5+(v.x-vp3.x0)*T3.s;if(X<-5||X>5)continue;
      const Zs=[-YD/3,-2*YD/3];const Z=Zs[Math.floor(Math.random()*2)];const top=heightAt(X,Z);
      if(v.sub||top<0){if(P.length<480)P.push({t:'b',x:X+(Math.random()-0.5)*0.06,y:top,z:Z+(Math.random()-0.5)*0.06,vx:0,vy:0.35+Math.random()*0.2,vz:0,age:0,life:(Math.max(0.05,-top))/0.4+0.2})}
      else{if(P.length<470){P.push({t:'a',x:X,y:top+0.03,z:Z,vx:(Math.random()-0.5)*0.12+0.08,vy:0.55+Math.random()*0.35,vz:(Math.random()-0.5)*0.12,age:0,life:3.2});
        if(Math.random()<0.5)P.push({t:'l',x:X,y:top+0.02,z:Z,vx:(Math.random()-0.5)*0.5,vy:0.7+Math.random()*0.6,vz:(Math.random()-0.5)*0.5,age:0,life:1.1})}}}}}
  for(let i=P.length-1;i>=0;i--){const q=P[i];q.age+=dt;if(q.age>q.life){P.splice(i,1);continue}
    if(q.t==='l')q.vy-=1.6*dt;else if(q.t==='a'){q.vy*=0.985;q.vx+=0.05*dt}
    q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt}
  const pp=T3.pp,pc=T3.pc,ps=T3.ps;let n=0;
  for(const q of P){const f=q.age/q.life;pp[n*3]=q.x;pp[n*3+1]=q.y;pp[n*3+2]=q.z;
    if(q.t==='a'){const g=f<0.12?[1,0.45,0.15]:[0.42,0.4,0.4];pc.set([g[0],g[1],g[2],0.75*(1-f)],n*4);ps[n]=0.12+f*0.55}
    else if(q.t==='l'){pc.set([1,0.55+0.3*(1-f),0.12,1-f],n*4);ps[n]=0.06}
    else{pc.set([0.85,0.95,1,0.8*(1-f)],n*4);ps[n]=0.04}
    n++;if(n>=500)break}
  T3.pg.setDrawRange(0,n);T3.pg.attributes.position.needsUpdate=true;T3.pg.attributes.col.needsUpdate=true;T3.pg.attributes.size.needsUpdate=true;
  // aardbevingsringen
  if(!cur.map&&vp3){for(const q of QS){if(q.r3||q.m<4.6||q.z>90)continue;q.r3=1;const X=-5+(q.x-vp3.x0)*T3.s;if(X<-5||X>5)continue;
    const r=T3.rings.find(r=>r.age>2)||T3.rings[0];r.age=0;r.big=q.m;r.m.position.set(X,Math.max(heightAt(X,-0.05),0)+0.03,0);r.m.material.color.set(qColor(q.z));if(q.m>=7&&state.playing)camShake=0.12}}
  for(const r of T3.rings){r.age+=dt;const on=r.age<2&&!cur.map;r.m.visible=on;if(on){const sc=0.1+r.age*(0.35+(r.big-4.5)*0.25);r.m.scale.set(sc,sc,sc);r.m.material.opacity=0.85*(1-r.age/2)}}
}
function hover3D(e){
  if(!T3.ready||cur.map||!vp3){tip.hidden=true;return}
  const r=glc.getBoundingClientRect();const X=e.clientX-r.left,Y=e.clientY-r.top;
  const ray=new THREE.Raycaster();ray.setFromCamera({x:X/r.width*2-1,y:-(Y/r.height)*2+1},T3.cam);
  const hit=ray.intersectObjects([T3.front,T3.back])[0];if(!hit||!hit.uv){tip.hidden=true;return}
  const x=vp3.x0+hit.uv.x*vp3.span;const m=vp3.mTop+(1-hit.uv.y)*vp3.TH*vp3.kpx/vp3.ve;const z=m<0?m/vp3.R:m;
  const id=cur.sample(x,z,state.t,0.3,-1);if(id===ID.AIR){tip.hidden=true;return}
  const nm=NAMES[id][state.level==='onder'?0:1];tip.innerHTML=`<b>${nm}</b><br>${z<0?`${fmt(-z,1)} km boven zeeniveau`:`${fmt(z,z<20?1:0)} km diep`}`;tip.style.left=X+'px';tip.style.top=Y+'px';tip.hidden=false}

// ================= hoofdlus =================
function draw(dt){
  if(state.dim==='3d'&&three){draw3D(dt);return}
  placed=[];
  if(cur.map){OT={ctx,W,H,kpx:1,sx:x=>x/((state.mode==='geo'?600:100)/W),sy:y=>H*0.47-y/((state.mode==='geo'?600:100)/W),wx:X=>X*((state.mode==='geo'?600:100)/W),wz:Y=>(H*0.47-Y)*((state.mode==='geo'?600:100)/W)};
    drawTransform();return}
  vp=computeVP();
  const key=state.sc+'|'+state.t.toFixed(4)+'|'+vp.key;
  const now=performance.now();
  if(key!==rasterKey&&(!state.playing||now-lastRaster>45)){raster();rasterKey=key;lastRaster=now;
    if(!state.playing||now-lastTopo>220){drawTopo();lastTopo=now}}
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,vp.cw,vp.ch,0,0,vp.cw*vp.cellPx,vp.ch*vp.cellPx);
  const O=makeO();reserve(O);drawMarkers(O);drawEvents(O);cur.overlay(O,state.t);drawAxes(O)}
function depthStep(){const d=state.depth/state.ve;for(const c of[5,10,20,25,50,100,200])if(d/c<=9)return c;return 200}
function reserve(O){const p=vp;const step=depthStep();for(let z=0;z<3000;z+=step){const Y=O.sy(z);if(Y<8)continue;if(Y>O.H-6)break;placed.push([0,Y-9,64,18])}
  placed.push([O.W-170,O.H-44,166,42])}
let lastRaster=0,lastTopo=0,lastTs=performance.now();
function loop(ts){requestAnimationFrame(loop);const dt=Math.min(0.1,(ts-lastTs)/1000);lastTs=ts;try{
  if(state.playing){state.t+=dt*state.speed*cur.rate*(cur.map&&state.mode==='geo'?1:1);if(state.t>=cur.t1){state.t=cur.t1;state.playing=false;updPlay();rasterKey=''}syncTime()}
  updEvents(dt);draw(dt)}catch(err){if(!loop.warned){loop.warned=1;console.error(err)}}}

// ================= UI-koppeling =================
const ICON={eq:'<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="4" fill="#d7301f"/><circle cx="10" cy="10" r="8" fill="none" stroke="#d7301f" stroke-width="1.5" opacity=".5"/></svg>',
  volc:'<svg viewBox="0 0 20 20"><path d="M2 18 L8 8 L12 8 L18 18Z" fill="#5c423e"/><circle cx="10" cy="5" r="3" fill="#ff5a1f"/></svg>',
  mtn:'<svg viewBox="0 0 20 20"><path d="M1 18 L7 6 L11 12 L14 8 L19 18Z" fill="#8b6a4a"/></svg>',
  ore:'<svg viewBox="0 0 20 20"><path d="M10 2 L12.4 7.6 L18.5 8 L13.8 12 L15.3 18 L10 14.6 L4.7 18 L6.2 12 L1.5 8 L7.6 7.6Z" fill="#e3b23c" stroke="#5a3e00" stroke-width=".8"/></svg>'};
const SHORT={rug:'Mid-oceanische rug',slenk:'Slenk wordt oceaan',sub:'Oceaan onder continent',boog:'Eilandboog',botsing:'Botsing',transform:'Transforme breuk',hotspot:'Hotspot',ng:'Nieuw-Guinea'};
const LOC={"rug": IMGBASE+"kaart-rug.webp", "slenk": IMGBASE+"kaart-slenk.webp", "sub": IMGBASE+"kaart-sub.webp", "boog": IMGBASE+"kaart-boog.webp", "botsing": IMGBASE+"kaart-botsing.webp", "transform": IMGBASE+"kaart-transform.webp", "hotspot": IMGBASE+"kaart-hotspot.webp", "ng": IMGBASE+"kaart-ng.webp"};
const LOCNAME={rug:'de Atlantische rug',slenk:'de Oost-Afrikaanse slenk',sub:'de Andes',boog:'de Marianen',botsing:'de Himalaya',transform:'Californië',hotspot:'de Hawaï-keten',ng:'Nieuw-Guinea'};
const TAGS={rug:'Divergent',slenk:'Divergent',sub:'Convergent',boog:'Convergent',botsing:'Convergent',transform:'Transform',hotspot:'Midden op een plaat',ng:'Nieuw onderzoek'};
function buildChips(){const c=$('#chips');c.innerHTML='';for(const k of ORDER){const s=SC[k];const b=document.createElement('button');b.className='pt-chip';b.innerHTML=`<i aria-hidden="true"></i><span>${SHORT[k]}</span>`;b.setAttribute('aria-pressed',k===state.sc);b.onclick=()=>selectSc(k);c.appendChild(b)}}
function selectSc(k){state.sc=k;cur=SC[k];state.t=cur.t0;state.pan={x:0,z:0};QS.length=0;PUFF.length=0;FL.length=0;
  const dv=cur.defView||'overzicht';setDepth(cur.map?100:dv==='lithosfeer'?230:dv==='korst'?62:cur.zBot,true);
  ROOT.querySelectorAll('#chips .pt-chip').forEach((b,i)=>b.setAttribute('aria-pressed',ORDER[i]===k));
  key3D='';legKey='';legIds=[];if(T3.ready){T3.parts.length=0;for(const r of T3.rings)r.age=9;T3.needReset=true}applyDim();buildPhasebar();updText();syncTime();state.playing=false;updPlay();
  if(cur.prepare)cur.prepare(state.t,{cw:1,ch:1,x0:0,ckx:1,zAt:()=>0,key:'pre'+state.t})}
function applyDim(){const d3=state.dim==='3d'&&!!three;
  cv.hidden=d3;glc.hidden=!d3;lab.hidden=!d3;$('#hint3d').hidden=!d3||hintSeen;
  $('#gDepth').hidden=!!cur.map;$('#gVe').hidden=!!cur.map;$('#gMode').hidden=!cur.map;$('#gRel').hidden=!d3||!!cur.map;$('#camReset').hidden=!d3;
  ROOT.querySelectorAll('[data-dim]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.dim===state.dim));
  tcv.hidden=d3||!!cur.map;setupCanvas();updScale();updBadge();legKey='';updLegend()}
let hintSeen=false;
function depthFromSlider(v){const mx=cur.zBot;return Math.round(DMIN*Math.exp(v/1000*Math.log(mx/DMIN)))}
function sliderFromDepth(d){const mx=cur.zBot;return Math.round(1000*Math.log(d/DMIN)/Math.log(mx/DMIN))}
function setDepth(d,quiet){state.depth=clamp(d,DMIN,cur.zBot);state.view=viewOf(state.depth);state.pan={x:0,z:0};
  $('#depth').value=sliderFromDepth(state.depth);$('#depthVal').textContent=`${state.depth} km`;
  ROOT.querySelectorAll('[data-rel]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.rel===String(state.relief)));
  if(!quiet){setupCanvas();updScale();updBadge()}}
function buildPhasebar(){const pb=$('#phasebar');pb.innerHTML='';const tot=cur.t1-cur.t0;if(cur.phases.length<2){pb.hidden=true;return}pb.hidden=false;
  cur.phases.forEach((p,i)=>{const b=document.createElement('button');b.style.flexGrow=String((p.t1-p.t0)/tot*10);b.textContent=p.title;b.title=p.title;b.onclick=()=>{state.t=p.t0+0.001;state.playing=false;updPlay();syncTime()};pb.appendChild(b)})}
let lastPhase=-1,lastLevel='';
function curPhase(){const ph=cur.phases;for(let i=ph.length-1;i>=0;i--)if(state.t>=ph[i].t0)return i;return 0}
function updText(){const i=curPhase();const p=cur.phases[i];$('#scTitle').textContent=cur.name;{const im=$('#locMap');if(im.dataset.sc!==state.sc){im.dataset.sc=state.sc;im.src=LOC[state.sc];im.alt='Kaart van '+LOCNAME[state.sc]+' met plaatgrenzen, aardbevingen en vulkanen; de lijn is de doorsnede';$('#locCap').textContent='Deze doorsnede ligt in '+LOCNAME[state.sc]+'. De zwarte lijn is de doorsnede.'}}$('#phaseT').textContent=p.title;
  $('#phaseText').innerHTML=state.level==='onder'?p.onder:p.boven;
  $('#effects').innerHTML=cur.effects[state.level].map(([ic,txt])=>`<li>${ICON[ic]}<span>${txt}</span></li>`).join('');
  [...$('#phasebar').children].forEach((b,j)=>b.classList.toggle('on',j===i));
  updLegend();
  updScale();
  $('#insA').innerHTML=INSIGHTS[state.level][0]+' '+INSIGHTS[state.level][1];$('#insB').innerHTML=INSB[state.level];
  lastPhase=i;lastLevel=state.level}

const LEG_ORDER=[ID.WATER,ID.YOUNG,ID.YOUNGB,ID.YOUNG2,ID.SED0,ID.SED1,ID.SEDM,ID.ACCR,ID.VOLC,ID.OPH,ID.CCU,ID.CCL,ID.CCU2,ID.CCL2,ID.ARC,ID.OCN,ID.OCR,ID.OC,ID.LITHC,ID.LITHC2,ID.LITHO,ID.WEDGE,ID.PLUME,ID.PMELT,ID.MAGMA,ID.ASTH,ID.TZ,ID.LM];
function updLegend(){
  const lv=state.level==='onder'?0:1;let h='';const seen=new Set();
  let ids;if(cur.map)ids=state.dim==='3d'&&three?[ID.CCU,ID.CCL,ID.LITHC]:[];
  else{const set=new Set(legIds.map(i=>SEDS.includes(i)?(i===ID.SED0?ID.SED0:ID.SED1):(i===ID.SED2?ID.SED1:i)));ids=LEG_ORDER.filter(i=>set.has(i))}
  if(ids.length){h+=`<div class="lgsub">${cur.map?'Lagen in het blok':'Nu in beeld'}</div>`;
    for(const id of ids){const nm=NAMES[id][lv];if(seen.has(nm))continue;seen.add(nm);
      let sw=`background:rgb(${PAL[id]})`;if(id===ID.SED1)sw=`background:repeating-linear-gradient(0deg,rgb(${PAL[ID.SED1]}) 0 3px,rgb(${PAL[ID.SED3]}) 3px 6px,rgb(${PAL[ID.SED2]}) 6px 9px)`;
      if(id===ID.PMELT)sw=`background:radial-gradient(circle at 30% 40%,rgb(${PAL[ID.PMELT]}) 0 2px,transparent 3px),radial-gradient(circle at 70% 60%,rgb(${PAL[ID.PMELT]}) 0 2px,transparent 3px),rgb(${PAL[ID.ASTH]})`;
      h+=`<div class="lg"><span class="sw" style="${sw}"></span><span>${nm}</span></div>`}
    const hasLith=ids.some(i=>i===ID.LITHO||i===ID.LITHC||i===ID.LITHC2);
    if(hasLith)h+=`<div class="note" style="margin-top:4px">${lv?'Lithosfeer = korst + lithosferische mantel (stijf). Asthenosfeer = zwakker, maar vast gesteente.':'Plaat = korst + stijve mantel eronder.'}</div>`}
  if(state.dim==='3d'&&three&&!cur.map&&vp3){const E=vp3.e;const sea=E.some(e=>e<0),land=E.some(e=>e>0.05);h+=`<div class="lgsub">Bovenkant van het blok</div>`;
    if(sea)h+=`<div class="lg"><span class="sw" style="background:linear-gradient(90deg,#6fd6e0,#1c63a8)"></span><span>${lv?'Oceaan: lichter = ondieper (bijv. de rug), donkerder = dieper':'Zee: licht = ondiep, donker = diep'}</span></div>`;
    if(land)h+=`<div class="lg"><span class="sw" style="background:linear-gradient(90deg,#77a052,#8a775c,#9a9690,#f4f6f8)"></span><span>${lv?'Land: laagland → gebergte → sneeuw (op ware hoogte gekleurd)':'Land: groen laag, bruin/grijs hoog, wit = sneeuw'}</span></div>`}
  h+=`<div class="lgsub">Symbolen</div>`;
  const sy=cur.syms?cur.syms(state.t):[];
  if(state.tog.eq)h+=`<div class="lg"><span class="sw" style="background:radial-gradient(circle at 25% 50%,#d7301f 0 4px,transparent 5px),radial-gradient(circle at 55% 50%,#f39c12 0 4px,transparent 5px),radial-gradient(circle at 85% 50%,#2c7fb8 0 4px,transparent 5px);border:0"></span><span>${cur.map?'Aardbeving (ster en kringen)':'Aardbeving: rood ondiep (&lt;70 km), oranje middeldiep, blauw diep (&gt;300 km). Groter = zwaarder.'}</span></div>`;
  if(state.tog.markers&&!cur.map&&!cur.noMarkers)h+=`<div class="lg"><span class="sw" style="background:radial-gradient(circle,rgba(70,40,25,.6) 0 3px,transparent 4px);border:0"></span><span>${lv?'Mantelmerker: vast t.o.v. de diepe mantel':'Stipje in de mantel: blijft (bijna) liggen'}</span></div>`;
  if(state.tog.markers&&sy.includes('ticks'))h+=`<div class="lg"><svg width="30" height="16"><path d="M15 14 L10 4 L20 4Z" fill="#fff" stroke="#1b2729"/></svg><span>${lv?'Plaatmerker: vast aan het gesteente van de plaat':'Driehoekje: beweegt mee met de plaat'}</span></div>`;
  if(sy.includes('fault'))h+=`<div class="lg"><svg width="30" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#c0281b" stroke-width="2.4" stroke-dasharray="6 3"/></svg><span>${lv?'Actieve breuk (dun donker: niet meer actief)':'Breuk die nu beweegt (donker: oude breuk)'}</span></div>`;
  if(sy.includes('mapfault'))h+=`<div class="lg"><svg width="30" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#c0281b" stroke-width="3"/></svg><span>Breuk (plaatgrens)</span></div><div class="lg"><svg width="30" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#4a4a4a" stroke-width="5"/><line x1="2" y1="8" x2="28" y2="8" stroke="#f7d64a" stroke-width="1.2" stroke-dasharray="5 4"/></svg><span>Weg</span></div><div class="lg"><svg width="30" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#2f78c4" stroke-width="3"/></svg><span>Rivier</span></div><div class="lg"><svg width="30" height="16"><line x1="2" y1="8" x2="28" y2="8" stroke="#6e5a3c" stroke-width="1.4" stroke-dasharray="5 3"/></svg><span>Hek</span></div>`;
  if(state.tog.forces)h+=`<div class="lg"><svg width="30" height="16"><path d="M2 6h18v-4l8 6-8 6v-4H2z" fill="#b8481f"/></svg><span>${lv?'Kracht (rood) of snelheid (blauwgroen); breedte schematisch':'Rode pijl = kracht, blauwgroene pijl = beweging'}</span></div>`;
  if(state.tog.volc&&sy.includes('fluids'))h+=`<div class="lg"><svg width="30" height="16"><circle cx="8" cy="10" r="2.4" fill="#2b7bd0"/><circle cx="16" cy="6" r="2.4" fill="#2b7bd0"/><circle cx="23" cy="11" r="2.4" fill="#2b7bd0"/></svg><span>Water dat uit de duikende plaat ontsnapt</span></div>`;
  if(sy.includes('ngparts'))h+=`<div class="lg"><svg width="30" height="16"><circle cx="6" cy="8" r="3.5" fill="#1f8f86"/><circle cx="15" cy="8" r="3.5" fill="#d0241c"/><circle cx="24" cy="8" r="3" fill="#5f5a55"/></svg><span>Mantelbrokjes: verrijkt · smelt · gewone mantel</span></div>`;
  if(sy.includes('ore'))h+=`<div class="lg"><svg width="30" height="16"><path d="M15 2 L17 7 L22 7.5 L18 11 L19.5 15 L15 12.5 L10.5 15 L12 11 L8 7.5 L13 7Z" fill="#e3b23c" stroke="#5a3e00" stroke-width=".8"/></svg><span>Koper- en gouderts</span></div>`;
  $('#legend').innerHTML=h}
function updScale(){const L=[];
  if(cur.map){L.push(...cur.notes.map(n=>`<li>${n}</li>`))}
  else{const d3=state.dim==='3d'&&three;
    if(d3){const R=reliefNow();L.push(`<li><b>3D-blok:</b> de voorkant is de doorsnede. Het blok loopt in de diepte gelijk door, dus de achterkant toont dezelfde lagen en de zijkanten de lagen aan de rand.</li>`);
      L.push(`<li><b>Bergen boven zeeniveau ×${R}</b> – ${R>1?'alleen wat boven zeeniveau uitsteekt is uitgerekt, anders zie je bergen op deze schaal niet. Alles onder zeeniveau (oceaan, korst, mantel) is op schaal: daarom is de oceaan maar een dun laagje!':'niets overdreven: zo plat is het aardoppervlak in het echt.'}</li>`);
      L.push(`<li>De vorm van bergen en vulkanen <b>langs</b> het blok (bergkammen, een rij vulkanen) is sfeer. Hoogte en ligging komen uit de doorsnede.</li>`)}
    L.push(`<li><b>Doorsnede: verticaal ×${state.ve}</b> – ${state.ve===1?'ware schaal: diktes, dieptes en hellingen kloppen onderling.':'overdreven: lagen lijken dikker en hellingen steiler dan in het echt. Vergelijk met ×1!'}</li>`);
    const ex=Math.round(topoEx);if(!d3)L.push(`<li><b>Hoogteprofiel: ×${Math.max(1,ex)}</b> – ${ex>1.4?'zonder overdrijving zou je bergen nauwelijks zien (Mount Everest is 8,8 km; de mantel is 2900 km dik).':'bij deze zoom is het reliëf in de doorsnede zelf al zichtbaar; het profiel is verborgen.'}</li>`);
    L.push(`<li><b>Tijd versneld:</b> 1 seconde ≈ ${fmt(cur.rate*state.speed,1)} miljoen jaar.</li>`);
    L.push(`<li>Aardbevingen, vulkaanpluimen, pijlen en stipjes zijn <b>symbolen</b>, niet op schaal.</li>`);
    L.push(...cur.notes.map(n=>`<li>${n}</li>`))}
  $('#scaleList').innerHTML=L.join('')}
function updBadge(){const b=$('#veBadge');if(cur.map){b.className='badge ex';b.textContent=state.mode==='geo'?'Kaart: ware schaal':'Kaart: verschuiving ×1500';return}
  const R=state.dim==='3d'&&three?reliefNow():1;const ok=state.ve===1&&R===1;b.className='badge '+(ok?'true':'ex');
  b.textContent=(state.ve===1?'Lagen op ware schaal':`Lagen ×${state.ve} overdreven`)+(R>1?` · bergen ×${R}`:'')}
function syncTime(){updBadge();const s=$('#slider');s.min=cur.t0;s.max=cur.t1;s.step=(cur.t1-cur.t0)/1000;s.value=state.t;$('#timeBig').textContent=cur.timeLabel(state.t);
  const i=curPhase();if(i!==lastPhase||state.level!==lastLevel)updText()}
function updPlay(){const b=$('#play');b.innerHTML=state.playing?'<svg viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" fill="currentColor"/><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor"/></svg>Pauze':'<svg viewBox="0 0 14 14"><path d="M2 1 L13 7 L2 13Z" fill="currentColor"/></svg>Afspelen';b.setAttribute('aria-label',state.playing?'Pauzeren':'Afspelen');rasterKey=''}
$('#play').onclick=()=>{if(!state.playing&&state.t>=cur.t1-1e-6)state.t=cur.t0;state.playing=!state.playing;updPlay()};
$('#reset').onclick=()=>{state.t=cur.t0;state.playing=false;updPlay();syncTime()};
$('#slider').oninput=e=>{state.t=+e.target.value;state.playing=false;updPlay();syncTime()};
$('#speed').onchange=e=>{state.speed=+e.target.value;updScale()};
$('#lvOnder').onclick=()=>setLevel('onder');$('#lvBoven').onclick=()=>setLevel('boven');
function setLevel(l){state.level=l;$('#lvOnder').setAttribute('aria-pressed',l==='onder');$('#lvBoven').setAttribute('aria-pressed',l==='boven');updText()}
$('#depth').oninput=e=>{setDepth(depthFromSlider(+e.target.value))};
ROOT.querySelectorAll('[data-dim]').forEach(b=>b.onclick=()=>{state.dim=b.dataset.dim;applyDim()});
ROOT.querySelectorAll('[data-rel]').forEach(b=>b.onclick=()=>{state.relief=b.dataset.rel==='auto'?'auto':+b.dataset.rel;ROOT.querySelectorAll('[data-rel]').forEach(x=>x.setAttribute('aria-pressed',x===b));key3D='';updScale();updBadge()});
$('#camReset').onclick=()=>resetCam();
if(!three){$('#gDim').hidden=true;state.dim='2d'}
ROOT.querySelectorAll('[data-ve]').forEach(b=>b.onclick=()=>{state.ve=+b.dataset.ve;ROOT.querySelectorAll('[data-ve]').forEach(x=>x.setAttribute('aria-pressed',x===b));rasterKey='';topoKey='';updScale();updBadge()});
ROOT.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;ROOT.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',x===b));state.t=0;syncTime()});
ROOT.querySelectorAll('input[data-tg]').forEach(b=>{const k=b.dataset.tg;b.checked=!!state.tog[k];b.onchange=()=>{state.tog[k]=b.checked;rasterKey='';key3D='';last3D=0;if(!b.checked&&k==='eq')QS.length=0;if(!b.checked&&k==='volc'){PUFF.length=0;FL.length=0;if(T3.ready)T3.parts.length=0}updLegend()}});
// slepen = schuiven, hover = uitlezen
let drag=null;
cv.addEventListener('pointerdown',e=>{if(cur.map)return;drag={x:e.clientX,y:e.clientY,px:state.pan.x,pz:state.pan.z};cv.setPointerCapture(e.pointerId);cv.classList.add('drag')});
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();const X=e.clientX-r.left,Y=e.clientY-r.top;
  if(drag&&vp){state.pan.x=drag.px-(e.clientX-drag.x)*vp.kpx;state.pan.z=clamp(drag.pz-(e.clientY-drag.y)*vp.kpx/vp.ve,-40,600);tip.hidden=true;return}
  if(cur.map||!vp){tip.hidden=true;return}
  const x=vp.x0+X*vp.kpx,z=vp.zTop+Y*vp.kpx/vp.ve;const id=cur.sample(x,z,state.t,0.3,-1);
  const nm=NAMES[id][state.level==='onder'?0:1];tip.innerHTML=`<b>${nm}</b><br>${z<0?`${fmt(-z,1)} km boven zeeniveau`:`${fmt(z,z<20?1:0)} km diep`}`;tip.style.left=X+'px';tip.style.top=(Y+(tcv.hidden?0:TOPOH))+'px';tip.hidden=false});
cv.addEventListener('pointerup',()=>{drag=null;cv.classList.remove('drag')});cv.addEventListener('pointerleave',()=>{tip.hidden=true});
window.addEventListener('resize',()=>{setupCanvas()});
glc.addEventListener('pointerdown',()=>{hintSeen=true;glc.style.cursor='grabbing'});glc.addEventListener('pointerup',()=>{glc.style.cursor='grab'});
try{if(matchMedia('(max-width:680px)').matches){$('#more').open=false;$('#legWrap').open=false}}catch(e){}
buildChips();selectSc('sub');requestAnimationFrame(loop);
// ---------- hoofdstukken: de balk neemt de laag eronder over ----------
(function(){const bar=$('#bar'),dn=$('#depthNow'),secs=[...ROOT.querySelectorAll('[data-depth]')];let last=null;
  function upd(){const y=innerHeight*0.45;let cur=secs[0];for(const s of secs){const r=s.getBoundingClientRect();if(r.top<=y&&r.bottom>y){cur=s;break}}
    if(cur!==last){last=cur;bar.style.setProperty('--bar-bg',cur.dataset.bg);bar.style.setProperty('--bar-ink',cur.dataset.ink);dn.innerHTML='<b>'+cur.dataset.depth+'</b> · '+cur.dataset.layer}}
  addEventListener('scroll',()=>requestAnimationFrame(upd),{passive:true});addEventListener('resize',upd);upd();
  // Alleen tonen zolang de lagen in beeld zijn (niet boven de opening of in de voettekst van de site).
  const top=$('#top'),kern=$('#kern');const vis=()=>{const a=top.getBoundingClientRect(),k=kern.getBoundingClientRect();bar.classList.toggle('is-on',a.bottom<innerHeight*0.6&&k.top>innerHeight*0.5)};addEventListener('scroll',()=>requestAnimationFrame(vis),{passive:true});vis()})();
// ---------- binnenkomst van de onderdelen ----------
(function(){const els=ROOT.querySelectorAll('.rise');if(!('IntersectionObserver' in window)){els.forEach(e=>e.classList.add('in'));return}
  const io=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}},{rootMargin:'0px 0px 0px 0px',threshold:0});els.forEach(e=>io.observe(e))})();
// ---------- tegels en knoppen kiezen een plaatgrens ----------
function goSim(k){selectSc(k);$('#simulatie').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
ROOT.querySelectorAll('.pt-tile[data-sc]').forEach(t=>t.onclick=()=>goSim(t.dataset.sc));
$('#toNg').onclick=()=>goSim('ng');

})();
