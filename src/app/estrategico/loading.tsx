import { SkPageHeader, SkKpiRow, SkSection } from "@/components/skeletons";

/** Skeleton instantâneo do Estratégico durante a navegação/carregamento. */
export default function EstrategicoLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      <SkPageHeader />
      <SkKpiRow count={3} />
      <SkSection className="min-h-48" />
      <SkSection className="min-h-48" />
    </div>
  );
}
