#!/usr/bin/env node
/**
 * BeautyZone SQLite -> Supabase migration.
 * Dry-run is the default. Examples:
 *   node scripts/migrate-sqlite-to-supabase.js
 *   node scripts/migrate-sqlite-to-supabase.js --export=/secure/backup.json
 *   node scripts/migrate-sqlite-to-supabase.js --apply
 *   node scripts/migrate-sqlite-to-supabase.js --apply --send-recovery
 *
 * Requires Node 22+, DATABASE_PATH, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Password hashes, sessions and reset/verification tokens are never exported or imported.
 */
import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SQLITE_PATH = process.env.DATABASE_PATH || path.resolve('data/beautyzone.db');
const APP_URL = String(process.env.APP_URL || '').replace(/\/+$/, '');
const EXPORT_TABLES = ['users','salons','services','staff','subscriptions','bookings','salon_versions','loyalty_accounts','loyalty_transactions','loyalty_vouchers','waitlist','stylist_inquiries','platform_settings','audit_logs'];
const cleanEmail = (v) => String(v || '').trim().toLowerCase();
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const json = (v, fallback) => { if (v === null || v === undefined || v === '') return fallback; try { return JSON.parse(v); } catch { return fallback; } };
const bool = (v) => v === true || v === 1 || v === '1';
const iso = (v) => v ? new Date(v).toISOString() : new Date(0).toISOString();
const chunks = (items, size=100) => Array.from({length: Math.ceil(items.length/size)}, (_,i) => items.slice(i*size,(i+1)*size));

