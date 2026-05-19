import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Sparkles, Calendar, Info, ShieldAlert, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import type { Message, ChatHistoryItem } from './types.ts';

const SYSTEM_GREETING = "¡Hola! Soy Aura, tu asistente virtual de la clínica. ✨ Estoy aquí para resolver tus dudas sobre nuestros tratamientos y ayudarte con tus citas. ¿En qué puedo ayudarte hoy? 🌸";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: SYSTEM_GREETING }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'appointments'>('chat');
  const [appointments, setAppointments] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Map messages to Gemini history format
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

      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Lo siento, he tenido un pequeño problema técnico. ¿Podrías repetirme tu consulta? ✨" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const QuickAction = ({ icon: Icon, text, onClick }: { icon: any, text: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-natural-border rounded-full text-xs font-bold uppercase tracking-tight text-natural-text hover:bg-natural-sidebar hover:text-natural-heading transition-all shadow-sm shrink-0"
      id={`quick-action-${text.toLowerCase().replace(/\s/g, '-')}`}
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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              activeView === 'chat' ? 'bg-stone-50' : 'bg-transparent'
            }`}>
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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              activeView === 'appointments' ? 'bg-stone-50' : 'bg-transparent group-hover:bg-white'
            }`}>
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

      {/* Main Chat Area */}
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
          <section className="flex-1 overflow-y-auto px-6 md:px-12 py-12 bg-natural-bg/30">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-medium text-natural-heading">Próximas Sesiones</h3>
                  <p className="text-sm text-stone-500">Aquí puedes ver el estado de tus citas programadas.</p>
                </div>
                <button 
                  onClick={() => setActiveView('chat')}
                  className="px-4 py-2 bg-white border border-natural-border rounded-full text-xs font-bold uppercase tracking-widest text-natural-heading hover:bg-natural-sidebar transition-all shadow-sm"
                >
                  Nueva Cita
                </button>
              </div>

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
                            <span className="flex items-center gap-1"><Calendar size={14} /> {appt.date}</span>
                            <span className="flex items-center gap-1">🕒 {appt.time}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          appt.status === 'Confirmada' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
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
      </main>

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
    </div>
  );
}
