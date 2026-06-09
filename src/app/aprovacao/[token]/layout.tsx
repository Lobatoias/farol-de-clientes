// Layout próprio pra /aprovacao/[token] — não usa a TopNav do app
// principal porque o cliente final (sem login) não precisa ver navegação.

import "@/app/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aprovação de conteúdo",
  description: "Aprove ou solicite alterações no conteúdo que sua agência preparou.",
};

export default function ApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[color:var(--background)]">{children}</div>;
}
