import { useEffect, useState } from 'react';

type ApiState =
  | { status: 'loading' }
  | { status: 'ok'; message: string }
  | { status: 'error'; error: string };

export default function App() {
  const [api, setApi] = useState<ApiState>({ status: 'loading' });

  useEffect(() => {
    fetch('/api')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((message) => setApi({ status: 'ok', message }))
      .catch((err: unknown) =>
        setApi({
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        }),
      );
  }, []);

  return (
    <main
      style={{
        padding: '3rem 1.5rem',
        maxWidth: 640,
        margin: '0 auto',
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ marginBottom: '0.25rem' }}>NestJS + React</h1>
      <p style={{ opacity: 0.7, marginTop: 0 }}>단일 서버에서 API와 화면을 함께 서빙</p>

      <p>
        이 화면은 NestJS(<code>ServeStaticModule</code>)가 정적 서빙하며, 아래 값은 같은
        서버의 <code>GET /api</code> 엔드포인트에서 가져옵니다.
      </p>

      <section
        style={{
          marginTop: '1.5rem',
          padding: '1rem 1.25rem',
          border: '1px solid color-mix(in srgb, currentColor 20%, transparent)',
          borderRadius: 10,
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'baseline',
        }}
      >
        <code>GET /api</code>
        <span aria-hidden>→</span>
        {api.status === 'loading' && <span style={{ opacity: 0.6 }}>불러오는 중…</span>}
        {api.status === 'ok' && (
          <strong style={{ color: '#12a150' }}>{api.message}</strong>
        )}
        {api.status === 'error' && (
          <strong style={{ color: '#e5484d' }}>에러: {api.error}</strong>
        )}
      </section>
    </main>
  );
}
