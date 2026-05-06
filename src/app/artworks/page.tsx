import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";

type Artwork = {
  id: number;
  slug: string;
  title: string;
  year: string;
  medium: string;
  category: string;
  status: string;
  coverImageUrl: string | null;
  viewCount: number;
  likeCount: number;
};

type SearchParams = Promise<{
  q?: string;
  page?: string;
  limit?: string;
}>;

type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

async function getArtworks(searchParams: {
  q?: string;
  page?: string;
  limit?: string;
}) {
  const q = searchParams.q ?? "";
  const page = searchParams.page ?? "1";
  const limit = searchParams.limit ?? "10";

  return apiFetch<Paginated<Artwork>>(
    `/artworks?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    { cache: "no-store" },
  );
}

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await getArtworks(params);

  const artworks = result.data;
  const totalPages = Math.ceil(result.total / result.limit);

  return (
    <AdminLayout title="Artworks">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-black/50">
          Manage artwork information, images, views, likes, and publish status.
        </p>

        <Link
          href="/artworks/new"
          className="rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.18em] text-white"
        >
          Add Artwork
        </Link>
      </div>
      <form className="mb-4 flex gap-3">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search..."
          className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm"
        />

        <select
          name="limit"
          defaultValue={params.limit ?? "10"}
          className="rounded-xl border border-black/10 px-4 py-3 text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>

        <button
          type="submit"
          className="rounded-xl bg-black px-5 py-3 text-sm text-white"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="hidden grid gap-4 lg:grid-cols-[80px_1fr_130px_120px_100px_100px] gap-4 border-b border-black/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-black/40 lg:grid">
          <div>Image</div>
          <div>Title</div>
          <div>Category</div>
          <div>Status</div>
          <div>Views</div>
          <div>Likes</div>
        </div>

        {artworks.length === 0 ? (
          <div className="p-8 text-sm text-black/50">No artworks yet.</div>
        ) : (
          artworks.map((art) => (
            <Link
              href={`/artworks/${art.id}`}
              key={art.id}
              className="grid gap-4 border-b border-black/10 px-5 py-4 transition hover:bg-black/[0.03] lg:grid-cols-[80px_1fr_130px_120px_100px_100px] lg:items-center"
            >
              <div className="h-20 w-20 overflow-hidden rounded-xl bg-black/5 lg:h-16 lg:w-16">
                {art.coverImageUrl ? (
                  <img
                    src={art.coverImageUrl}
                    alt={art.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-black/30">
                    No image
                  </div>
                )}
              </div>

              <div>
                <p className="font-serif text-2xl">{art.title}</p>
                <p className="mt-1 text-sm text-black/45">
                  {art.year} · {art.medium}
                </p>
              </div>

              <div className="text-sm text-black/60">{art.category}</div>

              <div>
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
                  {art.status}
                </span>
              </div>

              <div className="text-sm text-black/60">{art.viewCount}</div>
              <div className="text-sm text-black/60">{art.likeCount}</div>
            </Link>
          ))
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <p className="text-black/50">Total {result.total} items</p>

        <div className="flex gap-2">
          {Array.from({ length: totalPages }).map((_, index) => {
            const page = index + 1;
            const active = page === result.page;

            return (
              <Link
                key={page}
                href={`?q=${params.q ?? ""}&limit=${result.limit}&page=${page}`}
                className={`rounded-full px-4 py-2 ${
                  active ? "bg-black text-white" : "bg-black/5 text-black/60"
                }`}
              >
                {page}
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
