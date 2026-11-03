import { Router } from 'express';
import {
  SupabaseApiError, getSupabaseContext, requestSupabase, rest, rpc,
  getSalonForOwner, getSalonById, getServices, getStaff, getSubscription,
  getVersions, getWorkflow, userPayload, mapSalon, mapService, mapStaff,
  mapSubscription, mapVersion, buildSnapshot, hashSnapshot, writeAudit,
  livePayload, getLiveSalon, isoNow, uuid,
} from '../supabase-store.js';
import { generateSlots, FALLBACK_TIMINGS, DEFAULT_SLOT_MINUTES, DEFAULT_LEAD_MINUTES } from '../availability.js';

export const supabaseOperationsRouter = Router();
const hasBearer = (req) => /^Bearer\s+\S+/i.test(String(req.get('authorization') || ''));
const asyncRoute = (fn) => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const fail = (status, message, code) => { throw new SupabaseApiError(status, message, code); };
const s = (v, max=500, required=false) => {
  const value = typeof v === 'string' ? v.trim() : '';
  if (required && !value) fail(400, 'Required field is missing.');
  if (value.length > max) fail(400, 'A field exceeds the allowed length.');
  return value;
};
const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
const bool = (v, fallback=false) => v === undefined ? fallback : v === true || v === 1 || v === 'true';
const num = (v, min=0, max=100000000, fallback=0) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) fail(400, 'A numeric value is invalid.');
  return Math.round(n);
};
const isoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) && !Number.isNaN(Date.parse(value+'T12:00:00Z'));
const time24 = (value) => {
  const raw = String(value || '').trim();
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) return raw;
  const m=raw.match(/^(0?\d|1[0-2]):([0-5]\d)\s?(AM|PM)$/i);
  if(!m) fail(400,'Please choose a valid time slot.');
  let h=Number(m[1]); if(m[3].toUpperCase()==='PM'&&h!==12)h+=12;if(m[3].toUpperCase()==='AM'&&h===12)h=0;
  return String(h).padStart(2,'0')+':'+m[2];
};
const role = (ctx, needed) => { if(!ctx) fail(401,'Authentication required.'); if(ctx.role!==needed) fail(403,'You do not have permission to perform this action.'); };
const admin = (ctx) => role(ctx,'super_admin');
const owner = (ctx) => role(ctx,'salon_owner');
const one = async (ctx, table, query) => (await rest(ctx,table,query))[0] || null;
const write = async (ctx, table, rows, prefer='return=representation') =>
  rest(ctx,table,'',{method:'POST',body:Array.isArray(rows)?rows:[rows],prefer});
const update = async (ctx, table, query, patch) => rest(ctx,table,query,{method:'PATCH',body:patch,prefer:'return=representation'});
const remove = async (ctx, table, query) => rest(ctx,table,query,{method:'DELETE',prefer:'return=minimal'});
const ownSalonOrFail = async (ctx) => {
  owner(ctx);
  const salon=await getSalonForOwner(ctx);
  if(!salon) fail(409,'Complete salon onboarding first.','ONBOARDING_REQUIRED');
  return salon;
};
const audit = (ctx, action, targetType=null, targetId=null, metadata=null) => writeAudit(ctx,action,targetType,targetId,metadata);
const settingsDefaults = {platformName:'BeautyZone',supportEmail:'support@beautyzone.app',allowRegistrations:true,trialDays:14,maintenanceMessage:'',defaultPlan:'starter'};
const redirectUrl = (req, path) => {
  const configured = String(process.env.APP_URL || '').trim();
  let base = configured;
  if (!base) {
    const candidate = req.get('origin') || (req.get('referer') ? new URL(req.get('referer')).origin : null);
    base = candidate || (req.protocol + '://' + req.get('host'));
  }
  return new URL(path, base.replace(/\/+$/, '') + '/').toString();
};
const getSettings = async (ctx) => {
  const rows=await rest(ctx,'platform_settings','select=key,value');
  return {...settingsDefaults,...Object.fromEntries(rows.map(x=>[x.key,x.value]))};
};
const saveSettings = async (ctx, patch) => {
  const values=Object.entries(patch).map(([key,value])=>({key,value,updated_by:ctx.id,updated_at:isoNow()}));
  if(values.length) await rest(ctx,'platform_settings','on_conflict=key',{method:'POST',body:values,prefer:'resolution=merge-duplicates,return=minimal'});
  return getSettings(ctx);
};
const salonPatchMap={
  name:'name',tagline:'tagline',description:'description',logoUrl:'logo_url',coverImage:'cover_image',
  phone:'phone',email:'email',whatsapp:'whatsapp',addressLine:'address_line',city:'city',state:'state',
  postalCode:'postal_code',country:'country',mapUrl:'map_url',instagram:'instagram',facebook:'facebook',
  heroTitle:'hero_title',heroSubtitle:'hero_subtitle',theme:'theme',gallery:'gallery',
  timings:'timings',templateId:'template_id',ownerName:'owner_name',ownerPhone:'owner_phone',
};
const serviceRow=(b,salonId,index=0)=>({
  salon_id:salonId,name:s(b.name,120,true),category:s(b.category||'other',30),
  description:s(b.description,2000),price_paise:num(b.pricePaise ?? (b.price!==undefined?Number(b.price)*100:undefined),0,100000000,0),
  duration_minutes:num(b.durationMinutes,5,1440,30),image_url:s(b.imageUrl,2000000),
  active:bool(b.active,true),sort_order:num(b.sortOrder,0,10000,index),updated_at:isoNow(),
});
const staffRow=(b,salonId,index=0)=>({
  salon_id:salonId,name:s(b.name,120,true),role_title:s(b.roleTitle,120),
  bio:s(b.bio,1500),photo_url:s(b.photoUrl,2000000),
  specialties:Array.isArray(b.specialties)?b.specialties.slice(0,20).map(x=>s(x,60)):[],
  active:bool(b.active,true),booking_enabled:bool(b.bookingEnabled,true),
  sort_order:num(b.sortOrder,0,10000,index),updated_at:isoNow(),
});
const mapBooking=(r)=>({
  id:r.id,reference:r.reference,fullName:r.full_name,phone:r.phone,email:r.email||'',
  service:r.service,serviceId:r.service_id,category:r.category||'',stylist:r.stylist||'',
  staffId:r.staff_id,date:r.date,time:r.time,locationType:r.location_type||'salon',
  branch:r.branch||'',address:r.address||'',locality:r.locality||'',distanceKm:r.distance_km,
  bridalTrial:Boolean(r.bridal_trial),notes:r.notes||'',promoCode:r.promo_code||'',
  estimatedTotal:Number(r.estimated_total||0),advancePaid:Number(r.advance_paid||0),
  advanceRef:r.advance_ref||'',status:r.status,source:r.source,createdAt:r.created_at,updatedAt:r.updated_at,
});

