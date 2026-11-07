import type { SalonStaff, StaffAvailability } from '../types/auth';
import { STAFF_AVAILABILITY_OPTIONS as SHARED_OPTIONS } from './staffRoles.js';

/**
 * Availability vocabulary shared with the API (`src/lib/staffRoles.js`).
 *
 * `available`     → bookable online
 * `busy`          → fully booked right now
 * `on_leave`      → away on leave (multi-day)
 * `off_duty`      → off shift today (e.g. after the weekly schedule ends)
 */
export const STAFF_AVAILABILITY_OPTIONS: ReadonlyArray<{
  value: StaffAvailability;
  label: string;
  tone: 'green' | 'amber' | 'slate';
  hint: string;
}> = SHARED_OPTIONS as unknown as ReadonlyArray<{
  value: StaffAvailability;
  label: string;
  tone: 'green' | 'amber' | 'slate';
  hint: string;
}>;

export const getStaffAvailability = (member: Pick<SalonStaff, 'availabilityStatus'>): StaffAvailability =>
  member.availabilityStatus === 'busy' ||
  member.availabilityStatus === 'on_leave' ||
  member.availabilityStatus === 'off_duty'
    ? member.availabilityStatus
    : 'available';

export const getAvailabilityMeta = (status: StaffAvailability) =>
  STAFF_AVAILABILITY_OPTIONS.find((option) => option.value === status) ?? STAFF_AVAILABILITY_OPTIONS[0];
