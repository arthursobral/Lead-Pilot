'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { useObservations } from '@/hooks/useObservations';
import type { Observation, ObservationType, ObservationSeverity } from '@/types/observation';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CreateModeProps {
  developerId: string;
  developerName?: string;
  observation?: never;
  onSuccess?: never;
}

interface EditModeProps {
  developerId: string;
  developerName?: string;
  observation: Observation;
  onSuccess: () => void;
}

type ObservationFormProps = CreateModeProps | EditModeProps;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
  type: z.enum([
    'ACHIEVEMENT', 'CUSTOMER_FEEDBACK', 'COACHING_OPPORTUNITY',
    'CONCERN', 'LEADERSHIP', 'MENTORING', 'COMMUNICATION',
    'INCIDENT', 'OWNERSHIP', 'CONTEXT',
  ] as const),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH'] as const),
  summary: z
    .string()
    .min(5, 'Please describe the moment in a few words')
    .max(500, 'Keep the summary under 500 characters'),
  detail: z.string().max(2000, 'Detail must be under 2000 characters').optional(),
  occurredAt: z.string().min(1, 'Please select a date'),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const typeOptions: { value: ObservationType; label: string }[] = [
  { value: 'ACHIEVEMENT',          label: 'Achievement' },
  { value: 'CUSTOMER_FEEDBACK',    label: 'Customer feedback' },
  { value: 'LEADERSHIP',           label: 'Leadership moment' },
  { value: 'MENTORING',            label: 'Mentoring' },
  { value: 'OWNERSHIP',            label: 'Ownership' },
  { value: 'COACHING_OPPORTUNITY', label: 'Coaching opportunity' },
  { value: 'COMMUNICATION',        label: 'Communication' },
  { value: 'CONTEXT',              label: 'Context / note' },
  { value: 'CONCERN',              label: 'Concern' },
  { value: 'INCIDENT',             label: 'Incident' },
];

const severityOptions: { value: ObservationSeverity; label: string; description: string }[] = [
  { value: 'LOW',    label: 'Low',    description: 'Small note' },
  { value: 'MEDIUM', label: 'Medium', description: 'Worth remembering' },
  { value: 'HIGH',   label: 'High',   description: 'Significant moment' },
];

const todayStr = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ObservationForm
 *
 * Handles both create (redirect on success) and edit mode (call onSuccess).
 * In edit mode the date field is hidden -- occurredAt is immutable on the backend.
 *
 * Wording is chosen to reinforce "capturing context", not "evaluating performance".
 */
export function ObservationForm({
  developerId,
  developerName,
  observation,
  onSuccess,
}: ObservationFormProps): React.ReactElement {
  const router = useRouter();
  const isEditMode = Boolean(observation);

  const { createObservation, isCreating, updateObservation, isUpdating } =
    useObservations(developerId);

  const isSaving = isCreating || isUpdating;

  const initialOccurredAt = isEditMode
    ? observation!.occurredAt.slice(0, 10)
    : todayStr;

  const [pickerDate, setPickerDate] = useState(initialOccurredAt);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          type:       observation!.type,
          severity:   observation!.severity,
          summary:    observation!.summary,
          detail:     observation!.detail ?? '',
          occurredAt: initialOccurredAt,
        }
      : {
          type:       'ACHIEVEMENT',
          severity:   'LOW',
          occurredAt: todayStr,
        },
    mode: 'onChange',
  });

  // Keep the hidden form field in sync with the calendar picker
  useEffect(() => {
    setValue('occurredAt', pickerDate, { shouldValidate: true });
  }, [pickerDate, setValue]);

  const summaryLength = watch('summary')?.length ?? 0;

  const onSubmit = async (values: FormValues) => {
    if (isEditMode) {
      await updateObservation(observation!.id, {
        type:     values.type,
        severity: values.severity,
        summary:  values.summary,
        detail:   values.detail || undefined,
      });
      onSuccess!();
    } else {
      // Convert YYYY-MM-DD to ISO 8601 datetime (noon UTC avoids timezone off-by-one)
      const occurredAt = new Date(values.occurredAt + 'T12:00:00.000Z').toISOString();
      await createObservation({
        type:     values.type,
        severity: values.severity,
        summary:  values.summary,
        detail:   values.detail || undefined,
        occurredAt,
      });
      router.push(`/developers/${developerId}`);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      className="space-y-5 animate-fade-in"
    >
      {developerName && !isEditMode && (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Capturing a moment for{' '}
          <span className="font-medium text-stone-800 dark:text-stone-200">{developerName}</span>
        </p>
      )}

      {/* Type */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
        <select
          {...register('type')}
          className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600"
        >
          {typeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Severity */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Significance</label>
        <div className="flex gap-2">
          {severityOptions.map((o) => {
            const selected = watch('severity') === o.value;
            return (
              <label
                key={o.value}
                className={[
                  'flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-center transition-all duration-150',
                  selected
                    ? 'border-stone-800 bg-stone-900 dark:bg-stone-700 text-white'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800',
                ].join(' ')}
              >
                <input type="radio" value={o.value} {...register('severity')} className="sr-only" />
                <p className="text-sm font-medium">{o.label}</p>
                <p className="text-xs opacity-70 mt-0.5">{o.description}</p>
              </label>
            );
          })}
        </div>
      </div>

      {/* Date picker -- hidden in edit mode (occurredAt is immutable on the backend) */}
      {!isEditMode && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">When did this happen?</label>
          <DatePicker
            value={pickerDate}
            onChange={setPickerDate}
            max={todayStr}
          />
          {errors.occurredAt && (
            <p className="text-xs text-amber-700">{errors.occurredAt.message}</p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Summary</label>
          <span className="text-xs text-stone-400 dark:text-stone-500">{summaryLength} / 500</span>
        </div>
        <textarea
          {...register('summary')}
          rows={3}
          placeholder="Describe what you noticed."
          className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 resize-none"
        />
        {errors.summary && <p className="text-xs text-amber-700">{errors.summary.message}</p>}
      </div>

      {/* Detail */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Additional context{' '}
          <span className="font-normal text-stone-400 dark:text-stone-500">(optional)</span>
        </label>
        <textarea
          {...register('detail')}
          rows={4}
          placeholder="Any additional context -- links, quotes, circumstances -- that would be useful in a future conversation."
          className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-stone-600 resize-none"
        />
        {errors.detail && <p className="text-xs text-amber-700">{errors.detail.message}</p>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="primary" isLoading={isSaving} disabled={!isValid}>
          {isEditMode ? 'Save changes' : 'Save observation'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => (isEditMode ? onSuccess!() : router.back())}
          disabled={isSaving}
        >
          Cancel
        </Button>
      </div>

      {isSaving && (
        <Alert variant="info">
          {isEditMode ? 'Saving changes...' : 'Saving your observation...'}
        </Alert>
      )}
    </form>
  );
}
