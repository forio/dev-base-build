import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import styles from './step-transition.module.scss';

type StepTransitionProps = PropsWithChildren<{
  isTransitioning: boolean;
  fromYear: number;
  toYear: number;
  onComplete: () => void;
}>;

export const StepTransition: FC<StepTransitionProps> = ({
  isTransitioning,
  fromYear,
  toYear,
  onComplete,
  children,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const showInterstitial = isTransitioning && !prefersReducedMotion;

  useEffect(() => {
    if (isTransitioning && prefersReducedMotion) onComplete();
  }, [isTransitioning, prefersReducedMotion, onComplete]);

  return (
    <div className={styles.container}>
      <AnimatePresence mode="wait">
        {showInterstitial ? (
          <motion.div
            key="interstitial"
            className={styles.interstitial}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <YearInterstitial
              fromYear={fromYear}
              toYear={toYear}
              onComplete={onComplete}
            />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={styles.contentWrapper}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CENTER = 100;
const OUTER_R = 74;
const INNER_R = 64;
const CARDINAL_INNER_R = 58;
const ARC_R = 70;
const HAND_LENGTH = CENTER - 32; // 68px from center to tip

const ARC_PATH = [
  `M ${CENTER} ${CENTER - ARC_R}`,
  `A ${ARC_R} ${ARC_R} 0 1 1 ${CENTER - 0.001} ${CENTER - ARC_R}`,
].join(' ');

const TICK_COUNT = 12;
const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = (i * 360) / TICK_COUNT - 90;
  const rad = (angle * Math.PI) / 180;
  const isCardinal = i % 3 === 0;
  const innerR = isCardinal ? CARDINAL_INNER_R : INNER_R;
  return {
    x1: CENTER + innerR * Math.cos(rad),
    y1: CENTER + innerR * Math.sin(rad),
    x2: CENTER + OUTER_R * Math.cos(rad),
    y2: CENTER + OUTER_R * Math.sin(rad),
    isCardinal,
  };
});

const EASE_DECEL = [0.4, 0, 0.2, 1] as const;
const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const;

const ClockFace: FC = () => {
  const handAngle = useMotionValue(0);
  const handX = useTransform(handAngle, (a: number) => CENTER + HAND_LENGTH * Math.sin(a));
  const handY = useTransform(handAngle, (a: number) => CENTER - HAND_LENGTH * Math.cos(a));

  useEffect(() => {
    const controls = animate(handAngle, Math.PI * 2, {
      duration: 1.4,
      delay: 0.8,
      ease: EASE_DECEL,
    });
    return () => controls.stop();
  }, [handAngle]);

  return (
    <motion.svg
      className={styles.clockFace}
      viewBox="0 0 200 200"
      fill="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 2.5, times: [0, 0.04, 0.88, 1] }}
    >
      <motion.path
        d={ARC_PATH}
        fill="none"
        stroke="var(--accent-9)"
        strokeOpacity={0.25}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.4, delay: 0.8, ease: EASE_DECEL }}
      />

      {ticks.map((tick, i) => (
        <motion.line
          key={i}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={tick.isCardinal ? 'var(--surface-9)' : 'var(--surface-7)'}
          strokeWidth={tick.isCardinal ? 2 : 1}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 + i * 0.03, ease: EASE_SMOOTH }}
        />
      ))}

      <motion.circle
        cx={CENTER}
        cy={CENTER}
        fill="var(--accent-11)"
        initial={{ r: 0 }}
        animate={{ r: 2.5 }}
        transition={{ duration: 0.2, delay: 0.7, ease: 'easeOut' }}
      />

      <motion.line
        x1={CENTER}
        y1={CENTER}
        x2={handX}
        y2={handY}
        stroke="var(--accent-11)"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1, delay: 0.8 }}
      />
    </motion.svg>
  );
};

type OdometerYearProps = {
  fromYear: number;
  toYear: number;
  hasFlipped: boolean;
};

const OdometerYear: FC<OdometerYearProps> = ({ fromYear, toYear, hasFlipped }) => {
  const fromDigits = String(fromYear).split('');
  const toDigits = String(toYear).split('');

  return (
    <div className={styles.odometerRow}>
      {toDigits.map((toDigit, i) => {
        const fromDigit = fromDigits[i];
        const changed = fromDigit !== toDigit;
        const displayDigit = hasFlipped ? toDigit : fromDigit;

        return (
          <span key={i} className={styles.digitSlot}>
            <AnimatePresence mode="popLayout">
              <motion.span
                key={`${i}-${displayDigit}`}
                className={styles.digit}
                initial={changed && hasFlipped ? { y: '100%', opacity: 0 } : false}
                animate={{ y: '0%', opacity: 1 }}
                exit={changed ? { y: '-100%', opacity: 0 } : undefined}
                transition={
                  changed
                    ? { type: 'spring', stiffness: 300, damping: 30 }
                    : { duration: 0 }
                }
              >
                {displayDigit}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </div>
  );
};

type YearInterstitialProps = {
  fromYear: number;
  toYear: number;
  onComplete: () => void;
};

const YearInterstitial: FC<YearInterstitialProps> = ({ fromYear, toYear, onComplete }) => {
  const [hasFlipped, setHasFlipped] = useState(false);

  useEffect(() => {
    const flipDelay = setTimeout(() => setHasFlipped(true), 1500);
    const completeDelay = setTimeout(() => onComplete(), 3200);

    return () => {
      clearTimeout(flipDelay);
      clearTimeout(completeDelay);
    };
  }, [fromYear, toYear, onComplete]);

  return (
    <div className={styles.yearDisplay}>
      <motion.div
        className={styles.rule}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.0, delay: 0.1, ease: EASE_SMOOTH }}
      />

      <motion.p
        className={styles.overline}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        Fiscal Year
      </motion.p>

      <motion.div
        className={styles.clockWrapper}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15, ease: EASE_SMOOTH }}
      >
        <ClockFace />
        <motion.div
          className={styles.glow}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.5, opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.8, delay: 2.0, ease: 'easeOut' }}
        />
        <OdometerYear fromYear={fromYear} toYear={toYear} hasFlipped={hasFlipped} />
      </motion.div>

      <motion.p
        className={styles.subtitle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 2.5 }}
      >
        Results incoming
      </motion.p>
    </div>
  );
};
