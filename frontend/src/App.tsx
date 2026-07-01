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
    <main className="app">
      <h1 className="app__title">NestJS + React</h1>
      <p className="app__subtitle">단일 서버에서 API와 화면을 함께 서빙</p>

      <p>
        이 화면은 NestJS(<code>ServeStaticModule</code>)가 정적 서빙하며, 아래
        값은 같은 서버의 <code>GET /api</code> 엔드포인트에서 가져옵니다.
      </p>

      <section className="status">
        <code>GET /api</code>
        <span aria-hidden>→</span>
        {api.status === 'loading' && (
          <span className="status__value status__value--loading">
            불러오는 중…
          </span>
        )}
        {api.status === 'ok' && (
          <strong className="status__value status__value--ok">
            {api.message}
          </strong>
        )}
        {api.status === 'error' && (
          <strong className="status__value status__value--error">
            에러: {api.error}
          </strong>
        )}
      </section>
    </main>
  );
}
