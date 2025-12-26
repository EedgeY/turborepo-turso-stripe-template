import { Role, Staff, DayConfig, ShiftDefinition } from './types';

export const MOCK_STAFF: Staff[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    role: Role.MANAGER,
    hourlyRate: 25,
    skills: ['Management', 'FullTime'], // Has "FullTime" skill
    avatar: 'https://picsum.photos/150/150?random=1'
  },
  {
    id: '2',
    name: 'Sarah Williams',
    role: Role.KITCHEN,
    hourlyRate: 18,
    skills: ['Cooking', 'Prep'],
    avatar: 'https://picsum.photos/150/150?random=2'
  },
  {
    id: '3',
    name: 'Mike Brown',
    role: Role.HALL,
    hourlyRate: 15,
    skills: ['Service', 'Cleaning'], // No FullTime skill
    avatar: 'https://picsum.photos/150/150?random=3'
  },
  {
    id: '4',
    name: 'Emily Davis',
    role: Role.HALL,
    hourlyRate: 15,
    skills: ['Service', 'Cashier', 'FullTime'], // Has FullTime skill
    avatar: 'https://picsum.photos/150/150?random=4'
  },
  {
    id: '5',
    name: 'Chris Wilson',
    role: Role.KITCHEN,
    hourlyRate: 19,
    skills: ['Cooking', 'Safety'],
    avatar: 'https://picsum.photos/150/150?random=5'
  }
];

export const DEFAULT_SHIFT_DEFINITIONS: ShiftDefinition[] = [
  { 
    id: 'MORNING', 
    label: 'AM', 
    timeRange: '09:00-15:00', 
    hours: 6, 
    color: 'bg-sky-100 border-sky-300 text-sky-800',
    requiredSkills: [],
    minRequired: 1,
    category: 'WORK'
  },
  { 
    id: 'EVENING', 
    label: 'PM', 
    timeRange: '17:00-23:00', 
    hours: 6, 
    color: 'bg-indigo-100 border-indigo-300 text-indigo-800',
    requiredSkills: [],
    minRequired: 1,
    category: 'WORK'
  },
  { 
    id: 'FULL', 
    label: 'Full', 
    timeRange: '09:00-18:00', 
    hours: 9, 
    color: 'bg-teal-100 border-teal-300 text-teal-800',
    requiredSkills: ['FullTime'],
    minRequired: 0,
    category: 'WORK'
  },
  { 
    id: 'HOPE_LEAVE', 
    label: 'Hope', 
    timeRange: 'Request', 
    hours: 0, 
    color: 'bg-pink-100 border-pink-300 text-pink-800',
    requiredSkills: [],
    minRequired: 0,
    category: 'LEAVE'
  },
  { 
    id: 'PAID_LEAVE', 
    label: 'Paid', 
    timeRange: 'Day Off', 
    hours: 8, // Usually paid leaves are counted as standard day hours for payroll
    color: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    requiredSkills: [],
    minRequired: 0,
    category: 'LEAVE'
  },
  { 
    id: 'PUBLIC_HOLIDAY', 
    label: 'Off', 
    timeRange: 'Holiday', 
    hours: 0, 
    color: 'bg-gray-100 border-gray-300 text-gray-600',
    requiredSkills: [],
    minRequired: 0,
    category: 'LEAVE'
  }
];

// Generate days between start and end date
export const generateDaysRange = (startStr: string, endStr: string): DayConfig[] => {
  const days: DayConfig[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Safety check to prevent infinite loops if dates are invalid
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }

  const loopDate = new Date(start);
  
  // Limit to avoid browser crash on massive range selection
  let safeCounter = 0;
  const MAX_DAYS = 365; 

  while (loopDate <= end && safeCounter < MAX_DAYS) {
    const dateStr = loopDate.toISOString().split('T')[0];
    const dayOfWeek = loopDate.getDay();
    
    days.push({
      date: dateStr,
      dayName: dayNames[dayOfWeek],
      requiredStaff: 0, // Will be set by settings later
      isBusy: dayOfWeek === 5 || dayOfWeek === 6 
    });

    loopDate.setDate(loopDate.getDate() + 1);
    safeCounter++;
  }
  return days;
};

// Helper to get today's date string YYYY-MM-DD
export const getTodayStr = () => new Date().toISOString().split('T')[0];

// Helper to get date string X days from now
export const getFutureDateStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};
