import { FormEvent, useState } from 'react';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import type { SalesVariables } from '~/schemas/model';
import styles from '../index.module.scss';

export const SalesForm = ({
  step,
  variables,
  onSubmit,
}: {
  step: number;
  variables: SalesVariables;
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
      for (const key of ['Price', 'Demand'] as const) {
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
        <Label className={styles.inputGroup} htmlFor="Price">
          Unit Price ($)
          <Input
            id="Price"
            name="Price"
            type="number"
            step="any"
            required
            defaultValue={variables.Price[step] ?? ''}
            disabled={submitting}
            className={styles.formInput}
          />
        </Label>
        <Label className={styles.inputGroup} htmlFor="Demand">
          Market Demand (units)
          <Input
            id="Demand"
            name="Demand"
            type="number"
            step="any"
            required
            defaultValue={variables.Demand[step] ?? ''}
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
