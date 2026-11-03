import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, Scissors, MapPin, Home } from 'lucide-react';
import { Booking, BookingStatus } from './BookingsPage';
import { Badge, Button, Card } from '../ui';

interface CalendarViewProps {
  bookings: Booking[];
  onStatusChange?: (booking: Booking, status: BookingStatus) => void;
}

const STATUS_COLOR: Record<BookingStatus, string> = {
  requested: 'bg-blue-500',
  confirmed: 'bg-emerald-500',
  completed: 'bg-slate-400',
  declined: 'bg-rose-500',
  cancelled: 'bg-rose-500',
};

export const CalendarView: React.FC<CalendarViewProps> = ({ bookings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const daysInMonth = useMemo(() => {
    const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
    const firstDayIndex = new Date(year, currentDate.getMonth(), 1).getDay(); // 0 = Sun
    
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay; i++) {
      days.push(i);
    }
    return days;
  }, [currentDate, year]);

  const nextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));

  const getBookingsForDay = (day: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(currentDate.getMonth() + 1)}-${pad(day)}`;
    return bookings.filter((b) => b.date === dateStr);
  };

  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return bookings.filter((b) => b.date === selectedDay).sort((a, b) => a.time.localeCompare(b.time));
  }, [bookings, selectedDay]);

  const formatTime = (value: string) => {
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    if (!m) return value || '—';
    const hour = Number(m[1]);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(h12).padStart(2, '0')}:${m[2]} ${suffix}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-7">
      {/* Calendar Grid */}
      <Card className="p-6 lg:col-span-4">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-slate-900">
            {monthName} {year}
          </h3>
          <div className="flex gap-1">
            <Button variant="secondary" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-slate-50 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {d}
            </div>
          ))}
          {daysInMonth.map((day, idx) => {
            if (day === null) return <div key={`pad-${idx}`} className="bg-white p-2" />;
            
            const dayBookings = getBookingsForDay(day);
            const pad = (n: number) => String(n).padStart(2, '0');
            const dateStr = `${year}-${pad(currentDate.getMonth() + 1)}-${pad(day)}`;
            const isToday = new Date().toISOString().startsWith(dateStr);
            const isSelected = selectedDay === dateStr;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(dateStr)}
                className={`relative min-h-[80px] bg-white p-2 text-left transition-colors hover:bg-slate-50 focus:outline-none ${
                  isSelected ? 'ring-2 ring-inset ring-[#D09A40] z-10' : ''
                }`}
              >
                <span className={`text-sm font-bold ${isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[#0F172A] text-white' : 'text-slate-900'}`}>
                  {day}
                </span>
                
                <div className="mt-1 space-y-1">
                  {dayBookings.slice(0, 3).map((b) => (
                    <div key={b.id} className="flex items-center gap-1">
                      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_COLOR[b.status]}`} />
                      <span className="truncate text-[10px] text-slate-600">{b.service.split(' ')[0]}</span>
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <span className="text-[10px] font-medium text-slate-400">+{dayBookings.length - 3} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            <div className="h-2 w-2 rounded-full bg-blue-500" /> New Request
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            <div className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmed
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            <div className="h-2 w-2 rounded-full bg-slate-400" /> Completed
          </div>
        </div>
      </Card>

      {/* Day Details Panel */}
      <div className="lg:col-span-3">
        <Card className="h-full p-6">
          <div className="mb-6">
            <h3 className="font-serif text-xl font-bold text-slate-900">
              {selectedDay ? new Date(selectedDay).toLocaleDateString('default', { dateStyle: 'full' }) : 'Select a day'}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedDayBookings.length} appointment{selectedDayBookings.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>

          {!selectedDay ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <CalendarDays className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm">Tap a date to see appointment details</p>
            </div>
          ) : selectedDayBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Clock className="mb-3 h-10 w-10 opacity-20" />
              <p className="text-sm">No bookings for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedDayBookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono text-[#8a641f]">{b.reference}</span>
                    <Badge tone={b.status === 'requested' ? 'blue' : b.status === 'confirmed' ? 'green' : 'slate'}>
                      {b.status}
                    </Badge>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Scissors className="h-3.5 w-3.5 text-[#D09A40]" />
                    {b.service}
                  </h4>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {formatTime(b.time)}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {b.fullName}
                    </div>
                    {b.locationType === 'salon' ? (
                       <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {b.branch || 'Main Studio'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                        <Home className="h-3.5 w-3.5 text-slate-400" />
                        {b.locality}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// Internal icon shim for the empty state
const CalendarDays = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
);
