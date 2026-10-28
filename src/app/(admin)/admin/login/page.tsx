import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/site/Logo";
import { StaffLoginForm } from "@/components/admin/StaffLoginForm";

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.isStaff) redirect("/admin");

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Logo href="/fr" />
        <div className="mt-8 border border-line bg-white p-7">
          <p className="eyebrow">IMPS · Administration</p>
          <h1 className="mt-3 font-display text-2xl">Accès équipe</h1>
          <p className="mt-2 text-xs text-muted">Espace réservé aux membres autorisés. Toute action est journalisée.</p>
          <div className="mt-6">
            <StaffLoginForm />
          </div>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-muted">
          Aucun compte public ne donne accès à l&apos;administration. Les comptes sont créés par le propriétaire de la
          plateforme depuis l&apos;espace Équipe.
        </p>
      </div>
    </div>
  );
}
