import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiData } from "@/lib/api";

type RecentInquiry = {
  id: number;
  name: string;
  email: string;
  inquiryType: string;
  status: string;
  createdAt: string;
};

type DashboardSummary = {
  totalArtworks: number;
  totalWallProjects: number;
  totalExhibitions: number;
  totalInquiries: number;
  newInquiries: number;
  recentInquiries: RecentInquiry[];
};

async function getSummary() {
  return apiData<DashboardSummary>("/dashboard/summary", {
    cache: "no-store",
  });
}

export default async function DashboardPage() {
  const summary = await getSummary();

  const cards = [
    { label: "Artworks", value: summary.totalArtworks, href: "/artworks" },
    { label: "Wall Projects", value: summary.totalWallProjects, href: "/wall-painting" },
    { label: "Exhibitions", value: summary.totalExhibitions, href: "/exhibitions" },
    { label: "Inquiries", value: summary.totalInquiries, href: "/inquiries" },
    { label: "New Inquiries", value: summary.newInquiries, href: "/inquiries?status=new" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-black/10 bg-white p-6 transition hover:bg-black/[0.03]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-black/40">
              {card.label}
            </p>
            <p className="mt-5 font-serif text-5xl">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-3xl">Recent Inquiries</h2>
          <Link
            href="/inquiries"
            className="text-xs uppercase tracking-[0.18em] text-black/50 hover:text-black"
          >
            View all →
          </Link>
        </div>

        {summary.recentInquiries.length === 0 ? (
          <p className="text-sm text-black/50">No inquiries yet.</p>
        ) : (
          <div className="divide-y divide-black/10">
            {summary.recentInquiries.map((item) => (
              <Link
                key={item.id}
                href={`/inquiries/${item.id}`}
                className="grid gap-4 py-4 text-sm transition hover:bg-black/[0.02] md:grid-cols-[1fr_160px_120px]"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-black/45">{item.email}</p>
                </div>

                <div className="text-black/55">{item.inquiryType}</div>

                <div>
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/60">
                    {item.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}