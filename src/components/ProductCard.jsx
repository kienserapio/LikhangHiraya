import { useEffect, useState } from "react";
import styles from "./ProductCard.module.css";
import { useCartStore } from "../store/cartStore";
import { useFavoriteStore } from "../store/favoriteStore";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function ProductCard({ product, onOpenDetail }) {
  const addItem = useCartStore((state) => state.addItem);
  const toggleFavorite = useFavoriteStore((state) => state.toggleFavorite);
  const isFavorited = useFavoriteStore((state) => state.favoriteIds.includes(String(product.id)));
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  const stockQuantity = Number(product.stock_quantity ?? product.stockQuantity ?? product.stock ?? 0);
  const isOutOfStock = stockQuantity <= 0;
  const isLowStock = stockQuantity > 0 && stockQuantity <= 5;

  useEffect(() => {
    if (!isHeartAnimating) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsHeartAnimating(false);
    }, 180);

    return () => {
      clearTimeout(timer);
    };
  }, [isHeartAnimating]);

  function handleToggleFavorite() {
    if (isOutOfStock) {
      return;
    }

    toggleFavorite(product.id);
    setIsHeartAnimating(true);
  }

  return (
    <article className={`${styles.card} ${isOutOfStock ? styles.outOfStock : ""}`}>
      <button
        type="button"
        className={styles.contentButton}
        onClick={() => onOpenDetail?.(product)}
        aria-label={`Open ${product.name} details`}
      >
        <div className={styles.imageWrap}>
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className={styles.image} /> : null}
          {isOutOfStock ? (
            <div className={styles.unavailableOverlay}>
              <span className={styles.unavailableText}>Not Available</span>
            </div>
          ) : null}
        </div>
        <div className={styles.meta}>
          <p className={styles.category}>{product.category}</p>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={`${styles.stockLabel} ${isLowStock ? styles.stockLabelWarn : ""}`}>Stock: {Math.max(0, stockQuantity)}</p>
          <p className={styles.price}>{toPeso(product.pricePhp)}</p>
        </div>
      </button>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={`${styles.favoriteButton} ${isFavorited ? styles.favoriteButtonActive : ""} ${
            isHeartAnimating ? styles.favoriteButtonPulse : ""
          }`}
          onClick={handleToggleFavorite}
          disabled={isOutOfStock}
          aria-label={isFavorited ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
          aria-pressed={isFavorited}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              fill={isFavorited ? "currentColor" : "none"}
            />
          </svg>
        </button>

        <button
          type="button"
          className={styles.addButton}
          onClick={() => addItem(product, 1)}
          disabled={isOutOfStock}
          aria-label={`Add ${product.name} to cart`}
        >
          + Add
        </button>
      </div>
    </article>
  );
}
