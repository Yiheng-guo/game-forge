let token='';
export async function connect(){
  const r=await fetch('./api/session',{cache:'no-store'});if(!r.ok)throw Error('当前不是本机创作服务');const data=await r.json();token=data.token;
}
export async function api(route,body,method){
  const r=await fetch('./api'+route,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json','x-forge-token':token},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'请求失败，请稍后重试');return data;
}
export async function examples(){
  const catalog=await (await fetch('./catalog.json')).json();
  return Promise.all(catalog.map(async(s,i)=>{const html=await(await fetch('./examples/'+s.file)).text();return {id:s.slug,title:s.title,genre:s.genre,description:s.description,activeVersion:s.slug+'-1',messages:[{id:'welcome',role:'assistant',content:s.description+'\n\n这是可直接试玩的示例项目。打开本机工作台后，可以通过对话修改和创作游戏。'}],versions:[{id:s.slug+'-1',number:1,title:s.title,summary:s.description,html,controls:s.controls,objective:s.description,changes:['示例初始版本'],origin:'example',checks:{syntax:true,runtime:null},createdAt:new Date().toISOString()}],updatedAt:new Date(Date.now()-i*60000).toISOString()};}));
}
