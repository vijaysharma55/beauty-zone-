import React, { useEffect, useMemo, useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { Booking } from './BookingsPage';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader, Card, Alert } from '../ui';
import { TrendingUp, Calendar, Clock } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<{ bookings: Booking[] }>('/salon/bookings');
        setBookings(res.bookings);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const analyticsData = useMemo(() => {
    const revenueByMonth: Record<string, number> = {};
    const bookingsByMonth: Record<string, number> = {};
    const bookingTimes: Record<string, number> = {};

    bookings
      .filter((b) => b.status === 'completed')
      .forEach((b) => {
        const date = new Date(b.date);
        const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        
        revenueByMonth[month] = (revenueByMonth[month] || 0) + b.estimatedTotal;
        bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
        
        const time = b.time.split(':')[0] + ':00';
        bookingTimes[time] = (bookingTimes[time] || 0) + 1;
      });

    const monthlyRevenue = Object.entries(revenueByMonth).map(([month, revenue]) => ({ month, revenue }));
    const monthlyVolume = Object.entries(bookingsByMonth).map(([month, volume]) => ({ month, volume }));
    const peakTimes = Object.entries(bookingTimes).map(([time, count]) => ({ time, count }));

    return { monthlyRevenue, monthlyVolume, peakTimes };
  }, [bookings]);

  if (loading) return <Card className="p-12 text-center">Loading analytics...</Card>;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Insights" title="Dashboard Analytics" description="Review revenue trends and booking patterns." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[#D09A40]" /> Monthly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" fill="#D09A40" stroke="#0F172A" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Calendar className="h-4 w-4 text-[#D09A40]" /> Monthly Appointments</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.monthlyVolume}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="volume" fill="#0F172A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="h-4 w-4 text-[#D09A40]" /> Peak Booking Times</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData.peakTimes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#D09A40" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
