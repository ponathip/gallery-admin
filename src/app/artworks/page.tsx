import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import ArtworkSortableTable from "./ArtworkSortableTable";

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

      <ArtworkSortableTable artworks={artworks} />

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
