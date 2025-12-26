import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { ShiftDefinition, AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  definitions: ShiftDefinition[];
  setDefinitions: (defs: ShiftDefinition[]) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
}

const COLORS = [
  { label: 'Blue', val: 'bg-sky-100 border-sky-300 text-sky-800' },
  { label: 'Indigo', val: 'bg-indigo-100 border-indigo-300 text-indigo-800' },
  { label: 'Teal', val: 'bg-teal-100 border-teal-300 text-teal-800' },
  { label: 'Green', val: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  { label: 'Orange', val: 'bg-orange-100 border-orange-300 text-orange-800' },
  { label: 'Pink', val: 'bg-pink-100 border-pink-300 text-pink-800' },
  { label: 'Purple', val: 'bg-purple-100 border-purple-300 text-purple-800' },
  { label: 'Gray', val: 'bg-gray-100 border-gray-300 text-gray-800' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, definitions, setDefinitions, settings, setSettings 
}) => {
  if (!isOpen) return null;

  const [localDefs, setLocalDefs] = useState([...definitions]);
  const [localSettings, setLocalSettings] = useState({ ...settings });

  const handleSave = () => {
    setDefinitions(localDefs);
    setSettings(localSettings);
    onClose();
  };

  const addShift = () => {
    const id = `CUSTOM_${Date.now()}`;
    setLocalDefs([...localDefs, {
      id,
      label: 'New',
      timeRange: '09:00-17:00',
      hours: 8,
      color: COLORS[0].val,
      requiredSkills: [],
      minRequired: 0,
      category: 'WORK'
    }]);
  };

  const updateShift = (index: number, field: keyof ShiftDefinition, value: any) => {
    const newDefs = [...localDefs];
    newDefs[index] = { ...newDefs[index], [field]: value };
    setLocalDefs(newDefs);
  };

  const removeShift = (index: number) => {
    setLocalDefs(localDefs.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Section 1: General Constraints */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">General Constraints</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Total Staff Per Day
                </label>
                <input 
                  type="number" 
                  min="0"
                  value={localSettings.minStaffPerDay}
                  onChange={(e) => setLocalSettings({...localSettings, minStaffPerDay: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total daily coverage target (after meeting specific shift minimums).
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Shift Definitions */}
          <section>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Shift Types & Leaves</h3>
               <button onClick={addShift} className="text-sm flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                 <Plus size={16} /> Add Type
               </button>
             </div>
             
             <div className="space-y-4">
               {localDefs.map((def, idx) => (
                 <div key={def.id} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                       <div className="col-span-1">
                         <label className="text-xs text-gray-500 block mb-1">Category</label>
                         <select 
                           value={def.category}
                           onChange={(e) => updateShift(idx, 'category', e.target.value)}
                           className="w-full text-xs p-2 border rounded font-medium text-gray-700"
                         >
                            <option value="WORK">Work</option>
                            <option value="LEAVE">Leave/Off</option>
                         </select>
                       </div>
                       <div className="col-span-1">
                         <label className="text-xs text-gray-500 block mb-1">Label</label>
                         <input 
                           type="text" 
                           value={def.label} 
                           onChange={(e) => updateShift(idx, 'label', e.target.value)}
                           className="w-full text-sm p-2 border rounded"
                           placeholder="e.g. A"
                         />
                       </div>
                       <div className="col-span-1">
                         <label className="text-xs text-gray-500 block mb-1">Time/Desc</label>
                         <input 
                           type="text" 
                           value={def.timeRange} 
                           onChange={(e) => updateShift(idx, 'timeRange', e.target.value)}
                           className="w-full text-sm p-2 border rounded"
                           placeholder="09:00-17:00"
                         />
                       </div>
                       <div className="col-span-1">
                          <label className="text-xs text-gray-500 block mb-1">Paid Hrs</label>
                          <input 
                            type="number" 
                            value={def.hours} 
                            onChange={(e) => updateShift(idx, 'hours', parseFloat(e.target.value))}
                            className="w-full text-sm p-2 border rounded"
                          />
                       </div>
                       <div className="col-span-1">
                          <label className={`text-xs block mb-1 font-bold ${def.category === 'WORK' ? 'text-indigo-600' : 'text-gray-400'}`}>Min Staff</label>
                          <input 
                            type="number" 
                            min="0"
                            disabled={def.category !== 'WORK'}
                            value={def.minRequired} 
                            onChange={(e) => updateShift(idx, 'minRequired', parseInt(e.target.value) || 0)}
                            className="w-full text-sm p-2 border rounded ring-1 ring-transparent focus:ring-indigo-200 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                       </div>
                       <div className="col-span-1">
                          <label className="text-xs text-gray-500 block mb-1">Color</label>
                          <select 
                            value={def.color}
                            onChange={(e) => updateShift(idx, 'color', e.target.value)}
                            className="w-full text-sm p-2 border rounded"
                          >
                            {COLORS.map(c => <option key={c.label} value={c.val}>{c.label}</option>)}
                          </select>
                       </div>
                    </div>
                    
                    {/* Required Skills Input */}
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Required Skills (Comma separated)</label>
                      <input 
                        type="text" 
                        value={def.requiredSkills ? def.requiredSkills.join(', ') : ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          const skills = val ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
                          updateShift(idx, 'requiredSkills', skills);
                        }}
                        placeholder="e.g. FullTime, Manager"
                        className="w-full text-sm p-2 border rounded"
                      />
                    </div>

                    <div className="flex justify-end mt-2">
                       <button onClick={() => removeShift(idx)} className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1">
                          <Trash2 size={12} /> Delete Type
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
