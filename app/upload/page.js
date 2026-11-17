"use client";
import { useState, useEffect } from "react";

export default function SimpleUploader() {
  const [file, setFile] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [arf, setArf] = useState("");
  const [proofNumber, setProofNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedPasscode = localStorage.getItem("proofPasscode");
    if (savedPasscode) setPasscode(savedPasscode);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !arf.trim()) return setError("Missing required fields.");

    setIsLoading(true);
    setError("");

    const expectedFileName = `${arf}-v${proofNumber}.html`; 
    
    try {
      const checkRes = await fetch(`/${expectedFileName}`, { method: 'HEAD' });
      if (checkRes.ok && !window.confirm("⚠️ This proof already exists. Overwrite?")) {
        return setIsLoading(false);
      }
    } catch (e) {}

    const formData = new FormData();
    formData.append("file", file);
    formData.append("passcode", passcode);
    formData.append("arf", arf);
    formData.append("proofNumber", proofNumber);

    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      localStorage.setItem("proofPasscode", passcode);

      const blobUrl = new URL(data.url);
      const fileName = blobUrl.pathname.split('/').pop();
      
      // ALWAYS returns the direct HTML link
      setShareUrl(`${window.location.origin}/${fileName}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full brand-card p-8">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">Direct Proof Uploader</h1>
        <p className="text-gray-600 mb-6">Generates a standard full-screen HTML link.</p>

        <form onSubmit={handleUpload} className="space-y-5">
          <input type="file" accept=".html,.htm" onChange={(e) => setFile(e.target.files[0])} required />
          <div className="flex gap-4">
            <input type="text" value={arf} onChange={(e) => setArf(e.target.value)} placeholder="ARF Number" required className="w-1/2 p-2 border rounded" />
            <input type="number" value={proofNumber} onChange={(e) => setProofNumber(e.target.value)} placeholder="Proof Version" className="w-1/2 p-2 border rounded" />
          </div>
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Team Passcode" required className="w-full p-2 border rounded" />
          
          {error && <div className="text-red-700 text-sm p-3 bg-red-50 border border-red-200 rounded">{error}</div>}
          
          <button type="submit" disabled={isLoading} className="w-full py-3 bg-brand-primary text-white rounded font-bold">
            {isLoading ? "Uploading..." : "Generate Direct Link"}
          </button>
        </form>

        {shareUrl && (
          <div className="mt-8 p-5 bg-brand-bg border-2 rounded text-center">
             <a href={shareUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold break-all">{shareUrl}</a>
          </div>
        )}
      </div>
    </main>
  );
}