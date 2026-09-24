import { isCloudflareStreamEmbed } from "@/lib/media/classify";

type ReportMediaItem = {
  media_type: "photo" | "video";
  media_url: string;
  thumbnail_url?: string | null;
};

const stageClass = "w-full bg-ink";
const mediaClass = "mx-auto block max-h-[80vh] w-full object-contain";

export function ReportMediaGallery({ media }: { media: ReportMediaItem[] }) {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {media.map((item) => {
        if (item.media_type === "video") {
          if (isCloudflareStreamEmbed(item.media_url)) {
            return (
              <div key={item.media_url} className={`${stageClass} aspect-video`}>
                <iframe
                  src={item.media_url}
                  title="Firsthand video"
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            );
          }
          return (
            <div key={item.media_url} className={stageClass}>
              <video
                src={item.media_url}
                poster={item.thumbnail_url ?? undefined}
                controls
                playsInline
                className={mediaClass}
              />
            </div>
          );
        }

        return (
          <div key={item.media_url} className={stageClass}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.media_url} alt="" className={mediaClass} />
          </div>
        );
      })}
    </div>
  );
}
