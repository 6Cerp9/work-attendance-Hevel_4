import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, 
  X, 
  MessageSquare, 
  Lock, 
  Unlock, 
  Trash2, 
  Calendar as CalendarIcon,
  UserPlus,
  Check,
  Save
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDate,
  isWeekend
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { AttendanceMark, Worker, AppState } from './types';
import { cn } from './utils/cn';

const STORAGE_KEY = 'industrial_attendance_app_data';

const DEFAULT_MARKS = ['+', '-', '?', '8', '4', '2'];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return { workers: [], attendance: {} };
  });

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{workerId: string, day: number} | null>(null);
  const [newWorkerName, setNewWorkerName] = useState('');

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const monthKey = format(currentMonth, 'yyyy-MM');
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const addWorker = () => {
    if (!newWorkerName.trim()) return;
    const newWorker: Worker = {
      id: crypto.randomUUID(),
      name: newWorkerName.trim()
    };
    setState(prev => ({
      ...prev,
      workers: [...prev.workers, newWorker]
    }));
    setNewWorkerName('');
    setIsWorkerModalOpen(false);
  };

  const removeWorker = (id: string) => {
    if (confirm('Удалить работника и все его данные?')) {
      setState(prev => ({
        ...prev,
        workers: prev.workers.filter(w => w.id !== id)
      }));
    }
  };

  const updateAttendance = (workerId: string, day: number, updates: Partial<AttendanceMark>) => {
    setState(prev => {
      const currentMonthData = prev.attendance[monthKey] || {};
      const workerMarks = currentMonthData[workerId] || {};
      const currentMark = workerMarks[day] || { value: '' };

      if (currentMark.locked && !updates.locked && updates.value !== undefined) {
        return prev; // Prevent update if locked unless we are specifically unlocking
      }

      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [monthKey]: {
            ...currentMonthData,
            [workerId]: {
              ...workerMarks,
              [day]: { ...currentMark, ...updates }
            }
          }
        }
      };
    });
  };

  const toggleMark = (workerId: string, day: number) => {
    const mark = state.attendance[monthKey]?.[workerId]?.[day];
    if (mark?.locked) return;

    const currentVal = mark?.value || '';
    let nextVal = '';
    
    if (currentVal === '') nextVal = '+';
    else if (currentVal === '+') nextVal = '-';
    else if (currentVal === '-') nextVal = '?';
    else nextVal = '';

    updateAttendance(workerId, day, { value: nextVal });
  };

  const calculateStats = (workerId: string) => {
    const marks = state.attendance[monthKey]?.[workerId] || {};
    let totalHours = 0;

    Object.values(marks).forEach(mark => {
      if (mark.value === '+') {
        totalHours += 8;
      } else if (!isNaN(Number(mark.value)) && mark.value !== '') {
        totalHours += Number(mark.value);
      }
    });

    const totalDays = totalHours / 8;
    return { 
      totalDays: Number.isInteger(totalDays) ? totalDays : totalDays.toFixed(1), 
      totalHours 
    };
  };

  const months = useMemo(() => {
    const result = [];
    let d = new Date();
    // Show 6 months back and 6 months forward
    for (let i = -6; i <= 6; i++) {
      result.push(addMonths(d, i));
    }
    return result;
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-blue-600 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="font-bold text-lg truncate px-2">
          {format(currentMonth, 'LLLL yyyy', { locale: ru })}
        </h1>
        <button 
          onClick={() => setIsWorkerModalOpen(true)}
          className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
        >
          <UserPlus size={24} />
        </button>
      </header>

      {/* Main Content - Table */}
      <main className="flex-1 overflow-auto relative">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full border-separate border-spacing-0 table-fixed">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-100 p-2 border-b border-r text-left w-32 min-w-[120px] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Работник
                </th>
                {daysInMonth.map(day => (
                  <th 
                    key={day.getTime()} 
                    className={cn(
                      "p-1 border-b border-r text-center w-10 text-[10px] font-bold",
                      isWeekend(day) ? "bg-red-50 text-red-500" : "bg-white text-slate-600"
                    )}
                  >
                    <div className="leading-none">{format(day, 'eeeee', { locale: ru })}</div>
                    <div className="mt-1">{format(day, 'd')}</div>
                  </th>
                ))}
                <th className="sticky right-0 z-30 bg-slate-100 p-2 border-b border-l text-center w-20 text-[10px] font-bold text-slate-500">
                  ИТОГО (Д-Ч)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {state.workers.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth.length + 2} className="p-8 text-center text-slate-400 italic">
                    Нажмите +, чтобы добавить первого работника
                  </td>
                </tr>
              ) : (
                state.workers.map(worker => {
                  const stats = calculateStats(worker.id);
                  return (
                    <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white p-2 border-b border-r font-medium text-sm truncate group">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{worker.name}</span>
                          <button 
                            onClick={() => removeWorker(worker.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                      {daysInMonth.map(day => {
                        const dNum = getDate(day);
                        const mark = state.attendance[monthKey]?.[worker.id]?.[dNum];
                        return (
                          <AttendanceCell 
                            key={dNum}
                            mark={mark}
                            isWeekend={isWeekend(day)}
                            onToggle={() => toggleMark(worker.id, dNum)}
                            onLongPress={() => setSelectedCell({ workerId: worker.id, day: dNum })}
                          />
                        );
                      })}
                      <td className="sticky right-0 z-10 bg-slate-50 p-2 border-b border-l text-center font-bold text-sm text-blue-700">
                        {stats.totalDays} – {stats.totalHours}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Sidebar - Month Selection */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b bg-blue-700 text-white flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <CalendarIcon size={20} /> Выбор месяца
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-white/20 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {months.map(m => {
                const isActive = format(m, 'yyyy-MM') === monthKey;
                return (
                  <button
                    key={m.getTime()}
                    onClick={() => {
                      setCurrentMonth(m);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between",
                      isActive ? "bg-blue-50 text-blue-700 font-bold" : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <span>{format(m, 'LLLL yyyy', { locale: ru })}</span>
                    {isActive && <div className="w-2 h-2 rounded-full bg-blue-700" />}
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t space-y-2">
              <button 
                onClick={() => {
                  const data = JSON.stringify(state, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `attendance-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
                  a.click();
                }}
                className="w-full p-2 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 flex items-center justify-center gap-2 transition-colors"
              >
                <Save size={14} /> Экспорт данных (бэкап)
              </button>
              <div className="text-[10px] text-slate-400 text-center">
                Электронный журнал работника v1.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Add Worker */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsWorkerModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50 font-bold">Добавить работника</div>
            <div className="p-4">
              <input 
                autoFocus
                type="text" 
                value={newWorkerName}
                onChange={e => setNewWorkerName(e.target.value)}
                placeholder="ФИО работника"
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                onKeyDown={e => e.key === 'Enter' && addWorker()}
              />
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="flex-1 p-3 border rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={addWorker}
                  className="flex-1 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Edit Cell (Mark, Comment, Lock) */}
      {selectedCell && (
        <CellEditorModal 
          worker={state.workers.find(w => w.id === selectedCell.workerId)!}
          day={selectedCell.day}
          mark={state.attendance[monthKey]?.[selectedCell.workerId]?.[selectedCell.day] || { value: '' }}
          onClose={() => setSelectedCell(null)}
          onUpdate={(updates) => {
            updateAttendance(selectedCell.workerId, selectedCell.day, updates);
            setSelectedCell(null);
          }}
        />
      )}

      {/* Security Info Banner (Standard Web Sandbox) */}
      <div className="bg-slate-200 p-2 text-[10px] text-slate-500 text-center">
        Данные хранятся локально в браузере. Приложение изолировано песочницей браузера.
      </div>
    </div>
  );
}

// Sub-component for individual cell with long press support
function AttendanceCell({ mark, isWeekend, onToggle, onLongPress }: { 
  mark?: AttendanceMark, 
  isWeekend: boolean, 
  onToggle: () => void,
  onLongPress: () => void
}) {
  const timerRef = useRef<number | null>(null);
  const touchMoved = useRef(false);

  const startTimer = (e: React.MouseEvent | React.TouchEvent) => {
    touchMoved.current = false;
    // Don't trigger on right click
    if ('button' in e && (e as React.MouseEvent).button !== 0) return;
    
    timerRef.current = window.setTimeout(() => {
      onLongPress();
      timerRef.current = null;
    }, 500);
  };

  const endTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (!touchMoved.current) {
        onToggle();
      }
    }
  };

  const handleMove = () => {
    touchMoved.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const markValue = mark?.value || '';
  const isLocked = mark?.locked;
  const hasComment = !!mark?.comment;

  return (
    <td 
      className={cn(
        "relative p-0 border-b border-r text-center h-12 cursor-pointer select-none transition-colors",
        isWeekend ? "bg-red-50/30" : "bg-white",
        markValue === '+' && "bg-green-50",
        markValue === '-' && "bg-red-50",
        markValue === '?' && "bg-amber-50"
      )}
      onMouseDown={startTimer}
      onMouseUp={endTimer}
      onMouseMove={handleMove}
      onMouseLeave={() => timerRef.current && clearTimeout(timerRef.current)}
      onTouchStart={startTimer}
      onTouchEnd={endTimer}
      onTouchMove={handleMove}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className={cn(
        "w-full h-full flex items-center justify-center font-bold text-sm",
        markValue === '+' && "text-green-600",
        markValue === '-' && "text-red-600",
        markValue === '?' && "text-amber-600",
        !['+', '-', '?'].includes(markValue) && markValue !== '' && "text-blue-600"
      )}>
        {markValue}
      </div>
      
      {/* Flags/Icons */}
      <div className="absolute top-0 right-0 flex p-0.5">
        {hasComment && (
          <div className="w-0 h-0 border-t-[6px] border-r-[6px] border-t-blue-500 border-r-transparent" />
        )}
      </div>
      {isLocked && (
        <div className="absolute bottom-0 right-0 p-0.5 opacity-40">
          <Lock size={8} />
        </div>
      )}
    </td>
  );
}

// Modal for editing cell details
function CellEditorModal({ worker, day, mark, onClose, onUpdate }: { 
  worker: Worker, 
  day: number, 
  mark: AttendanceMark, 
  onClose: () => void,
  onUpdate: (updates: Partial<AttendanceMark>) => void
}) {
  const [val, setVal] = useState(mark.value);
  const [comment, setComment] = useState(mark.comment || '');
  const [locked, setLocked] = useState(mark.locked || false);

  const save = () => {
    onUpdate({ value: val, comment, locked });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <div className="font-bold">
            {worker.name} <span className="text-slate-400 font-normal">({day} число)</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Quick Marks */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Отметка / Часы</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_MARKS.map(m => (
                <button
                  key={m}
                  onClick={() => setVal(m)}
                  className={cn(
                    "w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all",
                    val === m 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg scale-110" 
                      : "border-slate-200 text-slate-600 hover:border-blue-300"
                  )}
                >
                  {m}
                </button>
              ))}
              <button
                onClick={() => setVal('')}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 flex items-center justify-center text-slate-300 transition-all",
                  val === '' ? "border-slate-600 text-slate-600" : "border-slate-200"
                )}
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-2">
              <input 
                type="text" 
                value={val}
                onChange={e => setVal(e.target.value)}
                placeholder="Или введите свое (напр. 6)"
                className="w-full p-2 text-sm border-b focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
              <MessageSquare size={12} /> Комментарий
            </label>
            <textarea 
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Причина отсутствия, примечание..."
              className="w-full p-3 border rounded-xl h-24 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Lock toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2">
              {locked ? <Lock size={18} className="text-amber-600" /> : <Unlock size={18} className="text-slate-400" />}
              <span className="text-sm font-medium">Заблокировать ячейку</span>
            </div>
            <button 
              onClick={() => setLocked(!locked)}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors",
                locked ? "bg-amber-500" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                locked ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <button 
            onClick={save}
            className="w-full p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2"
          >
            <Check size={20} /> Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
}
