import AdminLayout from "@/components/admin/AdminLayout";
import { apiFetch } from "@/lib/api";
import InquiryStatusSelect from "./InquiryStatusSelect";
import Link from "next/link";
import AutoRefresh from "./AutoRefresh";
import NotificationWatcher from "./NotificationWatcher";
export const dynamic = "force-dynamic";

type Inquiry = {
  id: number;
  name: string;
  email: string;
  inquiryType: string;
  artworkId: number | null;
  wallProjectId: number | null;
  exhibitionId: number | null;
  status: string;
  message: string | null;
  createdAt: string;
};

type InquiryResult = {
  data: Inquiry[];
  total: number;
  page: number;
  limit: number;
  counts: {
    all: number;
    new: number;
    read: number;
    replied: number;
    archived: number;
  };
};

type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

async function getInquiries(searchParams: { page?: string; limit?: string }) {
  const page = searchParams.page ?? "1";
  const limit = searchParams.limit ?? "10";

  return apiFetch<Paginated<Inquiry>>(
    `/inquiries?page=${page}&limit=${limit}`,
    { cache: "no-store" },
  );
}

function getStatusClass(status: string) {
  switch (status) {
    case "new":
      return "bg-blue-50 text-blue-700";
    case "read":
      return "bg-yellow-50 text-yellow-700";
    case "replied":
      return "bg-green-50 text-green-700";
    case "archived":
      return "bg-black/5 text-black/50";
    default:
      return "bg-black/5 text-black/60";
  }
}

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    q?: string;
    page?: string;
    limit?: string;
  };
}) {
  const params = searchParams;

  const result = await getInquiries(params);

  const inquiries = result.data;
  const totalPages = Math.ceil(result.total / result.limit);

  const status = params.status || "all";
  const q = params.q || "";

  return (
    <AdminLayout title="Inquiries">
      <NotificationWatcher />
      <AutoRefresh interval={15000} />

      {/* SEARCH */}
      <form className="mb-4 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, message..."
          className="w-full rounded-full border border-black/10 px-5 py-3 text-sm"
        />

        <select
          name="limit"
          defaultValue={params.limit ?? "10"}
          className="rounded-full border border-black/10 px-4 py-3 text-sm"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>

        <button className="rounded-full bg-black px-5 py-3 text-sm text-white">
          Search
        </button>
      </form>

      {/* STATUS FILTER */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-black/10 bg-white p-4">
          {["all", "new", "read", "replied", "archived"].map((s) => (
            <Link
              key={s}
              href={`?status=${s}&q=${q}&limit=${result.limit}`}
              className={`mb-2 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                status === s
                  ? "bg-black text-white"
                  : "text-black/60 hover:bg-black/5"
              }`}
            >
              <span className="capitalize">{s}</span>

              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  status === s ? "bg-white/20" : "bg-black/5"
                }`}
              >
                {result.counts[s as keyof typeof result.counts]}
              </span>
            </Link>
          ))}
        </aside>

        <section>
          {/* TABLE */}
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            {inquiries.length === 0 ? (
              <div className="p-8 text-sm text-black/50">No inquiries yet.</div>
            ) : (
              inquiries.map((item) => (
                <Link
                  href={`/inquiries/${item.id}`}
                  key={item.id}
                  className={`grid gap-4 border-b border-black/10 px-5 py-5 text-sm transition hover:bg-black/[0.03] md:grid-cols-[220px_1fr_140px] ${
                    item.status === "new" ? "bg-blue-50/40 font-semibold" : ""
                  }`}
                >
                  <div>
                    <p>{item.name}</p>
                    <p className="mt-1 text-xs text-black/45">{item.email}</p>
                  </div>

                  <div>
                    <p className="line-clamp-1 text-black/70">{item.message}</p>
                    <p className="mt-1 text-xs text-black/40">
                      {item.inquiryType}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${getStatusClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* PAGINATION */}
          <div className="mt-5 flex justify-between text-sm">
            <p className="text-black/50">Total {result.total} items</p>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, i) => {
                const page = i + 1;
                const active = page === result.page;

                return (
                  <Link
                    key={page}
                    href={`?q=${q}&status=${status}&limit=${result.limit}&page=${page}`}
                    className={`rounded-full px-4 py-2 ${
                      active
                        ? "bg-black text-white"
                        : "bg-black/5 text-black/60"
                    }`}
                  >
                    {page}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