// Attach the authenticated Supabase identity only to requests that carry a Supabase JWT.
// Requests without a bearer token continue through the legacy middleware/routes during migration.
supabaseOperationsRouter.use(asyncRoute(async(req,res,next)=>{
  if(!hasBearer(req)) return next();
  req.sb=await getSupabaseContext(req);
  return next();
}));

// Auth bridge: the browser already signed in with Supabase; return the profile + salon from Postgres.
// No SQLite user/session is created for Supabase-authenticated users.
supabaseOperationsRouter.post('/auth/supabase-session', asyncRoute(async(req,res)=>{
  if(!req.sb) fail(401,'Supabase sign-in required.');
  res.json(await userPayload(req.sb));
}));
supabaseOperationsRouter.get('/auth/me', asyncRoute(async(req,res)=>{
  if(!req.sb) return res.json({user:null,salon:null,workflow:null,subscription:null,onboardingRequired:false});
  res.json(await userPayload(req.sb));
}));
supabaseOperationsRouter.post('/auth/logout', asyncRoute(async(req,res)=>{
  if(req.sb) await requestSupabase('/auth/v1/logout',req.sb.token,{method:'POST'});
  res.json({ok:true});
}));
supabaseOperationsRouter.post('/auth/logout-all', asyncRoute(async(req,res)=>{
  if(!req.sb) fail(401,'Authentication required.');
  await requestSupabase('/auth/v1/logout?scope=global',req.sb.token,{method:'POST'});
  res.json({ok:true});
}));
supabaseOperationsRouter.post('/auth/resend-verification', asyncRoute(async(req,res)=>{
  if(!req.sb) fail(401,'Sign in before requesting another verification email.');
  if(req.sb.emailVerified) return res.json({ok:true,message:'Your email is already verified.'});
  await requestSupabase('/auth/v1/resend',null,{
    method:'POST',
    body:{type:'signup',email:req.sb.email,options:{emailRedirectTo:redirectUrl(req,'/verify-email')}},
  });
  res.json({ok:true,message:'A confirmation email was requested. Check your inbox.'});
}));

// Salon onboarding, profile, approvals, staff, services and subscription.
supabaseOperationsRouter.get('/salon', asyncRoute(async(req,res)=>{
  const salon=await getSalonForOwner(req.sb);
  if(!salon) return res.json({salon:null,workflow:null,versions:[],subscription:null});
  const [versions,workflow,subscription]=await Promise.all([
    getVersions(req.sb,salon.id),getWorkflow(req.sb,salon),getSubscription(req.sb,salon.id),
  ]);
  res.json({salon:mapSalon(salon),workflow,versions,subscription});
}));
supabaseOperationsRouter.post('/salon/onboarding', asyncRoute(async(req,res)=>{
  owner(req.sb);
  const result=await rpc(req.sb,'create_salon_onboarding',{p_data:req.body||{}});
  await audit(req.sb,'salon.onboarding_completed','salon',result.salon?.id);
  res.status(201).json({salon:mapSalon(result.salon),subscription:mapSubscription(result.subscription)});
}));
supabaseOperationsRouter.patch('/salon', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const patch={updated_at:isoNow()};
  for(const [key,column] of Object.entries(salonPatchMap)){
    if(req.body?.[key]===undefined) continue;
    const value=req.body[key];
    if(['gallery','theme','timings'].includes(key)){
      if(key==='gallery'&&!Array.isArray(value)) fail(400,'Gallery must be a list.');
      if(key==='theme'&&!isObject(value)) fail(400,'Theme must be an object.');
      if(key==='timings'&&!Array.isArray(value)) fail(400,'Opening hours must be a list.');
      patch[column]=value;
    }else patch[column]=s(value,key==='description'?3000:key==='logoUrl'||key==='coverImage'?2000000:500);
  }
  if(req.body?.slug!==undefined){
    const nextSlug=s(req.body.slug,60).toLowerCase();
    const available=nextSlug===salon.slug?true:await rpc(req.sb,'is_salon_slug_available',{p_slug:nextSlug});
    if(!available) fail(409,'That salon website address is already taken.');
    patch.slug=nextSlug;
  }
  const rows=await update(req.sb,'salons','id=eq.'+encodeURIComponent(salon.id),patch);
  const next=rows[0]||await getSalonForOwner(req.sb);
  await audit(req.sb,'salon.updated','salon',salon.id,{fields:Object.keys(patch)});
  res.json({salon:mapSalon(next),workflow:await getWorkflow(req.sb,next)});
}));
supabaseOperationsRouter.post('/salon/submit', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const [services,staff]=await Promise.all([getServices(req.sb,salon.id),getStaff(req.sb,salon.id)]);
  const snapshot=buildSnapshot(salon,await rest(req.sb,'services','salon_id=eq.'+salon.id+'&select=*&order=sort_order.asc,created_at.asc'),await rest(req.sb,'staff','salon_id=eq.'+salon.id+'&select=*&order=sort_order.asc,created_at.asc'));
  const version=await rpc(req.sb,'submit_salon_for_approval',{p_salon_id:salon.id,p_snapshot:snapshot,p_content_hash:hashSnapshot(snapshot)});
  const updated=await getSalonForOwner(req.sb);
  await audit(req.sb,'salon.submitted_for_review','salon',salon.id,{version:version.version});
  res.status(201).json({salon:mapSalon(updated),workflow:await getWorkflow(req.sb,updated),version:mapVersion(version)});
}));
supabaseOperationsRouter.get('/salon/versions', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const versions=await getVersions(req.sb,salon.id);
  res.json({versions:versions.map(v=>({...v,pendingChanges:v.status==='pending'})),workflow:await getWorkflow(req.sb,salon)});
}));
supabaseOperationsRouter.post('/salon/publish', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const workflow=await getWorkflow(req.sb,salon);
  if(!workflow.canPublish) fail(409,'Your website must have an approved version and verified email before publishing.','APPROVAL_REQUIRED');
  const rows=await update(req.sb,'salons','id=eq.'+encodeURIComponent(salon.id),{website_published:true,published_at:salon.published_at||isoNow(),updated_at:isoNow()});
  await audit(req.sb,'salon.published','salon',salon.id);
  res.json({salon:mapSalon(rows[0]||salon),workflow:await getWorkflow(req.sb,rows[0]||salon),url:'/salon/'+salon.slug});
}));
supabaseOperationsRouter.post('/salon/unpublish', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const rows=await update(req.sb,'salons','id=eq.'+encodeURIComponent(salon.id),{website_published:false,updated_at:isoNow()});
  await audit(req.sb,'salon.unpublished','salon',salon.id);
  res.json({salon:mapSalon(rows[0]||salon),workflow:await getWorkflow(req.sb,rows[0]||salon)});
}));
supabaseOperationsRouter.get('/salon/subscription', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  res.json({subscription:await getSubscription(req.sb,salon.id)});
}));

