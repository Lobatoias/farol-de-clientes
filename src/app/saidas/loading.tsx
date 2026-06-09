import { SkPageHeader, SkKpiRow, SkSection } from "@/components/skeletons";

/** Skeleton instantâneo de Saídas durante a navegação/carregamento. */
export default function SaidasLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      <SkPageHeader />
      <SkKpiRow count={3} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkSection className="min-h-64" />
        <SkSection className="min-h-64" />
      </div>
      <SkSection />
    </div>
  );
}
