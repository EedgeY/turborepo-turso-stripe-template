import React from 'react';
import { Shift, ShiftDefinition } from '../types';
import { Lock, Unlock, Clock, History } from 'lucide-react';

interface ShiftCellProps {
  shift?: Shift;
  definition?: ShiftDefinition;
  originalDefinition?: ShiftDefinition; // The definition of the shift BEFORE modification
  isHovered: boolean;
  onCycleType: () => void;
  onToggleLock: () => void;
  compact?: boolean;
}

const ShiftCell: React.FC<ShiftCellProps> = ({ shift, definition, originalDefinition, isHovered, onCycleType, onToggleLock, compact = false }) => {
  const isOff = !shift || shift.type === 'OFF';
  const isLocked = shift?.isLocked || false;

  const bgColor = definition ? definition.color : 'bg-white border-gray-100 text-gray-400';
  
  // Check if modified: shift has an originalType AND it differs from current type
  const isModified = shift?.originalType && shift.originalType !== shift.type;

  return (
    <div 
      className={`relative h-16 border rounded-md m-0.5 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center select-none group
        ${bgColor} ${isHovered ? 'ring-2 ring-indigo-400' : ''}`}
      onClick={onCycleType}
    >
      {/* Modification Indicator */}
      {isModified && (
         <div className="absolute top-0.5 left-0.5 z-20 group/indicator">
            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm animate-pulse"></div>
            {/* Tooltip for modification */}
            <div className="hidden group-hover/indicator:block absolute top-0 left-3 bg-gray-800 text-white text-[10px] p-1.5 rounded shadow-lg whitespace-nowrap z-50">
               Changed from: {originalDefinition?.label || 'OFF'}
            </div>
         </div>
      )}

      {!isOff && definition && (
        <span className={`${compact ? 'text-xs' : 'text-sm'} font-bold`}>{definition.label}</span>
      )}
      
      {/* Lock Indicator/Toggle */}
      <div 
        className={`absolute top-1 right-1 p-0.5 rounded-full hover:bg-black/10 transition-colors z-10
          ${isLocked ? 'opacity-100 text-red-500' : 'opacity-0 group-hover:opacity-100 text-gray-400'}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
        title={isLocked ? "Shift Locked" : "Lock Shift"}
      >
        {isLocked ? <Lock size={compact ? 10 : 12} /> : <Unlock size={compact ? 10 : 12} />}
      </div>

      {/* Time hint - using dynamic definition */}
      {!isOff && definition && !compact && (
        <div className="absolute bottom-1 text-[10px] flex items-center gap-0.5 opacity-70">
           {definition.category === 'WORK' && <Clock size={8} />}
           <span className="truncate max-w-[40px]">{definition.timeRange}</span>
        </div>
      )}
    </div>
  );
};

export default ShiftCell;
