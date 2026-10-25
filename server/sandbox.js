import vm from 'node:vm';

export function inspectHtml(html){
  const errors=[];
  if(typeof html!=='string'||html.length<300||html.length>300000)return ['游戏文档应在 300–300000 字符之间'];
  if(!/<html[\s>]/i.test(html)||!/<body[\s>]/i.test(html))errors.push('缺少完整 HTML 或 body');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  if(!scripts.length)errors.push('缺少可执行游戏逻辑');
  for(const [,attrs,source] of scripts){
    if(/\bsrc\s*=|\btype\s*=\s*["']module/i.test(attrs)){errors.push('请使用自包含的普通内联脚本');continue;}
    if(/type\s*=\s*["'](?:application\/json|importmap)/i.test(attrs))continue;
    try{new vm.Script(source);}catch(e){errors.push(`JavaScript 语法错误：${e.message}`);}
  }
  if(/<(?:iframe|object|embed|base)\b/i.test(html))errors.push('游戏不能嵌入外部文档或修改基础路径');
  return errors;
}

export const CSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
export function sandboxDocument(html){
  // Put the boundary before all model-authored content. CSP policies are additive.
  const bridge=`<script>(()=>{const send=(type,data)=>parent.postMessage({source:'game-forge',type,data},'*');window.addEventListener('error',e=>send('runtime-error',String(e.message).slice(0,1000)));window.addEventListener('unhandledrejection',e=>send('runtime-error',String(e.reason).slice(0,1000)));window.addEventListener('DOMContentLoaded',()=>send('loaded',{}));})();<\/script>`;
  const boundary=`<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="no-referrer">${bridge}`;
  return `<!doctype html>${boundary}`+html.replace(/<!doctype[^>]*>/gi,'');
}
