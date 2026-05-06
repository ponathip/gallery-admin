import imageCompression from "browser-image-compression";

export async function optimizeImage(file: File, type: "thumb" | "large") {
  const options =
    type === "thumb"
      ? {
          maxSizeMB: 0.25,
          maxWidthOrHeight: 600,
          useWebWorker: true,
          fileType: "image/webp",
        }
      : {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1800,
          useWebWorker: true,
          fileType: "image/webp",
        };

  const compressedFile = await imageCompression(file, options);

  return new File(
    [compressedFile],
    file.name.replace(/\.[^.]+$/, `-${type}.webp`),
    {
      type: "image/webp",
    }
  );
}