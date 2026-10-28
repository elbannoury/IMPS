import Link from "next/link";
import { Notice } from "@/components/ui";
import { createDevelopmentAction, saveArticleAction, toggleArticleStatusAction, toggleDevelopmentStatusAction } from "@/app/actions/content";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; created?: string; error?: string }>;
}) {
  await requireStaffPage("content.manage");
  const flags = await searchParams;
  const tab = flags.tab === "developments" ? "developments" : "articles";

  const [articles, developments, cities, categories] = await Promise.all([
    prisma.article.findMany({ orderBy: { updatedAt: "desc" }, include: { category: true, city: true, author: { select: { fullName: true } } } }),
    prisma.development.findMany({ orderBy: { updatedAt: "desc" }, include: { city: true, units: true } }),
    prisma.city.findMany({ where: { isPublished: true }, select: { id: true, nameFr: true }, orderBy: { nameFr: "asc" } }),
    prisma.articleCategory.findMany({ orderBy: { nameFr: "asc" } }),
  ]);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Référentiels</p>
      <h1 className="mt-1 font-display text-3xl">Contenu éditorial</h1>
      <p className="mt-1 text-xs text-muted">
        Guides et programmes ne sont publiés qu&apos;après relecture. Aucun contenu généré n&apos;est publié automatiquement.
      </p>

      {flags.saved ? <div className="mt-4"><Notice tone="success">Contenu enregistré.</Notice></div> : null}
      {flags.created ? <div className="mt-4"><Notice tone="success">Brouillon créé — complétez et publiez après relecture.</Notice></div> : null}
      {flags.error === "INVALID" ? <div className="mt-4"><Notice tone="warning">Formulaire invalide : titre, extrait (20 caractères) et corps (100 caractères) sont requis.</Notice></div> : null}

      <div className="mt-5 flex gap-1">
        <Link href="/admin/content" className={tab === "articles" ? "border border-ink bg-ink px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white" : "border border-line px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-muted"}>
          Articles ({articles.length})
        </Link>
        <Link href="/admin/content?tab=developments" className={tab === "developments" ? "border border-ink bg-ink px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white" : "border border-line px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-muted"}>
          Programmes ({developments.length})
        </Link>
      </div>

      {tab === "articles" ? (
        <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Articles & guides</h2>
            </header>
            <ul className="divide-y divide-line">
              {articles.map((article) => (
                <li key={article.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/admin/content/articles/${article.id}`} className="text-[13px] font-medium hover:underline">
                      {article.titleFr}
                    </Link>
                    <p className="text-[10px] text-muted">
                      {article.status} · {article.category?.nameFr ?? "sans catégorie"} · {article.city?.nameFr ?? "national"} ·{" "}
                      {article.author?.fullName ?? "—"} · {formatDate(article.updatedAt, "fr")}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/admin/content/articles/${article.id}`} className="btn-outline btn-sm">Modifier</Link>
                    <form action={toggleArticleStatusAction}>
                      <input type="hidden" name="articleId" value={article.id} />
                      <button type="submit" className="btn-outline btn-sm">{article.status === "published" ? "Dépublier" : "Publier"}</button>
                    </form>
                  </div>
                </li>
              ))}
              {!articles.length ? <li className="px-4 py-8 text-center text-xs text-muted">Aucun article.</li> : null}
            </ul>
          </section>

          <aside className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nouvel article</h2>
            </header>
            <form action={saveArticleAction} className="space-y-2 p-4">
              <div>
                <label htmlFor="titleFr" className="label">Titre (FR)</label>
                <input id="titleFr" name="titleFr" required className="field" />
              </div>
              <div>
                <label htmlFor="titleAr" className="label">Titre (AR)</label>
                <input id="titleAr" name="titleAr" dir="rtl" className="field" />
              </div>
              <div>
                <label htmlFor="excerptFr" className="label">Extrait (FR)</label>
                <textarea id="excerptFr" name="excerptFr" rows={2} required className="field" />
              </div>
              <div>
                <label htmlFor="bodyFr" className="label">Corps (FR) — texte brut</label>
                <textarea id="bodyFr" name="bodyFr" rows={6} required className="field" />
              </div>
              <div>
                <label htmlFor="categoryId" className="label">Catégorie</label>
                <select id="categoryId" name="categoryId" className="field">
                  <option value="">—</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.nameFr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cityId" className="label">Ville (facultatif)</label>
                <select id="cityId" name="cityId" className="field">
                  <option value="">National</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.nameFr}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">Créer le brouillon</button>
            </form>
          </aside>
        </div>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Programmes</h2>
            </header>
            <ul className="divide-y divide-line">
              {developments.map((development) => (
                <li key={development.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium">{development.nameFr}</p>
                    <p className="text-[10px] text-muted">
                      {development.status} · {development.city.nameFr} · {development.units.length} unité(s) · livraison{" "}
                      {formatDate(development.deliveryDate, "fr")}
                    </p>
                  </div>
                  <form action={toggleDevelopmentStatusAction}>
                    <input type="hidden" name="developmentId" value={development.id} />
                    <button type="submit" className="btn-outline btn-sm">{development.status === "published" ? "Dépublier" : "Publier"}</button>
                  </form>
                </li>
              ))}
              {!developments.length ? <li className="px-4 py-8 text-center text-xs text-muted">Aucun programme.</li> : null}
            </ul>
          </section>

          <aside className="border border-line bg-white">
            <header className="border-b border-line px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Nouveau programme</h2>
            </header>
            <form action={createDevelopmentAction} className="space-y-2 p-4">
              <div>
                <label htmlFor="dev-name" className="label">Nom (FR)</label>
                <input id="dev-name" name="nameFr" required className="field" />
              </div>
              <div>
                <label htmlFor="dev-name-ar" className="label">Nom (AR)</label>
                <input id="dev-name-ar" name="nameAr" dir="rtl" className="field" />
              </div>
              <div>
                <label htmlFor="dev-city" className="label">Ville</label>
                <select id="dev-city" name="cityId" required className="field">
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.nameFr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dev-desc" className="label">Description (FR)</label>
                <textarea id="dev-desc" name="descriptionFr" rows={4} required className="field" />
              </div>
              <div>
                <label htmlFor="dev-developer" className="label">Promoteur</label>
                <input id="dev-developer" name="developerName" className="field" />
              </div>
              <div>
                <label htmlFor="dev-status" className="label">Avancement</label>
                <select id="dev-status" name="constructionStatus" className="field">
                  <option value="planned">Programmé</option>
                  <option value="under_construction">En construction</option>
                  <option value="delivered">Livré</option>
                </select>
              </div>
              <div>
                <label htmlFor="dev-delivery" className="label">Livraison</label>
                <input id="dev-delivery" name="deliveryDate" type="date" className="field" />
              </div>
              <div>
                <label htmlFor="dev-cover" className="label">Image de couverture (chemin public)</label>
                <input id="dev-cover" name="coverImage" placeholder="/media/villa-pool-1.jpg" className="field" />
              </div>
              <button type="submit" className="btn-primary w-full">Créer le brouillon</button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
