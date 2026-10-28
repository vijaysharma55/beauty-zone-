import React, { useEffect, useState } from 'react';
import { ServiceItem } from '../types';
import { Button } from './ui';

interface Props {
  services: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
}

export const RecommendedServicesSection: React.FC<Props> = ({ services, onSelectService }) => {
  const [recommended, setRecommended] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // In a real app, pass actual user history
        const response = await fetch('/api/ai/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            bookingHistory: [], 
            preferences: {}, 
            servicesList: services.map(s => ({ id: s.id, title: s.title }))
          }),
        });
        const data = await response.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommended(services.filter(s => data.recommendations.includes(s.id)));
        }
      } catch (err) {
        console.error('Failed to fetch recommendations', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecommendations();
  }, [services]);

  if (loading || recommended.length === 0) return null;

  return (
    <section className="py-16 bg-[#FAF5E5] w-full border-t border-[#E8DFC8]/60">
      <div className="w-full px-4 sm:px-6 md:px-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold tracking-wider text-[#A2722A] uppercase bg-[#A2722A]/10 px-2.5 py-0.5 rounded-full">
            Curated For You
          </span>
        </div>
        <h2 className="font-serif text-3xl font-bold text-slate-900 mb-8">Recommended Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recommended.map(service => (
            <div key={service.id} className="border border-[#E8DFC8] p-6 rounded-xl bg-white shadow-sm flex flex-col justify-between hover:shadow-md transition">
              <div>
                <h3 className="font-serif font-semibold text-xl text-slate-900">{service.title}</h3>
                <p className="text-sm text-slate-600 mt-2 line-clamp-3">{service.description}</p>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-sm font-medium text-slate-500">{service.duration || '45 mins'}</span>
                <Button size="sm" onClick={() => onSelectService(service)}>Book Now</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
