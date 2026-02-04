import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { consensusAdapter, runAdapter } from 'epicenter-libs';
import { ComponentType, useCallback, useMemo, useState } from 'react';
import invariant from 'tiny-invariant';
import { Button } from '~/components/ui/button/button';
import { Card } from '~/components/ui/card/card';
import { useGuardedSession } from '~/query/auth';
import { ConsensusQuery } from '~/query/consensus';
import { EpisodeQuery } from '~/query/episode';
import { RunQuery } from '~/query/run';
import { WorldQuery } from '~/query/world';
import type { BarrierReadOutView } from '~/schemas/consensus';
import type {
  FinanceVariables,
  OperationsVariables,
  SalesVariables,
} from '~/schemas/model';
import { Role } from '~/schemas/world';
import { FinanceForm } from './finance';
import styles from './index.module.scss';
import { OperationsForm } from './operations';
import { PerformanceReport } from './performance-report';
import { ReportChart } from './report-chart';
import { SalesForm } from './sales';
import { Sidebar } from './sidebar';
import { StepTransition } from './step-transition';

const createPendingBarrierPlaceholder = (
  barrier: BarrierReadOutView,
  name: string,
  stage: string
): BarrierReadOutView => ({
  // Keep the current board mounted while the next step's barrier is created/refetched.
  ...barrier,
  name,
  stage,
  triggered: false,
  closed: false,
  arrivedRoles: {
    Sales: [],
    Operations: [],
    Finance: [],
  },
  impendingRoles: {
    Sales: [],
    Operations: [],
    Finance: [],
  },
  result: undefined,
});

// Union of role-specific variable types - all extend BaseVariables
type RoleVariables = SalesVariables | OperationsVariables | FinanceVariables;

type FormProps = {
  step: number;
  variables: RoleVariables;
  onSubmit: (values: Record<string, number>) => Promise<void>;
};

const ROLE_COMPONENTS: Record<
  Role,
  {
    Form: ComponentType<FormProps>;
    description: string;
  }
> = {
  Sales: {
    Form: SalesForm as ComponentType<FormProps>,
    description: 'Set the selling price and forecast market demand.',
  },
  Operations: {
    Form: OperationsForm as ComponentType<FormProps>,
    description: 'Set production capacity and per-unit costs.',
  },
  Finance: {
    Form: FinanceForm as ComponentType<FormProps>,
    description: 'Set the fixed overhead costs.',
  },
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

  // Get role first - needed for role-aware variables query
  const myRole = world.assignments.find(
    (assignment) => assignment.user.userKey === session.userKey
  )?.role as Role | undefined;
  invariant(myRole, 'Player has no role assigned in this world');

  // Fetch only the variables this role can access
  const { data: variables } = useSuspenseQuery(
    RunQuery.variablesByRole({ runKey: run.runKey, role: myRole })
  );

  const { Step: step, Time: time } = variables;

  const [displayedStep, setDisplayedStep] = useState(step);
  const isTransitioning = displayedStep !== step;
  const handleTransitionComplete = useCallback(() => {
    setDisplayedStep(step);
  }, [step]);

  const { Form, description } = ROLE_COMPONENTS[myRole];

  const decisionYear = time[step];

  const stepActions = useMemo(
    () => [
      {
        objectType: 'execute',
        name: 'step',
        arguments: [] as Record<string, unknown>[],
      },
    ],
    []
  );

  const barrierName = `${run.runKey}:${step}`;
  const barrierStage = 'confer';

  const { data: barrier, dataUpdatedAt: barrierUpdatedAt } = useQuery({
    ...ConsensusQuery.barrier({
      worldKey: world.worldKey,
      runKey: run.runKey,
      name: barrierName,
      stage: barrierStage,
    }),
    placeholderData: (previousBarrier) =>
      previousBarrier
        ? createPendingBarrierPlaceholder(previousBarrier, barrierName, barrierStage)
        : undefined,
  });

  if (!barrier)
    throw queryClient.ensureQueryData(
      ConsensusQuery.barrier({
        worldKey: world.worldKey,
        runKey: run.runKey,
        name: barrierName,
        stage: barrierStage,
      })
    );

  const hasSubmitted = (barrier.arrivedRoles[myRole].length ?? 0) > 0;

  const handleSubmit = async (values: Record<string, number>) => {
    const updates = Object.entries(values).reduce<Record<string, number>>(
      (acc, [key, value]) => {
        acc[`${key}[0,${step}]`] = value;
        return acc;
      },
      {}
    );

    await runAdapter.updateVariables(run.runKey, updates);
    await consensusAdapter.submitActions(
      world.worldKey,
      barrierName,
      barrierStage,
      stepActions
    );

    queryClient.invalidateQueries({ queryKey: ['consensus', world.worldKey] });
    return queryClient.invalidateQueries(
      RunQuery.variablesByRole({ runKey: run.runKey, role: myRole })
    );
  };

  const handleUnsubmit = () =>
    consensusAdapter
      .undoSubmit(world.worldKey, barrierName, barrierStage)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['consensus', world.worldKey] })
      );

  return (
    <section className={styles.root} data-role={myRole}>
      <Sidebar
        myRole={myRole}
        description={description}
        decisionYear={decisionYear}
        step={step}
        barrier={barrier}
        barrierUpdatedAt={barrierUpdatedAt}
      >
        <Button
          onClick={() =>
            consensusAdapter.submitActions(
              world.worldKey,
              barrierName,
              barrierStage,
              stepActions
            )
          }
        >
          Continue On
        </Button>
      </Sidebar>
      <div className={styles.mainContent}>
        <StepTransition
          isTransitioning={isTransitioning}
          fromYear={time[displayedStep]}
          toYear={time[step]}
          onComplete={handleTransitionComplete}
        >
          <div className={styles.scrollArea}>
            {displayedStep > 1 && (
              <ReportChart variables={variables} step={displayedStep} />
            )}
            <PerformanceReport variables={variables} step={displayedStep} />
          </div>
        </StepTransition>
      </div>

      <div className={styles.decisionPanel}>
        {hasSubmitted ? (
          <Card className={styles.submittedCard}>
            <div className={styles.submittedTitle}>Decision submitted</div>
            <p className={styles.submittedHint}>
              We will advance once all roles have arrived.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className={styles.unsubmitButton}
              onClick={handleUnsubmit}
            >
              Undo submission
            </Button>
          </Card>
        ) : (
          <Form step={step} variables={variables} onSubmit={handleSubmit} />
        )}
      </div>
    </section>
  );
};
