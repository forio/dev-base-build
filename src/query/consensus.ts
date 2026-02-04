import { queryOptions } from '@tanstack/react-query';
import { consensusAdapter, Fault } from 'epicenter-libs';
import { BarrierReadOutSchema } from '~/schemas/consensus';
import { Role } from '~/schemas/world';

const ROUND_TTL_SECONDS = 120;

const barrier = ({
  worldKey,
  runKey,
  name,
  stage = 'confer',
}: {
  worldKey: string;
  runKey: string;
  name: string;
  stage?: string;
}) =>
  queryOptions({
    queryKey: ['consensus', worldKey, runKey, name, stage],
    queryFn: () =>
      consensusAdapter
        .load(worldKey, name, stage)
        .catch((error) =>
          error instanceof Fault && error.status === 404
            ? consensusAdapter.create(
                worldKey,
                name,
                stage,
                {
                  Sales: 1,
                  Operations: 1,
                  Finance: 1,
                } satisfies Record<Role, number>,
                // @ts-expect-error fixed in 3.33.0
                { null: [{ objectType: 'execute', name: 'step', arguments: [] }] },
                { allowChannel: true, ttlSeconds: ROUND_TTL_SECONDS }
              )
            : Promise.reject(error)
        )
        .then(BarrierReadOutSchema.parse),
  });

export const ConsensusQuery = {
  barrier: barrier,
};
