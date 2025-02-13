import { FC } from 'react';
import { useTranslation } from 'react-i18next';

export type LangProps = {
  children: string;
  ns?: string;
  d?: Record<string, string | number>;
};

export const Lang: FC<LangProps> = ({ children, ns: namespace, d: dict }) => {
  const { t } = useTranslation(namespace);
  return t(children, dict) as string;
};
