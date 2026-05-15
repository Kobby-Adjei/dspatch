// dashboard/app.jsx
// React dashboard component for DSPatch SMB owners

import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function StatCard({ title, value, color }) {
  return (
    <div style={{
      background: '#1a1a1a', border: `1px solid ${color}`,
      borderRadius: 12, padding: '1.5rem', flex: 1
    }}>
      <p style={{ color: '#888', fontSize: 14 }}>{title}</p>
      <h2 style={{ color, fontSize: 32, fontWeight: 700 }}>{value}</h2>
    </div>
  );
}

function TicketRow({ ticket }) {
  const priorityColors = { urgent: '#ff4444', high: '#ff8800', medium: '#ffcc00', low: '#44bb44' };
  return (
    <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
      <td style={{ padding: '0.75rem' }}>{ticket.id.slice(0, 8)}...</td>
      <td style={{ padding: '0.75rem' }}>{ticket.customer_phone}</td>
      <td style={{ padding: '0.75rem', maxWidth: 300 }}>{ticket.issue_summary}</td>
      <td style={{ padding: '0.75rem' }}>
        <span style={{
          background: priorityColors[ticket.priority] + '22',
          color: priorityColors[ticket.priority],
          padding: '2px 8px', borderRadius: 999, fontSize: 12
        }}>{ticket.priority}</span>
      </td>
      <td style={{ padding: '0.75rem' }}>{ticket.status}</td>
    </tr>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, calls_today: 0 });

  useEffect(() => {
    // TODO: fetch from real API
    setTickets([
      { id: 'abc-123', customer_phone: '+1-313-555-0101', issue_summary: 'HVAC unit not working', priority: 'urgent', status: 'open' },
      { id: 'def-456', customer_phone: '+1-734-555-0202', issue_summary: 'Need to reschedule appointment', priority: 'medium', status: 'in_progress' },
    ]);
    setStats({ total: 14, open: 5, resolved: 9, calls_today: 23 });
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>DSPatch Dashboard</h1>
        <p style={{ color: '#888' }}>AI dispatch for Michigan small businesses</p>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Tickets" value={stats.total} color="#6c63ff" />
        <StatCard title="Open" value={stats.open} color="#ff8800" />
        <StatCard title="Resolved" value={stats.resolved} color="#44bb44" />
        <StatCard title="Calls Today" value={stats.calls_today} color="#00ccff" />
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Recent Tickets</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#888', textAlign: 'left', borderBottom: '1px solid #2a2a2a' }}>
              <th style={{ padding: '0.75rem' }}>ID</th>
              <th style={{ padding: '0.75rem' }}>Customer</th>
              <th style={{ padding: '0.75rem' }}>Issue</th>
              <th style={{ padding: '0.75rem' }}>Priority</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map(t => <TicketRow key={t.id} ticket={t} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
