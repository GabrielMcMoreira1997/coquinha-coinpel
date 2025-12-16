"use client"

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { format, addDays, isWeekend, differenceInBusinessDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Definição do tipo para o TypeScript
interface Member {
  id: number;
  name: string;
  ordem: number;
  id_home_office: number;
  home_office?: {
    day: string;
  };
}

export default function CocaDaily() {
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState('');
  const [homeOfficeDay, setHomeOfficeDay] = useState('1');
  const [payer, setPayer] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const { data } = await supabase
      .from('members')
      .select('*, home_office(day)')
      .order('ordem', { ascending: true });
    
    const membersList = (data as Member[]) || [];
    setMembers(membersList);
    calculatePayer(membersList);
    setLoading(false);
  }

  const calculatePayer = (list: Member[]) => {
    if (list.length === 0) return;
    
    const startDate = new Date('2023-10-02'); 
    const today = new Date();
    const diffDays = differenceInBusinessDays(today, startDate);
    
    let currentPayerIndex = 0;
    // Ajuste do array para bater com getDay() (0=Dom, 1=Seg...)
    const daysOfWeekPt = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira'];

    for (let i = 0; i <= diffDays; i++) {
      const dateCheck = addDays(startDate, i);
      if (isWeekend(dateCheck)) continue;

      const dayName = daysOfWeekPt[dateCheck.getDay()];
      const candidate = list[currentPayerIndex % list.length];

      if (candidate.home_office?.day === dayName) {
        const emergencyReplacement = list[(currentPayerIndex + 1) % list.length];
        if (i === diffDays) setPayer(emergencyReplacement);
      } else {
        if (i === diffDays) setPayer(candidate);
        currentPayerIndex++;
      }
    }
  };

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const nextOrder = members.length > 0 ? members[members.length - 1].ordem + 1 : 1;
    await supabase.from('members').insert([
      { name: newName, id_home_office: parseInt(homeOfficeDay), ordem: nextOrder }
    ]);
    
    setNewName('');
    fetchMembers();
  }

  return (
    <div className="page-wrapper">
      <div className="container">
        <header>
          <h1>🥤 Coca do Dia</h1>
          <p className="subtitle">Rodízio oficial de refrescos</p>
        </header>
        
        <div className={`highlight-card ${loading ? 'pulse' : ''}`}>
          <div className="card-content">
            <h3>Hoje quem paga é:</h3>
            <p className="payer-name">{payer ? payer.name : "..."}</p>
            <div className="date-badge">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
        </div>

        <section className="form-section">
          <form onSubmit={addMember} className="coca-form">
            <div className="input-group">
              <input 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                placeholder="Nome do colega..." 
                required 
              />
              <select value={homeOfficeDay} onChange={e => setHomeOfficeDay(e.target.value)}>
                <option value="1">HO: Segunda</option>
                <option value="2">HO: Terça</option>
                <option value="3">HO: Quarta</option>
                <option value="4">HO: Quinta</option>
                <option value="5">HO: Sexta</option>
              </select>
            </div>
            <button type="submit">Adicionar à Fila</button>
          </form>
        </section>

        <section className="list-section">
          <h3>👥 Próximos na Fila</h3>
          <div className="queue-list">
            {members.map((m) => (
              <div key={m.id} className={`member-row ${payer?.id === m.id ? 'active' : ''}`}>
                <span className="order">#{m.ordem}</span>
                <span className="name">{m.name}</span>
                <span className="ho-tag">HO: {m.home_office?.day?.split('-')[0]}</span>
                {payer?.id === m.id && <span className="status-badge">PAGANDO</span>}
              </div>
            ))}
            {members.length === 0 && !loading && <p className="empty-msg">Nenhum participante cadastrado.</p>}
          </div>
        </section>
      </div>

      <style jsx global>{`
        :root {
          --primary: #f40000;
          --primary-dark: #cc0000;
          --bg: #f8f9fa;
          --text: #2d3436;
          --white: #ffffff;
        }
        body { background-color: var(--bg); color: var(--text); margin: 0; font-family: sans-serif; }
        .page-wrapper { min-height: 100vh; padding: 40px 20px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 480px; }
        header { text-align: center; margin-bottom: 30px; }
        header h1 { margin: 0; font-size: 2.5rem; color: var(--primary); font-weight: 800; }
        .subtitle { margin: 5px 0 0; color: #636e72; }
        .highlight-card { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); color: white; padding: 40px 30px; border-radius: 24px; text-align: center; box-shadow: 0 20px 25px -5px rgba(244, 0, 0, 0.2); margin-bottom: 40px; }
        .payer-name { font-size: 3rem; font-weight: 900; margin: 15px 0; text-transform: uppercase; }
        .date-badge { background: rgba(0,0,0,0.1); padding: 6px 16px; border-radius: 50px; display: inline-block; font-size: 0.9rem; }
        .form-section { background: var(--white); padding: 20px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 30px; }
        .coca-form { display: flex; flex-direction: column; gap: 12px; }
        .input-group { display: flex; gap: 8px; }
        input, select { padding: 12px; border: 2px solid #edf2f7; border-radius: 8px; font-size: 1rem; flex: 1; }
        button { background: var(--text); color: white; padding: 14px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; }
        button:hover { background: #000; }
        .queue-list { display: flex; flex-direction: column; gap: 10px; }
        .member-row { background: var(--white); padding: 15px 20px; border-radius: 12px; display: flex; align-items: center; gap: 12px; border: 1px solid transparent; }
        .member-row.active { border-color: var(--primary); background: #fff5f5; }
        .order { color: #b2bec3; width: 30px; }
        .name { font-weight: 600; flex: 1; }
        .ho-tag { font-size: 0.75rem; background: #f1f2f6; padding: 4px 8px; border-radius: 4px; }
        .status-badge { background: var(--primary); color: white; font-size: 0.65rem; padding: 4px 8px; border-radius: 4px; animation: blink 1.5s infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}