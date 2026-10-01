import { useEffect, useRef, useState } from "react";
import images from "../domain/image-manifest.json";
import { journeySizes } from "../domain/image-layout";

export type IllustrationId = keyof typeof images;
const campusSizes =
  "(max-width: 720px) calc(100vw - 40px), (max-width: 1050px) calc((100vw - 100px) / 3), (max-width: 1420px) calc((100vw - 152px) / 3), 422.67px";

/** 有尺寸的微缩占位 + AVIF/WebP 自动协商；屏幕外图片靠近 200px 时才请求。 */
export function Illustration({
  id,
  alt,
  eager = false,
  priority = false,
}: {
  id: IllustrationId;
  alt: string;
  eager?: boolean;
  priority?: boolean;
}) {
  const picture = useRef<HTMLPictureElement>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(false);
  const asset = images[id];
  const sizes = id.startsWith("career-") ? journeySizes : campusSizes;
  useEffect(() => {
    if (visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (picture.current) observer.observe(picture.current);
    return () => observer.disconnect();
  }, [visible]);
  const srcSet = (format: "avif" | "webp") =>
    asset[format].map((item) => `${item.src} ${item.width}w`).join(", ");
  return (
    <picture
      ref={picture}
      className="responsive-illustration"
      data-loaded={loaded}
      style={
        loaded ? undefined : { backgroundImage: `url("${asset.placeholder}")` }
      }
    >
      <source
        type="image/avif"
        srcSet={visible ? srcSet("avif") : undefined}
        sizes={sizes}
      />
      <img
        src={visible ? asset.webp[1].src : asset.placeholder}
        srcSet={visible ? srcSet("webp") : undefined}
        sizes={sizes}
        width={asset.width}
        height={asset.height}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => {
          if (visible) setLoaded(true);
        }}
      />
    </picture>
  );
}
