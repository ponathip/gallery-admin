import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import PublishToggle from "./PublishToggle";
import WallProjectSortableTable from "./WallProjectSortableTable";

type WallProject = {
  id: number;
  title: string;
  location: string;
  year: string;
  spaceType: string;
  status: string;
  coverImageUrl: string;
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

function getStatusClass(status: string) {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700";
    case "in_progress":
      return "bg-yellow-50 text-yellow-700";
    case "concept":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-black/5 text-black/60";
  }
}

async function getWallProjects(searchParams: {
  q?: string;
  page?: string;
  limit?: string;
}) {
  const q = searchParams.q ?? "";
  const page = searchParams.page ?? "1";
  const limit = searchParams.limit ?? "10";

  return apiFetch<Paginated<WallProject>>(
    `/wall-projects?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    { cache: "no-store" },
  );
}

export default async function WallPaintingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await getWallProjects(params);

    const projects = Array.isArray(result)
    ? result
    : result?.data ?? [];

  // const total = Array.isArray(result)
  //   ? result.length
  //   : result?.total ?? 0;

  // const page = Array.isArray(result)
  //   ? Number(params.page ?? 1)
  //   : result?.page ?? 1;

  // const limit = Array.isArray(result)
  //   ? Number(params.limit ?? 10)
  //   : result?.limit ?? 10;
  const totalPages = Math.ceil(result.total / result.limit);
  return (
    <AdminLayout title="Wall Painting">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-black/50">
          Manage wall painting projects, before/after images, project details,
          views, and likes.
        </p>

        <Link
          href="/wall-painting/new"
          className="rounded-full bg-black px-6 py-3 text-xs uppercase tracking-[0.18em] text-white"
        >
          Add Project
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

      <WallProjectSortableTable projects={projects} />

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
