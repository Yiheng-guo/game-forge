import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export class Store{
  constructor(directory){this.directory=directory;this.file=path.join(directory,'projects.json');this.data={schema:1,projects:[]};this.queue=Promise.resolve();}
  async init(seeds=[]){
    await fs.mkdir(this.directory,{recursive:true,mode:0o700});
    try{const data=JSON.parse(await fs.readFile(this.file,'utf8'));if(data.schema!==1||!Array.isArray(data.projects))throw Error('Unsupported project format');this.data=data;}
    catch(e){if(e.code!=='ENOENT')throw new Error('项目数据无法读取，请先保留 projects.json 再恢复备份。');}
    for(const seed of [...seeds].reverse())if(!this.data.projects.some(p=>p.templateSlug===seed.slug))this.create({...seed,templateSlug:seed.slug});
    await this.save();
  }
  list(){return this.data.projects.map(({versions,messages,...p})=>({...p,versionCount:versions.length,thumbnail:versions.find(v=>v.id===p.activeVersion)?.thumbnail??null}));}
  get(id){return this.data.projects.find(p=>p.id===id);}
  create({title='未命名游戏',html='',genre='创意游戏',description='',controls='在试玩画面查看操作说明',origin='created',templateSlug=null}){
    const now=new Date().toISOString(),id=randomUUID();
    const v=html?{id:randomUUID(),number:1,title,html,summary:description,controls,objective:description,changes:['初始可玩版本'],createdAt:now,parent:null,origin,checks:{syntax:true,runtime:null}}:null;
    const project={id,title,genre,description,templateSlug,createdAt:now,updatedAt:now,activeVersion:v?.id??null,versions:v?[v]:[],messages:[],currentJob:null};
    if(v)project.messages.push({id:randomUUID(),role:'assistant',content:`${description}\n\n这是可直接游玩的示例项目。告诉我你想改变的玩法、画面或难度，我会在此基础上创建新版本。`,at:now});
    this.data.projects.unshift(project);return project;
  }
  message(p,role,content){const m={id:randomUUID(),role,content,at:new Date().toISOString()};p.messages.push(m);p.updatedAt=m.at;return m;}
  commit(p,result,{parent,origin='codex',checks={syntax:true,runtime:null}}={}){
    const {title,html,summary,controls,objective,genre,changes,thumbnail}=result;
    const v={title,html,summary,controls,objective,genre,changes,thumbnail,id:randomUUID(),number:p.versions.length+1,parent:parent??p.activeVersion,origin,checks,createdAt:new Date().toISOString()};
    p.versions.push(v);p.activeVersion=v.id;p.title=result.title||p.title;p.genre=result.genre||p.genre;p.description=result.summary||p.description;p.updatedAt=v.createdAt;return v;
  }
  save(){
    const snapshot=JSON.stringify(this.data);this.queue=this.queue.catch(()=>{}).then(async()=>{
      const temp=this.file+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,snapshot,{mode:0o600});
      try{await fs.copyFile(this.file,this.file+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;}
      await fs.rename(temp,this.file);
    });return this.queue;
  }
}
