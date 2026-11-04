import test from 'node:test';
import assert from 'node:assert/strict';
import { stableUuid, buildMigrationPlan } from '../../scripts/migrate-sqlite-to-supabase.js';

test('stableUuid deterministically generates a valid UUID v5 shape',()=>{
  const a=stableUuid('salons','legacy-salon-1');
  assert.equal(a,stableUuid('salons','legacy-salon-1'));
  assert.notEqual(a,stableUuid('users','legacy-salon-1'));
  assert.match(a,/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('buildMigrationPlan maps legacy parent IDs before child foreign keys',()=>{
  const source={
    users:[{id:'user-1',email:'owner@example.com',name:'Owner',role:'salon_owner',status:'active',email_verified:1,auth_provider:'password',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',password_hash:'must-not-be-copied'}],
    salons:[{id:'salon-1',owner_id:'user-1',name:'Test Salon',slug:'test-salon',status:'approved',website_published:1,template_id:'luxe',created_at:'2026-01-01',updated_at:'2026-01-01'}],
    services:[{id:'service-1',salon_id:'salon-1',name:'Haircut',price_paise:10000,duration_minutes:30,active:1,created_at:'2026-01-01',updated_at:'2026-01-01'}],
    staff:[{id:'staff-1',salon_id:'salon-1',name:'Stylist A',active:1,booking_enabled:1,created_at:'2026-01-01',updated_at:'2026-01-01'}],
    subscriptions:[{id:'sub-1',salon_id:'salon-1',plan:'starter',status:'active',created_at:'2026-01-01',updated_at:'2026-01-01'}],
    bookings:[{id:'booking-1',salon_id:'salon-1',reference:'BZ-1',full_name:'Guest',phone:'9999999999',service:'Haircut',stylist:'Stylist A',date:'2026-02-01',time:'10:00',estimated_total:10000,status:'requested',created_at:'2026-01-01',updated_at:'2026-01-01'}],
    salon_versions:[{id:'version-1',salon_id:'salon-1',version:1,status:'approved',snapshot_json:JSON.stringify({salon:{name:'Test Salon'},services:[{id:'service-1',name:'Haircut'}],staff:[{id:'staff-1',name:'Stylist A'}]}),submitted_at:'2026-01-01',created_at:'2026-01-01'}],
    loyalty_accounts:[{phone:'9999999999',name:'Guest',member_id:'VIP-1',tier:'silver',total_points:200,lifetime_points:200,visits_count:1,created_at:'2026-01-01',updated_at:'2026-01-01'}],
    loyalty_transactions:[{id:'tx-1',phone:'9999999999',booking_id:'booking-1',salon_id:'salon-1',points:100,type:'earn',created_at:'2026-01-01'}],
    loyalty_vouchers:[{code:'VIP-1',phone:'9999999999',offer_id:'rew-1',title:'Discount',discount_amount:200,points_cost:200,used:0,created_at:'2026-01-01',expires_at:'2026-12-01'}],
    waitlist:[],stylist_inquiries:[],platform_settings:[],audit_logs:[],
  };
  const plan=buildMigrationPlan(source);
  assert.equal(plan.profiles.length,1);
  assert.equal(plan.profiles[0].role,'salon_owner');
  assert.equal(plan.salons[0].owner_id,plan.identityMap.users.get('user-1'));
  assert.equal(plan.services[0].salon_id,plan.salons[0].id);
  assert.equal(plan.bookings[0].service_id,plan.services[0].id);
  assert.equal(plan.bookings[0].staff_id,plan.staff[0].id);
  assert.equal(plan.salon_versions[0].snapshot.services[0].id,plan.services[0].id);
  assert.equal(plan.loyalty_transactions[0].account_id,plan.loyalty_accounts[0].id);
  assert.equal(plan.loyalty_transactions[0].booking_id,plan.bookings[0].id);
  assert.equal(plan.loyalty_vouchers[0].account_id,plan.loyalty_accounts[0].id);
  assert.equal(plan.profiles[0].password_hash,undefined);
});

test('invalid legacy emails are excluded from Auth profile creation',()=>{
  const plan=buildMigrationPlan({users:[{id:'bad',email:'not-an-email',name:'Legacy',role:'salon_owner'}]});
  assert.equal(plan.profiles.length,0);
  assert.deepEqual(plan.skippedUsers,[{legacyId:'bad',reason:'invalid_email'}]);
});

test('migration filters child salon rows when the legacy owner cannot be linked',()=>{
  const plan=buildMigrationPlan({
    users:[{id:'bad-owner',email:'not-an-email',role:'salon_owner'}],
    salons:[{id:'orphan-salon',owner_id:'bad-owner',name:'Orphan Salon',slug:'orphan-salon',status:'draft'}],
    services:[{id:'orphan-service',salon_id:'orphan-salon',name:'Cut',price_paise:1000}],
    staff:[{id:'orphan-staff',salon_id:'orphan-salon',name:'Stylist'}],
    subscriptions:[{id:'orphan-sub',salon_id:'orphan-salon',plan:'starter',status:'active'}],
    salon_versions:[{id:'orphan-version',salon_id:'orphan-salon',version:1,status:'approved',snapshot_json:'{}',submitted_at:'2026-01-01'}],
    bookings:[{id:'orphan-booking',salon_id:'orphan-salon',reference:'BZ-ORPHAN',full_name:'Guest',phone:'9999999999',service:'Cut',date:'2026-03-01',time:'10:00',estimated_total:1000}],
    waitlist:[{id:'orphan-wait',salon_id:'orphan-salon',full_name:'Guest',phone:'9999999999',service:'Cut',date:'2026-03-01',time:'10:00'}],
    stylist_inquiries:[{id:'orphan-inquiry',salon_id:'orphan-salon',stylist_id:'orphan-staff',user_name:'Guest',user_phone:'9999999999',message:'Hello'}],
  });
  assert.equal(plan.salons.length,0);
  assert.equal(plan.services.length,0);
  assert.equal(plan.staff.length,0);
  assert.equal(plan.subscriptions.length,0);
  assert.equal(plan.salon_versions.length,0);
  assert.equal(plan.bookings[0].salon_id,null);
  assert.equal(plan.bookings[0].service_id,null);
  assert.equal(plan.waitlist[0].salon_id,null);
  assert.equal(plan.stylist_inquiries[0].salon_id,null);
  assert.equal(plan.stylist_inquiries[0].stylist_id,null);
});

test('migration reports Indian mobile numbers that collide after canonicalization',()=>{
  const plan=buildMigrationPlan({
    loyalty_accounts:[
      {phone:'9876543210',name:'One'},
      {phone:'+91 98765 43210',name:'Two'},
    ],
  });
  assert.deepEqual(plan.duplicateLoyaltyPhones,[{
    phone:'9876543210',legacyPhones:['9876543210','+91 98765 43210'],
  }]);
});
