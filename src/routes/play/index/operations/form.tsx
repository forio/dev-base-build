import { FormEvent, useState } from 'react';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import type { OperationsVariables } from '~/schemas/model';
import styles from '../index.module.scss';

export const OperationsForm = ({
  step,
  variables,
  onSubmit,
}: {
  step: number;
  variables: OperationsVariables;
  onSubmit: (values: Record<string, number>) => Promise<void>;
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData(event.currentTarget);
      const values: Record<string, number> = {};
      for (const key of ['Capacity', 'Variable_Cost'] as const) {
        const raw = formData.get(key);
        const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
        if (!Number.isNaN(parsed)) values[key] = parsed;
      }
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.decisionForm} onSubmit={handleSubmit}>
      <div className={styles.formTitle}>Submit Your Inputs</div>
      <div className={styles.formGrid}>
        <Label className={styles.inputGroup} htmlFor="Capacity">
          Production Capacity (units)
          <Input
            id="Capacity"
            name="Capacity"
            type="number"
            step="any"
            required
            defaultValue={variables.Capacity[step] ?? ''}
            disabled={submitting}
            className={styles.formInput}
          />
        </Label>
        <Label className={styles.inputGroup} htmlFor="Variable_Cost">
          Variable Cost per Unit ($)
          <Input
            id="Variable_Cost"
            name="Variable_Cost"
            type="number"
            step="any"
            required
            defaultValue={variables.Variable_Cost[step] ?? ''}
            disabled={submitting}
            className={styles.formInput}
          />
        </Label>
      </div>
      <Button
        type="submit"
        variant="role"
        size="md"
        fullWidth
        disabled={submitting}
        className={styles.submitButton}
      >
        {submitting ? 'Submitting...' : 'Submit Decision'}
      </Button>
    </form>
  );
};
