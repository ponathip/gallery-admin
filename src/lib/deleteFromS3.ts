export async function deleteFromS3(key: string) {
  const res = await fetch("/api/s3/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Delete from S3 failed");
  }
}