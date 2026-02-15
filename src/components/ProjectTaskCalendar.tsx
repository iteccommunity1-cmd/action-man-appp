import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/types/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added missing imports

interface ProjectTaskCalendarProps {
  events: CalendarEvent[];
}

export const ProjectTaskCalendar: React.FC<ProjectTaskCalendarProps> = ({ events }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const headerFormat = "MMMM yyyy";
  const dayFormat = "d";

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = new Date(day.setDate(day.getDate() + 1));
    }
    return days;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(event);
    });
    return map;
  }, [events]);

  const getEventColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'overdue': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Card className="rounded-xl glass-card p-4 sm:p-6 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="rounded-full text-muted-foreground hover:bg-muted/20">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <CardTitle className="text-xl font-bold text-foreground">
          {format(currentMonth, headerFormat)}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="rounded-full text-muted-foreground hover:bg-muted/20">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, index) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDay.get(dayKey) || [];
            const isCurrentDay = isSameDay(day, new Date());

            return (
              <Popover key={index}>
                <PopoverTrigger asChild>
                  <div
                    className={cn(
                      "relative flex flex-col items-center justify-center p-2 h-16 rounded-lg cursor-pointer transition-colors duration-200",
                      isSameMonth(day, currentMonth) ? "text-foreground" : "text-muted-foreground/60",
                      isCurrentDay && "bg-primary/20 border-2 border-primary",
                      dayEvents.length > 0 && "hover:bg-primary/10",
                      "hover:bg-muted/20"
                    )}
                  >
                    <span className="text-sm font-semibold">{format(day, dayFormat)}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mt-1">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <span key={i} className={cn("h-2 w-2 rounded-full", getEventColor(event.status))}></span>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverTrigger>
                {dayEvents.length > 0 && (
                  <PopoverContent className="w-full sm:w-80 p-0 rounded-xl shadow-lg border border-border bg-card text-card-foreground">
                    <div className="p-4 border-b border-border">
                      <h4 className="font-semibold text-lg text-foreground">Events on {format(day, 'PPP')}</h4>
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="flex flex-col">
                        {dayEvents.map((event) => (
                          <Link to={event.link} key={event.id} className="block">
                            <div className="flex items-center p-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                              <span className={cn("h-3 w-3 rounded-full mr-3", getEventColor(event.status))}></span>
                              <div className="flex-grow">
                                <p className="text-sm font-medium text-foreground">{event.title}</p>
                                <p className="text-xs text-muted-foreground capitalize">{event.type} - {event.status.replace('-', ' ')}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};