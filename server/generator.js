import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectHtml,sandboxDocument} from './sandbox.js';

const schema={type:'object',additionalProperties:false,properties:{title:{type:'string'},summary:{type:'string'},html:{type:'string'},controls:{type:'string'},objective:{type:'string'},genre:{type:'string'},changes:{type:'array',items:{type:'string'}}},required:['title','summary','html','controls','objective','genre','changes']};
const macCli='/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex';
export const codexPath=process.env.CODEX_BIN||(existsSync(macCli)?macCli:'codex');
let model='';
try{model=(await fs.readFile(path.join(os.homedir(),'.codex/config.toml'),'utf8')).match(/^model\s*=\s*"([^"\n]+)"/m)?.[1]??'';}catch{}
export const selectedModel=process.env.CODEX_MODEL||model;

export async function status(){
  return new Promise(resolve=>{
    const p=spawn(codexPath,['login','status'],{stdio:['ignore','pipe','pipe']});let text='';
    const timeout=setTimeout(()=>{p.kill();resolve({ready:false,model:selectedModel,reason:'Codex 登录检查超时'});},8000);
    p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>text+=b);
    p.on('error',()=>{clearTimeout(timeout);resolve({ready:false,model:selectedModel,reason:'没有找到 Codex CLI，请按 README 安装后重试'});});
    p.on('close',code=>{clearTimeout(timeout);resolve({ready:code===0,model:selectedModel,reason:code===0?'已通过本机登录检查':'请先运行 codex login'});});
  });
}
async function skillContext(){
  const root=path.resolve('skills');
  return (await Promise.all(['game-product-brief','game-engine-selection','game-code-quality','game-playtest-release','web-game-core','game-feel','game-ui-ux'].map(async name=>{
    try{return `## ${name}\n`+(await fs.readFile(path.join(root,name,'SKILL.md'),'utf8'));}catch{return '';}
  }))).join('\n').slice(0,28000);
}

