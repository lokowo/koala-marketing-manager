'use client';
import { useState, useEffect } from 'react';

const VIDEOS = [
  { id: 'h-09', url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-09-bubbly-boba-nobg.webm' },
  { id: 'h-02', url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-02-morning-coffee-nobg.webm' },
];

export default function TestVideo() {
  const [results, setResults] = useState<Record<string, string>>({});

  useEffect(() => {
    VIDEOS.forEach(async (v) => {
      try {
        const r = await fetch(v.url, { method: 'HEAD' });
        const ct = r.headers.get('content-type');
        const cl = r.headers.get('content-length');
        setResults(p => ({ ...p, [v.id + '_fetch']: `${r.status} ${r.statusText} | type=${ct} | size=${cl}` }));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setResults(p => ({ ...p, [v.id + '_fetch']: `FETCH FAILED: ${msg}` }));
      }
    });
  }, []);

  return (
    <div style={{ background: '#000', padding: 20, color: '#0f0', fontFamily: 'monospace', fontSize: 13 }}>
      <h2 style={{ color: '#ff0' }}>1. Fetch test (HTTP HEAD)</h2>
      {VIDEOS.map(v => (
        <div key={v.id} style={{ marginBottom: 8 }}>
          <span style={{ color: '#fff' }}>{v.id}: </span>
          <span>{results[v.id + '_fetch'] || 'fetching...'}</span>
        </div>
      ))}

      <h2 style={{ color: '#ff0', marginTop: 30 }}>2. Direct video tag</h2>
      {VIDEOS.map(v => (
        <div key={v.id} style={{ marginBottom: 30, border: '1px solid #333', padding: 10 }}>
          <div style={{ color: '#fff' }}>{v.id}</div>
          <video src={v.url} autoPlay playsInline muted loop preload="auto" width={250}
            style={{ background: '#111' }}
            onCanPlay={() => { const el = document.getElementById('s-'+v.id); if(el) el.textContent='CAN PLAY ✅'; }}
            onError={(e) => { const el = document.getElementById('s-'+v.id); const vid=e.currentTarget; if(el) el.textContent='ERROR ❌ code='+vid.error?.code+' msg='+vid.error?.message; }}
            onLoadStart={() => { const el = document.getElementById('s-'+v.id); if(el) el.textContent='load started...'; }}
            onStalled={() => { const el = document.getElementById('s-'+v.id); if(el) el.textContent='STALLED ⚠️ (network issue)'; }}
          />
          <div id={'s-'+v.id} style={{ color: '#ff0', marginTop: 4 }}>waiting...</div>
        </div>
      ))}

      <h2 style={{ color: '#ff0', marginTop: 30 }}>3. Direct link test</h2>
      <p>Click to open video URL directly in new tab:</p>
      {VIDEOS.map(v => (
        <div key={v.id}><a href={v.url} target="_blank" style={{ color: '#0ff' }}>{v.id}: {v.url.slice(-50)}</a></div>
      ))}
    </div>
  );
}
