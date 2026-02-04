import { FormEvent, useState } from 'react';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import type { FinanceVariables } from '~/schemas/model';
import styles from '../index.module.scss';

export const FinanceForm = ({
  step,
  variables,
  onSubmit,
}: {
  step: number;
  variables: FinanceVariables;
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
      const raw = formData.get('Fixed_Costs');
      const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
      if (!Number.isNaN(parsed)) values.Fixed_Costs = parsed;
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.decisionForm} onSubmit={handleSubmit}>
      <div className={styles.formTitle}>Submit Your Inputs</div>
      <div className={styles.formGrid}>
        <Label className={styles.inputGroup} htmlFor="Fixed_Costs">
          Fixed Costs ($)
          <Input
            id="Fixed_Costs"
            name="Fixed_Costs"
            type="number"
            step="any"
            required
            defaultValue={variables.Fixed_Costs[step] ?? ''}
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
