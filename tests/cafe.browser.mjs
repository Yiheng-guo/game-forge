import {chromium} from 'playwright';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {sandboxDocument} from '../src/sandbox.js';
const root=process.cwd();const html=await fs.readFile(root+'/public/examples/tidal-cafe.html','utf8');
const {existsSync}=await import('node:fs');const mac='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';const executable=process.env.CHROME_PATH||(existsSync(mac)?mac:undefined);const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{})});const p=await browser.newPage({viewport:{width:1100,height:900}});
try{
await p.clock.install();await p.setContent('<iframe sandbox="allow-scripts" style="border:0;width:1080px;height:860px"></iframe>');await p.locator('iframe').evaluate((f,doc)=>f.srcdoc=doc,sandboxDocument(html));const f=p.frameLocator('iframe');await f.getByRole('button',{name:'开门营业'}).click();let bought=false;
for(let i=0;i<9;i++){
 if(await f.locator('#brew').isEnabled())await f.locator('#brew').click();await p.clock.runFor(4500);
 for(let slot=1;slot<=8;slot++)await f.locator('body').press(String(slot));
 const coins=Number(await f.locator('#coins').innerText());
 if(!bought&&coins>=44){await f.locator('#delivery').press('Enter');await p.clock.runFor(100);console.log('delivery:',await f.locator('#deliveryStatus').innerText(),'toast:',await f.locator('#toast').innerText());assert.equal(Number(await f.locator('#coins').innerText()),coins-30);assert.ok((await f.locator('#deliveryStatus').innerText()).includes('已购买'));bought=true;}
 const income=Number((await f.locator('#income').innerText()).split('/')[0]);if(bought&&income>=48)break;
}
assert.ok(bought,'takeaway window should be purchasable after serving customers');
await p.clock.runFor(65000);
const title=await f.locator('#modalTitle').innerText(),body=await f.locator('#modalBody').innerText();
console.log({title,body});assert.equal(title,'今日打烊');assert.ok(body.includes('12'));
await p.screenshot({path:root+'/test-results/real-cafe-day-complete.png',fullPage:true});
console.log('Real model-produced game: brewing, serving, 30-coin purchase, daily 12-coin bonus and first-day success verified through controls and simulated browser time.');
}catch(e){await p.screenshot({path:root+'/test-results/cafe-mechanics-failure.png',fullPage:true});console.log('modal',await p.frameLocator('iframe').locator('#modalTitle').innerText());throw e;}finally{await browser.close();}
