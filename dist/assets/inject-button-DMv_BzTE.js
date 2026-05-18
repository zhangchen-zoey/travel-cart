import{c as f,j as p,R as h}from"./client-BvckCBpw.js";const u=new Map;let d=!1;function y(n){if(d)return;d=!0;const e=window.XMLHttpRequest,o=e.prototype.open,a=e.prototype.send;e.prototype.open=function(s,t,...r){return this.__tcUrl=String(t),o.apply(this,[s,t,...r])},e.prototype.send=function(...s){const t=this.__tcUrl||"";return n.some(c=>c.test(t))&&this.addEventListener("load",function(){try{const c=JSON.parse(this.responseText);u.set(t,c)}catch{}}),a.apply(this,s)}}function m(n,e){for(const[o,a]of u.entries()){if(!n.test(o))continue;if(!e)return JSON.stringify(a);const s=e.split(".");let t=a;for(const r of s){if(t==null)return null;t=t[r]}return t!=null?String(t):null}return null}function v(n,e=document){var s;const o=n.transform??(t=>t),a=n.captureGroup??1;if(n.xhrPattern){const t=m(n.xhrPattern,n.jsonPath);if(t!=null)return{value:o(t),source:"xhr"}}if(n.selector){const t=e.querySelector(n.selector),r=(s=t==null?void 0:t.textContent)==null?void 0:s.trim();if(r)return{value:o(r),source:"selector"}}if(n.regex){const t=e instanceof Document?document.body.innerHTML:e.innerHTML,r=n.regex.exec(t);if(r&&r[a])return{value:o(r[a]),source:"regex"}}return null}function w(n){const e=n.replace(/[^0-9.]/g,"");return parseFloat(e)||0}function S(n,e,o=document.body){const a=document.querySelectorAll(n);a.length>0&&e(Array.from(a));const s=new WeakSet;a.forEach(r=>s.add(r));const t=new MutationObserver(()=>{const r=document.querySelectorAll(n),c=[];r.forEach(i=>{s.has(i)||(s.add(i),c.push(i))}),c.length>0&&e(c)});return t.observe(o,{childList:!0,subtree:!0}),()=>t.disconnect()}const x=`
  .tc-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 500;
    line-height: 1;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    color: #fff;
    background-color: #0086F6;
    box-shadow: 0 2px 6px rgba(0, 134, 246, 0.3);
    transition: all 0.2s ease;
    white-space: nowrap;
    user-select: none;
    outline: none;
  }
  .tc-btn:hover {
    background-color: #006fd6;
    box-shadow: 0 4px 12px rgba(0, 134, 246, 0.4);
    transform: translateY(-1px);
  }
  .tc-btn:active {
    transform: translateY(0);
    box-shadow: 0 1px 3px rgba(0, 134, 246, 0.3);
  }
  .tc-btn--added {
    background-color: #52c41a;
    box-shadow: 0 2px 6px rgba(82, 196, 26, 0.3);
    cursor: default;
    pointer-events: none;
  }
  .tc-btn--loading {
    opacity: 0.7;
    cursor: wait;
    pointer-events: none;
  }
`,g=({extractData:n})=>{const[e,o]=h.useState("idle"),a=async r=>{var c;if(r.stopPropagation(),r.preventDefault(),!(e==="added"||e==="loading")){o("loading");try{const i=n(),l={action:"ADD_ITEM",payload:i};typeof chrome<"u"&&((c=chrome.runtime)!=null&&c.sendMessage)?await chrome.runtime.sendMessage(l):(window.postMessage({type:"TRAVEL_CART_ADD_ITEM",...l},"*"),console.log("[travel-cart] ADD_ITEM (dev mode):",i)),o("added")}catch(i){console.error("[travel-cart] Failed to add item:",i),o("error"),setTimeout(()=>o("idle"),3e3)}}},s={idle:"+ 行程单",loading:"添加中…",added:"✓ 已添加",error:"✗ 失败"}[e],t=["tc-btn",e==="added"&&"tc-btn--added",e==="loading"&&"tc-btn--loading"].filter(Boolean).join(" ");return p.jsx("button",{className:t,onClick:a,title:"添加到行程单",children:s})};function E(n,e){const o=document.createElement("div");o.className="travel-cart-inject",o.style.display="inline-block",o.style.marginLeft="8px",o.style.verticalAlign="middle";const a=o.attachShadow({mode:"closed"}),s=document.createElement("style");s.textContent=x,a.appendChild(s);const t=document.createElement("div");t.style.display="inline-block",a.appendChild(t),n.appendChild(o);const r=f.createRoot(t);return r.render(p.jsx(g,{extractData:e})),()=>{r.unmount(),o.remove()}}export{y as a,v as e,E as i,S as o,w as p};