supabaseOperationsRouter.post('/salon/uploads', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const kind=s(req.query.kind,20)||'image';
  if(!['logo','cover','gallery','staff'].includes(kind)) fail(400,'Unsupported upload type.');
  const mime=String(req.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
  const ext=extensions[mime];
  const data=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
  if(!ext||data.length<12||data.length>5*1024*1024) fail(400,'Choose a valid PNG, JPEG, WEBP or GIF image under 5 MB.');
  const valid=(mime==='image/png'&&data[0]===0x89&&data[1]===0x50&&data[2]===0x4e&&data[3]===0x47)
    ||(mime==='image/jpeg'&&data[0]===0xff&&data[1]===0xd8&&data[2]===0xff)
    ||(mime==='image/gif'&&data.subarray(0,3).toString('ascii')==='GIF')
    ||(mime==='image/webp'&&data.subarray(0,4).toString('ascii')==='RIFF'&&data.subarray(8,12).toString('ascii')==='WEBP');
  if(!valid) fail(415,'The uploaded file content does not match its image type.');
  const key=req.sb.id+'/'+kind+'/'+uuid()+'.'+ext;
  await requestSupabase('/storage/v1/object/beautyzone-assets/'+key,req.sb.token,{
    method:'POST',headers:{'Content-Type':mime,'x-upsert':'true'},body:data,
  });
  await audit(req.sb,'salon.image_uploaded','salon',salon.id,{kind,size:data.length});
  res.status(201).json({url:'https://botkjeikjzhnbxnowdkl.supabase.co/storage/v1/object/public/beautyzone-assets/'+key});
}));
supabaseOperationsRouter.get('/salon/services', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb); res.json({services:await getServices(req.sb,salon.id)});
}));
supabaseOperationsRouter.post('/salon/services', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb), existing=await getServices(req.sb,salon.id);
  const rows=await write(req.sb,'services',{...serviceRow(req.body||{},salon.id,existing.length)});
  await audit(req.sb,'service.created','service',rows[0]?.id);
  res.status(201).json({service:mapService(rows[0])});
}));
supabaseOperationsRouter.patch('/salon/services/:serviceId', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const current=await one(req.sb,'services','id=eq.'+encodeURIComponent(req.params.serviceId)+'&salon_id=eq.'+encodeURIComponent(salon.id)+'&select=*');
  if(!current) fail(404,'Service not found.');
  const patch={};
  const fields=serviceRow({...current,...req.body,pricePaise:req.body?.pricePaise??current.price_paise,durationMinutes:req.body?.durationMinutes??current.duration_minutes},salon.id,current.sort_order);
  for(const key of ['name','category','description','price_paise','duration_minutes','image_url','active','sort_order','updated_at']) if(req.body?.[({price_paise:'pricePaise',duration_minutes:'durationMinutes',image_url:'imageUrl',sort_order:'sortOrder'})[key]||key]!==undefined||key==='updated_at') patch[key]=fields[key];
  const rows=await update(req.sb,'services','id=eq.'+encodeURIComponent(current.id)+'&salon_id=eq.'+encodeURIComponent(salon.id),patch);
  await audit(req.sb,'service.updated','service',current.id);
  res.json({service:mapService(rows[0]||current)});
}));
supabaseOperationsRouter.delete('/salon/services/:serviceId', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  await remove(req.sb,'services','id=eq.'+encodeURIComponent(req.params.serviceId)+'&salon_id=eq.'+encodeURIComponent(salon.id));
  await audit(req.sb,'service.deleted','service',req.params.serviceId); res.json({ok:true});
}));
supabaseOperationsRouter.get('/salon/staff', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb); res.json({staff:await getStaff(req.sb,salon.id)});
}));
supabaseOperationsRouter.post('/salon/staff', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb),existing=await getStaff(req.sb,salon.id);
  const rows=await write(req.sb,'staff',staffRow(req.body||{},salon.id,existing.length));
  await audit(req.sb,'staff.created','staff',rows[0]?.id); res.status(201).json({staff:mapStaff(rows[0])});
}));
supabaseOperationsRouter.patch('/salon/staff/:staffId', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const current=await one(req.sb,'staff','id=eq.'+encodeURIComponent(req.params.staffId)+'&salon_id=eq.'+encodeURIComponent(salon.id)+'&select=*');
  if(!current) fail(404,'Staff member not found.');
  const fields=staffRow({...current,...req.body},salon.id,current.sort_order);
  const patch={};
  const names={role_title:'roleTitle',photo_url:'photoUrl',booking_enabled:'bookingEnabled',sort_order:'sortOrder'};
  for(const key of ['name','role_title','bio','photo_url','specialties','active','booking_enabled','sort_order','updated_at']) if(req.body?.[names[key]||key]!==undefined||key==='updated_at') patch[key]=fields[key];
  const rows=await update(req.sb,'staff','id=eq.'+encodeURIComponent(current.id)+'&salon_id=eq.'+encodeURIComponent(salon.id),patch);
  await audit(req.sb,'staff.updated','staff',current.id);res.json({staff:mapStaff(rows[0]||current)});
}));
supabaseOperationsRouter.delete('/salon/staff/:staffId', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  await remove(req.sb,'staff','id=eq.'+encodeURIComponent(req.params.staffId)+'&salon_id=eq.'+encodeURIComponent(salon.id));
  await audit(req.sb,'staff.deleted','staff',req.params.staffId);res.json({ok:true});
}));

// Subscription payments are records pending provider verification; clients can never mark a charge paid.
supabaseOperationsRouter.get('/salon/subscription/payments', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const rows=await rest(req.sb,'subscription_payments','salon_id=eq.'+encodeURIComponent(salon.id)+'&select=*&order=created_at.desc&limit=100');
  res.json({payments:rows});
}));
supabaseOperationsRouter.post('/salon/subscription/payments', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const provider=s(req.body?.provider,20,true);
  if(!['razorpay','phonepe','cashfree','upi','manual'].includes(provider)) fail(400,'Unsupported payment provider.');
  const plan=s(req.body?.plan,20,true);
  if(!['trial','starter','pro','elite'].includes(plan)) fail(400,'Invalid subscription plan.');
  const amountPaise=num(req.body?.amountPaise,1,100000000);
  const rows=await write(req.sb,'subscription_payments',{
    salon_id:salon.id,provider,provider_reference:s(req.body?.providerReference,150,true),
    amount_paise:amountPaise,currency:'INR',status:'pending',plan,
    metadata:isObject(req.body?.metadata)?req.body.metadata:{},
  });
  await audit(req.sb,'subscription.payment_created','subscription_payment',rows[0]?.id,{provider,plan,amountPaise});
  res.status(201).json({payment:rows[0]});
}));

