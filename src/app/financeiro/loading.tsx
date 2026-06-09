import {
  SkPageHeader,
  SkKpiRow,
  SkSection,
} from "@/components/skeletons";

/** Skeleton instantâneo do Financeiro durante a navegação/carregamento. */
export default function FinanceiroLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      <SkPageHeader />
      <SkKpiRow count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkSection />
        <SkSection />
      </div>
      <SkSection className="min-h-64" />
    </div>
  );
}
