export async function uploadToS3(file: File, folder: string) {
  const res = await fetch("/api/s3/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      folder,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create upload URL");
  }

  const { uploadUrl, publicUrl, key } = await res.json();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload to S3");
  }

  return {
    url: publicUrl,
    key,
  };
}