export async function generate({prompt,current,feedback,signal,onEvent}){
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'game-forge-'));
  const output=path.join(temp,'result.json'),schemaFile=path.join(temp,'schema.json');
  await fs.writeFile(schemaFile,JSON.stringify(schema));
  const instruction=`You are Game Forge, a senior gameplay engineer and art director. Return only the JSON matching the provided schema. Do not use tools, inspect files, execute commands or access the network. All needed inputs are in this prompt.\n\nProduce a complete, polished PLAYABLE browser game as a SINGLE self-contained HTML document. Use vanilla JS Canvas2D and/or DOM, inline CSS, no external assets, imports, fetch, frames, analytics or dependencies. It runs in an opaque-origin iframe with connect-src none; localStorage and cookies may throw. Avoid persistence or wrap it in try/catch. Chinese player-facing UI. Title/menu, readable controls and objective, responsive mouse/keyboard/touch controls, real gameplay decisions, escalating content, clear victory/loss, pause and restart are required when appropriate. Use requestAnimationFrame with capped delta for continuous games; don't pause DOM buttons. Canvas pointer coordinates must account for displayed size. Render bright readable action against a crafted scene with layered visual design. Build specific mechanics from the user request, not the same template with changed colors. A requested change must preserve unrelated existing gameplay, content and controls. When editing return the FULL modified HTML, not a patch. Summary and changes must describe actual gameplay behavior, no unsupported claims of playtesting. Keep HTML under 80000 characters.\n\nDevelopment playbooks (guidance, not proof of execution):\n${await skillContext()}\n\nUser request:\n${JSON.stringify(prompt)}\n\n${current?`Existing game to preserve and modify:\n${JSON.stringify(current.html)}\nExisting objective: ${JSON.stringify(current.objective)}`:'This is a new game; choose a coherent genre, complete core loop and expressive visual direction.'}\n\n${feedback?`Actual validation/runtime feedback to fix:\n${JSON.stringify(feedback)}`:''}`;
  try{
    await new Promise((resolve,reject)=>{
      const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','-s','read-only','-c','features.shell_tool=false','-c','features.unified_exec=false','--json','--output-schema',schemaFile,'--output-last-message',output,'-C',temp];
      if(selectedModel)args.push('-m',selectedModel);
      args.push('-');
      const p=spawn(codexPath,args,{stdio:['pipe','pipe','pipe'],env:{...process.env,RUST_LOG:'error'}});
      let buffer='',stderr='',size=0,ended=false;
      const finish=err=>{if(ended)return;ended=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);err?reject(err):resolve();};
      const abort=()=>{p.kill('SIGTERM');setTimeout(()=>p.kill('SIGKILL'),1500).unref();finish(new Error('生成已取消；原有版本保持可用'));};
      const timer=setTimeout(()=>{p.kill('SIGTERM');finish(new Error('生成超过 8 分钟，已停止；可缩小需求后重试'));},480000);
      signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}
      p.on('error',e=>finish(new Error(e.code==='ENOENT'?'没有找到 Codex CLI':e.message)));
      p.stderr.on('data',b=>stderr=(stderr+b).slice(-8000));
      p.stdout.on('data',b=>{
        size+=b.length;if(size>3000000){p.kill();finish(new Error('模型输出超出安全大小限制'));return;}
        buffer+=b.toString();let cut;
        while((cut=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,cut);buffer=buffer.slice(cut+1);try{const e=JSON.parse(line);if(e.type==='thread.started')onEvent?.('connected','已连接 Codex，正在创作游戏');if(e.type==='item.completed'&&e.item?.type==='agent_message')onEvent?.('received','已收到模型返回，正在检查可运行版本');if(e.type==='error')stderr=String(e.message).slice(0,1000);}catch{}}
      });
      p.on('close',code=>finish(code===0?null:new Error(`Codex 生成失败${stderr?'：'+stderr.replace(/(?:sk-|gho_|eyJ)[A-Za-z0-9_.-]+/g,'[redacted]').slice(-1000):'，请检查登录状态与可用额度'}`)));
      p.stdin.end(instruction);
    });
    const result=JSON.parse(await fs.readFile(output,'utf8'));
    for(const field of schema.required)if(!(field in result))throw Error('模型输出缺少 '+field);
    if(['title','summary','html','controls','objective','genre'].some(key=>typeof result[key]!=='string')||!Array.isArray(result.changes)||result.changes.some(item=>typeof item!=='string'))throw Error('模型返回的游戏数据格式无效，原版本已保留');
    const errors=inspectHtml(result.html);return {result,errors};
  }finally{await fs.rm(temp,{recursive:true,force:true});}
}

export async function smoke(html){
  let browser;
  try{
    const {chromium}=await import('playwright');
    const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';let executable=process.env.CHROME_PATH;
    if(!executable){try{await fs.access(mac);executable=mac;}catch{}}
    browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});
    const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];page.setDefaultTimeout(6000);
    await page.route('**/*',route=>route.abort());
    await page.exposeFunction('reportGameError',value=>errors.push(String(value).slice(0,1000)));
    await page.setContent('<html><body style="margin:0;background:#101019"><iframe sandbox="allow-scripts" style="border:0;width:1100px;height:760px"></iframe></body></html>');
    await page.evaluate(()=>window.addEventListener('message',e=>{if(e.source===document.querySelector('iframe').contentWindow&&e.data?.source==='game-forge'&&e.data.type==='runtime-error')window.reportGameError(e.data.data);}));
    await page.locator('iframe').evaluate((frame,doc)=>frame.srcdoc=doc,sandboxDocument(html));
    await page.waitForTimeout(1800);
    const thumbnail=(await page.screenshot({type:'jpeg',quality:60,timeout:6000})).toString('base64');
    return {runtime:errors.length===0,errors,thumbnail:'data:image/jpeg;base64,'+thumbnail,scope:'初始加载检查；不代表完整通关或真人试玩'};
  }catch(e){return {runtime:browser?false:null,errors:browser?['浏览器初始运行失败或超时：'+e.message.slice(0,180)]:[],thumbnail:null,scope:'运行检查不可用：'+e.message.slice(0,180)};}
  finally{await browser?.close();}
}
