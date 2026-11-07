/**
 * Unit tests for the shared staff-onboarding vocabulary
 * (`src/lib/staffRoles.js`) used by the dashboard form AND the API validator.
 *
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_STAFF_WEEKLY_SCHEDULE,
  STAFF_APP_ACCESS_ROLE_VALUES,
  STAFF_APP_ACCESS_ROLES,
  STAFF_AVAILABILITY_STATUSES,
  STAFF_PRIMARY_ROLE_VALUES,
  STAFF_PRIMARY_ROLES,
  STAFF_SKILL_SUGGESTIONS,
  cloneWeeklySchedule,
  defaultWeeklySchedule,
  describeWeeklySchedule,
  getAppAccessRoleLabel,
  getPrimaryRoleLabel,
  isStaffAppAccessRole,
  isStaffAvailabilityStatus,
  isStaffPrimaryRole,
  maskMobileNumber,
  normalizeCommissionPercent,
  normalizeIndianMobile,
  normalizeServiceIdList,
  normalizeSkillList,
  normalizeWeeklySchedule,
  parseWeeklySchedule,
  scheduleWindowForDay,
  staffCanDeliverService,
  suggestedAppAccessRole,
} from '../../src/lib/staffRoles.js';

/* ------------------------------------------------------------------ */
/* Role + app access vocabulary                                        */
/* ------------------------------------------------------------------ */

test('primary role vocabulary matches the approved onboarding list', () => {
  assert.deepEqual(STAFF_PRIMARY_ROLE_VALUES, [
    'senior_stylist',
    'junior_stylist',
    'hair_dresser',
    'makeup_artist',
    'nail_artist',
    'spa_therapist',
    'salon_manager',
    'receptionist',
  ]);
  assert.deepEqual(
    STAFF_PRIMARY_ROLES.map((role) => role.label),
    [
      'Senior Stylist',
      'Junior Stylist',
      'Hair Dresser',
      'Makeup Artist',
      'Nail Artist',
      'Spa Therapist',
      'Salon Manager',
      'Receptionist',
    ]
  );
  assert.equal(isStaffPrimaryRole('hair_dresser'), true);
  assert.equal(isStaffPrimaryRole('Hair Dresser'), false, 'labels are not accepted as slugs');
  assert.equal(isStaffPrimaryRole(undefined), false);
  assert.equal(getPrimaryRoleLabel('spa_therapist'), 'Spa Therapist');
  assert.equal(getPrimaryRoleLabel('nope'), '');
});

test('app access vocabulary matches the approved permission levels', () => {
  assert.deepEqual(STAFF_APP_ACCESS_ROLE_VALUES, ['manager', 'service_provider', 'receptionist']);
  assert.deepEqual(
    STAFF_APP_ACCESS_ROLES.map((role) => role.label),
    ['Manager (Full Access)', 'Service Provider (Assigned)', 'Receptionist (Frontdesk)']
  );
  assert.equal(isStaffAppAccessRole('manager'), true);
  assert.equal(isStaffAppAccessRole('admin'), false);
  assert.equal(getAppAccessRoleLabel('receptionist'), 'Receptionist (Frontdesk)');
});

test('suggested app access follows the primary role but least privilege by default', () => {
  assert.equal(suggestedAppAccessRole('salon_manager'), 'manager');
  assert.equal(suggestedAppAccessRole('receptionist'), 'receptionist');
  assert.equal(suggestedAppAccessRole('senior_stylist'), 'service_provider');
  assert.equal(suggestedAppAccessRole('makeup_artist'), 'service_provider');
  assert.equal(suggestedAppAccessRole(''), 'service_provider');
});

test('availability vocabulary includes the onboarding statuses', () => {
  assert.deepEqual(STAFF_AVAILABILITY_STATUSES, ['available', 'busy', 'on_leave', 'off_duty']);
  assert.equal(isStaffAvailabilityStatus('off_duty'), true);
  assert.equal(isStaffAvailabilityStatus('vacation'), false);
});

