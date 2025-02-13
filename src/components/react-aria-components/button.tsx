import { Button as RACButton, ButtonProps } from 'react-aria-components';
import './button.scss';

export interface StyledButtonProps extends ButtonProps {
  secondary?: boolean;
}

export function Button(props: StyledButtonProps) {
  const { secondary, className, ...rest } = props;
  const additionalClass = secondary ? 'secondary' : 'primary';
  const computedClassName = `react-aria-Button ${additionalClass} ${className || ''}`;
  return <RACButton className={computedClassName} {...rest} />;
}