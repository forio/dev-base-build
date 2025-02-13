import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Lang } from '../lang';
import clsx from 'clsx';
import styles from './header.module.scss';

type Route = {
  path: string;
  title: string;
  className?: string;
  children?: Route[];
};

export const NavItem = ({ route }: { route: Route }) => {
  const { title, className, path } = route;
  const { t } = useTranslation();
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => (
    clsx(isActive && styles.active, className && `${styles[className]}`)
  );

  return (
    <li>
      <NavLink
        to={path}
        data-content={t(title)}
        className={getNavLinkClass}
        {...route}
      >
        <Lang>{title}</Lang>
      </NavLink>
    </li>
  );
};

export const Header = ({ routes }: { routes: Route[] }) => {
  const { t } = useTranslation();

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <img src="https://forio.com/img/heros/forio-logo-blue.svg" alt={t('sim_title')} />
        <Lang>sim_title</Lang>
      </div>
      <nav aria-label={t('main')}>
        <ul>
          {routes.map((route) => (
            <NavItem key={route.path} route={route} />
          ))}
        </ul>
      </nav>
    </header>
  );
};