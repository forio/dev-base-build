import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { runAdapter } from 'epicenter-libs';
import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import { Table } from '~/components/ui/table/table';
import { useGuardedSession } from '~/query/auth';
import { EpisodeQuery } from '~/query/episode';
import { MODEL, RunQuery } from '~/query/run';
import { formatDollar, formatDollarSI } from '~/utils/formatter';
import styles from './index.module.scss';

export const PlayerHome = () => {
  const queryClient = useQueryClient();
  const session = useGuardedSession();

  const { data: episode } = useSuspenseQuery(EpisodeQuery.current({ session }));
  const { data: run } = useSuspenseQuery(
    RunQuery.byUserPerEpisode({ session, episodeKey: episode.episodeKey })
  );
  const { data: variables } = useSuspenseQuery(
    RunQuery.variables({
      runKey: run.runKey,
    })
  );

  const step = variables?.Step || 0;

  const handleRestart = (e: React.FormEvent<HTMLFormElement>) => {
    invariant(episode?.episodeKey);
    invariant(run?.runKey);
    e.preventDefault();
    return runAdapter
      .create(MODEL, {
        scopeKey: episode.episodeKey,
        scopeBoundary: 'EPISODE',
        userKey: session.userKey,
      })
      .then(() =>
        queryClient.invalidateQueries(
          RunQuery.byUserPerEpisode({ session, episodeKey: episode.episodeKey })
        )
      );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    invariant(run?.runKey);
    e.preventDefault();
    return runAdapter
      .updateVariables(run.runKey, {
        [`Price[0,${step}]`]: Number(e.currentTarget.price.value),
      })
      .then(() => runAdapter.operation(run.runKey, 'step'))
      .then(() =>
        queryClient.invalidateQueries(RunQuery.variables({ runKey: run.runKey }))
      );
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

  if (!variables) return null;

  const isLastStep = step === variables.Time.length - 1;

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
      {isLastStep ? (
        <form className={styles.resetForm} onSubmit={handleRestart}>
          <h2>Play Again?</h2>
          <Button type="submit" intent="primary" size="md">
            Play Again
          </Button>
        </form>
      ) : (
        <form className={styles.decisionForm} onSubmit={handleSubmit}>
          <h2>Set a price for {variables.Time[step]}</h2>
          <Label>
            Price
            <Input
              type="number"
              name="price"
              min="0.01"
              step="0.01"
              defaultValue={variables.Price[step]}
            />
          </Label>
          <Button type="submit" intent="primary" size="md">
            Submit
          </Button>
        </form>
      )}
    </section>
  );
};
