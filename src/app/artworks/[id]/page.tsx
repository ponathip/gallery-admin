import AdminLayout from "@/components/admin/AdminLayout";
import EditArtworkForm from "./EditArtworkForm";

type ArtworkImage = {
  id: string;
  imageUrl: string;
  s3Key: string | null;
  altText: string | null;
  sortOrder: number;
};

type Artwork = {
  id: number;
  slug: string;
  title: string;
  year: string;
  medium: string;
  size: string;
  category: string;
  status: string;
  coverImageUrl: string | null;
  description: string;
  descriptionTh: string;
  viewCount: number;
  likeCount: number;
  isPublished: number;
  images: ArtworkImage[];
};

async function getArtwork(id: string): Promise<Artwork> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/artworks/id/${id}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch artwork");
  }

  const json = await res.json();
  return json.data;
}

export default async function EditArtworkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const art = await getArtwork(id);

  return (
    <AdminLayout title="Edit Artwork">
      <EditArtworkForm artwork={art} />
    </AdminLayout>
  );
}