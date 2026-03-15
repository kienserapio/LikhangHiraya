import ProductCard from "./ProductCard";
import styles from "./ProductGrid.module.css";

export default function ProductGrid({ products, onOpenDetail }) {
  return (
    <section className={styles.grid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onOpenDetail={onOpenDetail} />
      ))}
    </section>
  );
}
