import {strToU8,strFromU8,deflateSync,inflateSync} from 'fflate';
export function encodeGame(version){
  const payload={schema:1,title:version.title,html:version.html,controls:version.controls,objective:version.objective};
  const compressed=deflateSync(strToU8(JSON.stringify(payload)),{level:8});
  const text=btoa(Array.from(compressed,b=>String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  if(text.length>60000)throw Error('游戏超过链接分享大小，请下载独立 HTML 分享');
  return text;
}
export function decodeGame(encoded){
  if(!encoded||encoded.length>60000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw Error('分享链接无效或超出大小限制');
  const binary=atob(encoded.replaceAll('-','+').replaceAll('_','/'));
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  // Fixed output bounds prevent compressed payloads allocating unbounded memory.
  const output=new Uint8Array(400000);
  const result=JSON.parse(strFromU8(inflateSync(bytes,{out:output})));
  if(result.schema!==1||typeof result.html!=='string'||result.html.length>300000||typeof result.title!=='string')throw Error('分享内容格式不受支持');
  return result;
}