/* ------------------------------------------------------------------ */
/* Weekly schedule                                                     */
/* ------------------------------------------------------------------ */

test('default week is Monday–Saturday 10:00–20:00 with Sunday closed', () => {
  const week = defaultWeeklySchedule();
  assert.equal(week.length, 7);
  for (const entry of week.slice(0, 6)) {
    assert.deepEqual(entry, { day: entry.day, startTime: '10:00', endTime: '20:00', closed: false });
  }
  assert.deepEqual(week[6], { day: 'sun', startTime: '', endTime: '', closed: true });
  // The exported constant is frozen and cloning keeps callers isolated.
  assert.equal(Object.isFrozen(DEFAULT_STAFF_WEEKLY_SCHEDULE), true);
  const clone = cloneWeeklySchedule(week);
  clone[0].startTime = '11:00';
  assert.equal(defaultWeeklySchedule()[0].startTime, '10:00');
});

test('schedule normalization fills missing days, honours closures and validates times', () => {
  const partial = normalizeWeeklySchedule([
    { day: 'mon', startTime: '09:30', endTime: '19:30', closed: false },
    { day: 'sun', closed: true },
  ]);
  assert.deepEqual(partial.errors, []);
  assert.equal(partial.schedule.length, 7);
  assert.deepEqual(partial.schedule[0], { day: 'mon', startTime: '09:30', endTime: '19:30', closed: false });
  assert.deepEqual(partial.schedule[6], { day: 'sun', startTime: '', endTime: '', closed: true });
  // Tuesday was not supplied → platform default.
  assert.deepEqual(partial.schedule[1], { day: 'tue', startTime: '10:00', endTime: '20:00', closed: false });

  const badTimes = normalizeWeeklySchedule([{ day: 'tue', startTime: '25:00', endTime: '10:00' }]);
  assert.ok(badTimes.errors.length > 0);

  const inverted = normalizeWeeklySchedule([{ day: 'wed', startTime: '20:00', endTime: '10:00' }]);
  assert.match(inverted.errors[0], /start time must be before/);

  const unknownDay = normalizeWeeklySchedule([{ day: 'funday', startTime: '10:00', endTime: '18:00' }]);
  assert.match(unknownDay.errors[0], /Unknown schedule day/);

  const duplicate = normalizeWeeklySchedule([
    { day: 'mon', startTime: '10:00', endTime: '18:00' },
    { day: 'mon', startTime: '11:00', endTime: '19:00' },
  ]);
  assert.match(duplicate.errors[0], /Duplicate schedule entry/);

  // A closed day ignores any stray times.
  const closedWithTimes = normalizeWeeklySchedule([
    { day: 'sun', startTime: '11:00', endTime: '18:00', closed: true },
  ]);
  assert.deepEqual(closedWithTimes.schedule[6], { day: 'sun', startTime: '', endTime: '', closed: true });
});

test('schedule parsing is defensive against malformed JSON', () => {
  assert.equal(parseWeeklySchedule('not-json').length, 7);
  assert.equal(parseWeeklySchedule('[]').length, 7);
  assert.equal(parseWeeklySchedule(null).length, 7);
  const parsed = parseWeeklySchedule(JSON.stringify([{ day: 'fri', startTime: '12:00', endTime: '22:00' }]));
  assert.deepEqual(parsed[4], { day: 'fri', startTime: '12:00', endTime: '22:00', closed: false });
});

test('schedule descriptions and per-day windows read naturally', () => {
  assert.equal(describeWeeklySchedule(defaultWeeklySchedule()), 'Mon–Sat 10:00 – 20:00 · Sun closed');
  assert.equal(scheduleWindowForDay(defaultWeeklySchedule(), 'mon').endTime, '20:00');
  assert.equal(scheduleWindowForDay(defaultWeeklySchedule(), 'sun'), null);
  assert.equal(scheduleWindowForDay(null, 'mon'), null);
});

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

