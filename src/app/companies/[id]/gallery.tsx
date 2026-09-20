import Image from "next/image";
import { ImageZoom } from "@/components/image-zoom";

/** Just the company's current main image — see page.tsx's galleryPhotos
 * comment for why this dropped the old thumbnail-switching gallery. Tapping
 * it opens the same photo full-screen via ImageZoom. */
export function Gallery({
  photos,
  alt,
}: {
  photos: { id: string; url: string }[];
  alt: string;
}) {
  const photo = photos[0];

  if (!photo) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-neutral-100 text-5xl">
        🧽
      </div>
    );
  }

  return (
    <ImageZoom src={photo.url} alt={alt} className="relative block aspect-square w-full bg-neutral-100">
      <Image src={photo.url} alt={alt} fill sizes="480px" priority className="object-cover" />
    </ImageZoom>
  );
}
