import {
  SkPageHeader,
  SkKpiRow,
  SkClientGrid,
  Sk,
} from "@/components/skeletons";

/** Skeleton instantâneo do Dashboard durante a navegação/carregamento. */
export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6 animate-fade-in">
      <SkPageHeader />
      <SkKpiRow count={4} />
      <SkKpiRow count={4} />
      <div className="flex flex-wrap items-center gap-2">
        <Sk className="h-10 w-64" />
        <Sk className="h-10 w-24" />
        <Sk className="h-10 w-24" />
        <Sk className="h-10 w-24" />
      </div>
      <SkClientGrid count={8} />
    </div>
  );
}
