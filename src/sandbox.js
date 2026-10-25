export const CSP="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
export function sandboxDocument(html){
  const bridge=`<script>(()=>{const send=(type,data)=>parent.postMessage({source:'game-forge',type,data},'*');window.addEventListener('error',e=>send('runtime-error',String(e.message).slice(0,1000)));window.addEventListener('unhandledrejection',e=>send('runtime-error',String(e.reason).slice(0,1000)));window.addEventListener('DOMContentLoaded',()=>send('loaded',{}));})();<\/script>`;
  const boundary=`<meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="referrer" content="no-referrer">${bridge}`;
  return `<!doctype html>${boundary}`+html.replace(/<!doctype[^>]*>/gi,'');
}
