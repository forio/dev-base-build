import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Fault, runAdapter } from 'epicenter-libs';
import { useAnimate } from 'motion/react';
import { FC, useLayoutEffect, useRef } from 'react';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import styles from './index.module.scss';

const Column: FC<{
  title: string;
  children?: React.ReactNode;
  list: Array<string>;
}> = ({ title, children, list }) => {
  const ul = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    if (ul.current) {
      ul.current.scrollTop = ul.current.scrollHeight;
    }
  }, [list]);
  return (
    <div className={styles.column}>
      <h3>{title}</h3>
      <ul ref={ul}>
        {list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {children}
    </div>
  );
};

export const PlayerHome = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episode })
  );
  const { data: run } = useSuspenseQuery(
    RunQuery.byWorld({
      session,
      worldKey: world.worldKey,
    })
  );
  const {
    data: { state },
  } = useSuspenseQuery(RunQuery.variables({ runKey: run.runKey }));

  const buzz = () =>
    animate(scope.current, { x: [0, -5, 5, -5, 5, 0] }, { duration: 0.35 });

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement> & { nativeEvent: SubmitEvent }
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, e.nativeEvent.submitter);
    const intent = formData.get('intent');
    invariant(typeof intent === 'string');

    e.currentTarget.reset();

    switch (intent) {
      case 'contribute': {
        const contribution = formData.get('contribution');
        invariant(typeof contribution === 'string');
        if (contribution.trim() === '') return buzz();
        return runAdapter
          .operation(run.runKey, 'contribute', [contribution])
          .then(() =>
            queryClient.invalidateQueries(RunQuery.variables({ runKey: run.runKey }))
          )
          .catch((error) => {
            if (error instanceof Fault && error.code === 'OPERATION_ERROR') return buzz();
            throw error;
          });
      }
      case 'replay':
        return runAdapter
          .removeFromWorld(world.worldKey) // Requires `allowWorldReset: true` for project
          .then(() =>
            queryClient.invalidateQueries(
              RunQuery.byWorld({
                session,
                worldKey: world.worldKey,
              })
            )
          );
      default:
        invariant(false, 'Unknown intent');
    }
  };

  const isEnd = [state.animals, state.colors, state.places].some(
    (arr) => arr.length >= 10
  );

  const playerRole = world.assignments.find(
    (assignment) => assignment.user.userKey === session.userKey
  )?.role;
  invariant(playerRole, 'Player has no role assigned in this world');

  const grid = [
    ['animals', 'Animals', 'Name an Animal'] as const,
    ['colors', 'Colors', 'Name a Color'] as const,
    ['places', 'Places', 'Name a Place'] as const,
  ].sort(
    ([a], [b]) => (a === playerRole ? 1 : b === playerRole ? -1 : 0) // Sort player to end
  );

  const [scope, animate] = useAnimate<HTMLInputElement>();

  return (
    <section className={styles.root}>
      <h1 className={styles.title}>🏁 First to name 10 in their category wins! 🏁</h1>
      <Card className={styles.mainGrid}>
        <Card>
          <Column list={state[grid[0][0]]} title={grid[0][1]} />
        </Card>
        <Card className={styles.middleColumn}>
          <Column list={state[grid[2][0]]} title={grid[2][1]}>
            {isEnd ? null : (
              <Card className={styles.centeredCard}>
                <form onSubmit={handleSubmit} className={styles.decisionForm}>
                  <Label>
                    {grid[2][2]}
                    <Input type="text" name="contribution" ref={scope} />
                  </Label>
                  <Button
                    type="submit"
                    variant="primary"
                    name="intent"
                    value="contribute"
                  >
                    Contribute
                  </Button>
                </form>
              </Card>
            )}
          </Column>
        </Card>
        <Card>
          <Column list={state[grid[1][0]]} title={grid[1][1]} />
        </Card>
      </Card>
      {isEnd && (
        <Card style={{ marginInline: 'auto' }}>
          <form onSubmit={handleSubmit}>
            <Button
              type="submit"
              variant="primary"
              name="intent"
              value="replay"
              size="md"
            >
              Play Again
            </Button>
          </form>
        </Card>
      )}
    </section>
  );
};
