'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Plus, Minus, Search, Loader2, Lock } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  category: string;
}

export default function ManagerDashboard() {
  // Security State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');

  // Dashboard States
  const [catalog, setCatalog] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<{ [id: string]: number }>({});
  const [eventName, setEventName] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loadDate, setLoadDate] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // CHANGE YOUR PASSCODE HERE:
    if (passcode === '2026') {
      setIsAuthenticated(true);
    } else {
      alert('Incorrect passcode');
      setPasscode('');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    supabase
      .from('equipment')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) alert("DATABASE ERROR: " + error.message);
        if (data) setCatalog(data);
      });
  }, [isAuthenticated]);

  const updateQty = (id: string, delta: number) => {
    setSelected((prev) => {
      const count = (prev[id] || 0) + delta;
      if (count <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: count };
    });
  };

  const handleDispatch = async () => {
    if (!eventName.trim() || Object.keys(selected).length === 0) return;
    setLoading(true);

    try {
      const { data: event, error: eventErr } = await supabase
        .from('events')
        .insert([{ name: eventName, venue, event_date: eventDate, load_date: loadDate }])
        .select()
        .single();

      if (eventErr || !event) throw eventErr;

      const itemsToInsert = Object.entries(selected).map(([eqId, qty]) => ({
        event_id: event.id,
        equipment_id: eqId,
        qty_needed: qty,
      }));

      const { error: itemsErr } = await supabase.from('event_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      const selectedItemsDetails = catalog.filter(item => selected[item.id] > 0);
      let gearListText = '';
      
      selectedItemsDetails.forEach(item => {
        gearListText += `- ${selected[item.id]}x ${item.name}\n`;
      });

      let waMessage = `*SHOCK SOUND & LIGHT | DISPATCH*\n━━━━━━━━━━━━━━━━━━━━\n`;
      waMessage += `*Event:* ${eventName.toUpperCase()}\n`;
      if (venue) waMessage += `*Venue:* ${venue}\n`;
      if (eventDate) waMessage += `*Event Date:* ${eventDate}\n`;
      if (loadDate) waMessage += `*Load-out Date:* ${loadDate}\n`;
      if (notes.trim()) waMessage += `*Notes:* ${notes.trim()}\n`;
      waMessage += `\n*EQUIPMENT CHECKLIST:*\n${gearListText}`;

      window.open(`https://wa.me/?text=${encodeURIComponent(waMessage)}`, '_blank');
      
      setSelected({});
      setEventName('');
      setVenue('');
      setEventDate('');
      setLoadDate('');
      setNotes('');
    } catch (e: any) {
      alert('Error saving manifest: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = catalog.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  // If not logged in, show only this lock screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 max-w-sm w-full shadow-2xl text-center">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-wide mb-1">Shock Dispatch</h1>
          <p className="text-sm text-slate-400 mb-6">Enter manager passcode to access inventory.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Enter Passcode" 
              value={passcode} 
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-center text-lg tracking-widest focus:border-amber-500 outline-none text-white"
              autoFocus
            />
            <button 
              type="submit" 
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // If logged in, show the main dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex justify-center font-sans">
      <div className="w-full max-w-xl space-y-4">
        <header className="border-b border-slate-800 pb-3">
          <h1 className="text-xl font-black text-amber-500 uppercase tracking-wide">
            Shock Sound & Light — Dispatch
          </h1>
          <p className="text-xs text-slate-400">Select event gear and generate WhatsApp checklist.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input type="text" placeholder="Event Name (e.g. Wedding Zouk)" value={eventName} onChange={(e) => setEventName(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none text-white" />
          <input type="text" placeholder="Venue / Location" value={venue} onChange={(e) => setVenue(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none text-white" />
          
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 uppercase ml-1 mb-1 font-bold">Event Date</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm focus:border-amber-500 outline-none text-white w-full" style={{ colorScheme: 'dark' }} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-slate-500 uppercase ml-1 mb-1 font-bold">Load-out Date</label>
            <input type="date" value={loadDate} onChange={(e) => setLoadDate(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm focus:border-amber-500 outline-none text-white w-full" style={{ colorScheme: 'dark' }} />
          </div>
        </div>

        <textarea 
          placeholder="Manager Notes (Optional)... e.g., Speak to security at the gate." 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm focus:border-amber-500 outline-none text-white resize-none h-16" 
        />

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input type="text" placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-amber-500 outline-none text-white" />
        </div>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {filtered.map((item) => {
            const qty = selected[item.id] || 0;
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{item.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => updateQty(item.id, -1)} disabled={qty === 0} className="w-7 h-7 flex items-center justify-center bg-slate-800 rounded disabled:opacity-20 active:scale-95"><Minus size={14} /></button>
                  <span className="text-sm font-bold w-4 text-center">{qty}</span>
                  <button type="button" onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-amber-500 text-slate-950 font-bold rounded active:scale-95"><Plus size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={handleDispatch} disabled={loading || !eventName.trim() || Object.keys(selected).length === 0} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-white">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          Send to WhatsApp
        </button>
      </div>
    </div>
  );
}