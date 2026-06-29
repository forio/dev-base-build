import { useQueries, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { runAdapter } from 'epicenter-libs';
import { CheckCircle2, Eye, Lock, Megaphone, RefreshCcw } from 'lucide-react';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { PUBLIC_WORLD_VARIABLES, ProxyQuery } from '~/query/proxy';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import styles from './index.module.scss';

const SIGNALS = [
  { value: 'build', label: 'Build' },
  { value: 'partner', label: 'Partner' },
  { value: 'wait', label: 'Wait' },
] as const;

const nameForWorld = (world: { displayName?: string; name?: string; worldKey: string }) =>
  world.displayName ?? world.name ?? world.worldKey;

const signalLabel = (value: string) =>
  SIGNALS.find((signal) => signal.value === value)?.label ?? value;

type FloorRow = {
  worldKey: string;
  worldName: string;
  signal: string;
  pitch: string;
  status: 'ok' | 'empty' | 'error';
  error?: string;
};

export const PlayerHome = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: world } = useSuspenseQuery(
    WorldQuery.bySessionPerEpisode({ session, episodeName: episode.name })
  );
  const { data: worlds } = useSuspenseQuery(
    WorldQuery.byEpisode({ session, episodeName: episode.name })
  );
  const { data: run } = useSuspenseQuery(
    RunQuery.byWorld({ session, worldKey: world.worldKey })
  );
  const { data: variables } = useSuspenseQuery(
    RunQuery.variables({ runKey: run.runKey })
  );

  const ready = variables.ready === true;
  const floorWorlds = worlds
    .filter((floorWorld) => floorWorld.worldKey !== world.worldKey)
    .sort((a, b) => nameForWorld(a).localeCompare(nameForWorld(b)));
  const floorQueries = useQueries({
    queries: floorWorlds.map((floorWorld) => ({
      ...ProxyQuery.publicWorldVariables({
        session,
        episodeKey: episode.episodeKey,
        worldKey: floorWorld.worldKey,
        variableNames: PUBLIC_WORLD_VARIABLES,
      }),
      enabled: ready,
    })),
  });
  const isFetchingFloor = floorQueries.some((query) => query.isFetching);
  const floor: FloorRow[] = floorWorlds.map((floorWorld, worldIndex) => {
    const floorQuery = floorQueries[worldIndex];
    const signal = floorQuery?.data?.signal ?? '';
    const pitch = floorQuery?.data?.pitch ?? '';

    return {
      worldKey: floorWorld.worldKey,
      worldName: nameForWorld(floorWorld),
      signal,
      pitch,
      status: floorQuery?.error ? 'error' : signal ? 'ok' : 'empty',
      error:
        floorQuery?.error instanceof Error
          ? floorQuery.error.message
          : floorQuery?.error
            ? String(floorQuery.error)
            : undefined,
    };
  });

  const invalidateRun = () =>
    queryClient.invalidateQueries(RunQuery.variables({ runKey: run.runKey }));

  const publishFloorChange = (activity: 'lock' | 'unlock') =>
    ProxyQuery.publishFloorChange({
      session,
      activity,
      episodeKey: episode.episodeKey,
      worldKey: world.worldKey,
      runKey: run.runKey,
    }).catch((error) => console.error('Floor change push failed', error));

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const signal = formData.get('signal');
    const pitch = formData.get('pitch');
    const privateNote = formData.get('private_note');

    invariant(typeof signal === 'string');
    invariant(typeof pitch === 'string');
    invariant(typeof privateNote === 'string');

    return runAdapter
      .updateVariables(run.runKey, {
        signal,
        pitch: pitch.trim(),
        private_note: privateNote.trim(),
        ready: true,
      })
      .then(() => Promise.all([invalidateRun(), publishFloorChange('lock')]));
  };

  const handleReset = () =>
    runAdapter
      .updateVariables(run.runKey, {
        signal: '',
        pitch: '',
        private_note: '',
        ready: false,
      })
      .then(() => Promise.all([invalidateRun(), publishFloorChange('unlock')]));

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1>Market signal</h1>
          <p>{ready ? signalLabel(variables.signal) : 'Choose'}</p>
        </div>
        <div className={styles.statusStrip}>
          <span>Episode {new Date(episode.created).toLocaleDateString()}</span>
          <span>{nameForWorld(world)}</span>
          <span>Run {run.runKey.slice(-6)}</span>
        </div>
      </header>

      <p className={styles.intro}>
        You run a desk on the trading floor. Pick your market signal, talk your book with
        a one-line pitch, then lock in to see how rival desks are playing it — your
        private note stays sealed.
      </p>

      <div className={styles.grid}>
        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Your desk</h2>
            <span data-ready={ready}>{ready ? 'Locked' : 'Open'}</span>
          </div>
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            key={`${run.runKey}:${variables.signal}:${variables.pitch}:${variables.private_note}:${ready}`}
          >
            <Label>
              Signal
              <select
                className={styles.select}
                name="signal"
                defaultValue={variables.signal || SIGNALS[0].value}
                disabled={ready}
              >
                {SIGNALS.map((signal) => (
                  <option key={signal.value} value={signal.value}>
                    {signal.label}
                  </option>
                ))}
              </select>
            </Label>

            <Label>
              <span className={styles.fieldLead}>
                <Megaphone size={14} aria-hidden />
                Public pitch
              </span>
              <Input
                name="pitch"
                defaultValue={variables.pitch}
                disabled={ready}
                maxLength={80}
                placeholder="Talk your book — one line"
              />
              <span className={styles.hint} data-tone="public">
                Other desks read this.
              </span>
            </Label>

            <Label>
              <span className={styles.fieldLead}>
                <Lock size={14} aria-hidden />
                Private note
              </span>
              <Input
                name="private_note"
                defaultValue={variables.private_note}
                disabled={ready}
                placeholder="Internal reasoning"
              />
              <span className={styles.hint} data-tone="sealed">
                Sealed. Never leaves your desk — the proxy will not serve it.
              </span>
            </Label>

            <div className={styles.actions}>
              {ready ? (
                <Button type="button" variant="secondary" onClick={handleReset}>
                  <RefreshCcw size={16} aria-hidden />
                  Change
                </Button>
              ) : (
                <Button type="submit" variant="primary">
                  <CheckCircle2 size={16} aria-hidden />
                  Lock
                </Button>
              )}
            </div>
          </form>
        </Card>

        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>On the floor</h2>
            <span>{ready && isFetchingFloor ? 'Refreshing' : 'Reveal'}</span>
          </div>

          {ready ? (
            <Table compact hover className={styles.floorTable}>
              <thead>
                <tr>
                  <th>Desk</th>
                  <th>Stance</th>
                  <th>Pitch</th>
                </tr>
              </thead>
              <tbody>
                {floor.length ? (
                  floor.map((row) => (
                    <tr key={row.worldKey} data-status={row.status}>
                      <td>{row.worldName}</td>
                      <td>
                        {row.status === 'ok' ? (
                          <span className={styles.stance} data-signal={row.signal}>
                            {signalLabel(row.signal)}
                          </span>
                        ) : (
                          <span className={styles.stanceMuted}>—</span>
                        )}
                      </td>
                      <td>
                        {row.status === 'ok' &&
                          (row.pitch ? (
                            <span className={styles.pitch}>{row.pitch}</span>
                          ) : (
                            <span className={styles.pitchMuted}>No pitch</span>
                          ))}
                        {row.status === 'empty' && 'Not locked'}
                        {row.status === 'error' && (row.error ?? 'Unavailable')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>No other desks</td>
                  </tr>
                )}
              </tbody>
            </Table>
          ) : (
            <div className={styles.revealGate}>
              <Eye size={22} aria-hidden />
              <span>Lock your desk to open the floor</span>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};
