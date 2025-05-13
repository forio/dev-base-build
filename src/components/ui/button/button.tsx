import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentPropsWithRef } from 'react';
import { cn } from '../cn';
import styles from './button.module.scss';

const buttonVariants = cva(styles.base, {
  variants: {
    intent: {
      primary: styles.primary,
      secondary: styles.secondary,
      ghost: styles.ghost,
    },
    size: {
      sm: styles.sm,
      md: styles.md,
    },
    fullWidth: {
      true: styles.fullWidth,
      false: '',
    },
  },
  defaultVariants: {
    intent: 'primary',
    size: 'md',
    fullWidth: false,
  },
});

type ButtonProps = VariantProps<typeof buttonVariants> & ComponentPropsWithRef<'button'>;

const Button = ({ className, intent, size, fullWidth, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ intent, size, fullWidth }), className)}
      {...props}
    />
  );
};

export { Button, buttonVariants };
