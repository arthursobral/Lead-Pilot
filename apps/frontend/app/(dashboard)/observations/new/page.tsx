'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ObservationForm } from '@/components/observations/observation-form';
import { useDeveloper } from '@/hooks/useDeveloper';

function NewObservationContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const developerId = searchParams.get('developerId') ?? '';

  const { developer } = useDeveloper(developerId);

  if (!developerId) {
    return (
      <div>
        <PageHeader
          title="Add observation"
          description="Record a meaningful moment for your team."
        />
        <p className="text-sm text-stone-500 dark:text-stone-400">
          No developer selected. Open this page from a developer profile.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Add observation"
        description="Capture a meaningful moment to build context over time."
      />
      <div className="max-w-xl">
        <ObservationForm
          developerId={developerId}
          developerName={developer?.name}
        />
      </div>
    </div>
  );
}

export default function NewObservationPage(): React.ReactElement {
  return (
    <Suspense fallback={
      <div>
        <PageHeader title="Add observation" description="Capture a meaningful moment." />
        <p className="text-sm text-stone-400 dark:text-stone-500">Loading...</p>
      </div>
    }>
      <NewObservationContent />
    </Suspense>
  );
}