// Owner appointment list / status changes.
supabaseOperationsRouter.get('/salon/bookings', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb),status=s(req.query.status,20);
  let query='salon_id=eq.'+encodeURIComponent(salon.id)+'&select=*&order=date.desc,time.desc&limit=200';
  if(status) query+='&status=eq.'+encodeURIComponent(status);
  const rows=await rest(req.sb,'bookings',query);
  res.json({bookings:rows.map(mapBooking)});
}));
supabaseOperationsRouter.patch('/salon/bookings/:bookingId', asyncRoute(async(req,res)=>{
  const salon=await ownSalonOrFail(req.sb);
  const status=s(req.body?.status,20,true);
  if(!['requested','confirmed','declined','completed','cancelled'].includes(status)) fail(400,'Invalid booking status.');
  if(status==='completed'){
    const result=await rpc(req.sb,'complete_salon_booking',{p_booking_id:req.params.bookingId});
    await audit(req.sb,'booking.status_changed','booking',req.params.bookingId,{status,loyaltyReward:result.loyaltyReward||null});
    res.json({booking:mapBooking(result.booking),loyaltyReward:result.loyaltyReward||null});
    return;
  }
  const rows=await update(req.sb,'bookings','id=eq.'+encodeURIComponent(req.params.bookingId)+'&salon_id=eq.'+encodeURIComponent(salon.id),{status,updated_at:isoNow()});
  if(!rows[0]) fail(404,'Booking not found.');
  await audit(req.sb,'booking.status_changed','booking',rows[0].id,{status});
  res.json({booking:mapBooking(rows[0]),loyaltyReward:null});
}));

