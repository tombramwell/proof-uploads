'use client';
import { useState, use, useRef, useEffect } from 'react';

export default function ReviewDashboard({ params }) {
  const unwrappedParams = use(params); 
  const id = unwrappedParams.id; 
  const iframeRef = useRef(null);

  const [name, setName] = useState('');
  const [draftComment, setDraftComment] = useState('');
  
  // NEW: The Ghost Array to hold the pinpoints silently
  const [draftQuotes, setDraftQuotes] = useState([]); 
  
  const [amendsList, setAmendsList] = useState([]);
  const [status, setStatus] = useState('');
  const [highlightedText, setHighlightedText] = useState('');
  const [highlightContext, setHighlightContext] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const savedDraft = localStorage.getItem(`amends_draft_${id}`);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.name) setName(parsed.name);
        if (parsed.draftComment) setDraftComment(parsed.draftComment);
        if (parsed.amendsList) setAmendsList(parsed.amendsList);
        if (parsed.draftQuotes) setDraftQuotes(parsed.draftQuotes);
      } catch (e) {}
    }
    setIsLoaded(true);
  }, [id]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(`amends_draft_${id}`, JSON.stringify({ name, draftComment, amendsList, draftQuotes }));
    }
  }, [name, draftComment, amendsList, draftQuotes, isLoaded, id]);

