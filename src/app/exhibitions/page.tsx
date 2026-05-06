import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";

type Exhibition = {
  id: number;
  slug: string;
  title: string;
  year: string | null;
  type: string | null;
  venue: string | null;
  exhibitionDate: string | null;
  coverImageUrl: string | null;
  coverThumbUrl: string | null;
  isPublished: boolean;
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

async function getExhibitions(searchParams: {
  q?: string;
  page?: string;
  limit?: string;
}) {
  const q = searchParams.q ?? "";
  const page = searchParams.page ?? "1";
  const limit = searchParams.limit ?? "10";

  return apiFetch<Paginated<Exhibition>>(
    `/exhibitions?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    { cache: "no-store" },
  );
}

export default async function ExhibitionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await getExhibitions(params);

  const exhibitions = result.data;
  const totalPages = Math.ceil(result.total / result.limit);

  return (
    <AdminLayout title="Exhibitions">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-black/50">
          Manage exhibitions, images, statements, and artworks in each show.
        </p>

        <Link
          href="/exhibitions/new"
          className="rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.18em] text-white"
        >
          Add Exhibition
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
        {exhibitions.map((item) => (
          <Link
            key={item.id}
            href={`/exhibitions/${item.id}`}
            className="grid gap-5 border-b border-black/10 p-5 transition hover:bg-black/[0.03] lg:grid-cols-[180px_1fr_160px_130px]"
          >
            <img
              src={
                item.coverThumbUrl ??
                item.coverImageUrl ??
                "/images/placeholder.jpg"
              }
              alt={item.title}
              className="h-40 w-full rounded-xl object-cover lg:h-28"
            />

            <div>
              <p className="font-serif text-3xl">{item.title}</p>
              <p className="mt-2 text-sm text-black/50">
                {item.exhibitionDate} · {item.venue}
              </p>
            </div>

            <div className="text-sm text-black/60">
              {item.type}
              <br />
              {item.year}
            </div>

            <div>
              <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
                {item.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          </Link>
        ))}
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
