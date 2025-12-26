import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Play, RotateCcw, Settings, ShieldCheck, Sparkles, Loader2, Calendar as CalIcon, Users, ArrowRight } from 'lucide-react';
import { Staff, Shift, DayConfig, ShiftDefinition, AppSettings } from '../types';
import { MOCK_STAFF, generateDaysRange, DEFAULT_SHIFT_DEFINITIONS, getTodayStr, getFutureDateStr } from '../constants';
import ShiftCell from './ShiftCell';
import SettingsModal from './SettingsModal';
import StaffHistoryModal from './StaffHistoryModal';
import { analyzeRoster } from '../services/geminiService';

const Dashboard: React.FC = () => {
  // Config State
  const [dateRange, setDateRange] = useState({ start: getTodayStr(), end: getFutureDateStr(6) });
  const [definitions, setDefinitions] = useState<ShiftDefinition[]>(DEFAULT_SHIFT_DEFINITIONS);
  const [appSettings, setAppSettings] = useState<AppSettings>({ minStaffPerDay: 3 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Data State
  const [days, setDays] = useState<DayConfig[]>([]);
  const [staff] = useState<Staff[]>(MOCK_STAFF);
  const [shifts, setShifts] = useState<Shift[]>([]);
  
  // UI State
  const [hoveredCell, setHoveredCell] = useState<{sId: string, date: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{score: number, insights: string[], cost: number} | null>(null);
  
  // History Modal State
  const [selectedStaffForHistory, setSelectedStaffForHistory] = useState<Staff | null>(null);

  // Initialize Data when Date Range Changes
  useEffect(() => {
    const nextDays = generateDaysRange(dateRange.start, dateRange.end);
    setDays(nextDays);
    
    // Ensure we have shift objects for all these days (preserve existing)
    setShifts(prevShifts => {
      const newShifts = [...prevShifts];
      const existingIds = new Set(prevShifts.map(s => s.id));

      MOCK_STAFF.forEach(s => {
        nextDays.forEach(d => {
          const id = `${s.id}-${d.date}`;
          if (!existingIds.has(id)) {
            newShifts.push({
              id,
              staffId: s.id,
              date: d.date,
              type: 'OFF',
              isLocked: false
              // originalType is undefined initially
            });
          }
        });
      });
      return newShifts;
    });
    setAnalysis(null); // Reset analysis on range change
  }, [dateRange]);

  // Handlers
  const handleCycleShift = (shift: Shift) => {
    if (shift.isLocked) return;

    // Create a cycle list: OFF -> Def 1 -> Def 2 -> ... -> OFF
    const cycleIds = ['OFF', ...definitions.map(d => d.id)];
    const currentIdx = cycleIds.indexOf(shift.type);
    const nextIdx = (currentIdx + 1) % cycleIds.length;
    const nextType = cycleIds[nextIdx];
    
    // When manually changing, we want to record the "Original" type if it wasn't recorded yet.
    // This allows us to show "Changed from X" history.
    // If originalType is already set, we keep it (the baseline).
    // If it's not set, we set it to the current type before changing.
    const originalType = shift.originalType !== undefined ? shift.originalType : shift.type;

    const updated = shifts.map(s => 
      s.id === shift.id ? { ...s, type: nextType, originalType: originalType } : s
    );
    setShifts(updated);
  };

  const handleToggleLock = (shift: Shift) => {
    const updated = shifts.map(s => 
      s.id === shift.id ? { ...s, isLocked: !s.isLocked } : s
    );
    setShifts(updated);
  };

  const handleAutoGenerate = () => {
    if (definitions.length === 0) return;

    const newShifts = [...shifts];

    days.forEach(day => {
      // Filter shifts for this day
      // IMPORTANT: We only modify shifts that are currently 'OFF'.
      // This automatically respects manual entries like "Hope Leave" or "Paid Leave" entered before generation.
      const dayShifts = newShifts.filter(s => s.date === day.date);
      
      // PHASE 1: Satisfy Specific Shift Requirements (e.g. "Need 2 Morning shifts")
      // Filter definitions that are actually WORK types. Leaves shouldn't be auto-filled by "minRequired" usually.
      const workDefs = definitions.filter(d => d.category === 'WORK').sort((a, b) => b.minRequired - a.minRequired);

      workDefs.forEach(def => {
         if (def.minRequired <= 0) return;

         // Check existing coverage for this specific shift type (including Locked or Manual entries)
         let currentCount = dayShifts.filter(s => s.type === def.id).length;
         
         if (currentCount < def.minRequired) {
            const needed = def.minRequired - currentCount;
            
            // Find candidates: OFF, Unlocked, Has Skills
            let candidates = dayShifts.filter(s => s.type === 'OFF' && !s.isLocked);
            
            // Filter by required skills
            candidates = candidates.filter(s => {
               const staffMember = staff.find(st => st.id === s.staffId);
               if (!staffMember) return false;
               if (!def.requiredSkills || def.requiredSkills.length === 0) return true;
               return def.requiredSkills.every(req => staffMember.skills.includes(req));
            });

            // Randomize
            candidates.sort(() => Math.random() - 0.5);

            // Assign
            for (let i = 0; i < needed && i < candidates.length; i++) {
               const cand = candidates[i];
               const sIdx = newShifts.findIndex(s => s.id === cand.id);
               if (sIdx !== -1) {
                  newShifts[sIdx] = { ...newShifts[sIdx], type: def.id };
                  cand.type = def.id; 
               }
            }
         }
      });

      // PHASE 2: Satisfy Total Daily Minimum (Only counting WORK shifts)
      // Re-fetch counts
      let currentTotal = newShifts.filter(s => {
         if (s.date !== day.date) return false;
         // Count any shift that is WORK category
         const def = definitions.find(d => d.id === s.type);
         return def?.category === 'WORK';
      }).length;
      
      if (currentTotal < appSettings.minStaffPerDay) {
        let remainingCandidates = newShifts.filter(s => s.date === day.date && s.type === 'OFF' && !s.isLocked);
        remainingCandidates.sort(() => Math.random() - 0.5);

        let candIdx = 0;
        while (currentTotal < appSettings.minStaffPerDay && candIdx < remainingCandidates.length) {
            const cand = remainingCandidates[candIdx];
            const staffMember = staff.find(st => st.id === cand.staffId);
            
            if (staffMember) {
                // Pick a random WORK definition allowed for this user
                const allowedDefs = definitions.filter(def => {
                   if (def.category !== 'WORK') return false;
                   if (!def.requiredSkills || def.requiredSkills.length === 0) return true;
                   return def.requiredSkills.every(req => staffMember.skills.includes(req));
                });

                if (allowedDefs.length > 0) {
                    const randomDef = allowedDefs[Math.floor(Math.random() * allowedDefs.length)];
                    const sIdx = newShifts.findIndex(s => s.id === cand.id);
                    if (sIdx !== -1) {
                        newShifts[sIdx] = { ...newShifts[sIdx], type: randomDef.id };
                        currentTotal++;
                    }
                }
            }
            candIdx++;
        }
      }

      // PHASE 3: Fill Remaining Empty Spots with "Public Holiday" (公休)
      // We look for any remaining 'OFF' shifts and convert them to 'PUBLIC_HOLIDAY'
      // Only if PUBLIC_HOLIDAY definition exists.
      const publicHolidayDef = definitions.find(d => d.id === 'PUBLIC_HOLIDAY');
      if (publicHolidayDef) {
         newShifts.forEach((s, idx) => {
            if (s.date === day.date && s.type === 'OFF' && !s.isLocked) {
               newShifts[idx] = { ...s, type: 'PUBLIC_HOLIDAY' };
            }
         });
      }
    });

    setShifts(newShifts);
    handleAnalyze(newShifts);
  };

  const handleClear = () => {
    if (!confirm('Reset all shifts? \n\nThis will revert generated shifts to "OFF", but KEEP your manual locks.')) return;
    
    // We want to clear everything back to 'OFF' unless it is locked.
    // This allows the user to re-run generation.
    // NOTE: This will also clear "Public Holidays" that were auto-filled.
    // However, if the user MANUALLY set "Hope Leave" and didn't lock it, it would be cleared. 
    // To protect "Hope Leave" during clear, users should lock them, OR we can preserve them here if we want.
    // Standard behavior: Clear = Reset to empty slate (except locks).
    
    const cleared = shifts.map(s => {
      const isVisible = days.some(d => d.date === s.date);
      if (isVisible && !s.isLocked) {
         return { ...s, type: 'OFF', originalType: undefined };
      }
      return s;
    });
    setShifts(cleared);
    setAnalysis(null);
  };

  const handleAnalyze = async (currentShifts: Shift[]) => {
    setIsAnalyzing(true);
    const visibleShifts = currentShifts.filter(s => days.some(d => d.date === s.date));
    const result = await analyzeRoster(staff, visibleShifts, days);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  // Metrics for Charts
  const chartData = days.map(day => {
    const dailyShifts = shifts.filter(s => s.date === day.date && s.type !== 'OFF');
    // Calculate cost (work hours + paid leave hours)
    const cost = dailyShifts.reduce((acc, s) => {
      const person = staff.find(st => st.id === s.staffId);
      const def = definitions.find(d => d.id === s.type);
      return acc + (person && def ? person.hourlyRate * def.hours : 0);
    }, 0);
    
    // Count only active WORK staff for coverage chart
    const activeStaffCount = dailyShifts.filter(s => {
       const def = definitions.find(d => d.id === s.type);
       return def?.category === 'WORK';
    }).length;

    return {
      name: days.length > 10 ? day.date.slice(5) : day.dayName,
      staffCount: activeStaffCount,
      cost: cost,
      target: appSettings.minStaffPerDay
    };
  });

  const isCompact = days.length > 10;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      
      {/* Toolbar */}
      <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row gap-4 justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <span className="bg-indigo-600 text-white p-1 rounded-md"><RotateCcw size={20} className="rotate-45" /></span>
            ShiftFlow
          </h1>
          
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg border">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-white border-gray-200 text-xs font-medium px-2 py-1 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <ArrowRight size={14} className="text-gray-400" />
            <input 
              type="date" 
              value={dateRange.end}
              min={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-white border-gray-200 text-xs font-medium px-2 py-1 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsSettingsOpen(true)}
             className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            <Settings size={16} /> Config
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button 
            onClick={handleAutoGenerate}
            className="flex items-center gap-2 px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-medium"
          >
            <Play size={16} fill="currentColor" /> Auto Generate
          </button>
           <button 
            onClick={() => handleAnalyze(shifts)}
            className="flex items-center gap-2 px-4 py-2 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
            AI Insights
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 flex flex-col xl:flex-row gap-6">
        
        {/* Left: Main Calendar */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
             <h2 className="font-semibold text-gray-700 flex items-center gap-2"><CalIcon size={18} /> Schedule ({days.length} Days)</h2>
             <div className="flex gap-4 text-xs text-gray-500 overflow-x-auto">
                {definitions.map(def => (
                  <span key={def.id} className="flex items-center gap-1 whitespace-nowrap bg-gray-50 px-2 py-1 rounded border">
                    <div className={`w-3 h-3 rounded border ${def.color.split(' ')[0]} ${def.color.split(' ')[1]}`}></div> 
                    <span className="font-medium">{def.label}</span>
                    {def.minRequired > 0 && <span className="text-gray-400 ml-1 text-[10px]">(Min: {def.minRequired})</span>}
                  </span>
                ))}
             </div>
          </div>
          
          <div className="overflow-auto flex-1 relative">
            {/* Grid Container */}
            <div 
              style={{ 
                display: 'grid',
                gridTemplateColumns: `200px repeat(${days.length}, ${isCompact ? '60px' : 'minmax(100px, 1fr)'})`,
                minWidth: '100%'
              }}
              className="border-b"
            >
              {/* Header Row */}
              <div className="sticky left-0 z-20 bg-gray-100/90 border-b border-r p-3 font-medium text-gray-500 text-sm backdrop-blur-sm">
                Staff Member
              </div>
              {days.map(d => (
                <div key={d.date} className={`p-2 text-center border-l border-b bg-gray-50 ${d.isBusy ? 'bg-orange-50/50' : ''}`}>
                  <div className="font-bold text-gray-800 text-sm whitespace-nowrap">{isCompact ? d.date.slice(8) : d.dayName}</div>
                  <div className="text-[10px] text-gray-500">{isCompact ? d.dayName.charAt(0) : d.date.slice(5)}</div>
                  {d.isBusy && !isCompact && <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider block">Busy</span>}
                </div>
              ))}

              {/* Staff Rows */}
              {staff.map(s => (
                <React.Fragment key={s.id}>
                  {/* Staff Info Column (Sticky) - Added onClick handler */}
                  <div 
                    className="sticky left-0 z-10 p-3 flex items-center gap-3 border-r border-b bg-white group hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedStaffForHistory(s)}
                    title="Click to view shift history"
                  >
                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                    <div className="overflow-hidden">
                      <div className="font-medium text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{s.name}</div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                        {/* Display Skills as Badges */}
                        {s.skills.slice(0, 3).map(skill => (
                          <span key={skill} className="px-1.5 py-0.5 bg-gray-100 rounded-md text-[10px] text-gray-600 truncate max-w-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Days Columns */}
                  {days.map(d => {
                    const shift = shifts.find(sh => sh.staffId === s.id && sh.date === d.date);
                    const def = shift && shift.type !== 'OFF' ? definitions.find(def => def.id === shift.type) : undefined;
                    const originalDef = shift?.originalType ? definitions.find(def => def.id === shift.originalType) : undefined;
                    
                    return (
                      <div 
                        key={`${s.id}-${d.date}`} 
                        className="p-0.5 border-l border-b relative hover:bg-gray-50"
                        onMouseEnter={() => setHoveredCell({sId: s.id, date: d.date})}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                         <ShiftCell 
                           shift={shift}
                           definition={def}
                           originalDefinition={originalDef}
                           isHovered={hoveredCell?.sId === s.id && hoveredCell?.date === d.date}
                           onCycleType={() => shift && handleCycleShift(shift)}
                           onToggleLock={() => shift && handleToggleLock(shift)}
                           compact={isCompact}
                         />
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Analytics & AI */}
        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
          
          {/* AI Insights Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 shrink-0">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="text-indigo-500" size={18} />
              AI Assistant
            </h3>
            
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                <Loader2 className="animate-spin mb-2" size={24} />
                <span className="text-sm">Analyzing...</span>
              </div>
            ) : analysis ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <span className="text-sm text-gray-600">Fairness</span>
                  <span className={`text-lg font-bold ${analysis.score > 80 ? 'text-green-600' : 'text-amber-600'}`}>
                    {analysis.score}/100
                  </span>
                </div>
                
                <div className="max-h-40 overflow-y-auto">
                   <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Insights</p>
                   <ul className="space-y-2">
                     {analysis.insights.map((insight, idx) => (
                       <li key={idx} className="text-xs text-gray-700 flex gap-2 items-start bg-indigo-50/50 p-2 rounded">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0"></div>
                         {insight}
                       </li>
                     ))}
                   </ul>
                </div>

                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-500">Est. Cost</span>
                     <span className="font-bold text-gray-900">${analysis.cost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 rounded-lg border border-dashed">
                Click "AI Insights" to analyze current range.
              </div>
            )}
          </div>

          {/* Stats Charts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Users className="text-teal-500" size={18} />
                Coverage
              </h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Target: {appSettings.minStaffPerDay}</span>
            </div>
            
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize: 9}} interval={isCompact ? 4 : 0} />
                  <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Bar dataKey="staffCount" name="Active Staff" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.staffCount < entry.target ? '#f87171' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        definitions={definitions}
        setDefinitions={setDefinitions}
        settings={appSettings}
        setSettings={setAppSettings}
      />

      <StaffHistoryModal 
        isOpen={!!selectedStaffForHistory}
        onClose={() => setSelectedStaffForHistory(null)}
        staff={selectedStaffForHistory}
        currentShifts={shifts}
        definitions={definitions}
      />
    </div>
  );
};

export default Dashboard;
