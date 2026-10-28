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
    <section className="py-16 bg-[#FAF5E5]">
      <div className="container mx-auto px-6">
        <h2 className="font-serif text-3xl font-bold text-slate-900 mb-8">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recommended.map(service => (
            <div key={service.id} className="border border-slate-200 p-6 rounded-lg bg-white shadow-sm">
              <h3 className="font-semibold text-lg">{service.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{service.description}</p>
              <Button className="mt-4" onClick={() => onSelectService(service)}>Book Now</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
