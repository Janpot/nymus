import React from 'react';
import Head from 'next/head';

import dynamic from 'next/dynamic';

const IcuEditor = dynamic(() => import('../components/IcuEditor'), {
  ssr: false
});

const SAMPLE = `
Hello there  mr. {name}, how are you?

Quote '{' to escape '}' or Don''t

{ gender, select,
  female {{
    count, plural,
       =0 {Ela não tem nenhum Pokémon}
      one {Ela tem só um Pokémon}
    other {Ela tem # Pokémon}
  }}
  other {{
    count, plural,
       =0 {Ele não tem nenhum Pokémon}
      one {Ele tem só um Pokémon}
    other {Ele tem # Pokémon}
  }}
}

Trainers: { count, number }

Caught on { catchDate, date, short }

{ trainers, plural, offset:1
   =0 {The gym is empty}
   =1 {You are alone here}
  one {You and # trainer}
other {You and # trainers} }
`;

/*
interface HookResult<T, U> {
  load: (args: T) => Promise<void>;
  value?: U;
  loading: boolean;
  error?: Error;
}

function createLoader<T, U>(loadFunction: (args: T) => Promise<U>) {
  return function useLoader(): HookResult<T, U> {
    const [value, setValue] = React.useState<U>();
    const [loading, setLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<Error>();

    const load = React.useCallback(
      async (args: T) => {
        try {
          setLoading(true);
          const fetchesult = await loadFunction(args);
          setError(undefined);
          setValue(fetchesult);
        } catch (err) {
          setError(err);
        } finally {
          setLoading(false);
        }
      },
      [loadFunction]
    );

    return React.useMemo(
      () => ({
        load,
        value,
        loading,
        error
      }),
      [load, value, loading, error]
    );
  };
}
 */

function Home() {
  const [value, setValue] = React.useState(SAMPLE);
  return (
    <div>
      <Head>
        <title>Home</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <IcuEditor value={value} onChange={setValue} />
      <style jsx>{`
        .hero {
          width: 100%;
          color: #333;
        }
        .title {
          margin: 0;
          width: 100%;
          padding-top: 80px;
          line-height: 1.15;
          font-size: 48px;
        }
        .title,
        .description {
          text-align: center;
        }
        .row {
          max-width: 880px;
          margin: 80px auto 40px;
          display: flex;
          flex-direction: row;
          justify-content: space-around;
        }
        .card {
          padding: 18px 18px 24px;
          width: 220px;
          text-align: left;
          text-decoration: none;
          color: #434343;
          border: 1px solid #9b9b9b;
        }
        .card:hover {
          border-color: #067df7;
        }
        .card h3 {
          margin: 0;
          color: #067df7;
          font-size: 18px;
        }
        .card p {
          margin: 0;
          padding: 12px 0 0;
          font-size: 13px;
          color: #333;
        }
      `}</style>
    </div>
  );
}

export default Home;
