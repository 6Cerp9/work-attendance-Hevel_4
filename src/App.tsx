
import { useState, useEffect } from 'react';
import { 
  Plus, 
  Menu, 
  X, 
  MessageSquare,
  Check,
  Minus,
  Info,
  Lock,
  Unlock,
  Flag
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { storage } from './utils/storage';
import { Employee, AttendanceRecord } from './types';
import { cn } from './utils/cn';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{empId: string, date: string} | null>(null);
  const [commentText, setCommentText] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // New employee state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPosition, setNewEmpPosition] = useState('');

  useEffect(() => {
    setEmployees(storage.getEmployees());
    setAttendance(storage.getAttendance());
  }, []);



  const addEmployee = () => {
    if (!newEmpName.trim()) return;
    const newEmp: Employee = {
      id: crypto.randomUUID(),
      name: newEmpName,
      position: newEmpPosition,
    };
    const updated = [...employees, newEmp];
    setEmployees(updated);
    storage.saveEmployees(updated);
    setNewEmpName('');
    setNewEmpPosition('');
    setIsAddEmployeeOpen(false);
  };

  const toggleAttendance = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingIndex = attendance.findIndex(r => r.employeeId === employeeId && r.date === dateStr);
    
    // Check if record is locked
    if (existingIndex > -1 && attendance[existingIndex].isLocked) {
      return; // Do nothing on click if locked
    }

    let newAttendance = [...attendance];
    if (existingIndex > -1) {
      const currentStatus = newAttendance[existingIndex].status;
      if (currentStatus === 'present') {
        newAttendance[existingIndex].status = 'absent';
        newAttendance[existingIndex].value = '-';
      } else if (currentStatus === 'absent') {
        newAttendance.splice(existingIndex, 1);
      }
    } else {
      newAttendance.push({
        employeeId,
        date: dateStr,
        status: 'present',
        value: '8'
      });
    }
    
    setAttendance(newAttendance);
    storage.saveAttendance(newAttendance);
  };

  const openEditModal = (employeeId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = attendance.find(r => r.employeeId === employeeId && r.date === dateStr);
    setEditingRecord({ empId: employeeId, date: dateStr });
    setCommentText(record?.comment || '');
    setCustomValue(record?.value || (record?.status === 'present' ? '8' : ''));
    setIsLocked(record?.isLocked || false);
  };

  const saveRecord = () => {
    if (!editingRecord) return;
    const { empId, date } = editingRecord;
    let newAttendance = [...attendance];
    const index = newAttendance.findIndex(r => r.employeeId === empId && r.date === date);
    
    const recordValue = customValue.trim();
    let status: 'present' | 'absent' | 'custom' = 'custom';
    
    if (recordValue === '+') status = 'present';
    else if (recordValue === '-' || recordValue === '0' || recordValue === '') status = 'absent';

    const newRecord: AttendanceRecord = {
      employeeId: empId,
      date,
      status,
      value: recordValue,
      comment: commentText,
      isLocked: isLocked
    };

    if (index > -1) {
      newAttendance[index] = newRecord;
    } else {
      newAttendance.push(newRecord);
    }
    
    setAttendance(newAttendance);
    storage.saveAttendance(newAttendance);
    setEditingRecord(null);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getRecord = (empId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return attendance.find(r => r.employeeId === empId && r.date === dateStr);
  };

  const monthsList = Array.from({ length: 24 }, (_, i) => {
    return addMonths(new Date(new Date().getFullYear() - 1, 0, 1), i);
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          {format(currentMonth, 'LLLL yyyy', { locale: ru }).replace(/^\w/, c => c.toUpperCase())}
        </h1>
        <button 
          onClick={() => setIsAddEmployeeOpen(true)}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content - Attendance Grid */}
      <main className="flex-1 overflow-x-auto relative">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-50 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-r border-slate-200">
                  Работник
                </th>
                {daysInMonth.map(day => (
                  <th key={day.toString()} className={cn(
                    "px-2 py-3 text-center text-xs font-medium border-b border-slate-200 min-w-[45px]",
                    [0, 6].includes(day.getDay()) ? "bg-red-50 text-red-400" : "text-slate-500"
                  )}>
                    <div className="flex flex-col">
                      <span>{format(day, 'eeeee', { locale: ru })}</span>
                      <span className="text-sm font-bold">{format(day, 'd')}</span>
                    </div>
                  </th>
                ))}
                <th className="sticky right-0 z-30 bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-l border-slate-200">
                  Итого (д/ч)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth.length + 1} className="px-4 py-20 text-center text-slate-400">
                    Пока нет работников. Нажмите "+", чтобы добавить.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 border-b border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-between group/name">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700 line-clamp-1">{emp.name}</span>
                          <span className="text-xs text-slate-400 line-clamp-1">{emp.position}</span>
                        </div>
                        <button 
                          onClick={() => {
                            if(window.confirm(`Удалить ${emp.name}?`)) {
                              const updated = employees.filter(e => e.id !== emp.id);
                              setEmployees(updated);
                              storage.saveEmployees(updated);
                            }
                          }}
                          className="opacity-0 group-hover/name:opacity-100 p-1 text-rose-300 hover:text-rose-500 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    {daysInMonth.map(day => {
                      const record = getRecord(emp.id, day);
                      return (
                        <AttendanceCell 
                          key={day.toString()}
                          record={record}
                          onClick={() => toggleAttendance(emp.id, day)}
                          onLongPress={() => openEditModal(emp.id, day)}
                        />
                      );
                    })}
                    <td className="sticky right-0 z-10 bg-white px-4 py-3 border-b border-l border-slate-200 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] text-center">
                      {(() => {
                        const monthRecords = attendance.filter(r => 
                          r.employeeId === emp.id && 
                          r.date.startsWith(format(currentMonth, 'yyyy-MM'))
                        );
                        let totalHours = 0;
                        let totalDays = 0;
                        monthRecords.forEach(r => {
                          if (r.status === 'present') {
                            totalHours += 8;
                            totalDays += 1;
                          } else if (r.status === 'custom' && r.value) {
                            const hours = parseFloat(r.value.replace(',', '.'));
                            if (!isNaN(hours)) {
                              totalHours += hours;
                              if (hours > 0) totalDays += 1;
                            } else if (r.value === '1/2') {
                              totalHours += 4;
                              totalDays += 0.5;
                            }
                          }
                        });
                        return (
                          <div className="flex flex-col font-bold">
                            <span className="text-indigo-600">{totalDays}д</span>
                            <span className="text-slate-400 text-[10px]">{totalHours}ч</span>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Sidebar - Monthly Navigation */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-slate-800">Выбор месяца</h2>
                  <button 
                    onClick={() => {
                      setCurrentMonth(new Date());
                      setIsSidebarOpen(false);
                    }}
                    className="text-xs text-indigo-600 font-medium hover:underline text-left mt-1"
                  >
                    Перейти к текущему месяцу
                  </button>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {monthsList.map((m) => (
                  <button
                    key={m.toString()}
                    onClick={() => {
                      setCurrentMonth(m);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between",
                      format(currentMonth, 'yyyy-MM') === format(m, 'yyyy-MM')
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <span>{format(m, 'LLLL yyyy', { locale: ru }).replace(/^\w/, c => c.toUpperCase())}</span>
                    {format(currentMonth, 'yyyy-MM') === format(m, 'yyyy-MM') && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {isAddEmployeeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddEmployeeOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 relative"
            >
              <h3 className="text-xl font-bold mb-4 text-slate-800">Новый сотрудник</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">ФИО</label>
                  <input 
                    autoFocus
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Должность</label>
                  <input 
                    value={newEmpPosition}
                    onChange={(e) => setNewEmpPosition(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Мастер цеха"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={addEmployee}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Добавить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Record Modal */}
      <AnimatePresence>
        {editingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingRecord(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-indigo-600">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="text-xl font-bold text-slate-800">Изменение записи</h3>
                </div>
                <button onClick={() => setEditingRecord(null)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <p className="text-sm text-slate-500 mb-6">
                {employees.find(e => e.id === editingRecord.empId)?.name} • {editingRecord.date}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Значение (8, 4, 1/2, ?, +, -)</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {['8', '4', '1/2', '?', '+', '-'].map(v => (
                      <button 
                        key={v}
                        onClick={() => setCustomValue(v)}
                        className={cn(
                          "px-3 py-1 rounded-full border text-sm transition-colors",
                          customValue === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <input 
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Введите свое значение..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Комментарий</label>
                  <textarea 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] text-slate-700"
                    placeholder="Причина отсутствия или другая информация..."
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    {isLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm font-medium text-slate-700">Заблокировать ячейку</span>
                  </div>
                  <button 
                    onClick={() => setIsLocked(!isLocked)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      isLocked ? "bg-amber-500" : "bg-slate-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      isLocked ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Отмена
                </button>
                <button 
                  onClick={saveRecord}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="bg-white border-t border-slate-200 p-3 text-[10px] text-slate-400 flex justify-between">
        <p>Нажмите для отметки • Удерживайте для комментария</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Присутствие</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Отсутствие</div>
        </div>
      </div>
    </div>
  );
}

function AttendanceCell({ record, onClick, onLongPress }: { 
  record?: AttendanceRecord, 
  onClick: () => void, 
  onLongPress: () => void 
}) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  return (
    <td className="p-1 border-b border-slate-100 text-center relative group">
      <motion.div 
        onTap={() => {
          if (!longPressTriggered) onClick();
          setLongPressTriggered(false);
        }}
        onTapStart={() => {
          setLongPressTriggered(false);
          const timer = setTimeout(() => {
            onLongPress();
            setLongPressTriggered(true);
          }, 600);
          const cancel = () => clearTimeout(timer);
          window.addEventListener('mouseup', cancel, { once: true });
          window.addEventListener('touchend', cancel, { once: true });
        }}
        whileTap={{ scale: 0.8 }}
        className={cn(
          "mx-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer relative",
          !record && "bg-slate-50 border border-slate-100 hover:bg-slate-100",
          record?.status === 'present' && "bg-emerald-500 text-white shadow-md shadow-emerald-100",
          record?.status === 'absent' && "bg-rose-500 text-white shadow-md shadow-rose-100",
          record?.status === 'custom' && "bg-indigo-500 text-white shadow-md shadow-indigo-100",
          record?.isLocked && "ring-2 ring-amber-400 ring-offset-1"
        )}
      >
        {record?.status === 'present' && <Plus className="w-4 h-4" />}
        {record?.status === 'absent' && <Minus className="w-4 h-4" />}
        {record?.status === 'custom' && <span className="text-[10px] font-bold">{record.value}</span>}

        {/* Lock indicator */}
        {record?.isLocked && (
          <div className="absolute -bottom-1 -left-1 bg-amber-500 rounded-full p-0.5 border border-white">
            <Lock className="w-2 h-2 text-white" />
          </div>
        )}

        {/* Comment Flag */}
        {record?.comment && (
          <div className="absolute -top-1 -right-1">
            <Flag className="w-3 h-3 text-white fill-white drop-shadow-sm" />
          </div>
        )}
      </motion.div>
      
      {/* Small preview of comment if it exists */}
      {record?.comment && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className="relative group">
            <Info className="w-3 h-3 text-indigo-500 fill-white" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-xl whitespace-normal min-w-[120px] text-center border border-slate-700">
                {record.comment}
              </div>
              <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
            </div>
          </div>
        </div>
      )}
    </td>
  );
}
