import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/ui";
import { saveArticleAction, toggleArticleStatusAction } from "@/app/actions/content";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireStaffPage("content.manage");
  const { id } = await params;
  const flags = await searchParams;

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();
  const [categories, cities] = await Promise.all([
    prisma.articleCategory.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.city.findMany({ where: { isPublished: true }, select: { id: true, nameFr: true }, orderBy: { nameFr: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Contenu · Article</p>
          <h1 className="mt-1 font-display text-2xl">{article.titleFr}</h1>
          <p className="mt-1 text-xs text-muted">
            {article.status} · /{article.slug} · mis à jour {formatDateTime(article.updatedAt, "fr")}
          </p>
        </div>
        <div className="flex gap-2">
          {article.status === "published" ? <Link href={`/fr/guides/${article.slug}`} target="_blank" className="btn-outline btn-sm">Voir</Link> : null}
          <form action={toggleArticleStatusAction}>
            <input type="hidden" name="articleId" value={article.id} />
            <button type="submit" className="btn-primary btn-sm">{article.status === "published" ? "Dépublier" : "Publier"}</button>
          </form>
          <Link href="/admin/content" className="btn-ghost btn-sm">Retour</Link>
        </div>
      </div>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Article enregistré.</Notice></div> : null}

      <form action={saveArticleAction} className="mt-6 space-y-4">
        <input type="hidden" name="articleId" value={article.id} />
        <section className="border border-line bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="titleFr" className="label">Titre (FR)</label>
              <input id="titleFr" name="titleFr" defaultValue={article.titleFr} required className="field" />
            </div>
            <div>
              <label htmlFor="titleAr" className="label">Titre (AR)</label>
              <input id="titleAr" name="titleAr" defaultValue={article.titleAr ?? ""} dir="rtl" className="field" />
            </div>
            <div>
              <label htmlFor="excerptFr" className="label">Extrait (FR)</label>
              <textarea id="excerptFr" name="excerptFr" defaultValue={article.excerptFr} rows={3} required className="field" />
            </div>
            <div>
              <label htmlFor="excerptAr" className="label">Extrait (AR)</label>
              <textarea id="excerptAr" name="excerptAr" defaultValue={article.excerptAr ?? ""} rows={3} dir="rtl" className="field" />
            </div>
            <div>
              <label htmlFor="bodyFr" className="label">Corps (FR) — un paragraphe par bloc séparé par une ligne vide</label>
              <textarea id="bodyFr" name="bodyFr" defaultValue={article.bodyFr} rows={14} required className="field" />
            </div>
            <div>
              <label htmlFor="bodyAr" className="label">Corps (AR)</label>
              <textarea id="bodyAr" name="bodyAr" defaultValue={article.bodyAr ?? ""} rows={14} dir="rtl" className="field" />
            </div>
          </div>
        </section>

        <section className="border border-line bg-white p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Publication & SEO</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="categoryId" className="label">Catégorie</label>
              <select id="categoryId" name="categoryId" defaultValue={article.categoryId ?? ""} className="field">
                <option value="">—</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.nameFr}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cityId" className="label">Ville</label>
              <select id="cityId" name="cityId" defaultValue={article.cityId ?? ""} className="field">
                <option value="">National</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.nameFr}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="coverImage" className="label">Image de couverture (chemin)</label>
              <input id="coverImage" name="coverImage" defaultValue={article.coverImage ?? ""} className="field" />
            </div>
            <div>
              <label htmlFor="metaTitle" className="label">Meta title</label>
              <input id="metaTitle" name="metaTitle" defaultValue={article.metaTitle ?? ""} className="field" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="metaDescription" className="label">Meta description</label>
              <input id="metaDescription" name="metaDescription" defaultValue={article.metaDescription ?? ""} className="field" />
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary">Enregistrer</button>
          <p className="self-center text-[11px] text-muted">
            Publier rend l&apos;article immédiatement visible et ajouté au sitemap.
          </p>
        </div>
      </form>
    </div>
  );
}
