'use client';
export default function TestVideo() {
  const videos = [
    { id: 'h-09', url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-09-bubbly-boba-nobg.webm' },
    { id: 'h-02', url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/h-02-morning-coffee-nobg.webm' },
    { id: 'b-01', url: 'https://geolbgirpkzxrdvozmqw.supabase.co/storage/v1/object/public/ola-assets/animations/b-01-dancing.webm' },
  ];
  return (
    <div style={{ background: '#000', padding: 20, color: '#0f0', fontFamily: 'monospace' }}>
      <h1>Video Playback Test</h1>
      {videos.map(v => (
        <div key={v.id} style={{ marginBottom: 40, border: '1px solid #333', padding: 10 }}>
          <div>{v.id}</div>
          <video
            src={v.url}
            autoPlay playsInline muted loop preload="auto"
            width={300}
            style={{ background: 'transparent' }}
            onCanPlay={() => { document.getElementById('s-'+v.id)!.textContent = 'CAN PLAY ✅'; }}
            onError={(e) => {
              const el = e.currentTarget;
              document.getElementById('s-'+v.id)!.textContent = 'ERROR ❌ code=' + el.error?.code + ' msg=' + el.error?.message;
            }}
          />
          <div id={'s-'+v.id} style={{ color: '#ff0', marginTop: 4 }}>loading...</div>
        </div>
      ))}
    </div>
  );
}
