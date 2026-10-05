import{R as lt}from"./truth-v705DCbR.js";import{m as dt}from"./mount-Dfy8R3uc.js";import"./relay-frames-BH4hSqru.js";import{D as it,e as rt,R as ct,T as ut,A as pt,F as mt,g as bt,L as ft,P as B,G as vt,C as yt,f as W,a as ht,h as gt,j as St,s as $t,r as wt,v as Tt,k as Ct,m as kt,l as xt,n as Et,o as Lt,c as Nt,d as Rt,b as Mt,t as It,i as Ot,p as jt}from"./actions-mLPajnhJ.js";import"./context-BzoOqa4m.js";import"./alarm-voice-WqLzLFNG.js";import"./engine-CvroiKVw.js";import"./clock-C_fpNLDt.js";import"./numerics-dom-C5bX6zwA.js";import"./engine.worker-CDYQpNpj.js";import"./wave-lanes-DQlLuakQ.js";import"./sweep-lane-DLt-pTEF.js";const Q=64,X=14,o=(e,m=e,T=!1)=>`<option value="${e}"${T?" selected":""}>${m}</option>`,w=e=>`${Math.floor(e/60)}:${String(Math.floor(e%60)).padStart(2,"0")}`,Dt=`
<header class="pc-bar">
  <strong>Physiology console</strong>
  <span class="pc-t" data-id="t">0:00</span>
  <select data-id="speed" title="Sim speed">${[.25,.5,1,2,4].map(e=>o(String(e),`×${e}`,e===1)).join("")}</select>
  <button type="button" data-act="pause">Pause</button>
  <span class="pc-sep"></span>
  <span data-id="base">baseline: pending</span>
  <button type="button" data-act="setBase">Set baseline</button>
  <button type="button" data-act="reset" disabled>Reset to baseline</button>
  <span class="pc-sep"></span>
  <input data-id="filter" type="search" placeholder="filter (path or label)" />
  <label><input type="checkbox" data-id="changed" /> changed only</label>
  <label><input type="checkbox" data-id="internals" /> internals</label>
  <span class="pc-sep"></span>
  <button type="button" data-act="json">JSON</button><button type="button" data-act="csv">CSV</button><button type="button" data-act="copy">Copy</button>
  <span class="pc-stats" data-id="stats"></span>
</header>
<div class="pc-body">
  <div class="pc-left">
    <div class="pc-monitor" data-id="monitor"></div>
    <div class="pc-rail" data-id="rail">
      <fieldset><legend>Drug</legend>
        <input data-f="drug" list="pc-drugs" value="phenylephrine" size="13" />
        <datalist id="pc-drugs">${it.map(e=>o(e)).join("")}</datalist>
        <input data-f="dose" type="number" value="100" step="any" /> <select data-f="doseUnit">${rt.map(e=>o(e)).join("")}</select>
        <button type="button" data-act="bolus">Bolus</button>
        <input data-f="rate" type="number" value="0.5" step="any" /> <select data-f="rateUnit">${ct.map(e=>o(e)).join("")}</select>
        <button type="button" data-act="infusion">Infuse</button>
        TCI <input data-f="tciTarget" type="number" value="3" step="any" /> <select data-f="tciMode">${o("effect")}${o("plasma")}</select>
        <input data-f="tciModel" list="pc-tci" placeholder="model" size="8" /><datalist id="pc-tci">${ut.map(e=>o(e)).join("")}</datalist>
        <button type="button" data-act="tci">TCI</button>
      </fieldset>
      <fieldset><legend>Vaporiser</legend>
        <select data-f="agent">${pt.map(e=>o(e)).join("")}</select> dial <input data-f="dial" type="number" value="2" step="0.1" /> %
        FGF <input data-f="fgf" type="number" value="2" step="0.5" /> L/min N₂O <input data-f="n2o" type="number" value="0" min="0" max="0.7" step="0.1" />
        <button type="button" data-act="vap">Set</button>
      </fieldset>
      <fieldset><legend>Fluids / bleed / labs</legend>
        <input data-f="fluid" list="pc-fluids" value="crystalloid" size="11" /><datalist id="pc-fluids">${mt.map(e=>o(e)).join("")}</datalist>
        <input data-f="vol" type="number" value="500" /> mL over <input data-f="over" type="number" value="300" /> s
        <button type="button" data-act="fluid">Give</button> <button type="button" data-act="bleed">Bleed</button>
        <select data-f="panel">${o("abg","ABG")}${o("vbg","VBG")}</select> <button type="button" data-act="lab">Send</button>
      </fieldset>
      <fieldset><legend>Condition</legend>
        <input data-f="cond" list="pc-conds" value="tamponade" size="11" /><datalist id="pc-conds">${bt.map(e=>o(e)).join("")}</datalist>
        severity <input data-f="sev" type="number" value="0.8" min="0" max="1" step="0.1" /> <button type="button" data-act="cond">Apply</button>
      </fieldset>
      <fieldset><legend>Lungs</legend>
        <input data-f="lcond" list="pc-lconds" value="ards" size="11" /><datalist id="pc-lconds">${ft.map(e=>o(e)).join("")}</datalist>
        severity <input data-f="lsev" type="number" value="0.5" min="0" max="1" step="0.1" /> <select data-f="side">${o("","both/none")}${o("L")}${o("R")}</select>
        <button type="button" data-act="lcond">Apply</button>
        tube <select data-f="mainstem">${o("both")}${o("left")}${o("right")}</select> <button type="button" data-act="mainstem">Set</button>
        RM <input data-f="rmP" type="number" value="40" /> cmH₂O × <input data-f="rmS" type="number" value="30" /> s <button type="button" data-act="recruit">Recruit</button>
      </fieldset>
      <fieldset><legend>Ventilation</legend>
        <select data-f="src">${["spontaneous","ventilator","bvm","none"].map(e=>o(e)).join("")}</select>
        RR <input data-f="rr" type="number" value="12" /> VT <input data-f="vt" type="number" value="500" /> PEEP <input data-f="peep" type="number" value="5" />
        FiO₂ <input data-f="fio2" type="number" value="0.5" step="0.05" /> <button type="button" data-act="vent">Set</button>
      </fieldset>
      <fieldset><legend>Rhythm / mode / patient</legend>
        <select data-f="rhythm">${lt.map(e=>o(e)).join("")}</select> <button type="button" data-act="rhythm">Set rhythm</button>
        <select data-f="mode">${o("modeled","MODELED",!0)}${o("manual","MANUAL")}</select> <button type="button" data-act="mode">Set mode</button>
        <select data-f="preset">${B.map(e=>o(e.id,e.label)).join("")}</select> <button type="button" data-act="restart">Restart patient</button>
      </fieldset>
      <fieldset><legend>Raw command (JSON body)</legend>
        <textarea data-f="raw" rows="2">{"type":"applyEvent","event":{"kind":"drug","drugId":"ephedrine","dose":10,"unit":"mg","route":"iv"}}</textarea>
        <button type="button" data-act="raw">Send</button>
      </fieldset>
    </div>
    <ol class="pc-log" data-id="log" aria-label="Change log"></ol>
  </div>
  <main class="pc-organs" data-id="organs"></main>
</div>`;function Ut(e,m,T={}){const h=e.ownerDocument;e.innerHTML=Dt;const b=t=>e.querySelector(`[data-id="${t}"]`),l=t=>e.querySelector(`[data-f="${t}"]`),c=t=>Number(l(t).value),r=new yt,C=[],A=T.autoBaselineS??60;let v=0,y=null,k=null,x=!1,H=0;const at=b("organs"),E=new Map;for(const t of vt){const a=h.createElement("details");a.className="pc-sec",a.dataset.group=t.id,a.open=t.id!=="other"&&t.id!=="controls",a.hidden=!0,a.innerHTML=`<summary>${t.title} <span class="pc-count"></span></summary><table><tbody></tbody></table>`,a.addEventListener("toggle",()=>a.open&&$()),at.append(a),E.set(t.id,{det:a,body:a.querySelector("tbody"),sum:a.querySelector(".pc-count"),n:0})}const g=new Map,nt=t=>{const a=h.createElement("tr");a.dataset.path=t.path;const s=t.path.lastIndexOf(".");a.innerHTML=`<td class="k" title="${t.path}"><span class="lbl"></span><span class="par"></span></td><td class="v"></td><td class="u"></td><td class="b"></td><td class="d"></td><td class="s"><canvas width="${Q}" height="${X}"></canvas></td>`,a.querySelector(".lbl").textContent=t.meta.label,a.querySelector(".par").textContent=t.meta.rank===Number.POSITIVE_INFINITY&&s>0?t.path.slice(0,s):"",a.querySelector(".u").textContent=t.meta.unit;const p=a.querySelector("canvas");return{tr:a,v:a.querySelector(".v"),b:a.querySelector(".b"),d:a.querySelector(".d"),cv:p,g:p.getContext("2d")}},S=(t,a)=>{t.textContent!==a&&(t.textContent=a)};function $(){const t=performance.now(),a=r.rows(),s=b("filter").value.trim().toLowerCase(),p=b("changed").checked,K=b("internals").checked,U=new Map,ot=new Set(a.map(n=>n.path));for(const[n,f]of g)ot.has(n)||(f.tr.remove(),g.delete(n));for(const n of a){const f=U.get(n.group)??{shown:0,changed:0,total:0,added:!1};U.set(n.group,f);let d=g.get(n.path);d||(d=nt(n),g.set(n.path,d),f.added=!0);const N=typeof n.base=="number"?n.base:typeof n.value=="number"?n.value:0;S(d.v,W(n.value,n.meta)),S(d.b,W(n.base,n.meta)),S(d.d,ht(n.delta,n.meta,N));const Y=n.dir??"";d.tr.className!==Y&&(d.tr.className=Y);const R=n.internal&&!K||p&&!n.dir||s!==""&&!n.path.toLowerCase().includes(s)&&!n.meta.label.toLowerCase().includes(s);d.tr.hidden!==R&&(d.tr.hidden=R),f.total++,R||f.shown++,n.dir&&(K||!n.internal)&&f.changed++,!R&&E.get(n.group).det.open&&n.hist.length>1&&gt(d.g,n.hist,Q,X,n.dir==="down"?"#5fc8ff":n.dir==="up"?"#ffb347":"#8a8f98",typeof n.base=="number"?n.base:void 0)}for(const[n,f]of E){const d=U.get(n);if(f.det.hidden=!d||d.shown===0,!!d){if(d.added||d.total!==f.n){for(const N of a)N.group===n&&f.body.append(g.get(N.path).tr);f.n=d.total}S(f.sum,`${d.shown}${d.changed?` · ${d.changed} changed`:""}`)}}H=performance.now()-t,V()}function V(){S(b("t"),w(v)),S(b("base"),r.baseT===null?`baseline: pending (auto at ${w(A)})`:`baseline @ ${w(r.baseT)}`),e.querySelector('[data-act="reset"]').disabled=k===null;const t=r.truth;S(b("stats"),`${r.cur.size} values · truth ${t.leaves} leaves ${(t.bytes/1024).toFixed(1)} KB${t.truncated?" TRUNCATED":""} · render ${H.toFixed(1)} ms`)}function L(){b("log").replaceChildren(...C.map(a=>{const s=h.createElement("li");return s.dataset.kind=a.kind,s.className=a.ok===null?"pending":a.ok?"ok":"rej",s.innerHTML="<time></time> <span></span> <em></em>",s.children[0].textContent=w(a.t),s.children[1].textContent=a.text,s.children[2].textContent=a.ok===!1?`rejected: ${a.reason??""}`:"",s}))}const I=(t,a=v)=>{C.unshift({t:a,kind:"mark",text:t,ok:!0}),L()};async function u(t){const a={t:v,kind:"cmd",text:St(t),ok:null};C.unshift(a),L();const s=await m.dispatch(t).catch(p=>({accepted:!1,reason:String(p)}));return a.ok=s.accepted,s.reason!==void 0&&(a.reason=s.reason),L(),s}async function O(t=!1){r.setBaseline(),t||I(`baseline set @ ${w(r.baseT??0)}`),k=await m.snapshot(),$()}async function F(){if(!k||r.baseT===null)return;const t=r.baseT;y="restoring",await m.restore(k),y==="restoring"&&(y="resync",v=t),r.clearHistory(),I(`reset to baseline @ ${w(t)}`,t),$()}const st=m.on(t=>{const a=t.t;y!==null&&t.type==="toneCancel"&&!t.ids?(v=t.after,y=null):y==="resync"&&t.type==="truth"?(v=t.t,y=null):y===null&&typeof a=="number"&&t.type!=="tone"&&(v=Math.max(v,a)),r.ingest(t)&&(r.base===null&&r.t>=A?O(!0):$())}),G=(t,a,s)=>{const p=h.createElement("a");p.href=URL.createObjectURL(new Blob([a],{type:s})),p.download=t,p.click(),setTimeout(()=>URL.revokeObjectURL(p.href),1e3)},j=()=>JSON.stringify(r.toJSON(),null,1),z=()=>`pme-console-t${Math.round(r.t)}`,D={pause:()=>{x=!x,m.pause(x),e.querySelector('[data-act="pause"]').textContent=x?"Resume":"Pause"},setBase:()=>void O(),reset:()=>void F(),json:()=>G(`${z()}.json`,j(),"application/json"),csv:()=>G(`${z()}.csv`,r.toCSV(),"text/csv"),copy:()=>{var t;return void((t=navigator.clipboard)==null?void 0:t.writeText(j()).catch(()=>{}))},bolus:()=>void u(jt(l("drug").value.trim(),c("dose"),l("doseUnit").value)),infusion:()=>void u(Ot(l("drug").value.trim(),c("rate"),l("rateUnit").value)),tci:()=>void u(It(l("drug").value.trim(),c("tciTarget"),l("tciMode").value,l("tciModel").value.trim())),vap:()=>void u(Mt(l("agent").value,c("dial"),c("fgf"),c("n2o"))),fluid:()=>void u(Rt(l("fluid").value.trim(),c("vol"),c("over"))),bleed:()=>void u(Nt(c("vol"),c("over"))),lab:()=>void u(Lt(l("panel").value)),cond:()=>void u(Et(l("cond").value.trim(),c("sev"))),lcond:()=>void u(xt(l("lcond").value.trim(),c("lsev"),l("side").value)),mainstem:()=>void u(kt(l("mainstem").value)),recruit:()=>void u(Ct(c("rmP"),c("rmS"))),vent:()=>void u(Tt(l("src").value,c("rr"),c("vt"),c("peep"),c("fio2"))),rhythm:()=>void u(wt(l("rhythm").value)),mode:()=>void u($t(l("mode").value)),restart:()=>{m.restart(l("preset").value,l("mode").value),r.clear(),k=null,v=0,y=null;for(const t of g.values())t.tr.remove();g.clear();for(const t of E.values())t.n=0;I(`restart: ${l("preset").value}, ${l("mode").value.toUpperCase()}`),$()},raw:()=>{try{u(JSON.parse(l("raw").value))}catch(t){C.unshift({t:v,kind:"cmd",text:"raw command",ok:!1,reason:`bad JSON: ${String(t)}`}),L()}}},J=t=>{var s,p;const a=(s=t.target.closest("[data-act]"))==null?void 0:s.dataset.act;a&&((p=D[a])==null||p.call(D))};e.addEventListener("click",J),b("speed").addEventListener("change",t=>m.timeScale(Number(t.target.value)));for(const t of["filter","changed","internals"])b(t).addEventListener("input",$);return V(),{model:r,log:C,monitorEl:b("monitor"),send:u,setBaseline:O,resetToBaseline:F,exportJSON:j,exportCSV:()=>r.toCSV(),destroy(){st(),e.removeEventListener("click",J),e.replaceChildren()}}}const M=new URLSearchParams(location.search),Pt=M.get("skin")??"philips-like",Bt=Number(M.get("seed")??7),_=new Set;let i=null,Z=1,_t=0;const P=()=>{if(!i)throw new Error("monitor not mounted");return i},tt={dispatch:e=>P().dispatch({...e,id:`pc${++_t}`,issuedBy:"console"}),on:e=>(_.add(e),()=>{_.delete(e)}),snapshot:()=>P().snapshot(),restore:e=>P().restore(e),restart:(e,m)=>et(e,m),timeScale:e=>{Z=e,i==null||i.setTimeScale(e)},pause:e=>e?i==null?void 0:i.pause():i==null?void 0:i.resume()},q=Ut(document.getElementById("app"),tt);function et(e,m){i==null||i.destroy(),q.monitorEl.replaceChildren();const T=(B.find(h=>h.id===e)??B[0]).profile;i=dt(q.monitorEl,{skin:Pt,engine:{seed:Bt,mode:m,patient:T,truthHz:1}}),i.on(h=>{for(const b of _)b(h)}),i.setTimeScale(Z)}et(M.get("preset")??"adult",M.get("mode")==="manual"?"manual":"modeled");Object.assign(window,{__pmeConsole:{ui:q,host:tt,renderPath:()=>i==null?void 0:i.renderPath,ready:!0}});
