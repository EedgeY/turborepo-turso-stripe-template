import React, { useMemo } from 'react';
import { X, Calendar, Clock, DollarSign, User } from 'lucide-react';
import { Staff, Shift, ShiftDefinition } from '../types';

interface StaffHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  currentShifts: Shift[]; // Shifts currently in the dashboard state
  definitions: ShiftDefinition[];
}

const StaffHistoryModal: React.FC<StaffHistoryModalProps> = ({ 
  isOpen, onClose, staff, currentShifts, definitions 
}) => {
  if (!isOpen || !staff) return null;

  // Simulate past history logic
  // Since the main app only holds state for the selected range, we mock past history here
  // to demonstrate the "Monthly History" feature effectively.
  const historyData = useMemo(() => {
    const allShifts: { date: string; type: string; category: string; hours: number; pay: number; isMock?: boolean }[] = [];

    // 1. Add Current Dashboard Shifts for this user
    currentShifts.forEach(s => {
      if (s.staffId === staff.id && s.type !== 'OFF') {
        const def = definitions.find(d => d.id === s.type);
        if (def) {
          allShifts.push({
            date: s.date,
            type: def.label,
            category: def.category,
            hours: def.hours,
            pay: def.hours * staff.hourlyRate,
            isMock: false
          });
        }
      }
    });

    // 2. Generate Mock Past Data (Previous 3 months) for demonstration
    const today = new Date();
    for (let i = 1; i <= 90; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      
      // Randomly assign shifts to weekdays
      if (pastDate.getDay() !== 0 && pastDate.getDay() !== 6 && Math.random() > 0.3) {
        const randomDef = definitions[Math.floor(Math.random() * definitions.length)];
        
        if (randomDef) {
           allShifts.push({
             date: pastDate.toISOString().split('T')[0],
             type: randomDef.label,
             category: randomDef.category,
             hours: randomDef.hours,
             pay: randomDef.hours * staff.hourlyRate,
             isMock: true
           });
        }
      }
    }

    // 3. Sort descending by date
    allShifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Group by Month (YYYY-MM)
    const grouped: Record<string, { 
      items: typeof allShifts, 
      leaveCounts: Record<string, number> 
    }> = {};

    allShifts.forEach(item => {
      const monthKey = item.date.substring(0, 7); // "2023-10"
      if (!grouped[monthKey]) grouped[monthKey] = { items: [], leaveCounts: {} };
      
      grouped[monthKey].items.push(item);

      // Tally leaves
      if (item.category === 'LEAVE') {
         grouped[monthKey].leaveCounts[item.type] = (grouped[monthKey].leaveCounts[item.type] || 0) + 1;
      }
    });

    return grouped;
  }, [staff, currentShifts, definitions]);

  const monthKeys = Object.keys(historyData).sort((a, b) => b.localeCompare(a));

  // Helper for date formatting
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b bg-gray-50 flex justify-between items-start shrink-0">
          <div className="flex gap-4 items-center">
            <img src={staff.avatar} alt={staff.name} className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{staff.name}</h2>
              <div className="flex flex-wrap gap-2 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border"><User size={12} /> {staff.role}</span>
                <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border"><DollarSign size={12} /> ${staff.hourlyRate}/hr</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full border hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          <div className="space-y-6">
            {monthKeys.map(month => {
              const data = historyData[month];
              const shifts = data.items;
              const totalHours = shifts.reduce((sum, s) => sum + s.hours, 0);
              const totalPay = shifts.reduce((sum, s) => sum + s.pay, 0);
              const leaveTypes = Object.keys(data.leaveCounts);

              return (
                <div key={month} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                      <Calendar size={16} className="text-indigo-500" />
                      {formatMonth(month)}
                    </h3>
                    <div className="flex gap-4 text-xs font-medium text-gray-600">
                      <span className="flex items-center gap-1"><Clock size={12} /> {totalHours}h</span>
                      <span className="flex items-center gap-1 text-green-600"><DollarSign size={12} /> ${totalPay.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Leave Summary Section */}
                  {leaveTypes.length > 0 && (
                    <div className="px-4 py-2 bg-yellow-50/50 border-b border-yellow-100 flex gap-4 overflow-x-auto">
                        {leaveTypes.map(type => (
                           <span key={type} className="text-xs text-yellow-800 font-medium px-2 py-0.5 bg-yellow-100 rounded-md whitespace-nowrap">
                              {type}: {data.leaveCounts[type]}
                           </span>
                        ))}
                    </div>
                  )}
                  
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 font-medium">Date</th>
                          <th className="px-4 py-2 font-medium">Shift</th>
                          <th className="px-4 py-2 font-medium text-right">Hours</th>
                          <th className="px-4 py-2 font-medium text-right">Est. Pay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {shifts.map((shift, idx) => (
                          <tr key={`${month}-${idx}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                              {formatDate(shift.date)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold border 
                                 ${shift.category === 'WORK' 
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                    : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                {shift.type}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{shift.hours}h</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">${shift.pay}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {monthKeys.length === 0 && (
              <div className="text-center py-10 text-gray-400">
                No shift history found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffHistoryModal;
