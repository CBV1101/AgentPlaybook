import { isCloudflareStreamEmbed } from "@/lib/media/classify";

type ReportMediaItem = {
  media_type: "photo" | "video";
  media_url: string;
  thumbnail_url?: string | null;
};

export function ReportMediaGallery({ media }: { media: ReportMediaItem[] }) {
  if (media.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 space-y-4">
      {media.map((item) => {
        if (item.media_type === "video") {
          if (isCloudflareStreamEmbed(item.media_url)) {
            return (
              <iframe
                key={item.media_url}
                src={item.media_url}
                title="Firsthand video"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full rounded-2xl border border-stone-200 bg-black"
              />
            );
          }
          return (
            <video
              key={item.media_url}
              src={item.media_url}
              poster={item.thumbnail_url ?? undefined}
              controls
              playsInline
              className="w-full rounded-2xl border border-stone-200 bg-black"
            />
          );
        }

        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.media_url}
            src={item.media_url}
            alt=""
            className="w-full rounded-2xl border border-stone-200 object-cover"
          />
        );
      })}
    </section>
  );
}
