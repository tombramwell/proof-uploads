'use client';
import { useState } from 'react';

export default function AmendCard({ item }) {
  // Default to 'Pending' if no status exists yet
  const [status, setStatus] = useState(item.status || 'Pending');
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (newStatus) => {
    if (newStatus === status) return;
    
    setStatus(newStatus); // Optimistic UI update (feels instant to the writer)
    setIsUpdating(true);
    
    try {
      await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item._id, status: newStatus })
      });
    } catch (e) {
      console.error("Failed to update status");
    }
    
    setIsUpdating(false);
  };

  // Dynamically change the card's background and top border based on status
  const getCardStyles = () => {
    if (status === 'Actioned') return { borderTop: '4px solid #16a34a', bg: '#f0fdf4' };
    if (status === 'In Progress') return { borderTop: '4px solid #f59e0b', bg: '#fffbeb' };
    return { borderTop: '4px solid #94a3b8', bg: '#ffffff' }; 
  };

  const styles = getCardStyles();

  return (
    <div style={{ border: '1px solid #d4d5d5', borderTop: styles.borderTop, borderRadius: '8px', padding: '24px', backgroundColor: styles.bg, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{item.proofId}</span>
        <span style={{ fontSize: '12px', color: '#8b8e8f' }}>
          {new Date(item.createdAt).toLocaleDateString('en-GB', { 
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
          })}
        </span>
      </div>
      
      <div style={{ fontSize: '14px', color: '#111211', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
        {item.comment}
      </div>
      
      <div style={{ fontSize: '12px', color: '#5f6263', borderTop: '1px solid #cbd5e1', paddingTop: '12px', paddingBottom: '16px' }}>
        Submitted by: <strong>{item.name}</strong>
      </div>

      {/* WORKFLOW STATUS BUTTONS */}
      <div style={{ display: 'flex', gap: '8px', opacity: isUpdating ? 0.5 : 1 }}>
        <button 
          onClick={() => updateStatus('Pending')}
          style={{ flex: 1, padding: '6px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #cbd5e1', background: status === 'Pending' ? '#94a3b8' : '#fff', color: status === 'Pending' ? '#fff' : '#475569' }}>
          Pending
        </button>
        <button 
          onClick={() => updateStatus('In Progress')}
          style={{ flex: 1, padding: '6px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #fcd34d', background: status === 'In Progress' ? '#f59e0b' : '#fff', color: status === 'In Progress' ? '#fff' : '#b45309' }}>
          In Progress
        </button>
        <button 
          onClick={() => updateStatus('Actioned')}
          style={{ flex: 1, padding: '6px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #86efac', background: status === 'Actioned' ? '#16a34a' : '#fff', color: status === 'Actioned' ? '#fff' : '#15803d' }}>
          Actioned
        </button>
      </div>
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <a 
          href={`/amends/${item.proofId}`} 
          style={{ fontSize: '13px', color: '#2563eb', textDecoration: 'none', fontWeight: 'bold' }}>
          Open Workspace ↗
        </a>
      </div>

    </div>
  );
}