test('skill suggestions cover the requested onboarding list', () => {
  assert.deepEqual(STAFF_SKILL_SUGGESTIONS, [
    'Hair Coloring',
    'Balayage',
    'Bridal Makeup',
    'Facial Treatments',
    'Nail Art',
    'Hair Extensions',
    'Threading & Waxing',
    'Deep Tissue Massage',
    'Beard Sculpting',
    'Keratin Treatment',
  ]);
});

test('skills are trimmed, de-duplicated case-insensitively and capped', () => {
  assert.deepEqual(normalizeSkillList(['  Balayage ', 'balayage', '', 'Keratin  Treatment', null, 42]), [
    'Balayage',
    'Keratin  Treatment',
  ]);
  const many = Array.from({ length: 40 }, (_, i) => `Skill ${i}`);
  assert.equal(normalizeSkillList(many).length, 25);
  assert.ok(normalizeSkillList(['x'.repeat(200)])[0].length <= 80);
});

/* ------------------------------------------------------------------ */
/* Mobile, masking & commission                                        */
/* ------------------------------------------------------------------ */

test('Indian mobile normalization accepts real-world formats', () => {
  for (const input of [
    '9876543210',
    '+91 98765 43210',
    '+91-9876543210',
    '098765-43210',
    '91 9876543210',
    '(98765) 43210',
  ]) {
    const result = normalizeIndianMobile(input);
    assert.equal(result.ok, true, input);
    assert.equal(result.value, '+919876543210', input);
  }
});

test('Indian mobile normalization rejects invalid numbers and empty stays empty', () => {
  assert.deepEqual(normalizeIndianMobile(''), { ok: true, value: '', error: null });
  assert.deepEqual(normalizeIndianMobile(null), { ok: true, value: '', error: null });
  for (const input of ['12345', '1234567890', '5876543210', '+1 415 555 2671', '98765abcde']) {
    const result = normalizeIndianMobile(input);
    assert.equal(result.ok, false, input);
    assert.ok(result.error, input);
  }
});

test('mobile masking never reveals the middle digits', () => {
  assert.equal(maskMobileNumber('+919876543210'), '+91 ••••• 3210');
  assert.equal(maskMobileNumber('9876543210'), '••••• 3210');
  assert.equal(maskMobileNumber(''), '••••••');
});

test('commission percentages default to 15 and validate the 0–100 range', () => {
  assert.equal(normalizeCommissionPercent(undefined).value, 15);
  assert.equal(normalizeCommissionPercent('').value, 15);
  assert.equal(normalizeCommissionPercent(18.46).value, 18.5);
  assert.equal(normalizeCommissionPercent(0).value, 0);
  assert.equal(normalizeCommissionPercent(100).value, 100);
  const tooHigh = normalizeCommissionPercent(120);
  assert.equal(tooHigh.ok, false);
  assert.match(tooHigh.error, /between 0 and 100/);
  assert.equal(normalizeCommissionPercent('abc').ok, false);
});

/* ------------------------------------------------------------------ */
/* Service mapping                                                     */
/* ------------------------------------------------------------------ */

test('service assignment lists are de-duplicated and safe', () => {
  assert.deepEqual(normalizeServiceIdList(['svc-1', 'svc-1', ' svc-2 ', '', null, 5]), ['svc-1', 'svc-2']);
  assert.deepEqual(normalizeServiceIdList('svc-1'), []);
  assert.equal(staffCanDeliverService([], 'svc-9'), true, 'no mapping means no restriction');
  assert.equal(staffCanDeliverService(['svc-1'], 'svc-1'), true);
  assert.equal(staffCanDeliverService(['svc-1'], 'svc-2'), false);
  assert.equal(staffCanDeliverService(undefined, 'svc-2'), true);
});
