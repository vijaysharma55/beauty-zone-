import type { SalonStaff, StaffAvailability } from '../types/auth';

export const STAFF_AVAILABILITY_OPTIONS: ReadonlyArray<{
  value: StaffAvailability;
  label: string;
  tone: 'green' | 'amber' | 'slate';
  hint: string;
}> = [
  { value: 'available', label: 'Available', tone: 'green', hint: 'Can be booked online.' },
  { value: 'busy', label: 'Busy', tone: 'amber', hint: 'Fully booked for now — not offered for online booking.' },
  { value: 'on_leave', label: 'On leave', tone: 'slate', hint: 'Away — not offered for online booking.' },
];

export const getStaffAvailability = (member: Pick<SalonStaff, 'availabilityStatus'>): StaffAvailability =>
  member.availabilityStatus === 'busy' || member.availabilityStatus === 'on_leave'
    ? member.availabilityStatus
    : 'available';

export const getAvailabilityMeta = (status: StaffAvailability) =>
  STAFF_AVAILABILITY_OPTIONS.find((option) => option.value === status) ?? STAFF_AVAILABILITY_OPTIONS[0];
