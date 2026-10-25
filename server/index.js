import express from 'express';
import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store} from './store.js';
import {generate,status,smoke} from './generator.js';
import {inspectHtml} from './sandbox.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
export const app=express();const port=Number(process.env.PORT||4317),csrf=randomBytes(32).toString('hex');
const allowedHosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
app.disable('x-powered-by');
app.use((req,res,next)=>{
  if(!allowedHosts.has(req.headers.host))return res.status(403).json({error:'仅允许通过本机地址访问'});
  res.set({'X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer'});
  if(req.path.startsWith('/api/')){
    res.set('Cache-Control','no-store');
    if(req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'跨站请求已拒绝'});
    if(req.headers.origin && ![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin))return res.status(403).json({error:'来源不匹配'});
    if(!['/api/session','/api/health'].includes(req.path)){
      const token=req.headers['x-forge-token'];
      if(typeof token!=='string'||token.length!==csrf.length||!timingSafeEqual(Buffer.from(token),Buffer.from(csrf)))return res.status(403).json({error:'请刷新工作台后重试'});
    }
  }
  next();
});
app.use(express.json({limit:'1mb'}));

let seeds=[];
try{const {seedDefinitions}=await import('./seeds.js');seeds=await Promise.all(seedDefinitions.map(async seed=>({...seed,html:await fs.readFile(path.join(root,'public/examples',seed.file),'utf8'),origin:'example'})));}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const store=new Store(process.env.FORGE_DATA_DIR||path.join(root,'.data'));await store.init(seeds);
for(const project of store.data.projects){if(project.currentJob){project.currentJob=null;store.message(project,'system','上次生成因服务重启而中断，已有游戏版本已保留。');}}
await store.save();
const jobs=new Map();
const projectOf=(req,res)=>{const p=store.get(req.params.id);if(!p)res.status(404).json({error:'项目不存在'});return p;};
app.get('/api/session',(_req,res)=>res.json({token:csrf,version:'1.0.0'}));
app.get('/api/health',async(_req,res)=>res.json({local:true,...await status()}));
app.get('/api/projects',(_req,res)=>res.json(store.list()));
app.get('/api/projects/:id',(req,res)=>{const p=projectOf(req,res);if(p)res.json(p);});
app.post('/api/projects',async(req,res)=>{
  const title=typeof req.body.title==='string'?req.body.title.slice(0,80):'未命名游戏';
  if(store.data.projects.length>=100)return res.status(400).json({error:'最多保留 100 个项目，请先导出并清理旧项目'});
  const seed=seeds.find(s=>s.slug===req.body.template),p=store.create(seed?{...seed,origin:'example'}:{title});await store.save();res.status(201).json(p);
});
app.patch('/api/projects/:id',async(req,res)=>{
  const p=projectOf(req,res);if(!p)return;
  if(typeof req.body.title!=='string'||!req.body.title.trim())return res.status(400).json({error:'请输入项目名称'});
  p.title=req.body.title.trim().slice(0,80);p.updatedAt=new Date().toISOString();await store.save();res.json(p);
});
app.delete('/api/projects/:id',async(req,res)=>{
  const p=projectOf(req,res);if(!p)return;if(p.currentJob)return res.status(409).json({error:'请先取消正在进行的生成'});
  const trash=path.join(store.directory,'trash');await fs.mkdir(trash,{recursive:true});await fs.writeFile(path.join(trash,p.id+'.json'),JSON.stringify(p),{mode:0o600});
  store.data.projects=store.data.projects.filter(x=>x.id!==p.id);await store.save();res.json({deleted:true,recoverable:true});
});
app.post('/api/projects/:id/restore',async(req,res)=>{
  const p=projectOf(req,res);if(!p)return;if(p.currentJob)return res.status(409).json({error:'生成进行中，完成或取消后再切换工作版本'});
  const v=p.versions.find(v=>v.id===req.body.versionId);if(!v)return res.status(404).json({error:'版本不存在'});
  p.activeVersion=v.id;store.message(p,'system',`已恢复到 v${v.number}。后续修改会以这个版本为起点，其他版本仍保留。`);await store.save();res.json(p);
});
app.post('/api/projects/:id/code',async(req,res)=>{
  const p=projectOf(req,res);if(!p)return;if(p.currentJob)return res.status(409).json({error:'请等待当前生成完成'});
  const current=p.versions.find(v=>v.id===req.body.baseVersion);if(!current)return res.status(400).json({error:'请选择有效的基础版本'});
  const errors=inspectHtml(req.body.html);if(errors.length)return res.status(400).json({error:errors.join('\n')});
  const check=await smoke(req.body.html);if(check.runtime===false)return res.status(400).json({error:check.errors.join('\n')});
  store.commit(p,{...current,id:undefined,number:undefined,html:req.body.html,summary:'手动编辑了游戏代码',changes:['保存代码编辑'],thumbnail:check.thumbnail},{parent:current.id,origin:'manual',checks:{syntax:true,runtime:check.runtime,scope:check.scope}});
  // Store controls version identity; never accept source-owned ids.
  const v=p.versions.at(-1);v.id=randomUUID();v.number=p.versions.length;p.activeVersion=v.id;
  store.message(p,'assistant','代码已保存为新版本，之前的版本仍可恢复。');await store.save();res.json(p);
});
app.post('/api/projects/:id/generate',async(req,res)=>{
  const p=projectOf(req,res);if(!p)return;
  if(p.currentJob||[...jobs.values()].some(j=>['queued','running','checking','repairing'].includes(j.status)))return res.status(409).json({error:'已有一个生成任务正在运行，请完成或取消后再试'});
  const prompt=req.body.prompt;
  if(typeof prompt!=='string'||prompt.trim().length<2||prompt.length>6000)return res.status(400).json({error:'请用 2–6000 字描述玩法或修改要求'});
  const current=req.body.baseVersion?p.versions.find(v=>v.id===req.body.baseVersion):p.versions.find(v=>v.id===p.activeVersion);
  if(req.body.baseVersion&&!current)return res.status(400).json({error:'基础版本不存在'});
  const job={id:randomUUID(),projectId:p.id,status:'queued',stage:'准备创作',events:[],startedAt:Date.now(),error:null,versionId:null,controller:new AbortController()};
  jobs.set(job.id,job);p.currentJob=job.id;store.message(p,'user',prompt.trim());await store.save();res.status(202).json({jobId:job.id});
  const event=(stage,message)=>{job.stage=message;job.events.push({stage,message,at:new Date().toISOString()});};
  (async()=>{
    try{
      job.status='running';event('running',current?'正在基于所选版本修改游戏':'正在创作玩法、画面与交互');
      let output=await generate({prompt:prompt.trim(),current,feedback:req.body.feedback,signal:job.controller.signal,onEvent:event});
      if(job.controller.signal.aborted)throw Error('生成已取消');
      job.status='checking';event('checking','正在检查代码语法和隔离试玩区初始运行');
      let check=output.errors.length?{runtime:false,errors:output.errors}:await smoke(output.result.html);
      if(check.runtime===false){
        job.status='repairing';event('repairing','发现运行问题，正在进行一次修复');
        output=await generate({prompt:'修复下列实际错误并保留用户要求：'+prompt,current:output.result,feedback:check.errors,signal:job.controller.signal,onEvent:event});
        check=output.errors.length?{runtime:false,errors:output.errors}:await smoke(output.result.html);
      }
      if(job.controller.signal.aborted)throw Error('生成已取消');
      if(check.runtime===false)throw Error('运行检查未通过，原版本已保留：'+check.errors.join('；'));
      const v=store.commit(p,{...output.result,thumbnail:check.thumbnail},{parent:current?.id,checks:{syntax:true,runtime:check.runtime,scope:check.scope}});
      job.versionId=v.id;job.status='completed';event('completed',`v${v.number} 已可试玩`);
      store.message(p,'assistant',`${output.result.summary}\n\n${output.result.changes.map(s=>'• '+s).join('\n')}\n\n操作：${output.result.controls}`);
    }catch(e){job.status=job.controller.signal.aborted?'cancelled':'error';job.error=e.message;event(job.status,e.message);store.message(p,'system',e.message);}
    finally{p.currentJob=null;await store.save();}
  })().catch(e=>console.error('Job persistence failed:',e.message));
});
app.get('/api/jobs/:id',(req,res)=>{const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:'任务不存在或服务已重启'});const {controller,...data}=job;res.json(data);});
app.post('/api/jobs/:id/cancel',(req,res)=>{const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:'任务不存在'});if(['running','queued','checking','repairing'].includes(job.status))job.controller.abort();res.json({cancelled:job.controller.signal.aborted});});
app.use(express.static(path.join(root,'dist'),{index:'index.html'}));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'接口不存在'});res.sendFile(path.join(root,'dist/index.html'));});
app.use((error,_req,res,_next)=>{console.error(error.message);res.status(400).json({error:error.type==='entity.too.large'?'内容超出大小限制':error.message.slice(0,500)});});
const server=app.listen(port,'127.0.0.1',()=>console.log(`造游工作台 http://127.0.0.1:${port}`));
process.on('SIGTERM',()=>{for(const job of jobs.values())job.controller.abort();server.close(()=>process.exit());});
