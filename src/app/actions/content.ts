"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaffAction } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { articleSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";

function revalidatePublic() {
  revalidatePath("/fr");
  revalidatePath("/ar");
  revalidatePath("/fr/guides");
  revalidatePath("/ar/guides");
  revalidatePath("/fr/developments");
  revalidatePath("/ar/developments");
}

export async function saveArticleAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("content.manage");
  const id = String(formData.get("articleId") ?? "");
  const parsed = articleSchema.safeParse({
    titleFr: formData.get("titleFr"),
    titleAr: formData.get("titleAr") ?? "",
    excerptFr: formData.get("excerptFr"),
    excerptAr: formData.get("excerptAr") ?? "",
    bodyFr: formData.get("bodyFr"),
    bodyAr: formData.get("bodyAr") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    cityId: formData.get("cityId") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    metaTitle: formData.get("metaTitle") ?? "",
    metaDescription: formData.get("metaDescription") ?? "",
  });
  if (!parsed.success) redirect(`/admin/content${id ? `/articles/${id}` : ""}?error=INVALID`);
  const data = parsed.data;

  if (id) {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) redirect("/admin/content?error=NOT_FOUND");
    await prisma.article.update({
      where: { id },
      data: {
        titleFr: data.titleFr,
        titleAr: data.titleAr ?? null,
        excerptFr: data.excerptFr,
        excerptAr: data.excerptAr ?? null,
        bodyFr: data.bodyFr,
        bodyAr: data.bodyAr ?? null,
        categoryId: data.categoryId ?? null,
        cityId: data.cityId ?? null,
        coverImage: data.coverImage ?? existing.coverImage,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "content.article_update",
      entityType: "article",
      entityId: id,
      summary: `Article updated: ${data.titleFr}`,
    });
  } else {
    const created = await prisma.article.create({
      data: {
        slug: `${slugify(data.titleFr)}-${Date.now().toString(36).slice(-4)}`,
        titleFr: data.titleFr,
        titleAr: data.titleAr ?? null,
        excerptFr: data.excerptFr,
        excerptAr: data.excerptAr ?? null,
        bodyFr: data.bodyFr,
        bodyAr: data.bodyAr ?? null,
        categoryId: data.categoryId ?? null,
        cityId: data.cityId ?? null,
        coverImage: data.coverImage || null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        authorId: user.id,
        status: "draft",
      },
    });
    await writeAudit({
      actorId: user.id,
      action: "content.article_create",
      entityType: "article",
      entityId: created.id,
      summary: `Article created: ${created.titleFr}`,
    });
    redirect(`/admin/content/articles/${created.id}?created=1`);
  }
  revalidatePublic();
  redirect(`/admin/content/articles/${id}?saved=1`);
}

export async function toggleArticleStatusAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("content.manage");
  const id = String(formData.get("articleId") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) redirect("/admin/content?error=NOT_FOUND");
  const publishing = article.status !== "published";
  await prisma.article.update({
    where: { id },
    data: {
      status: publishing ? "published" : "draft",
      publishedAt: publishing ? new Date() : article.publishedAt,
    },
  });
  await writeAudit({
    actorId: user.id,
    action: publishing ? "content.article_publish" : "content.article_unpublish",
    entityType: "article",
    entityId: id,
    summary: `${publishing ? "Published" : "Unpublished"} article: ${article.titleFr}`,
  });
  revalidatePublic();
  revalidatePath(`/fr/guides/${article.slug}`);
  revalidatePath(`/ar/guides/${article.slug}`);
  redirect("/admin/content?saved=1");
}

export async function createDevelopmentAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("content.manage");
  const nameFr = String(formData.get("nameFr") ?? "").trim();
  const cityId = String(formData.get("cityId") ?? "");
  const descriptionFr = String(formData.get("descriptionFr") ?? "").trim();
  if (nameFr.length < 3 || !cityId || descriptionFr.length < 40) {
    redirect("/admin/content?error=INVALID");
  }
  const created = await prisma.development.create({
    data: {
      slug: `${slugify(nameFr)}-${Date.now().toString(36).slice(-4)}`,
      nameFr,
      nameAr: String(formData.get("nameAr") ?? "") || null,
      descriptionFr,
      descriptionAr: String(formData.get("descriptionAr") ?? "") || null,
      cityId,
      neighborhoodId: String(formData.get("neighborhoodId") ?? "") || null,
      developerName: String(formData.get("developerName") ?? "") || null,
      constructionStatus: String(formData.get("constructionStatus") ?? "planned"),
      deliveryDate: formData.get("deliveryDate") ? new Date(String(formData.get("deliveryDate"))) : null,
      coverImage: String(formData.get("coverImage") ?? "") || null,
      status: "draft",
      createdById: user.id,
    },
  });
  await writeAudit({
    actorId: user.id,
    action: "content.development_create",
    entityType: "development",
    entityId: created.id,
    summary: `Development created: ${created.nameFr}`,
  });
  redirect("/admin/content?tab=developments&created=1");
}

export async function toggleDevelopmentStatusAction(formData: FormData): Promise<void> {
  const user = await requireStaffAction("content.manage");
  const id = String(formData.get("developmentId") ?? "");
  const dev = await prisma.development.findUnique({ where: { id } });
  if (!dev) redirect("/admin/content?error=NOT_FOUND");
  const publishing = dev.status !== "published";
  await prisma.development.update({
    where: { id },
    data: { status: publishing ? "published" : "draft" },
  });
  await writeAudit({
    actorId: user.id,
    action: publishing ? "content.development_publish" : "content.development_unpublish",
    entityType: "development",
    entityId: id,
    summary: `${publishing ? "Published" : "Unpublished"} development: ${dev.nameFr}`,
  });
  revalidatePublic();
  redirect("/admin/content?tab=developments&saved=1");
}
