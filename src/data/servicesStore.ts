import { ServiceItem } from '../types';
import { SALON_SERVICES } from './salonData';

const SERVICES_STORAGE_KEY = 'bz_salon_services_v1';

export const getStoredServices = (): ServiceItem[] => {
  try {
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load services from localStorage', e);
  }
  return SALON_SERVICES;
};

export const saveStoredServices = (services: ServiceItem[]): void => {
  try {
    localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(services));
  } catch (e) {
    console.error('Failed to save services to localStorage', e);
  }
};
