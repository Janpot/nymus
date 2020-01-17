import React from 'react';

/*
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
`; */

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
  return <div>docs</div>;
}

export default Home;
