import {
  FieldError,
  Input,
  Label,
  Text,
  NumberField as AriaNumberField,
  NumberFieldProps as AriaNumberFieldProps,
  ValidationResult,
} from 'react-aria-components';

import './number-field.scss';

export interface NumberFieldProps extends AriaNumberFieldProps {
  label?: string | React.ReactNode;
  description?: string | React.ReactNode;
  errorMessage?: string | ((validation: ValidationResult) => string);
  prefix?: string;
}

export function NumberField(
  { label, description, errorMessage, prefix, ...props }: NumberFieldProps
) {
  return (
    <AriaNumberField {...props}>
      <Label>{label}</Label>
      {prefix && <Text slot="description">{prefix}</Text>}
      <Input />
      {description && <Text slot="description">{description}</Text>}
      <FieldError>{errorMessage}</FieldError>
    </AriaNumberField>
  );
}
