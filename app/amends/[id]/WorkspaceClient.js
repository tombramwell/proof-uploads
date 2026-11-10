'use client';
import { useRef } from 'react';

export default function WorkspaceClient({ proofId, comments }) {
  const iframeRef = useRef(null);

  // 1. EXTRACT BOTH THE QUOTE AND THE HIDDEN CONTEXT
  const extractQuotes = (text) => {
    // Regex looks for > "Quote" followed by > 📍 [Context]
    const regex = /> "(.*?)"\n> 📍 \[(.*?)\]/g;
    let match;
    const quotes = [];
    while ((match = regex.exec(text)) !== null) {
      quotes.push({ text: match[1], context: match[2] });
    }
    return quotes;
  };

  // 2. THE DOUBLE JUMP LOGIC
  const locateText = (quoteText, contextText) => {
    const win = iframeRef.current.contentWindow;
    if (!win) return;
    
    // Clear selection so we start fresh
    win.getSelection().removeAllRanges();
    
    // Step A: Find the unique surrounding sentence first
    const foundContext = win.find(contextText, false, false, true);
    
    if (foundContext) {
      // We found the paragraph! The browser is now highlighting the whole sentence.
      // Step B: Collapse the cursor to the START of that sentence...
      const sel = win.getSelection();
      sel.collapseToStart(); 
      
      // Step C: ...and search forward for the specific word!
      win.find(quoteText, false, false, false); 
    } else {
      // Fallback: If context wasn't found (e.g. DOM changed), just look for the quote
      const foundQuote = win.find(quoteText, false, false, true);
      if (!foundQuote) {
        alert("Could not locate this exact text.");
      }
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .workspace-layout { display: flex; flex-direction: row; height: 100vh; width: 100vw; margin: 0; font-family: system-ui, sans-serif; }
        .iframe-panel { flex: 1; background-color: #ececec; }
        .sidebar-panel { width: 450px; padding: 30px; background-color: #f8fafc; border-left: 1px solid #d4d5d5; display: flex; flex-direction: column; box-shadow: -4px 0 15px rgba(0,0,0,0.05); z-index: 10; overflow-y: auto; }
      `}} />

      <div className="workspace-layout">
        <div className="iframe-panel">
          <iframe ref={iframeRef} src={`/${proofId}.html`} style={{ width: '100%', height: '100%', border: 'none' }} title="Campaign Proof" />
        </div>

        <div className="sidebar-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ marginTop: 0, marginBottom: '4px', fontSize: '20px', color: '#111211' }}>Workspace</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#5f6263' }}>Proof: <strong>{proofId}</strong></p>
            </div>
            <a href="/amends" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', background: '#fff' }}>← Back to Inbox</a>
          </div>

          {comments.length === 0 ? (
            <div style={{ padding: '20px', background: '#ecfdf5', color: '#065f46', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
              All caught up! No pending amends for this proof.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {comments.map((item) => {
                const amendBlocks = item.comment.split('📝 Amend ').filter(Boolean);

                return (
                  <div key={item._id} style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold' }}>
                      {item.name} requested:
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {amendBlocks.map((block, idx) => {
                        const amendText = `📝 Amend ${block.trim()}`;
                        
                        // Use the new extractor
                        const quotes = extractQuotes(amendText);
                        
                        // Clean up the visible text so the writer doesn't see the ugly > 📍 [context] tag
                        const visibleText = amendText.replace(/\n> 📍 \[(.*?)\]/g, '');

                        return (
                          <div key={idx} style={{ paddingBottom: idx !== amendBlocks.length - 1 ? '20px' : '0', borderBottom: idx !== amendBlocks.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                            <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                              {visibleText}
                            </div>
                            
                            {quotes.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {quotes.map((quoteObj, qIdx) => (
                                  <button 
                                    key={qIdx}
                                    // Pass BOTH the quote and context to the locator
                                    onClick={() => locateText(quoteObj.text, quoteObj.context)}
                                    style={{ padding: '6px 12px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                    🔍 Locate: "{quoteObj.text}"
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}