import { useEffect, useState } from "react";
import { customAssetDataUrl } from "../lib/customAssets";

interface CustomAssetArtworkProps {
  assetId: string;
  className?: string;
}

export function CustomAssetArtwork({
  assetId,
  className,
}: CustomAssetArtworkProps) {
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSource("");
    setFailed(false);
    void customAssetDataUrl(assetId)
      .then((value) => {
        if (active) {
          setSource(value);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [assetId]);

  if (!source || failed) {
    return (
      <span
        aria-hidden="true"
        className={[className, "custom-asset-placeholder"]
          .filter(Boolean)
          .join(" ")}
      >
        {failed ? "!" : "◇"}
      </span>
    );
  }

  return (
    <img
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
      onError={() => setFailed(true)}
      src={source}
      height={64}
      width={64}
    />
  );
}
