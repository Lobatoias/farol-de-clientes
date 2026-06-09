import { Sk, SkKpiRow, SkSection } from "@/components/skeletons";

/** Skeleton instantâneo da página de cliente durante a navegação. */
export default function ClienteLoading() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <Sk className="h-4 w-40" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Sk className="size-14 rounded-2xl" />
          <div className="space-y-2">
            <Sk className="h-7 w-56" />
            <Sk className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <Sk className="h-10 w-40 hidden md:block" />
      </div>
      <SkKpiRow count={4} />
      <SkSection className="min-h-40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkSection className="min-h-56" />
        <SkSection className="min-h-56" />
      </div>
    </div>
  );
}