// Admin dashboard, identity management, approvals, subscriptions and audit.
supabaseOperationsRouter.get('/admin/overview', asyncRoute(async(req,res)=>{
  admin(req.sb);
  const [profiles,salons,bookings,payments,versions]=await Promise.all([
    rest(req.sb,'profiles','select=id,role,status'),rest(req.sb,'salons','select=id,website_published,status,suspended'),
    rest(req.sb,'bookings','select=id,status'),rest(req.sb,'subscription_payments','select=id,status'),
    rest(req.sb,'salon_versions','select=id,status'),
  ]);
  res.json({stats:{
    owners:profiles.filter(x=>x.role==='salon_owner').length,admins:profiles.filter(x=>x.role==='super_admin').length,
    salons:salons.length,published:salons.filter(x=>x.website_published).length,
    pendingApprovals:versions.filter(x=>x.status==='pending').length,
    bookings:bookings.length,pendingBookings:bookings.filter(x=>x.status==='requested').length,
    payments:payments.filter(x=>x.status==='pending').length,
  }});
}));
supabaseOperationsRouter.get('/admin/users', asyncRoute(async(req,res)=>{
  admin(req.sb);
  const rows=await rest(req.sb,'profiles','select=*&order=created_at.desc&limit=500');
  const users=await Promise.all(rows.map(async p=>{
    const salon=await one(req.sb,'salons','owner_id=eq.'+p.id+'&select=id,name,slug,website_published,status,suspended&limit=1');
    const sub=salon?await one(req.sb,'subscriptions','salon_id=eq.'+salon.id+'&select=plan,status&limit=1'):null;
    return {...{
      id:p.id,email:p.email,name:p.name,role:p.role,status:p.status||'active',
      emailVerified:Boolean(p.email_verified),authProvider:'password',createdAt:p.created_at,
    },salon:salon?{id:salon.id,name:salon.name,slug:salon.slug,published:salon.website_published,status:salon.status,suspended:salon.suspended}:null,
    subscription:sub?{plan:sub.plan,status:sub.status}:null};
  }));
  res.json({users});
}));
supabaseOperationsRouter.post('/admin/users', asyncRoute(async(req,res)=>{
  admin(req.sb);
  const name=s(req.body?.name,120,true);
  const email=s(req.body?.email,254,true).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail(400,'Please enter a valid email address.');
  const password=typeof req.body?.password==='string'?req.body.password:'';
  if(password.length<8||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)) fail(400,'Password must be at least 8 characters and include a letter and a number.');
  const role=['super_admin','salon_owner','customer'].includes(req.body?.role)?req.body.role:'salon_owner';
  const created=await requestSupabase('/auth/v1/signup',null,{
    method:'POST',body:{email,password,data:{name,full_name:name}},
  });
  const user=created?.user||created;
  if(!user?.id) fail(502,'Supabase Auth did not return the new user.');
  // The database trigger creates the profile with the safe default salon_owner role.
  // Only an already-authorized super admin can assign elevated application roles.
  if(role!=='salon_owner'){
    const rows=await update(req.sb,'profiles','id=eq.'+encodeURIComponent(user.id),{role,updated_at:isoNow()});
    if(!rows[0]) fail(502,'The account was created but its admin role could not be assigned.');
  }
  const profile=await one(req.sb,'profiles','id=eq.'+encodeURIComponent(user.id)+'&select=*&limit=1');
  await audit(req.sb,'admin.user_created','user',user.id,{role});
  res.status(201).json({user:{
    id:user.id,email:user.email||email,name:profile?.name||name,role:profile?.role||'salon_owner',
    status:profile?.status||'active',emailVerified:Boolean(user.email_confirmed_at||profile?.email_verified),
    authProvider:'password',createdAt:profile?.created_at||user.created_at,
  }});
}));
supabaseOperationsRouter.patch('/admin/users/:userId', asyncRoute(async(req,res)=>{
  admin(req.sb); const patch={updated_at:isoNow()};
  if(req.body?.name!==undefined) patch.name=s(req.body.name,120,true);
  if(req.body?.status!==undefined){if(!['active','disabled'].includes(req.body.status))fail(400,'Invalid account status.');patch.status=req.body.status;}
  if(req.body?.role!==undefined){if(!['super_admin','salon_owner','customer'].includes(req.body.role))fail(400,'Invalid application role.');if(req.params.userId===req.sb.id&&req.body.role!=='super_admin')fail(400,'You cannot remove your own super admin role.');patch.role=req.body.role;}
  const rows=await update(req.sb,'profiles','id=eq.'+encodeURIComponent(req.params.userId),patch);
  if(!rows[0]) fail(404,'User not found.');
  await audit(req.sb,'admin.user_updated','user',req.params.userId,{fields:Object.keys(patch)});
  res.json({user:{id:rows[0].id,email:rows[0].email,name:rows[0].name,role:rows[0].role,status:rows[0].status,emailVerified:rows[0].email_verified}});
}));
supabaseOperationsRouter.post('/admin/users/:userId/reset-password', asyncRoute(async(req,res)=>{
  admin(req.sb);
  const profile=await one(req.sb,'profiles','id=eq.'+encodeURIComponent(req.params.userId)+'&select=email&limit=1');
  if(!profile) fail(404,'User not found.');
  await requestSupabase('/auth/v1/recover?redirect_to='+encodeURIComponent(redirectUrl(req,'/reset-password')),null,{method:'POST',body:{email:profile.email}});
  await audit(req.sb,'admin.password_reset_email_sent','user',req.params.userId);
  res.json({ok:true,message:'Password recovery email requested.'});
}));
supabaseOperationsRouter.get('/admin/salons', asyncRoute(async(req,res)=>{
  admin(req.sb);let query='select=*&order=created_at.desc&limit=500';
  if(req.query.city&&req.query.city!=='all')query+='&city=ilike.'+encodeURIComponent(req.query.city);
  const salons=await rest(req.sb,'salons',query);
  const result=await Promise.all(salons.map(async row=>{
    const profile=await one(req.sb,'profiles','id=eq.'+row.owner_id+'&select=id,name,email,status,email_verified&limit=1');
    const sub=await getSubscription(req.sb,row.id);
    const services=await rest(req.sb,'services','salon_id=eq.'+row.id+'&select=id');
    return mapSalon(row,{owner:profile?{id:profile.id,name:profile.name,email:profile.email,status:profile.status,emailVerified:profile.email_verified}:null,subscription:sub,serviceCount:services.length});
  }));
  const cities=Array.from(new Set(['Jaipur',...salons.map(x=>x.city).filter(Boolean)])).sort((a,b)=>a==='Jaipur'?-1:b==='Jaipur'?1:a.localeCompare(b));
  res.json({salons:result,cities,filter:{city:req.query.city||null,q:req.query.q||null}});
}));
supabaseOperationsRouter.get('/admin/salons/:salonId', asyncRoute(async(req,res)=>{
  admin(req.sb);const salon=await getSalonById(req.sb,req.params.salonId);if(!salon)fail(404,'Salon not found.');
  const [profile,services,staff,sub,workflow]=await Promise.all([
    one(req.sb,'profiles','id=eq.'+salon.owner_id+'&select=*&limit=1'),
    getServices(req.sb,salon.id),getStaff(req.sb,salon.id),getSubscription(req.sb,salon.id),getWorkflow(req.sb,salon),
  ]);
  res.json({salon:mapSalon(salon,{owner:profile?{id:profile.id,name:profile.name,email:profile.email,status:profile.status}:null}),workflow,services,staff,subscription:sub});
}));
supabaseOperationsRouter.patch('/admin/salons/:salonId', asyncRoute(async(req,res)=>{
  admin(req.sb);const salon=await getSalonById(req.sb,req.params.salonId);if(!salon)fail(404,'Salon not found.');
  const patch={updated_at:isoNow()};
  const map={name:'name',tagline:'tagline',description:'description',city:'city',addressLine:'address_line',phone:'phone',email:'email',slug:'slug',logoUrl:'logo_url'};
  for(const [key,col] of Object.entries(map))if(req.body?.[key]!==undefined)patch[col]=s(req.body[key],key==='description'?3000:2000);
  if(req.body?.suspended!==undefined){patch.suspended=bool(req.body.suspended);patch.suspended_reason=patch.suspended?s(req.body.suspendReason,500)||'Suspended by platform administration.':'';patch.suspended_at=patch.suspended?isoNow():null;if(patch.suspended)patch.website_published=false;}
  if(req.body?.published!==undefined){if(bool(req.body.published)){const versions=await getVersions(req.sb,salon.id);if(salon.suspended||!versions.some(v=>v.status==='approved'))fail(409,'Approve a submission and clear suspension before publishing.');patch.website_published=true;patch.published_at=salon.published_at||isoNow();}else patch.website_published=false;}
  const rows=await update(req.sb,'salons','id=eq.'+salon.id,patch);await audit(req.sb,'admin.salon_updated','salon',salon.id,{fields:Object.keys(patch)});
  res.json({salon:mapSalon(rows[0]||salon)});
}));
supabaseOperationsRouter.get('/admin/subscriptions', asyncRoute(async(req,res)=>{
  admin(req.sb);const rows=await rest(req.sb,'subscriptions','select=*,salons(name,slug,owner_id)&order=updated_at.desc&limit=500');
  const result=await Promise.all(rows.map(async row=>{const profile=await one(req.sb,'profiles','id=eq.'+row.salons?.owner_id+'&select=email&limit=1');return {...mapSubscription(row),salonName:row.salons?.name||'',salonSlug:row.salons?.slug||'',ownerEmail:profile?.email||''};}));
  res.json({subscriptions:result});
}));
supabaseOperationsRouter.patch('/admin/subscriptions/:subscriptionId', asyncRoute(async(req,res)=>{
  admin(req.sb);const sub=await one(req.sb,'subscriptions','id=eq.'+req.params.subscriptionId+'&select=*&limit=1');if(!sub)fail(404,'Subscription not found.');
  const patch={updated_at:isoNow()};
  if(req.body?.plan!==undefined){if(!['trial','starter','pro','elite'].includes(req.body.plan))fail(400,'Invalid plan.');patch.plan=req.body.plan;}
  if(req.body?.status!==undefined){if(!['trialing','active','past_due','canceled'].includes(req.body.status))fail(400,'Invalid subscription status.');patch.status=req.body.status;}
  if(req.body?.currentPeriodEnd!==undefined)patch.current_period_end=req.body.currentPeriodEnd?new Date(req.body.currentPeriodEnd).toISOString():null;
  if(req.body?.extendDays!==undefined){const days=num(req.body.extendDays,1,3650);patch.current_period_end=new Date(Math.max(Date.now(),new Date(sub.current_period_end||Date.now()).getTime())+days*86400000).toISOString();}
  const rows=await update(req.sb,'subscriptions','id=eq.'+sub.id,patch);await audit(req.sb,'admin.subscription_updated','subscription',sub.id,{fields:Object.keys(patch)});
  res.json({subscription:mapSubscription(rows[0]||sub)});
}));
supabaseOperationsRouter.get('/admin/subscription-payments', asyncRoute(async(req,res)=>{
  admin(req.sb);const rows=await rest(req.sb,'subscription_payments','select=*,salons(name,slug)&order=created_at.desc&limit=500');res.json({payments:rows});
}));
supabaseOperationsRouter.post('/admin/subscription-payments/:paymentId/verify', asyncRoute(async(req,res)=>{
  admin(req.sb);const result=await rpc(req.sb,'verify_subscription_payment',{p_payment_id:req.params.paymentId});
  await audit(req.sb,'admin.subscription_payment_verified','subscription_payment',req.params.paymentId);
  res.json(result);
}));
supabaseOperationsRouter.get('/admin/approvals', asyncRoute(async(req,res)=>{
  admin(req.sb);const status=s(req.query.status,30)||'pending';
  if(!['pending','approved','rejected','changes_requested','superseded','all'].includes(status))fail(400,'Invalid approval status filter.');
  const filter=status==='all'?'':'&status=eq.'+encodeURIComponent(status);
  const [versions,pendingRows]=await Promise.all([
    rest(req.sb,'salon_versions','select=*&order=submitted_at.desc&limit=200'+filter),
    rest(req.sb,'salon_versions','select=id&status=eq.pending'),
  ]);
  const approvals=await Promise.all(versions.map(async v=>{
    const salon=await getSalonById(req.sb,v.salon_id);
    const profile=salon?await one(req.sb,'profiles','id=eq.'+salon.owner_id+'&select=name,email,email_verified&limit=1'):null;
    return {...mapVersion(v),snapshot:v.snapshot,salon:salon?{id:salon.id,name:salon.name,slug:salon.slug,city:salon.city,published:salon.website_published,suspended:salon.suspended,status:salon.status}:null,owner:profile?{name:profile.name,email:profile.email,emailVerified:profile.email_verified}:null};
  }));
  res.json({pendingCount:pendingRows.length,approvals});
}));
supabaseOperationsRouter.get('/admin/approvals/:versionId', asyncRoute(async(req,res)=>{
  admin(req.sb);const version=await one(req.sb,'salon_versions','id=eq.'+req.params.versionId+'&select=*&limit=1');if(!version)fail(404,'Submission not found.');
  const salon=await getSalonById(req.sb,version.salon_id);const profile=salon?await one(req.sb,'profiles','id=eq.'+salon.owner_id+'&select=*&limit=1'):null;
  const versions=await getVersions(req.sb,version.salon_id);
  res.json({version:mapVersion(version),snapshot:version.snapshot,salon:mapSalon(salon,{owner:profile?{id:profile.id,name:profile.name,email:profile.email,status:profile.status}:null}),workflow:await getWorkflow(req.sb,salon),isLiveVersion:versions.find(v=>v.status==='approved')?.id===version.id});
}));
supabaseOperationsRouter.post('/admin/approvals/:versionId/review', asyncRoute(async(req,res)=>{
  admin(req.sb);const action=s(req.body?.action,30,true),note=s(req.body?.note,1000);
  if(!['approve','reject','request_changes'].includes(action))fail(400,'Choose approve, reject or request changes.');
  if(action!=='approve'&&!note)fail(400,'A review note is required for this decision.');
  const result=await rpc(req.sb,'review_salon_submission',{p_version_id:req.params.versionId,p_action:action,p_note:note});
  await audit(req.sb,'admin.submission_'+action,'salon',result.salon?.id,{version:result.version?.version,note});
  res.json({version:mapVersion(result.version),salon:mapSalon(result.salon)});
}));
supabaseOperationsRouter.get('/admin/salons/:salonId/versions', asyncRoute(async(req,res)=>{
  admin(req.sb);const salon=await getSalonById(req.sb,req.params.salonId);if(!salon)fail(404,'Salon not found.');
  const versions=await getVersions(req.sb,salon.id),workflow=await getWorkflow(req.sb,salon);
  res.json({versions,workflow,hasUnpublishedChanges:workflow.hasUnpublishedChanges,pending:workflow.pendingVersion});
}));
supabaseOperationsRouter.get('/admin/settings', asyncRoute(async(req,res)=>{admin(req.sb);res.json({settings:await getSettings(req.sb)});}));
supabaseOperationsRouter.patch('/admin/settings', asyncRoute(async(req,res)=>{
  admin(req.sb);const b=req.body||{},patch={};
  if(b.platformName!==undefined)patch.platformName=s(b.platformName,80,true);
  if(b.supportEmail!==undefined){const email=s(b.supportEmail,254,true);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Support email must be valid.');patch.supportEmail=email.toLowerCase();}
  if(b.allowRegistrations!==undefined)patch.allowRegistrations=bool(b.allowRegistrations);
  if(b.trialDays!==undefined)patch.trialDays=num(b.trialDays,0,365);
  if(b.maintenanceMessage!==undefined)patch.maintenanceMessage=s(b.maintenanceMessage,500);
  if(b.defaultPlan!==undefined){if(!['trial','starter','pro','elite'].includes(b.defaultPlan))fail(400,'Invalid default plan.');patch.defaultPlan=b.defaultPlan;}
  const settings=await saveSettings(req.sb,patch);await audit(req.sb,'admin.settings_updated','platform_settings',null,{keys:Object.keys(patch)});
  res.json({settings});
}));
supabaseOperationsRouter.get('/admin/audit-logs', asyncRoute(async(req,res)=>{
  admin(req.sb);const rows=await rest(req.sb,'audit_logs','select=*&order=created_at.desc&limit=200');
  res.json({logs:rows.map(r=>({id:r.id,actorEmail:r.actor_email,action:r.action,targetType:r.target_type,targetId:r.target_id,meta:r.metadata||r.meta||null,ip:r.ip,createdAt:r.created_at}))});
}));

// Public directory, live salon content and appointment booking. Public writes remain RLS constrained.
supabaseOperationsRouter.get('/public/salons', asyncRoute(async(req,res)=>{
  const city=s(req.query.city,100),q=s(req.query.q,100);
  let query='select=*&website_published=eq.true&status=in.(approved,pending)&suspended=eq.false&order=published_at.desc&limit=60';
  if(city&&city.toLowerCase()!=='all')query+='&city=ilike.'+encodeURIComponent(city);
  if(q)query+='&or=(name.ilike.*'+encodeURIComponent(q)+'*,tagline.ilike.*'+encodeURIComponent(q)+'*,city.ilike.*'+encodeURIComponent(q)+'*)';
  const salons=await rest(req.sb,'salons',query);
  const result=await Promise.all(salons.map(async row=>{
    const versions=await rest(req.sb,'salon_versions','salon_id=eq.'+row.id+'&status=eq.approved&select=snapshot&order=version.desc&limit=1');
    const snapshot=versions[0]?.snapshot;
    const count=(snapshot?.services||[]).filter(x=>x.active).length;
    return {id:row.id,name:snapshot?.salon?.name||row.name,slug:row.slug,tagline:snapshot?.salon?.tagline||row.tagline,city:row.city,state:row.state,logoUrl:snapshot?.salon?.logoUrl||row.logo_url,coverImage:snapshot?.salon?.coverImage||row.cover_image,templateId:row.template_id,serviceCount:count,url:'/salon/'+row.slug};
  }));
  const cities=Array.from(new Set(['Jaipur',...salons.map(x=>x.city).filter(Boolean)])).sort((a,b)=>a==='Jaipur'?-1:b==='Jaipur'?1:a.localeCompare(b));
  res.json({salons:result,cities,total:result.length,filter:{city:city||null,q:q||null}});
}));
supabaseOperationsRouter.get('/public/salons/:slug', asyncRoute(async(req,res)=>{
  const rows=await rest(req.sb,'salons','slug=eq.'+encodeURIComponent(req.params.slug)+'&website_published=eq.true&status=in.(approved,pending)&suspended=eq.false&select=*&limit=1');
  if(!rows[0])fail(404,'This salon website is not available.');
  const versions=await rest(req.sb,'salon_versions','salon_id=eq.'+rows[0].id+'&status=eq.approved&select=*&order=version.desc&limit=1');
  if(!versions[0])fail(404,'This salon website is not available.');
  res.json(livePayload({salon:rows[0],version:versions[0],snapshot:versions[0].snapshot}));
}));
supabaseOperationsRouter.get('/public/tenant',asyncRoute(async(req,res)=>{
  const host=String(req.get('x-forwarded-host')||req.get('host')||'').split(',')[0].trim().toLowerCase();
  const explicit=s(req.query.slug,60).toLowerCase();
  const subdomain=host.endsWith('.beautyzone.app')?host.slice(0,-'.beautyzone.app'.length):'';
  const slug=explicit||subdomain;
  if(!slug||! /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug))return res.json({tenant:{mode:'path',slug:null,found:false,reason:'not_found'}});
  const live=await getLiveSalon(req.sb,slug);
  const salon=live?.salon||null;
  res.json({tenant:salon?{mode:'subdomain',slug,salonId:salon.id,salonName:salon.name,found:true}:{mode:'subdomain',slug,found:false,reason:'not_found'}});
}));
supabaseOperationsRouter.get('/public/slug-available',asyncRoute(async(req,res)=>{
  const slug=s(req.query.slug,60).toLowerCase();
  if(!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(slug)||slug.includes('--'))return res.json({available:false,reason:'Use 3–60 letters, numbers or hyphens.'});
  const available=await rpc(req.sb,'is_salon_slug_available',{p_slug:slug});
  res.json({available,reason:available?null:'Already taken',url:'/salon/'+slug,suggestedSubdomain:slug+'.beautyzone.app'});
}));
supabaseOperationsRouter.get('/public/templates',(req,res)=>res.json({templates:[
  {id:'luxe',name:'Luxe Gold',description:'Rich navy + gold editorial layout with image-led hero.',premium:false},
  {id:'minimal',name:'Minimal Ivory',description:'Airy, typography-first layout for modern studios.',premium:false},
  {id:'noir',name:'Noir Studio',description:'High-contrast dark hero with bold service cards.',premium:true},
  {id:'blush',name:'Blush Atelier',description:'Soft rose palette with a gentle, romantic feel.',premium:false},
]}));
supabaseOperationsRouter.get('/public/availability',asyncRoute(async(req,res)=>{
  const date=s(req.query.date,10,true);if(!isoDate(date))fail(400,'Select a valid date.');
  const slug=s(req.query.slug,60);
  let timings=FALLBACK_TIMINGS,source='default',salonName=null;
  if(slug){
    const live=await getLiveSalon(req.sb,slug);
    if(live){timings=live.snapshot?.salon?.timings||FALLBACK_TIMINGS;source='salon';salonName=live.salon.name;}
  }
  const duration=num(req.query.duration,1,1440,60),slot=num(req.query.slot,5,240,DEFAULT_SLOT_MINUTES),offset=num(req.query.tzOffset,-840,840,0);
  const result=generateSlots({date,timings,durationMinutes:duration,slotMinutes:slot,leadMinutes:DEFAULT_LEAD_MINUTES,timeZoneOffsetMinutes:offset});
  res.set('Cache-Control','no-store');
  res.json({date:result.date,day:result.day,open:result.open||null,close:result.close||null,closed:Boolean(result.closed),slots:result.slots||[],reason:result.reason||null,source,salonName,degraded:source==='default'});
}));
supabaseOperationsRouter.post('/public/bookings',asyncRoute(async(req,res)=>{
  const b=req.body||{};
  const name=s(b.fullName,120,true),phone=s(b.phone,40,true);
  const service=s(b.service,160,true),date=s(b.date,10,true),time=time24(b.time);
  if(phone.replace(/\D/g,'').length<8) fail(400,'Phone must contain at least 8 digits.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date());
  if(!isoDate(date)||date<today) fail(400,'Please choose today or a future date.');
  const slug=s(b.slug,60);
  const live=slug?await getLiveSalon(req.sb,slug):null;
  if(slug&&!live) fail(404,'Salon not found.');
  const salon=live?.salon||null;
  let approvedService=null,approvedStaff=null,bookingServiceId=null,bookingStaffId=null;
  if(salon){
    const snapshotServices=Array.isArray(live.snapshot?.services)?live.snapshot.services:[];
    approvedService=snapshotServices.find(item=>item.active&&(
      (b.serviceId&&item.id===b.serviceId)||String(item.name||'').trim().toLowerCase()===service.toLowerCase()
    ))||null;
    if(!approvedService) fail(400,'Selected service is not part of the live approved salon website.');
    const serviceRow=await one(req.sb,'services','id=eq.'+encodeURIComponent(approvedService.id)+'&salon_id=eq.'+encodeURIComponent(salon.id)+'&select=id&limit=1');
    bookingServiceId=serviceRow?.id||null;
    const stylistName=s(b.stylist,120);
    if(b.staffId||stylistName){
      const snapshotStaff=Array.isArray(live.snapshot?.staff)?live.snapshot.staff:[];
      approvedStaff=snapshotStaff.find(item=>item.active&&item.bookingEnabled!==false&&(
        (b.staffId&&item.id===b.staffId)||(!b.staffId&&String(item.name||'').trim().toLowerCase()===stylistName.toLowerCase())
      ))||null;
      if(!approvedStaff) fail(400,'Selected specialist is not part of the live approved salon website.');
      const staffRow=await one(req.sb,'staff','id=eq.'+encodeURIComponent(approvedStaff.id)+'&salon_id=eq.'+encodeURIComponent(salon.id)+'&select=id&limit=1');
      bookingStaffId=staffRow?.id||null;
    }
    const duration=Number(approvedService.durationMinutes||60);
    const slots=generateSlots({date,timings:live.snapshot?.salon?.timings||FALLBACK_TIMINGS,durationMinutes:duration,slotMinutes:DEFAULT_SLOT_MINUTES,leadMinutes:DEFAULT_LEAD_MINUTES,timeZoneOffsetMinutes:330});
    if(slots.closed||!slots.slots?.some(slot=>slot.value===time)) fail(409,'That time is not available. Please choose an available slot.');
  }
  const payload={
    id:uuid(),
    reference:'BZ-'+Date.now().toString(36).toUpperCase()+'-'+uuid().slice(0,5).toUpperCase(),
    salon_id:salon?.id||null,
    full_name:name,
    phone,
    email:s(b.email,254)||null,
    service,
    service_id:bookingServiceId,
    category:s(b.serviceCategory||b.category||approvedService?.category||'',80),
    stylist:s(b.stylist,120),
    staff_id:bookingStaffId,
    date,
    time,
    location_type:b.locationType==='home'?'home':'salon',
    branch:s(b.branch,120),
    address:s(b.address,300),
    locality:s(b.locality,150),
    distance_km:b.distanceKm===undefined?null:Number(b.distanceKm),
    bridal_trial:bool(b.bridalTrial),
    notes:s(b.notes,2000),
    promo_code:s(b.promoCode,100)||null,
    estimated_total:approvedService?num(approvedService.pricePaise,0,100000000,0):num(b.estimatedTotal,0,100000000,0),
  };
  if(payload.service_id&&!/^[0-9a-f-]{36}$/i.test(payload.service_id)) fail(400,'Invalid service.');
  if(payload.staff_id&&!/^[0-9a-f-]{36}$/i.test(payload.staff_id)) fail(400,'Invalid specialist.');
  const result=await rpc(req.sb,'create_public_booking',{p_booking:payload});
  const booking=result.booking||result;
  await audit(req.sb,'booking.created','booking',booking?.id,{
    salonId:salon?.id||null,date,time,discountApplied:result.discountApplied||0,
  });
  res.status(201).json({
    booking:mapBooking(booking),
    salon:salon?{name:salon.name,slug:salon.slug,phone:salon.phone}:null,
    warning:result.highDemand?'This slot is in high demand — the salon may offer the nearest alternative.':null,
  });
}));
supabaseOperationsRouter.post('/public/stylist-inquiry',asyncRoute(async(req,res)=>{
  const b=req.body||{};
  const requestedSalon=s(b.salonId,80,true);
  const live=/^[0-9a-f-]{36}$/i.test(requestedSalon)
    ? null
    : await getLiveSalon(req.sb,requestedSalon);
  const salon=live?.salon||await one(req.sb,'salons','id=eq.'+encodeURIComponent(requestedSalon)+'&website_published=eq.true&status=in.(approved,pending)&suspended=eq.false&select=id,slug&limit=1');
  if(!salon) fail(404,'Salon not found.');
  const stylistId=s(b.stylistId,80,true);
  const stylist=await one(req.sb,'staff','id=eq.'+encodeURIComponent(stylistId)+'&salon_id=eq.'+encodeURIComponent(salon.id)+'&active=eq.true&select=id,name&limit=1');
  if(!stylist) fail(404,'This specialist is not available.');
  const userName=s(b.userName,120,true),userPhone=s(b.userPhone,40,true),message=s(b.message,2000,true);
  if(userPhone.replace(/\D/g,'').length<8) fail(400,'Please enter a valid phone number.');
  await write(req.sb,'stylist_inquiries',{
    salon_id:salon.id,stylist_id:stylist.id,stylist_name:s(b.stylistName,120)||stylist.name,
    user_name:userName,user_phone:userPhone,message,status:'new',
  },'return=minimal');
  res.status(201).json({success:true,message:'Inquiry sent successfully.'});
}));

supabaseOperationsRouter.post('/public/waitlist',asyncRoute(async(req,res)=>{
  const b=req.body||{},slug=s(b.slug,60),live=slug?await getLiveSalon(req.sb,slug):null;
  if(slug&&!live)fail(404,'Salon not found.');
  const date=s(b.date,10,true);if(!isoDate(date))fail(400,'Select a valid date.');
  const time=time24(b.time),record={
    salon_id:live?.salon?.id||null,full_name:s(b.fullName,120,true),phone:s(b.phone,40,true),
    email:s(b.email,254)||null,service:s(b.service,160,true),date, time,
    requested_date:date,requested_time:time,status:'pending',
  };
  const rows=await write(req.sb,'waitlist',record);res.status(201).json({message:'You have been added to the waitlist.',id:rows[0]?.id});
}));

// Loyalty is deliberately locked behind Supabase phone OTP; a phone number typed into a form is not proof of ownership.
const offers=[
 {id:'rew-1',title:'₹200 Instant Salon Discount',description:'Valid on any haircut, styling, or grooming service bill across all studio branches.',pointsCost:200,discountAmount:200,discountValue:'₹200 Flat Off',category:'discount',badge:'Popular'},
 {id:'rew-2',title:'₹500 Premium Treatment Voucher',description:'Use on any hair botox, balayage, or hydra-facial treatment.',pointsCost:450,discountAmount:500,discountValue:'₹500 Flat Off',category:'discount',badge:'Best Value'},
 {id:'rew-3',title:'Free Moroccan Scalp & Hair Spa (Worth ₹1,800)',description:'Deep nourishing argan oil hair spa with hot towel steam and relaxing head massage.',pointsCost:750,discountAmount:1800,discountValue:'100% Free Service (Worth ₹1,800)',category:'free_service',badge:'100% Free'},
 {id:'rew-4',title:'24K Gold Foil Facial Upgrade (Worth ₹2,500)',description:'Upgrade any regular facial to our signature real 24K Gold Leaf facial with ultrasound glow treatment.',pointsCost:1000,discountAmount:2500,discountValue:'Free Luxury Upgrade (Worth ₹2,500)',category:'upgrade',badge:'Royal Favorite'},
 {id:'rew-5',title:'₹1,500 Royal Bridal Booking Discount',description:'Instant reduction on any Signature HD or Airbrush bridal makeup package.',pointsCost:1200,discountAmount:1500,discountValue:'₹1,500 Off Bridal',category:'bridal',badge:'Bridal Special'},
];
supabaseOperationsRouter.get('/public/loyalty',asyncRoute(async(req,res)=>{
  if(!req.sb)fail(401,'Sign in and verify your mobile number with OTP to view loyalty points.');
  const data=await rpc(req.sb,'ensure_customer_loyalty_account',{p_name:s(req.query.name,120)});
  const account=typeof data==='string'?JSON.parse(data):data;
  const [transactions,vouchers]=await Promise.all([
    rest(req.sb,'loyalty_transactions','account_id=eq.'+account.id+'&select=id,created_at,service_title,bill_amount,points,transaction_type,description&order=created_at.desc&limit=30'),
    rest(req.sb,'loyalty_vouchers','account_id=eq.'+account.id+'&select=code,title,discount_amount,points_cost,created_at,expires_at,used&order=created_at.desc&limit=100'),
  ]);
  res.json({account:{phone:account.phone,name:account.name,memberId:account.member_id,tier:account.tier,totalPoints:account.total_points,lifetimePoints:account.lifetime_points,visitsCount:account.visits_count,joinedDate:account.created_at},
    activities:transactions.map(x=>({id:x.id,date:x.created_at,serviceTitle:x.service_title,billAmount:x.bill_amount,pointsEarned:x.points,type:x.transaction_type,description:x.description})),
    vouchers:vouchers.map(x=>({voucherCode:x.code,rewardTitle:x.title,discountAmount:x.discount_amount,pointsCost:x.points_cost,dateRedeemed:x.created_at,validTill:x.expires_at,used:x.used,status:x.used?'used':'active',discountValue:'₹'+x.discount_amount+' OFF'})),offers});
}));
supabaseOperationsRouter.post('/public/loyalty/redeem',asyncRoute(async(req,res)=>{
  if(!req.sb)fail(401,'Sign in and verify your mobile number with OTP to redeem rewards.');
  const result=await rpc(req.sb,'redeem_customer_loyalty_reward',{p_offer_id:s(req.body?.offerId,40,true)});
  res.json(result);
}));
supabaseOperationsRouter.post('/public/loyalty/verify-voucher',asyncRoute(async(req,res)=>{
  if(!req.sb) fail(401,'Sign in and verify your mobile number before checking a loyalty voucher.');
  const code=s(req.body?.code,60,true).toUpperCase();
  const result=await rpc(req.sb,'verify_customer_loyalty_voucher',{p_code:code});
  res.json(result);
}));

// If a Supabase bearer token was supplied, never silently fall through to legacy SQLite for an unported route.
supabaseOperationsRouter.use((req,res,next)=>{
  if(hasBearer(req)) return res.status(404).json({error:'This Supabase-backed endpoint is not available yet.'});
  return next();
});

// Forward Supabase errors to the shared Express error handler.
supabaseOperationsRouter.use((err,req,res,next)=>{
  if(err instanceof SupabaseApiError) return res.status(err.status).json({error:err.message,code:err.code});
  return next(err);
});
