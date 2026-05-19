import{c as m,j as p,R as d}from"./client-BvckCBpw.js";const f=new Map;let u=!1;function y(r){if(u)return;u=!0;const t=window.XMLHttpRequest,o=t.prototype.open,a=t.prototype.send;t.prototype.open=function(s,e,...n){return this.__tcUrl=String(e),o.apply(this,[s,e,...n])},t.prototype.send=function(...s){const e=this.__tcUrl||"";return r.some(c=>c.test(e))&&this.addEventListener("load",function(){try{const c=JSON.parse(this.responseText);f.set(e,c)}catch{}}),a.apply(this,s)}}function h(r,t){for(const[o,a]of f.entries()){if(!r.test(o))continue;if(!t)return JSON.stringify(a);const s=t.split(".");let e=a;for(const n of s){if(e==null)return null;e=e[n]}return e!=null?String(e):null}return null}function v(r,t=document){var s;const o=r.transform??(e=>e),a=r.captureGroup??1;if(r.xhrPattern){const e=h(r.xhrPattern,r.jsonPath);if(e!=null)return{value:o(e),source:"xhr"}}if(r.selector){const e=t.querySelector(r.selector),n=(s=e==null?void 0:e.textContent)==null?void 0:s.trim();if(n)return{value:o(n),source:"selector"}}if(r.regex){const e=t instanceof Document?document.body.innerHTML:t.innerHTML,n=r.regex.exec(e);if(n&&n[a])return{value:o(n[a]),source:"regex"}}return null}function E(r){const t=r.replace(/[^0-9.]/g,"");return parseFloat(t)||0}function w(r,t,o=document.body){const a=document.querySelectorAll(r);a.length>0&&t(Array.from(a));const s=new WeakSet;a.forEach(n=>s.add(n));const e=new MutationObserver(()=>{const n=document.querySelectorAll(r),c=[];n.forEach(i=>{s.has(i)||(s.add(i),c.push(i))}),c.length>0&&t(c)});return e.observe(o,{childList:!0,subtree:!0}),()=>e.disconnect()}const g=`
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
`,x=({extractData:r})=>{const[t,o]=d.useState("idle");d.useEffect(()=>{var c;const n=i=>{i.action==="ITEM_REMOVED"&&t==="added"&&(o("idle"),console.log("[travel-cart][button] Reset to idle due to ITEM_REMOVED"))};if(typeof chrome<"u"&&((c=chrome.runtime)!=null&&c.onMessage))return chrome.runtime.onMessage.addListener(n),()=>chrome.runtime.onMessage.removeListener(n)},[t]);const a=async n=>{var c;if(n.stopPropagation(),n.preventDefault(),!(t==="added"||t==="loading")){o("loading");try{const i=r();console.log("[travel-cart][button] Click payload:",i);const l={action:"ADD_ITEM",payload:i};typeof chrome<"u"&&((c=chrome.runtime)!=null&&c.sendMessage)?await chrome.runtime.sendMessage(l):(window.postMessage({type:"TRAVEL_CART_ADD_ITEM",...l},"*"),console.log("[travel-cart] ADD_ITEM (dev mode):",i)),o("added")}catch(i){console.error("[travel-cart] Failed to add item:",i),o("error"),setTimeout(()=>o("idle"),3e3)}}},s={idle:"+ 行程单",loading:"添加中…",added:"✓ 已添加",error:"✗ 失败"}[t],e=["tc-btn",t==="added"&&"tc-btn--added",t==="loading"&&"tc-btn--loading"].filter(Boolean).join(" ");return p.jsx("button",{className:e,onClick:a,title:"添加到行程单",children:s})};function M(r,t){const o=document.createElement("div");o.className="travel-cart-inject",o.style.display="inline-block",o.style.marginLeft="8px",o.style.verticalAlign="middle";const a=o.attachShadow({mode:"closed"}),s=document.createElement("style");s.textContent=g,a.appendChild(s);const e=document.createElement("div");e.style.display="inline-block",a.appendChild(e),r.appendChild(o);const n=m.createRoot(e);return n.render(p.jsx(x,{extractData:t})),()=>{n.unmount(),o.remove()}}export{y as a,v as e,M as i,w as o,E as p};
