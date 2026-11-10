'use client';
import { useState } from 'react';
import { authenticateTeam } from './actions';
import { useRouter } from 'next/navigation';

export default function LoginClient() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const formData = new FormData(e.target);
    const result = await authenticateTeam(formData);
    
    if (result.success) {
      // Refresh the page so the Layout sees the new cookie and lets us in
      router.refresh(); 
    } else {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px', border: '1px solid #e2e8f0' }}>
        
        <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px', color: '#0f172a' }}>
          Team Access Required
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Please enter the studio passcode to view client amends.
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="password" 
            name="passcode"
            placeholder="Enter passcode" 
            required 
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
          />
          
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Verifying...' : 'Unlock Workspace'}
          </button>
          
          {error && <div style={{ fontSize: '13px', color: '#ef4444', marginTop: '4px', textAlign: 'center' }}>{error}</div>}
        </form>
      </div>
    </div>
  );
}