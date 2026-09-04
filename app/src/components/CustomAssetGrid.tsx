import type { CustomAsset } from "../lib/state";
import { CustomAssetArtwork } from "./CustomAssetArtwork";

interface CustomAssetGridProps {
  assets: CustomAsset[];
  locale: "ja" | "en";
  selectedId?: string;
  referenceCounts: ReadonlyMap<string, number>;
  onSelect: (asset: CustomAsset) => void;
  onDelete: (asset: CustomAsset) => void;
}

export function CustomAssetGrid({
  assets,
  locale,
  selectedId,
  referenceCounts,
  onSelect,
  onDelete,
}: CustomAssetGridProps) {
  return (
    <ul className="custom-asset-grid">
      {assets.map((asset) => {
        const references = referenceCounts.get(asset.id) ?? 0;
        const label =
          locale === "ja"
            ? `カスタム画像 ${asset.width}×${asset.height}`
            : `Custom image ${asset.width}×${asset.height}`;
        return (
          <li className="custom-asset-card" key={asset.id}>
            <button
              aria-label={label}
              className={selectedId === asset.id ? "is-selected" : ""}
              onClick={() => onSelect(asset)}
              type="button"
            >
              <CustomAssetArtwork
                assetId={asset.id}
                className="custom-asset-preview"
              />
              <span>{`${asset.width} × ${asset.height}`}</span>
            </button>
            <button
              aria-label={locale === "ja" ? "画像を削除" : "Delete image"}
              className="custom-asset-delete"
              disabled={references > 0}
              onClick={() => onDelete(asset)}
              title={
                references > 0
                  ? locale === "ja"
                    ? `${references}件のShelf項目で使用中`
                    : `Used by ${references} Shelf items`
                  : undefined
              }
              type="button"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