const handleIframeLoad = () => {
    try {
      // Get the window object so we can read the selection reliably
      const iframeWin = iframeRef.current.contentWindow;
      const iframeDoc = iframeRef.current.contentDocument || iframeWin.document;
      
      const checkSelection = () => {
        // A tiny 50ms delay allows the browser to finalize the highlight 
        // before we try to read it
        setTimeout(() => {
          const selection = iframeWin.getSelection();
          const text = selection.toString().trim();
          
          if (text && selection.anchorNode) {
            const parentNode = selection.anchorNode.parentElement;
            
            // Safety fallback in case parentNode is somehow missing
            const fullText = parentNode.innerText 
              ? parentNode.innerText.replace(/\s+/g, ' ').trim() 
              : text;
              
            const context = fullText.length > 100 ? fullText.substring(0, 100) : fullText;
            
            setHighlightedText(text);
            setHighlightContext(context);
          } else {
            setHighlightedText('');
            setHighlightContext('');
          }
        }, 50);
      };

      // 1. Listen for mouse releases, keyboard text selection (Shift+Arrows), and mobile taps
      iframeDoc.addEventListener('mouseup', checkSelection);
      iframeDoc.addEventListener('keyup', checkSelection);
      iframeDoc.addEventListener('touchend', checkSelection);
      
      // 2. Listen to the main window to catch instances where the client 
      // accidentally drags their mouse outside the iframe before releasing
      window.addEventListener('mouseup', checkSelection);

    } catch (e) {
      console.error("Could not read iframe contents", e);
    }
  };

  const injectQuote = () => {
    // 1. Client only sees the clean quote
    setDraftComment((prev) => `${prev}\n> "${highlightedText}"\n\n`);
    
    // 2. We silently record the quote paired with its exact pinpoint context
    setDraftQuotes((prev) => [...prev, { text: highlightedText, context: highlightContext }]);
    
    setHighlightedText(''); 
    setHighlightContext('');
  };

  const handleAddAmend = () => {
    if (!draftComment.trim()) return;
    
    // Store both the visible text and the hidden quotes in the shopping cart
    setAmendsList((prev) => [...prev, { visible: draftComment, quotes: draftQuotes }]);
    
    setDraftComment('');
    setDraftQuotes([]); // Clear the ghost array for their next amend
  };

  const removeAmend = (indexToRemove) => {
    setAmendsList((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (amendsList.length === 0 && !draftComment.trim()) return setStatus('⚠️ Please add at least one amend.');

    setStatus('Submitting...');
    
    const finalAmends = [...amendsList];
    if (draftComment.trim()) {
      finalAmends.push({ visible: draftComment, quotes: draftQuotes });
    }

    let combinedVisible = '';
    
    finalAmends.forEach((amend, index) => {
      let finalAmendText = amend.visible.trim();
      
      // 3. THE RE-ASSEMBLY: If this amend has hidden quotes, staple the context back on!
      if (amend.quotes && amend.quotes.length > 0) {
        amend.quotes.forEach(q => {
          // This replaces the clean quote with the system-ready [Quote + Pinpoint] string
          finalAmendText = finalAmendText.replace(`> "${q.text}"`, `> "${q.text}"\n> 📍 [${q.context}]`);
        });
      }
      
      combinedVisible += `📝 Amend ${index + 1}:\n${finalAmendText}\n\n`;
    });
    
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId: id, name, comment: combinedVisible.trim() })
      });
      if (res.ok) {
        setStatus('✅ All amends submitted successfully!');
        setAmendsList([]);
        setDraftComment('');
        setDraftQuotes([]);
        localStorage.removeItem(`amends_draft_${id}`);
      } else setStatus('❌ Error submitting.');
    } catch (err) {
      setStatus('❌ Network error.');
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .dashboard-layout { display: flex; flex-direction: row; height: 100vh; width: 100vw; margin: 0; font-family: system-ui, sans-serif; overflow: hidden; }
        .iframe-panel { flex: 1; background-color: #ececec; transition: all 0.3s ease; position: relative; }
        
        /* The sidebar now uses a CSS transition to slide in and out smoothly */
        .sidebar-panel { 
          width: ${isSidebarOpen ? '400px' : '0px'}; 
          padding: ${isSidebarOpen ? '30px' : '0px'}; 
          background-color: #ffffff; 
          border-left: ${isSidebarOpen ? '1px solid #d4d5d5' : 'none'}; 
          display: flex; 
          flex-direction: column; 
          box-shadow: -4px 0 15px rgba(0,0,0,0.05); 
          z-index: 10; 
          overflow-y: auto;
          overflow-x: hidden;
          transition: all 0.3s ease;
          opacity: ${isSidebarOpen ? '1' : '0'};
        }

        /* Floating button when sidebar is closed */
        .floating-open-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #2563eb;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
          border: none;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          cursor: pointer;
          z-index: 20;
          display: ${isSidebarOpen ? 'none' : 'block'};
          transition: transform 0.2s;
        }
        .floating-open-btn:hover { transform: scale(1.05); }

        @media (max-width: 768px) { 
          .dashboard-layout { flex-direction: column; } 
          .iframe-panel { flex: none; height: ${isSidebarOpen ? '50vh' : '100vh'}; } 
          .sidebar-panel { 
            width: 100%; 
            height: ${isSidebarOpen ? '50vh' : '0vh'}; 
            border-left: none; 
            border-top: ${isSidebarOpen ? '1px solid #d4d5d5' : 'none'}; 
            padding: ${isSidebarOpen ? '20px' : '0px'}; 
          }
          .floating-open-btn { bottom: 20px; top: auto; right: 20px; }
        }
      `}} />

      <div className="dashboard-layout">
        <div className="iframe-panel">
          <iframe ref={iframeRef} onLoad={handleIframeLoad} src={`/${id}.html`} style={{ width: '100%', height: '100%', border: 'none' }} title="Campaign Proof" />
          
          {/* THE FLOATING BUTTON */}
          <button className="floating-open-btn" onClick={() => setIsSidebarOpen(true)}>
            💬 Add Comments
          </button>
        </div>

<div className="sidebar-panel">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ marginTop: 0, fontSize: '20px', color: '#111211' }}>Campaign Feedback</h2>
              <p style={{ fontSize: '14px', color: '#5f6263', margin: 0 }}>Reviewing: <strong>{id}</strong></p>
            </div>
            
            {/* COLLAPSE BUTTON */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'none', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}>
              Full Screen ⤢
            </button>
          </div>
          
          {/* We wrap everything in the form so the Name input remains required for submission */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 'min-content' }}>
            
            {/* 1. NAME INPUT IS NOW AT THE TOP */}
            <input 
              type="text" 
              placeholder="Your Name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #b4b5b6', fontSize: '14px' }} 
            />
            
            {/* 2. HIGHLIGHTED TEXT BOX SITS BELOW THE NAME */}
            {highlightedText && (
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>Text Selected:</span>
                <span style={{ display: 'block', fontSize: '13px', color: '#14532d', marginBottom: '8px', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  "{highlightedText}"
                </span>
                <button type="button" onClick={injectQuote} style={{ padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', width: '100%' }}>
                  Add as Quote ✍️
                </button>
              </div>
            )}

            {/* 3. PENDING AMENDS LIST */}
            {amendsList.length > 0 && (
              <div style={{ padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <h3 style={{ fontSize: '14px', margin: '0 0 12px 0', color: '#334155' }}>Pending Amends ({amendsList.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {amendsList.map((amend, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '8px' }}>
                        {idx + 1}. {amend.visible}
                      </span>
                      <button onClick={() => removeAmend(idx)} type="button" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. DRAFTING TEXT AREA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea 
                placeholder="Type your amend here..." 
                value={draftComment} 
                onChange={(e) => setDraftComment(e.target.value)} 
                rows={4} 
                style={{ padding: '12px', borderRadius: '6px', border: '1px solid #b4b5b6', fontSize: '14px', resize: 'vertical' }} 
              />
              <button type="button" onClick={handleAddAmend} style={{ padding: '10px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                + Add to List
              </button>
            </div>

            {/* 5. SUBMIT BUTTON */}
            <button type="submit" style={{ padding: '14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '8px' }}>
              Submit All {amendsList.length > 0 ? `(${amendsList.length})` : ''}
            </button>
            
            {status && <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: '500', color: status.includes('✅') ? '#16a34a' : '#dc2626' }}>{status}</div>}
          </form>

        </div>
      </div>
    </>
  );
}