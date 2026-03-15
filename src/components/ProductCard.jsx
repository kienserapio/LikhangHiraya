import styles from "./ProductCard.module.css";
import { useCartStore } from "../store/cartStore";

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function ProductCard({ product, onOpenDetail }) {
  const addItem = useCartStore((state) => state.addItem);

  const isOutOfStock = Number(product.stock) <= 0;

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
          {isOutOfStock ? <span className={styles.badge}>Out of Stock</span> : null}
        </div>
        <div className={styles.meta}>
          <p className={styles.category}>{product.category}</p>
          <h3 className={styles.name}>{product.name}</h3>
          <p className={styles.price}>{toPeso(product.pricePhp)}</p>
        </div>
      </button>

      <button
        className={styles.addButton}
        onClick={() => addItem(product, 1)}
        disabled={isOutOfStock}
        aria-label={`Add ${product.name} to cart`}
      >
        + Add
      </button>
    </article>
  );
}
