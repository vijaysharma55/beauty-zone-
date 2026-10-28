import { ServiceItem } from '../types';
import { SALON_SERVICES } from './salonData';

const SERVICES_STORAGE_KEY = 'whitelabel_salon_services_v3';

export const getStoredServices = (): ServiceItem[] => {
  try {
    localStorage.removeItem('whitelabel_salon_services_v2');
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // An empty array is a valid saved catalog (all items deleted).
      if (Array.isArray(parsed)) {
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

/**
 * Explicitly saves a base64 encoded image string to the service catalog.
 */
export const persistServiceImage = (serviceId: string, base64Image: string): void => {
  const services = getStoredServices();
  const updated = services.map((s) => (s.id === serviceId ? { ...s, image: base64Image } : s));
  saveStoredServices(updated);
};

