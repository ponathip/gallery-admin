type UploadProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export async function uploadToS3WithProgress(
  file: File,
  folder: string,
  onProgress?: (progress: UploadProgress) => void,
) {
  const presignRes = await fetch("/api/s3/presign", {
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

  if (!presignRes.ok) {
    throw new Error("Create presign failed");
  }

  const data = await presignRes.json();

  const uploadUrl = data.uploadUrl;
  const publicUrl = data.publicUrl;
  const s3Key = data.s3Key || data.key;

  if (!uploadUrl || !publicUrl || !s3Key) {
    throw new Error("Presign response missing data");
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", uploadUrl);

    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      const percent = Math.round((event.loaded / event.total) * 100);

      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(file);
  });

  return {
    url: publicUrl,
    key: s3Key,
  };
}