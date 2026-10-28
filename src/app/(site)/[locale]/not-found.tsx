import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] max-w-xl flex-col justify-center py-20">
      <p className="eyebrow">404</p>
      <h1 className="h-section mt-3">Cette page n&apos;existe pas — أو الصفحة غير موجودة.</h1>
      <p className="mt-4 text-sm text-muted">
        Le lien est peut-être obsolète, ou l&apos;annonce n&apos;est plus publiée.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/fr" className="btn-primary">
          Accueil
        </Link>
        <Link href="/fr/properties" className="btn-outline">
          Rechercher un bien
        </Link>
      </div>
    </div>
  );
}