export function stableUuid(namespace, legacyId) {
  const hash = crypto.createHash('sha256').update(String(namespace) + ':' + String(legacyId)).digest();
  const bytes = Buffer.from(hash.subarray(0,16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = bytes.toString('hex');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}

function readSource(db) {
  const available = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
  const out = {};
  for (const t of EXPORT_TABLES) out[t] = available.has(t) ? db.prepare('SELECT * FROM "'+t+'"').all().map(x=>({...x})) : [];
  return out;
}

export function buildMigrationPlan(source) {
  const ids = {users:new Map(),salons:new Map(),services:new Map(),staff:new Map(),subscriptions:new Map(),bookings:new Map(),versions:new Map(),loyaltyAccounts:new Map(),transactions:new Map(),vouchers:new Map()};
  for (const x of source.users||[]) ids.users.set(x.id,stableUuid('users',x.id));
  for (const x of source.salons||[]) ids.salons.set(x.id,stableUuid('salons',x.id));
  for (const x of source.services||[]) ids.services.set(x.id,stableUuid('services',x.id));
  for (const x of source.staff||[]) ids.staff.set(x.id,stableUuid('staff',x.id));
  for (const x of source.subscriptions||[]) ids.subscriptions.set(x.id,stableUuid('subscriptions',x.id));
  for (const x of source.bookings||[]) ids.bookings.set(x.id,stableUuid('bookings',x.id));
  for (const x of source.salon_versions||[]) ids.versions.set(x.id,stableUuid('salon_versions',x.id));
  for (const x of source.loyalty_accounts||[]) ids.loyaltyAccounts.set(x.phone,stableUuid('loyalty_accounts',x.phone));
  for (const x of source.loyalty_transactions||[]) ids.transactions.set(x.id,stableUuid('loyalty_transactions',x.id));
  for (const x of source.loyalty_vouchers||[]) ids.vouchers.set(x.code,stableUuid('loyalty_vouchers',x.code));

  const profiles=(source.users||[]).filter(u=>validEmail(cleanEmail(u.email))).map(u=>({legacyId:u.id,id:ids.users.get(u.id),email:cleanEmail(u.email),name:u.name||'',role:u.role==='super_admin'?'super_admin':'salon_owner',status:u.status==='disabled'?'disabled':'active',email_verified:bool(u.email_verified),legacy_provider:u.auth_provider||'password',created_at:iso(u.created_at),updated_at:iso(u.updated_at)}));
  const salons=(source.salons||[]).map(x=>({
    id:ids.salons.get(x.id),owner_id:ids.users.get(x.owner_id),name:x.name,slug:x.slug,tagline:x.tagline||'',description:x.description||'',
    logo_url:x.logo_url||'',cover_image:x.cover_image||'',gallery:json(x.gallery_json,[]),phone:x.phone||'',email:x.email||'',whatsapp:x.whatsapp||'',
    address_line:x.address_line||'',city:x.city||'',state:x.state||'',postal_code:x.postal_code||'',country:x.country||'India',map_url:x.map_url||'',
    instagram:x.instagram||'',facebook:x.facebook||'',hero_title:x.hero_title||'',hero_subtitle:x.hero_subtitle||'',theme:json(x.theme_json,{}),
    website_published:bool(x.website_published),published_at:x.published_at||null,status:['draft','pending','approved','rejected','changes_requested'].includes(x.status)?x.status:'draft',
    submitted_at:x.submitted_at||null,approved_at:x.approved_at||null,review_note:x.review_note||'',reviewed_at:x.reviewed_at||null,suspended:bool(x.suspended),
    suspended_reason:x.suspended_reason||'',suspended_at:x.suspended_at||null,template_id:['luxe','minimal','noir','blush'].includes(x.template_id)?x.template_id:'luxe',
    timings:json(x.timings_json,[]),owner_name:x.owner_name||'',owner_phone:x.owner_phone||'',onboarding_completed:bool(x.onboarding_completed),created_at:iso(x.created_at),updated_at:iso(x.updated_at)
  })).filter(x=>x.owner_id);
  const services=(source.services||[]).map(x=>({id:ids.services.get(x.id),salon_id:ids.salons.get(x.salon_id),name:x.name,category:x.category||'other',description:x.description||'',price_paise:Number(x.price_paise||0),duration_minutes:Number(x.duration_minutes||30),image_url:x.image_url||'',active:bool(x.active),sort_order:Number(x.sort_order||0),created_at:iso(x.created_at),updated_at:iso(x.updated_at)})).filter(x=>x.salon_id);
  const staff=(source.staff||[]).map(x=>({id:ids.staff.get(x.id),salon_id:ids.salons.get(x.salon_id),name:x.name,role_title:x.role_title||'',bio:x.bio||'',photo_url:x.photo_url||'',specialties:json(x.specialties_json,[]),active:bool(x.active),booking_enabled:x.booking_enabled===undefined?true:bool(x.booking_enabled),sort_order:Number(x.sort_order||0),created_at:iso(x.created_at),updated_at:iso(x.updated_at)})).filter(x=>x.salon_id);
  const subscriptions=(source.subscriptions||[]).map(x=>({id:ids.subscriptions.get(x.id),salon_id:ids.salons.get(x.salon_id),plan:['trial','starter','pro','elite'].includes(x.plan)?x.plan:'trial',status:['trialing','active','past_due','canceled'].includes(x.status)?x.status:'trialing',current_period_end:x.current_period_end||null,created_at:iso(x.created_at),updated_at:iso(x.updated_at)})).filter(x=>x.salon_id);
  const serviceMap=new Map(services.map(x=>[x.salon_id+':'+String(x.name).toLowerCase(),x.id]));
  const staffMap=new Map(staff.map(x=>[x.salon_id+':'+String(x.name).toLowerCase(),x.id]));
  const bookings=(source.bookings||[]).map(x=>{const sid=ids.salons.get(x.salon_id)||null;const date=x.date||null;return {id:ids.bookings.get(x.id),salon_id:sid,reference:x.reference,full_name:x.full_name,phone:x.phone,email:x.email||null,service:x.service,service_id:sid?serviceMap.get(sid+':'+String(x.service).toLowerCase())||null:null,category:x.category||'',stylist:x.stylist||'',staff_id:sid?staffMap.get(sid+':'+String(x.stylist||'').toLowerCase())||null:null,booking_date:date,booking_time:x.time,date,time:x.time,location_type:x.location_type||'salon',branch:x.branch||'',address:x.address||'',locality:x.locality||'',distance_km:x.distance_km??null,bridal_trial:bool(x.bridal_trial),notes:x.notes||'',promo_code:x.promo_code||null,estimated_total:Number(x.estimated_total||0),advance_paid:Number(x.advance_paid||0),advance_ref:x.advance_ref||null,status:['requested','confirmed','declined','completed','cancelled'].includes(x.status)?x.status:'requested',source:x.source||'legacy',created_by:null,created_at:iso(x.created_at),updated_at:iso(x.updated_at)};}).filter(x=>x.booking_date);
  const versions=(source.salon_versions||[]).map(x=>{const sid=ids.salons.get(x.salon_id);if(!sid)return null;const snap=json(x.snapshot_json,{});if(Array.isArray(snap.services))snap.services=snap.services.map(s=>({...s,id:ids.services.get(s.id)||s.id}));if(Array.isArray(snap.staff))snap.staff=snap.staff.map(s=>({...s,id:ids.staff.get(s.id)||s.id}));return {id:ids.versions.get(x.id),salon_id:sid,version:Number(x.version),status:['pending','approved','rejected','changes_requested','superseded'].includes(x.status)?x.status:'rejected',snapshot:snap,content_hash:x.content_hash||null,submitted_at:iso(x.submitted_at),reviewed_at:x.reviewed_at||null,reviewed_by:null,review_note:x.review_note||'',submitted_by:null};}).filter(Boolean);
  const loyaltyAccounts=(source.loyalty_accounts||[]).map(x=>({id:ids.loyaltyAccounts.get(x.phone),owner_id:null,customer_id:null,phone:x.phone,name:x.name||'',member_id:x.member_id||'LEGACY-'+crypto.createHash('sha256').update(String(x.phone)).digest('hex').slice(0,12).toUpperCase(),tier:['silver','gold','platinum'].includes(x.tier)?x.tier:'silver',total_points:Number(x.total_points||0),lifetime_points:Number(x.lifetime_points||0),visits_count:Number(x.visits_count||0),created_at:iso(x.created_at),updated_at:iso(x.updated_at)}));
  const transactions=(source.loyalty_transactions||[]).map(x=>({id:ids.transactions.get(x.id),account_id:ids.loyaltyAccounts.get(x.phone),booking_id:ids.bookings.get(x.booking_id)||null,salon_id:ids.salons.get(x.salon_id)||null,service_title:x.service_title||'',bill_amount:Number(x.bill_amount||0),points:Number(x.points||0),transaction_type:['earn','redeem','bonus'].includes(x.type)?x.type:'bonus',type:x.type||'bonus',phone:x.phone,description:x.description||'',created_at:iso(x.created_at)})).filter(x=>x.account_id);
  const vouchers=(source.loyalty_vouchers||[]).map(x=>({id:ids.vouchers.get(x.code),code:x.code,account_id:ids.loyaltyAccounts.get(x.phone),phone:x.phone,offer_id:x.offer_id,title:x.title,discount_amount:Number(x.discount_amount||0),points_cost:Number(x.points_cost||0),used:bool(x.used),used_booking_id:ids.bookings.get(x.used_booking_id)||null,created_at:iso(x.created_at),expires_at:iso(x.expires_at)})).filter(x=>x.account_id);
  const waitlist=(source.waitlist||[]).map(x=>({id:stableUuid('waitlist',x.id),salon_id:ids.salons.get(x.salon_id)||null,full_name:x.full_name,phone:x.phone,email:x.email||null,service:x.service,requested_date:x.date,date:x.date,requested_time:x.time,time:x.time,status:['pending','notified','expired'].includes(x.status)?x.status:'pending',created_at:iso(x.created_at),updated_at:iso(x.updated_at)}));
  const inquiries=(source.stylist_inquiries||[]).map(x=>({id:stableUuid('stylist_inquiries',x.id),salon_id:ids.salons.get(x.salon_id)||null,stylist_id:ids.staff.get(x.stylist_id)||null,stylist_name:x.stylist_name||'',user_name:x.user_name,user_phone:x.user_phone,message:x.message,status:x.status||'new',created_at:iso(x.created_at)}));
  const settings=(source.platform_settings||[]).map(x=>({key:x.key,value:json(x.value,x.value),updated_by:null,updated_at:new Date().toISOString()}));
  const audits=(source.audit_logs||[]).map(x=>({id:stableUuid('audit_logs',x.id),actor_id:null,actor_email:x.actor_email||null,action:x.action,target_type:x.target_type||null,target_id:x.target_id||null,metadata:json(x.meta,null),meta:json(x.meta,null),ip:null,created_at:iso(x.created_at)}));
  return {profiles,salons,services,staff,subscriptions,salon_versions:versions,bookings,loyalty_accounts:loyaltyAccounts,loyalty_transactions:transactions,loyalty_vouchers:vouchers,waitlist,stylist_inquiries:inquiries,platform_settings:settings,audit_logs:audits,identityMap:ids,skippedUsers:(source.users||[]).filter(u=>!validEmail(cleanEmail(u.email))).map(u=>({legacyId:u.id,reason:'invalid_email'}))};
}

async function supa(pathname,options={}) {
  const headers=new Headers(options.headers||{});headers.set('apikey',SERVICE_KEY);headers.set('Authorization','Bearer '+SERVICE_KEY);
  if(options.body!==undefined&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
  const response=await fetch(SUPABASE_URL+pathname,{...options,headers});const text=await response.text();let value=null;
  if(text){try{value=JSON.parse(text);}catch{value=text;}}
  if(!response.ok)throw new Error('Supabase '+(options.method||'GET')+' '+pathname+' failed ('+response.status+'): '+(value?.message||value?.msg||JSON.stringify(value).slice(0,400)));
  return value;
}
function encryptedExport(value,passphrase){
  if(!passphrase||passphrase.length<16)throw new Error('MIGRATION_EXPORT_PASSPHRASE must be at least 16 characters for encrypted exports.');
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
  const key=crypto.scryptSync(passphrase,salt,32);
  const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return ['BZEXPORT1',salt.toString('base64'),iv.toString('base64'),tag.toString('base64'),encrypted.toString('base64')].join(String.fromCharCode(10))+String.fromCharCode(10);
}
async function listAuthUsers(){const byEmail=new Map();let page=1;for(;;){const data=await supa('/auth/v1/admin/users?page='+page+'&per_page=500');const users=Array.isArray(data?.users)?data.users:[];for(const u of users)if(u.email)byEmail.set(cleanEmail(u.email),u);if(users.length<500)break;page++;}return byEmail;}
async function upsertTable(name,rows){if(!rows.length)return {source:0,inserted:0};let inserted=0;for(const batch of chunks(rows,100)){const data=await supa('/rest/v1/'+name+'?on_conflict='+(name==='platform_settings'?'key':'id'),{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(batch)});inserted+=Array.isArray(data)?data.length:0;}return {source:rows.length,inserted,skipped:rows.length-inserted};}
async function reconcileTable(name,rows,key='id'){
  if(!rows.length)return {expected:0,found:0,missing:0};
  let found=0;
  const values=[...new Set(rows.map(x=>x[key]).filter(Boolean).map(String))];
  for(const batch of chunks(values,80)){
    const filter=batch.join(',');
    const result=await supa('/rest/v1/'+name+'?select='+key+'&'+key+'=in.('+encodeURIComponent(filter)+')',{method:'GET'});
    found+=Array.isArray(result)?result.length:0;
  }
  return {expected:values.length,found,missing:Math.max(0,values.length-found)};
}

export async function runMigration({apply=false,sendRecovery=false,exportPath=null}={}){
  if(!fs.existsSync(SQLITE_PATH))throw new Error('SQLite database not found at '+SQLITE_PATH);
  if(apply&&(!SUPABASE_URL||!SERVICE_KEY))throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the migration environment. Never add the service-role key to VITE_* or Git.');
  if(exportPath&&(!process.env.MIGRATION_EXPORT_PASSPHRASE||process.env.MIGRATION_EXPORT_PASSPHRASE.length<16))throw new Error('Set MIGRATION_EXPORT_PASSPHRASE (minimum 16 characters) to create an encrypted export.');
  if(sendRecovery&&!apply)throw new Error('--send-recovery requires --apply.');
  if(apply&&!sendRecovery)throw new Error('For safety, --apply requires --send-recovery so newly created legacy accounts receive a password-setup or confirmation email.');
  const db=new DatabaseSync(SQLITE_PATH,{readOnly:true});
  try{
    const source=readSource(db);const plan=buildMigrationPlan(source);
    const report={mode:apply?'apply':'dry-run',sqlitePath:SQLITE_PATH,sourceCounts:Object.fromEntries(EXPORT_TABLES.map(t=>[t,source[t].length])),plannedCounts:Object.fromEntries(Object.entries(plan).filter(([k,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])),skippedInvalidEmails:plan.skippedUsers.length,legacyGoogleCount:plan.profiles.filter(p=>p.legacy_provider==='google').length,imported:{},identity:{created:0,matched:0,recoveryQueued:0,confirmationQueued:0,errors:[]}};
    if(exportPath){const safe={exportedAt:new Date().toISOString(),data:source};safe.data.users=safe.data.users.map(({password_hash,google_sub,email_verification_token_hash,email_verification_expires,password_reset_token_hash,password_reset_expires,failed_logins,locked_until,...u})=>u);delete safe.data.sessions;const encrypted=encryptedExport(safe,process.env.MIGRATION_EXPORT_PASSPHRASE||'');fs.mkdirSync(path.dirname(path.resolve(exportPath)),{recursive:true});fs.writeFileSync(exportPath,encrypted,{mode:0o600,flag:'wx'});report.exportPath=path.resolve(exportPath);report.exportEncrypted=true;}
    if(!apply)return report;
    const authUsers=await listAuthUsers();const profileMap=new Map();
    for(const p of plan.profiles){
      let user=authUsers.get(p.email);
      let created=false;
      if(!user){
        const password=crypto.randomBytes(48).toString('base64url')+'Aa1!';
        user=await supa('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({
          email:p.email,password,email_confirm:p.email_verified,
          user_metadata:{name:p.name,legacy_user_id:p.legacyId,legacy_auth_provider:p.legacy_provider},
          app_metadata:{beautyzone_legacy_migration:true},
        })});
        report.identity.created++;
        created=true;
      }else report.identity.matched++;
      const uid=user.id;
      const existingProfiles=await supa('/rest/v1/profiles?id=eq.'+encodeURIComponent(uid)+'&select=id,role,legacy_user_id');
      const existingProfile=Array.isArray(existingProfiles)?existingProfiles[0]:null;
      if(existingProfile?.legacy_user_id && existingProfile.legacy_user_id!==p.legacyId){
        throw new Error('Identity conflict: '+p.email+' is already mapped to a different legacy user ID. Resolve manually before migration.');
      }
      if(existingProfile?.role==='customer' && p.role!=='customer'){
        throw new Error('Role conflict: '+p.email+' is already a customer account. It will not be silently promoted to '+p.role+'.');
      }
      profileMap.set(p.legacyId,uid);
      await supa('/rest/v1/profiles?id=eq.'+encodeURIComponent(uid),{
        method:'PATCH',headers:{Prefer:'return=minimal'},
        body:JSON.stringify({legacy_user_id:p.legacyId,name:p.name,role:p.role,status:p.status,auth_provider:'password',email_verified:p.email_verified,updated_at:p.updated_at}),
      });
      if(sendRecovery&&created){
        if(p.email_verified){
          await supa('/auth/v1/recover?redirect_to='+encodeURIComponent((APP_URL||'http://localhost:3000')+'/reset-password'),{
            method:'POST',body:JSON.stringify({email:p.email}),
          });
          report.identity.recoveryQueued++;
        }else{
          await supa('/auth/v1/resend',{method:'POST',body:JSON.stringify({
            type:'signup',email:p.email,options:{emailRedirectTo:(APP_URL||'http://localhost:3000')+'/verify-email'},
          })});
          report.identity.confirmationQueued=(report.identity.confirmationQueued||0)+1;
        }
      }
    }
    const profileId=(legacyId)=>profileMap.get(legacyId)||null;
    const importRows={
      salons:plan.salons.map(x=>({...x,owner_id:profileId(source.users.find(u=>plan.identityMap.users.get(u.id)===x.owner_id)?.id)})).filter(x=>x.owner_id),
      services:plan.services,staff:plan.staff,subscriptions:plan.subscriptions,
      salon_versions:plan.salon_versions.map(x=>{const raw=source.salon_versions.find(v=>plan.identityMap.versions.get(v.id)===x.id);return {...x,submitted_by:profileId(raw?.submitted_by),reviewed_by:profileId(raw?.reviewed_by)};}),
      bookings:plan.bookings,loyalty_accounts:plan.loyalty_accounts,loyalty_transactions:plan.loyalty_transactions,loyalty_vouchers:plan.loyalty_vouchers,
      waitlist:plan.waitlist,stylist_inquiries:plan.stylist_inquiries,platform_settings:plan.platform_settings,
      audit_logs:plan.audit_logs.map(x=>{const raw=source.audit_logs.find(v=>stableUuid('audit_logs',v.id)===x.id);return {...x,actor_id:profileId(raw?.actor_id)};})
    };
    const order=['salons','services','staff','subscriptions','salon_versions','bookings','loyalty_accounts','loyalty_transactions','loyalty_vouchers','waitlist','stylist_inquiries','platform_settings','audit_logs'];
    for(const table of order){try{report.imported[table]=await upsertTable(table,importRows[table]);}catch(error){report.imported[table]={source:importRows[table].length,error:error.message};report.failedTable=table;break;}}
    report.identity.needsGoogleProviderLink=report.legacyGoogleCount;
    const reconciliation={};
    const profileRows=plan.profiles.map(p=>({legacy_user_id:p.legacyId}));
    reconciliation.profiles=await reconcileTable('profiles',profileRows,'legacy_user_id');
    for(const table of order) reconciliation[table]=await reconcileTable(table,importRows[table]);
    report.reconciliation={
      profilesExpected:plan.profiles.length,profilesMapped:profileMap.size,tables:reconciliation,
      foreignKeysEnforcedByPostgres:true,passwordHashesMigrated:false,sessionsMigrated:false,
      legacyGoogleAccountsNeedProviderRelink:report.legacyGoogleCount,
    };
    return report;
  }finally{db.close();}
}

function parseArgs(argv){return {apply:argv.includes('--apply'),sendRecovery:argv.includes('--send-recovery'),exportPath:(argv.find(x=>x.startsWith('--export='))||'').slice(9)||null};}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(process.argv.includes('--help'))console.log('Dry-run by default. Use --apply to write; --send-recovery sends password setup emails; --export=/secure/path.enc writes an AES-256-GCM encrypted, redacted export. Set MIGRATION_EXPORT_PASSPHRASE (16+ chars).');
  else runMigration(parseArgs(process.argv.slice(2))).then(report=>{console.log(JSON.stringify(report,null,2));if(report.failedTable)process.exitCode=1;}).catch(error=>{console.error(error.message);process.exitCode=1;});
}