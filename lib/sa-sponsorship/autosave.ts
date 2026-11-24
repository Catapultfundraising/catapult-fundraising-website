import type { Operation, Receipt } from './schema';
export type Draft = Pick<Operation,'choice'|'comment'>;
export type SavePhase = 'idle'|'dirty'|'saving'|'saved'|'error';
type Sender = (operation:Readonly<Operation>)=>Promise<Receipt>;
const same=(a:Draft,b:Draft)=>a.choice===b.choice&&a.comment===b.comment;
/** One writer per prospect. Pending payloads never change after an ambiguous send. */
export class ProspectAutosave {
 draft:Draft;
 receipt:Receipt|undefined;
 pending:Readonly<Operation>|null=null;
 error='';
 saving=false;
 private running:Promise<void>|null=null;
 private timer:ReturnType<typeof setTimeout>|undefined;
 private listeners=new Set<()=>void>();
 constructor(private memberId:string,private prospectId:string,private rosterVersion:string,receipt:Receipt|undefined,private send:Sender,private acknowledged:(receipt:Receipt)=>void,private delay=600){
  this.receipt=receipt;this.draft={choice:receipt?.choice||'',comment:receipt?.comment||''};
 }
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 private emit(){for(const listener of Array.from(this.listeners))listener();}
 get dirty(){if(this.pending)return true;if(!this.receipt&&!this.draft.choice&&!this.draft.comment.trim())return false;return !same(this.draft,this.receipt||{choice:'',comment:''});}
 get phase():SavePhase{return this.error?'error':this.saving?'saving':this.dirty?'dirty':this.receipt?'saved':'idle';}
 edit(update:Partial<Draft>,immediate=false){
  this.draft={...this.draft,...update};this.cancelTimer();this.emit();
  // Preserve failed operation AND latest editable text; never an infinite retry loop.
  if(this.error)return;
  if(immediate){void this.flush().catch(()=>{});}else if(this.dirty){this.timer=setTimeout(()=>{this.timer=undefined;void this.flush().catch(()=>{});},this.delay);}
 }
 private cancelTimer(){if(this.timer!==undefined){clearTimeout(this.timer);this.timer=undefined;}}
 dispose(){this.cancelTimer();this.listeners.clear();}
 flush():Promise<void>{
  this.cancelTimer();if(this.running)return this.running;
  if(!this.dirty)return Promise.resolve();
  this.saving=true;this.error='';this.emit();
  this.running=this.drain().finally(()=>{this.running=null;this.saving=false;this.emit();});
  return this.running;
 }
 private async drain(){
  try{
   while(this.dirty){
    this.cancelTimer();
    const operation=this.pending||Object.freeze({operationId:crypto.randomUUID(),rosterVersion:this.rosterVersion,prospectId:this.prospectId,revision:(this.receipt?.revision||0)+1,...this.draft});
    this.pending=operation;
    const receipt=await this.send(operation);
    if(receipt.operationId!==operation.operationId||receipt.memberId!==this.memberId||receipt.prospectId!==operation.prospectId||receipt.rosterVersion!==operation.rosterVersion||receipt.revision!==operation.revision||!same(receipt,operation)||!Number.isFinite(Date.parse(receipt.savedAt)))throw new Error('Save acknowledgement could not be verified. Retry saving.');
    this.receipt=receipt;this.pending=null;this.error='';this.acknowledged(receipt);this.emit();
    // New edits are serialized behind the acknowledged revision, coalesced to latest text.
   }
  }catch(error){this.cancelTimer();this.error=error instanceof Error?error.message:'Save not confirmed. Retry saving.';this.emit();throw error;}
 }
}
