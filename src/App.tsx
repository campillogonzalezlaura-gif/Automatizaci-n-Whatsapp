import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Sparkles, Calendar, Info, ShieldAlert, CheckCircle2, ChevronRight, Phone, Plus, X, Clock, FileText, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import type { Message, ChatHistoryItem, Appointment } from './types.ts';

const SYSTEM_GREETING = "¡Hola! Soy Aura, tu asistente virtual de la clínica. ✨ Estoy aquí para resolver tus dudas sobre nuestros tratamientos y ayudarte con tus citas. ¿en qué puedo ayudarte hoy? 🌸";

const TREATMENTS = [
  "Bótox",
  "Ácido Hialurónico",
  "Higiene Facial",
  "Microblading",
  "Pestañas (Lifting y Extensiones)",
  "Tratamientos Corporales",
  "Depilación Láser",
  "Manicura y Pedicura",
  "Maquillaje",
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: SYSTEM_GREETING }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'appointments'>('chat');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showBookingForm, setShowBookingForm] = useState(false);

  // Form state
  const [bookingName, setBookingName] = useState('');
  const [bookingTreatment, setBookingTreatment] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar citas desde el backend
  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => setAppointments([]));
  }, []);

  // Parsea fechas DD/MM/AAAA a YYYY-MM-DD
  const parseDateInput = (input: string): string => {
    const cleaned = input.trim().replace(/\//g, '-').replace(/\./g, '-');
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const fullYear = y.length === 2 ? `20${y}` : y;
      return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return cleaned;
  };

  // Crea una cita en el backend
  const createAppointment = async () => {
    setBookingError('');
    setBookingSubmitting(true);
    try {
      const isoDate = parseDateInput(bookingDate);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientName: bookingName, treatment: bookingTreatment, date: isoDate, time: bookingTime }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear cita');
      }
      const newAppt = await res.json();
      setAppointments(prev => [...prev, newAppt]);
      setBookingSuccess(true);
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingName(''); setBookingTreatment(''); setBookingDate(''); setBookingTime('');
        setBookingSuccess(false);
      }, 2500);
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const canCreate = bookingName.trim() && bookingTreatment && bookingDate.trim() && bookingTime;

  const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history: ChatHistoryItem[] = messages.slice(1).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiMessage: Message = { role: 'model', text: data.text };
      setMessages(prev => [...prev, aiMessage]);

      // Si hay cita detectada en la respuesta
      if (data.appointment) {
        const { patientName, treatment, date, time } = data.appointment;
        try {
          const res2 = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientName, treatment, date, time }),
          });
          if (res2.ok) {
            const created = await res2.json();
            setAppointments(prev => [...prev, created]);
          }
        } catch (err) {
          console.error('Error auto-creating appointment:', err);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, he tenido un pequeño problema técnico. ¿Podrías repetirme tu consulta? ✨" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CALENDARIO ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0=Dom
  const todayStr = new Date().toISOString().slice(0, 10);

  const appointmentDates = new Set(appointments.map(a => a.date));

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vié', 'Sáb', 'Dom'];

  const daysInMonth = getDaysInMonth(calendarMonth.getFullYear(), calendarMonth.getMonth());
  const firstDayOffset = getFirstDayOfMonth(calendarMonth.getFullYear(), calendarMonth.getMonth()); // 0=Dom, ajustamos a 6=Dom
  let adjustedOffset = firstDayOffset === 0 ? 6 : firstDayOffset - 1; // 0=Lun, 6=Dom

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < adjustedOffset; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const prevMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1));
  const nextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1));
  const isToday = (d: number) => `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` === todayStr;

  const getAppointmentsForDay = (d: number) => {
    const dStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return appointments.filter(a => a.date === dStr);
  };

  // Format date for display
  const formatDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
  };

  // --- QUICK ACTIONS ---
  const QuickAction = ({ icon: Icon, text, onClick }: { icon: any, text: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-natural-border rounded-full text-xs font-bold uppercase tracking-tight text-natural-text hover:bg-natural-sidebar hover:text-natural-heading transition-all shadow-sm shrink-0"
    >
      <Icon size={14} className="text-natural-accent" />
      {text}
    </button>
  );

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-natural-text flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-natural-sidebar border-r border-natural-border flex-col p-8 z-10">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 bg-natural-accent rounded-full flex items-center justify-center text-white shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-natural-heading">Aura</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Asistente Virtual</p>
            </div>
          </div>
        </div>

        <nav className="space-y-3">
          <div
            onClick={() => setActiveView('chat')}
            className={`p-3 rounded-xl shadow-sm border transition-all cursor-pointer flex items-center gap-3 ${
              activeView === 'chat'
                ? 'bg-white border-natural-border'
                : 'hover:bg-stone-100/50 border-transparent text-stone-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeView === 'chat' ? 'bg-stone-50' : 'bg-transparent'}`}>
              <Sparkles size={16} className={activeView === 'chat' ? 'text-natural-accent' : 'text-stone-400'} />
            </div>
            <span className={`text-sm ${activeView === 'chat' ? 'font-semibold text-natural-text' : 'font-medium'}`}>Conversaciones</span>
          </div>

          <div
            onClick={() => setActiveView('appointments')}
            className={`p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 group ${
              activeView === 'appointments'
                ? 'bg-white border border-natural-border shadow-sm'
                : 'hover:bg-stone-100/50 border-transparent text-stone-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeView === 'appointments' ? 'bg-stone-50' : 'bg-transparent group-hover:bg-white'}`}>
              <Calendar size={16} className={activeView === 'appointments' ? 'text-natural-heading' : 'text-stone-400 group-hover:text-natural-heading'} />
            </div>
            <span className={`text-sm ${activeView === 'appointments' ? 'font-semibold text-natural-text' : 'font-medium group-hover:text-natural-text'}`}>Citas Agendadas</span>
          </div>
        </nav>

        <div className="mt-auto">
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tighter mb-1">Seguridad Médica</p>
              <p className="text-[10px] leading-relaxed text-amber-800">Prohibido diagnosticar. Derivar siempre casos médicos a valoración presencial.</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col relative w-full overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-natural-border px-6 md:px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)] animate-pulse"></div>
            <h2 className="text-lg font-medium text-natural-heading">
              {activeView === 'chat' ? 'Chat Activo con Aura' : 'Tus Citas Agendadas'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[12px] font-bold bg-natural-heading text-white px-3 py-1 rounded-full uppercase tracking-tighter">IA En Línea</span>
            <button className="md:hidden p-2 text-stone-400" onClick={() => setActiveView(activeView === 'chat' ? 'appointments' : 'chat')}>
              {activeView === 'chat' ? <Calendar size={20} /> : <Sparkles size={20} />}
            </button>
          </div>
        </header>

        {activeView === 'chat' ? (
          <>
            {/* Messages */}
            <section className="flex-1 overflow-y-auto px-4 md:px-12 py-8 space-y-8 scrollbar-hide bg-natural-bg/30">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] p-5 rounded-2xl shadow-sm relative ${
                        msg.role === 'user'
                          ? 'bg-natural-heading text-white rounded-tr-none shadow-md'
                          : 'bg-white text-natural-text rounded-tl-none border border-natural-border'
                      }`}
                    >
                      <div className="text-[15px] leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>
                      <div className={`text-[10px] mt-3 opacity-40 uppercase tracking-widest font-bold ${msg.role === 'user' ? 'text-white/70' : ''}`}>
                        {msg.role === 'user' ? 'Tú' : 'Aura AI'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-white border border-natural-border p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-2 items-center">
                    <div className="w-1.5 h-1.5 bg-natural-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-natural-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-natural-accent rounded-full animate-bounce" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </section>

            {/* Input Area */}
            <footer className="p-6 bg-white border-t border-natural-border">
              <div className="max-w-4xl mx-auto">
                {/* Quick Actions Bar */}
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                  <QuickAction icon={Info} text="Tratamientos" onClick={() => handleSend(undefined, "¿Qué tratamientos ofrecéis?")} />
                  <QuickAction icon={Calendar} text="Agendar Cita" onClick={() => handleSend(undefined, "Quisiera agendar una cita")} />
                  <QuickAction icon={Sparkles} text="Microblading" onClick={() => handleSend(undefined, "¿En qué consiste el microblading?")} />
                  <QuickAction icon={ShieldAlert} text="Cuidados" onClick={() => handleSend(undefined, "¿Cuáles son los cuidados recomendados?")} />
                </div>

                <form onSubmit={handleSend} className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribir mensaje..."
                    className="flex-1 bg-natural-sidebar rounded-full h-14 pl-6 pr-16 text-natural-text placeholder-stone-400 focus:outline-none border-2 border-transparent focus:border-stone-100 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-1 w-12 h-12 bg-natural-accent text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            </footer>
          </>
        ) : (
          /* === VISTA DE CITAS AGENDADAS === */
          <section className="flex-1 overflow-y-auto px-6 md:px-12 py-12 bg-natural-bg/30">
            <div className="max-w-3xl mx-auto">
              {/* Header de la vista */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-medium text-natural-heading">Próximas Sesiones</h3>
                  <p className="text-sm text-stone-500">Aquí puedes ver el estado de tus citas programadas.</p>
                </div>
                <button
                  onClick={() => { setActiveView('chat'); setShowBookingForm(false); }}
                  className="px-4 py-2 bg-white border border-natural-border rounded-full text-xs font-bold uppercase tracking-widest text-natural-heading hover:bg-natural-sidebar transition-all shadow-sm"
                >
                  Volver al Chat
                </button>
              </div>

              <AnimatePresence mode="wait">
                {showBookingForm ? (
                  /* === FORMULARIO DE AGENDAMIENTO === */
                  <motion.div
                    key="booking-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white border border-natural-border p-8 rounded-3xl shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-natural-heading flex items-center gap-2">
                        <Plus size={20} className="text-natural-accent" /> Nueva Cita
                      </h4>
                      <button onClick={() => setShowBookingForm(false)} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                      </button>
                    </div>

                    {bookingSuccess ? (
                      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 size={32} className="text-green-600" />
                        </div>
                        <h5 className="text-lg font-bold text-natural-heading mb-2">¡Cita Agendada! 🎉</h5>
                        <p className="text-sm text-stone-500">Tu cita para <strong>{bookingTreatment}</strong> el <strong>{formatDate(parseDateInput(bookingDate))}</strong> a las <strong>{bookingTime}</strong> ha sido registrada.</p>
                      </motion.div>
                    ) : (
                      <>
                        {/* Nombre */}
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-natural-heading mb-2">
                            <User size={14} /> Nombre completo
                          </label>
                          <input
                            type="text"
                            value={bookingName}
                            onChange={(e) => setBookingName(e.target.value)}
                            placeholder="Ej: Laura González"
                            className="w-full bg-natural-sidebar rounded-xl px-4 py-3 text-sm text-natural-text placeholder-stone-400 focus:outline-none border-2 border-transparent focus:border-natural-accent/40 transition-all"
                          />
                        </div>

                        {/* Tratamiento */}
                        <div>
                          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-natural-heading mb-2">
                            <Sparkles size={14} /> Tratamiento
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {TREATMENTS.map(t => (
                              <button
                                key={t}
                                onClick={() => setBookingTreatment(t)}
                                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                                  bookingTreatment === t
                                    ? 'bg-natural-accent/15 border-natural-accent text-natural-heading font-bold'
                                    : 'bg-natural-sidebar border-natural-border text-stone-600 hover:border-stone-300'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Fecha y Hora */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-natural-heading mb-2">
                              <Calendar size={14} /> Fecha
                            </label>
                            <input
                              type="text"
                              value={bookingDate}
                              onChange={(e) => setBookingDate(e.target.value)}
                              placeholder="DD/MM/AAAA"
                              className="w-full bg-natural-sidebar rounded-xl px-4 py-3 text-sm text-natural-text placeholder-stone-400 focus:outline-none border-2 border-transparent focus:border-natural-accent/40 transition-all"
                            />
                          </div>
                          <div>
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-natural-heading mb-2">
                              <Clock size={14} /> Hora
                            </label>
                            <select
                              value={bookingTime}
                              onChange={(e) => setBookingTime(e.target.value)}
                              className="w-full bg-natural-sidebar rounded-xl px-4 py-3 text-sm text-natural-text focus:outline-none border-2 border-transparent focus:border-natural-accent/40 transition-all appearance-none"
                            >
                              <option value="">Selecciona hora</option>
                              {TIME_SLOTS.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {bookingError && (
                          <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{bookingError}</p>
                        )}

                        {/* Resumen previo */}
                        {canCreate && (
                          <div className="bg-natural-sidebar/60 rounded-xl p-4 text-xs text-stone-600 space-y-1">
                            <p className="font-bold text-natural-heading mb-1">Resumen de la cita:</p>
                            <p><strong>Nombre:</strong> {bookingName}</p>
                            <p><strong>Tratamiento:</strong> {bookingTreatment}</p>
                            <p><strong>Fecha:</strong> {formatDate(parseDateInput(bookingDate))}</p>
                            <p><strong>Hora:</strong> {bookingTime}</p>
                          </div>
                        )}

                        <button
                          onClick={createAppointment}
                          disabled={!canCreate || bookingSubmitting}
                          className="w-full py-3.5 bg-natural-heading text-white font-bold rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {bookingSubmitting ? 'Guardando...' : 'Confirmar Cita'}
                        </button>
                      </>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {/* Calendario */}
                    <div className="bg-white border border-natural-border rounded-3xl p-6 shadow-sm mb-8">
                      <div className="flex items-center justify-between mb-6">
                        <button onClick={prevMonth} className="p-2 text-stone-400 hover:text-natural-heading transition-colors rounded-xl hover:bg-natural-sidebar">
                          <ChevronLeft size={18} />
                        </button>
                        <h4 className="text-base font-bold text-natural-heading">
                          {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                        </h4>
                        <button onClick={nextMonth} className="p-2 text-stone-400 hover:text-natural-heading transition-colors rounded-xl hover:bg-natural-sidebar">
                          <ChevronRightIcon size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {dayNames.map(d => (
                          <div key={d} className="text-[11px] font-bold uppercase tracking-widest text-stone-400 pb-2">{d}</div>
                        ))}
                        {calendarDays.map((d, i) => {
                          const dStr = d ? `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
                          const dayAppts = d ? getAppointmentsForDay(d) : [];
                          const highlighted = appointmentDates.has(dStr);
                          return (
                            <div
                              key={i}
                              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all cursor-default ${
                                d === null ? 'opacity-0' : ''
                              } ${
                                isToday(d!)
                                ? 'bg-natural-heading text-white shadow-md scale-105'
                                : highlighted
                                  ? 'bg-natural-accent/15 text-natural-heading font-bold'
                                  : 'text-stone-600 hover:bg-natural-sidebar'
                              }`}
                              title={highlighted ? `${dayAppts.length} cita(s)` : ''}
                            >
                              {d}
                              {highlighted && !isToday(d!) && (
                                <span className="w-1.5 h-1.5 bg-natural-accent rounded-full mt-0.5"></span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Botón "Nueva Cita" */}
                    <motion.button
                      onClick={() => setShowBookingForm(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 bg-natural-heading text-white font-bold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-md mb-8"
                    >
                      <Plus size={20} /> Agendar Nueva Cita
                    </motion.button>

                    {/* Lista de citas */}
                    {appointments.length > 0 ? (
                      <div className="grid gap-4">
                        {appointments.map((appt) => (
                          <motion.div
                            key={appt.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white border border-natural-border p-6 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-natural-sidebar rounded-2xl flex items-center justify-center text-natural-accent">
                                <Sparkles size={24} />
                              </div>
                              <div>
                                <h4 className="font-bold text-natural-heading underline decoration-natural-accent/30 underline-offset-4">{appt.treatment}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 font-medium">
                                  <span className="flex items-center gap-1"><Calendar size={14} /> {formatDate(appt.date)}</span>
                                  <span className="flex items-center gap-1"><Clock size={14} /> {appt.time}</span>
                        </div>
                                <p className="text-[11px] text-stone-400 mt-1">👤 {appt.patientName}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between md:justify-end gap-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                appt.status === 'Confirmada' ? 'bg-green-100 text-green-700' :
                                appt.status === 'Cancelada' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {appt.status}
                              </span>
                              <ChevronRight className="text-stone-300" size={20} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white border border-dashed border-natural-border rounded-3xl">
                        <div className="text-4xl mb-4">🌸</div>
                        <p className="text-stone-400 font-medium italic">Aún no tienes citas agendadas.</p>
                      </div>
                    )}
                  </>
                )}
              </AnimatePresence>

              <div className="mt-12 p-6 bg-natural-sidebar/40 rounded-3xl border border-natural-border">
                <div className="flex gap-4 items-start">
                  <Info className="text-natural-accent mt-1 shrink-0" size={20} />
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-widest text-natural-heading mb-2">Recordatorio Importante</h5>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Si necesitas cancelar o modificar tu cita, por favor avísanos con al menos 24 horas de antelación para que otra persona pueda aprovechar ese hueco. Puedes hacerlo hablando directamente con nuestro equipo por el chat. ✨
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Knowledge Panel - Desktop Only */}
        <aside className="hidden xl:flex w-80 bg-white border-l border-natural-border flex-col p-8 overflow-y-auto">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-8">Base de Conocimiento</h3>

          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3 text-natural-heading">
                <span className="text-sm font-bold uppercase tracking-tighter">Bótox</span>
                <span className="text-[10px] bg-natural-sidebar px-2 py-1 rounded-full font-bold">4-6 MESES</span>
              </div>
              <p className="text-[12px] leading-relaxed text-stone-500 italic">
                Ideal para suavizar líneas de expresión. No tumbarse en 4h post-sesión.
              </p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3 text-natural-heading">
                <span className="text-sm font-bold uppercase tracking-tighter">Ácido Hialurónico</span>
                <span className="text-[10px] bg-natural-sidebar px-2 py-1 rounded-full font-bold">9-12 MESES</span>
              </div>
              <p className="text-[12px] leading-relaxed text-stone-500 italic">
                Volumen e hidratación profunda. Evitar sol directo el primer día.
              </p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3 text-natural-heading">
                <span className="text-sm font-bold uppercase tracking-tighter">Higiene Facial</span>
                <span className="text-[10px] bg-natural-sidebar px-2 py-1 rounded-full font-bold">MENSUAL</span>
              </div>
              <p className="text-[12px] leading-relaxed text-stone-500 italic">
                Limpieza profunda con aparatología. Recuperación inmediata.
              </p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3 text-natural-heading">
                <span className="text-sm font-bold uppercase tracking-tighter">Microblading</span>
                <span className="text-[10px] bg-natural-sidebar px-2 py-1 rounded-full font-bold">12-18 MESES</span>
              </div>
              <p className="text-[12px] leading-relaxed text-stone-500 italic">
                Pigmentación de cejas pelo a pelo. Resultados muy naturales.
              </p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3 text-natural-heading">
                <span className="text-sm font-bold uppercase tracking-tighter">Láser y Corporales</span>
                <span className="text-[10px] bg-natural-sidebar px-2 py-1 rounded-full font-bold">VARIOS</span>
              </div>
              <p className="text-[12px] leading-relaxed text-stone-500 italic">
                Depilación definitiva y remodelación corporal personalizada.
              </p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3 text-natural-heading">
                <span className="text-sm font-bold uppercase tracking-tighter">Maquillaje</span>
                <span className="text-[10px] bg-natural-sidebar px-2 py-1 rounded-full font-bold">EVENTOS</span>
              </div>
              <p className="text-[12px] leading-relaxed text-stone-500 italic">
                Servicios para novias y eventos especiales. Resalta tu belleza natural.
              </p>
            </section>

            <div className="pt-8 mt-4 border-t border-natural-sidebar">
              <div className="w-full aspect-square rounded-3xl bg-natural-sidebar/50 border border-dashed border-stone-200 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-3xl mb-3">🌸</span>
                <p className="text-[11px] font-medium leading-relaxed text-natural-heading italic">
                  "La belleza comienza en el momento en que decides ser tú misma."
                </p>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
