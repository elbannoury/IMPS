import Image from "next/image";
import {
  deleteMediaAction,
  moveMediaAction,
  setCoverMediaAction,
  uploadMediaAction,
} from "@/app/actions/properties";

type Media = {
  id: string;
  url: string;
  kind: string;
  sortOrder: number;
  isCover: boolean;
  visibility: string;
  altFr: string | null;
  captionFr: string | null;
};

export function MediaManager({
  propertyId,
  media,
  canManage,
}: {
  propertyId: string;
  media: Media[];
  canManage: boolean;
}) {
  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]">Photos & médias</h2>
        <span className="text-[10px] text-muted">{media.length} fichier(s)</span>
      </header>

      {canManage ? (
        <form action={uploadMediaAction} encType="multipart/form-data" className="border-b border-line bg-soft/50 p-4">
          <input type="hidden" name="propertyId" value={propertyId} />
          <label htmlFor="files" className="label">Ajouter des photos (JPEG, PNG, WebP, AVIF — 8 Mo max)</label>
          <input id="files" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple required className="block w-full text-xs file:me-3 file:cursor-pointer file:border file:border-ink file:bg-ink file:px-3 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.12em] file:text-white" />
          <p className="mt-2 text-[10px] text-muted">Les images sont ré-encodées en WebP, EXIF supprimé, largeur max 2000 px. La première photo devient la photo principale.</p>
          <button type="submit" className="btn-primary btn-sm mt-3">Téléverser</button>
        </form>
      ) : null}

      {media.length ? (
        <ul className="divide-y divide-line">
          {media.map((item, index) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden bg-soft">
                {item.kind === "image" ? <Image src={item.url} alt={item.altFr ?? ""} fill sizes="80px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px]">{item.url}</p>
                <p className="text-[10px] text-muted">
                  {item.isCover ? "Photo principale · " : ""}{item.sortOrder + 1} · {item.visibility}
                </p>
              </div>
              {canManage ? (
                <div className="flex flex-wrap items-center gap-1">
                  <form action={moveMediaAction}>
                    <input type="hidden" name="mediaId" value={item.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={index === 0} className="btn-outline btn-sm disabled:opacity-30" aria-label="Monter">↑</button>
                  </form>
                  <form action={moveMediaAction}>
                    <input type="hidden" name="mediaId" value={item.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={index === media.length - 1} className="btn-outline btn-sm disabled:opacity-30" aria-label="Descendre">↓</button>
                  </form>
                  {!item.isCover ? (
                    <form action={setCoverMediaAction}>
                      <input type="hidden" name="mediaId" value={item.id} />
                      <button type="submit" className="btn-outline btn-sm">Principale</button>
                    </form>
                  ) : null}
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="mediaId" value={item.id} />
                    <button type="submit" className="btn-outline btn-sm">Supprimer</button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-xs text-muted">Aucun média. Au moins une photo est requise pour publier.</p>
      )}
    </section>
  );
}
