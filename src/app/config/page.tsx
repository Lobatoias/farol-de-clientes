import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getSettings, listUsers } from "@/lib/users";
import { ConfigView } from "@/components/config-view";

export const metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const session = await getSession();
  // Defesa em profundidade — o middleware já bloqueia, mas garantimos aqui.
  if (session?.role !== "admin") redirect("/");

  const [settings, users] = await Promise.all([getSettings(), listUsers()]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="space-y-1 animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-[color:var(--muted)] grid place-items-center">
            <Settings className="size-4 text-[color:var(--muted-foreground)]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        </div>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          Conta, usuários e o que cada papel pode ver no sistema.
        </p>
      </div>

      <ConfigView settings={settings} users={users} />
    </div>
  );
}
