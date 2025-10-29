import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { runAdapter } from 'epicenter-libs';
import { Fragment, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import { formatDollar, formatDollarSI } from '~/utils/formatter';
import styles from './index.module.scss';

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
      worldKey: world?.worldKey,
    })
  );
  const { data: variables } = useSuspenseQuery(
    RunQuery.variables({ runKey: run.runKey })
  );

  const { data: metadata, dataUpdatedAt: metadataUpdatedAt } = useSuspenseQuery(
    RunQuery.metadata({ runKey: run.runKey })
  );

  const step = variables?.Step || 0;

  const playAgain = () =>
    runAdapter
      .removeFromWorld(world.worldKey) // Requires `allowWorldReset: true` for project
      .then(() =>
        queryClient.invalidateQueries(
          RunQuery.byWorld({
            session,
            worldKey: world?.worldKey,
          })
        )
      );

  const setPrice = (step: number, price: number) =>
    runAdapter.updateVariables(run.runKey, { [`Price[0,${step}]`]: price });

  const claimEditorship = () =>
    runAdapter
      .updateMetadata(run.runKey, { set: { editor: session.userKey } })
      .then(() =>
        queryClient.invalidateQueries(RunQuery.metadata({ runKey: run.runKey }))
      );

  const stepModel = (priceDecision: number) =>
    setPrice(step, priceDecision)
      .then(() => runAdapter.operation(run.runKey, 'step'))
      .then(() =>
        queryClient.invalidateQueries(RunQuery.variables({ runKey: run.runKey }))
      );

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement> & { nativeEvent: SubmitEvent }
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, e.nativeEvent.submitter);
    const intent = formData.get('intent');
    invariant(typeof intent === 'string');

    switch (intent) {
      case 'submit': {
        const price = formData.get('price');
        invariant(typeof price === 'string');
        return stepModel(Number(price));
      }
      case 'replay':
        return playAgain();
      default:
        invariant(false, 'Unknown intent');
    }
  };

  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < step; i++) {
      data.push({
        Time: variables?.Time[i],
        Profit: variables?.Profit[i],
      });
    }
    return data;
  }, [variables, step]);

  const isLastStep = step === variables.Time.length - 1;

  const inputProps = (playerIsEditor: boolean) =>
    playerIsEditor
      ? {
          defaultValue: variables.Price[step],
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            e.target.value && setPrice(step, Number(e.target.value)),
        }
      : {
          disabled: true,
          value: variables.Price[step],
        };

  const editor = world.assignments.find(
    (assignment) => assignment.user.userKey === metadata.editor
  );
  const playerIsEditor = editor?.user.userKey === session.userKey;
  const editorName = metadata.editor
    ? (editor?.user.displayName ?? 'Someone else')
    : 'No one';

  return (
    <section className={styles.root}>
      <Card className={styles.chart}>
        <LineChart width={480} height={280} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="Time" style={{ fontSize: 14 }} />
          <YAxis
            tickFormatter={(v: number) => formatDollarSI(v)}
            style={{ fontSize: 14 }}
          />
          <Tooltip formatter={(v: number) => formatDollar(v)} />
          <Line type="monotone" dataKey="Profit" activeDot={{ r: 7 }} />
        </LineChart>
      </Card>
      <Table striped compact numeric>
        <thead>
          <tr>
            <th>Year</th>
            <th>Bike Sales</th>
            <th>Price</th>
            <th>Revenue</th>
            <th>Variable Costs</th>
            <th>Fixed Costs</th>
            <th>Total Costs</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: variables.Time.length }, (_, i) => i)
            .slice(
              Math.max(0, step - 3),
              Math.max(2, Math.min(step, variables.Time.length + 1))
            )
            .map((t) => (
              <tr key={t}>
                <td>{variables.Time[t]}</td>
                <td>{variables.Bike_Sales[t].toLocaleString()}</td>
                <td>{formatDollar(variables.Price[t])}</td>
                <td>{formatDollar(variables.Revenue[t])}</td>
                <td>{formatDollar(variables.Variable_Costs[t])}</td>
                <td>{formatDollar(variables.Fixed_Costs[t])}</td>
                <td>{formatDollar(variables.Total_Costs[t])}</td>
                <td>{formatDollar(variables.Profit[t])}</td>
              </tr>
            ))
            .reverse()}
        </tbody>
      </Table>
      <Card style={{ alignSelf: 'center' }}>
        <form onSubmit={handleSubmit} className={styles.decisionForm}>
          {isLastStep ? (
            <Button
              type="submit"
              variant="primary"
              size="md"
              name="intent"
              value="replay"
            >
              Play Again
            </Button>
          ) : (
            <Fragment>
              <h2>Set a price for {variables.Time[step]}</h2>
              <Label>
                Price
                <Input
                  key={metadataUpdatedAt}
                  type="number"
                  name="price"
                  min="0.01"
                  step="0.01"
                  {...inputProps(playerIsEditor)}
                />
              </Label>
              <div className={styles.submissionButtons}>
                <Button
                  type="button"
                  onClick={claimEditorship}
                  disabled={metadata.editor === session.userKey}
                  variant="secondary"
                >
                  Become Editor
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  name="intent"
                  value="submit"
                  disabled={!playerIsEditor}
                >
                  Submit
                </Button>
                <p>
                  {playerIsEditor
                    ? 'You are the editor'
                    : editorName.concat(' is the editor')}
                </p>
              </div>
            </Fragment>
          )}
        </form>
      </Card>
    </section>
  );
};
