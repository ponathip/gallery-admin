import AdminLayout from "@/components/admin/AdminLayout";
import { apiData } from "@/lib/api";
import InquiryStatusSelect from "../InquiryStatusSelect";
import ReplyBox from "./ReplyBox";

type Inquiry = {
  id: number;
  name: string;
  email: string;
  inquiryType: string;
  artworkId: number | null;
  artworkTitle: string | null;
  message: string;
  status: string;
  createdAt: string;
};

async function getInquiry(id: string) {
  return apiData<Inquiry>(`/inquiries/${id}`, {
    cache: "no-store",
  });
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const inquiry = await getInquiry(id);

  return (
    <AdminLayout title={`Inquiry #${inquiry.id}`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Message
          </p>

          <p className="mt-6 whitespace-pre-wrap leading-8 text-black/70">
            {inquiry.message}
          </p>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-black/40">
            Message
          </p>

          <p className="mt-6 whitespace-pre-wrap leading-8 text-black/70">
            {inquiry.message}
          </p>

          <ReplyBox id={inquiry.id} />
        </section>

        <aside className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                Customer
              </p>
              <p className="mt-2 font-medium">{inquiry.name}</p>
              <p className="text-black/50">{inquiry.email}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                Type
              </p>
              <p className="mt-2">{inquiry.inquiryType}</p>
            </div>

            {inquiry.artworkTitle && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                  Artwork
                </p>
                <p className="mt-2">{inquiry.artworkTitle}</p>
              </div>
            )}

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-black/40">
                Status
              </p>
              <div className="mt-2">
                <InquiryStatusSelect
                  id={inquiry.id}
                  status={inquiry.status}
                />
              </div>
            </div>
          </div>
        </aside>

      </div>
    </AdminLayout>
  );
}