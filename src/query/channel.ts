import { Channel, GenericScope } from 'epicenter-libs';
import { useEffect, useMemo, useRef } from 'react';

type ChannelScope = GenericScope & {
  pushCategory: string;
};

export const useChannel = ({
  scopeBoundary,
  scopeKey,
  pushCategory,
}: {
  scopeBoundary: ChannelScope['scopeBoundary'];
  scopeKey: ChannelScope['scopeKey'];
  pushCategory: ChannelScope['pushCategory'];
}) =>
  useMemo(
    () =>
      [scopeBoundary, scopeKey, pushCategory].every(Boolean)
        ? new Channel({ scopeBoundary, scopeKey: scopeKey!, pushCategory })
        : undefined,
    [scopeBoundary, scopeKey, pushCategory]
  );

// When `channel`, subscription `callback`, or `token` changes,
// unsubscribe (cleanup) and resubscribe (body). Queue ensures most
// "up-to-date" subscribe comes last.
export const useChannelEffect = <M>({
  token,
  channel,
  callback,
}: {
  token: string;
  channel: Channel | undefined;
  callback: (data: M) => void;
}) => {
  const queue = useRef(Promise.resolve<any>(undefined));

  useEffect(() => {
    if (!channel) return;

    const subscribe = async () => {
      try {
        await channel.subscribe(callback);
      } catch (error) {
        console.error(`Channel subscribe failed for ${channel.path}`, error);
      }
    };

    const unsubscribe = async () => {
      try {
        await channel.unsubscribe();
      } catch (error) {
        console.error(`Channel unsubscribe failed for ${channel.path}`, error);
      }
    };

    queue.current = queue.current.catch(() => undefined).then(subscribe);

    return () => {
      queue.current = queue.current.catch(() => undefined).then(unsubscribe);
    };
  }, [channel, callback, token]);
};
