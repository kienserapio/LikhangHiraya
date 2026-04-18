import { useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import LocationHeader from "../components/LocationHeader";
import ActiveOrdersDock from "../components/ActiveOrdersDock";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductCard from "../components/ProductCard";
import { useProductsQuery } from "../hooks/useProductsQuery";
import "./HomePage.css";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { data: products = [], isLoading, error } = useProductsQuery();
  const loadError = error?.message || "";
  const profile = useAuthStore((state) => state.profile);

  const categories = useMemo(() => {
    const unique = new Set(products.map((product) => product.category).filter(Boolean));
    return ["ALL", ...Array.from(unique)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatches = selectedCategory === "ALL" || product.category === selectedCategory;
      const searchMatches = product.name.toLowerCase().includes(searchText.toLowerCase());
      return categoryMatches && searchMatches;
    });
  }, [products, selectedCategory, searchText]);

  return (
    <div className="homepage">
      <LocationHeader
        locationText={profile.address || "Manila, Globe St. ABC 123"}
        searchText={searchText}
        onSearchChange={setSearchText}
      />

      <main className="main">
        <h2 className="title">Categories</h2>
        <div className="chips" data-purpose="category-scroller">
          {categories.map((category, index) => (
            <button key={category} className={`chip ${selectedCategory === category ? "active" : ""}`} onClick={() => setSelectedCategory(category)}>
              <span>{index === 0 ? "🍽️" : "☕"}</span>
              <span>{category}</span>
            </button>
          ))}
        </div>

        <div className="menu-grid" id="menu-grid">
          {loadError ? <p style={{ gridColumn: "1 / -1", color: "#b91c1c", fontWeight: 700 }}>{loadError}</p> : null}
          {isLoading && !loadError ? (
            <p style={{ gridColumn: "1 / -1", color: "#6b7280", fontWeight: 600 }}>Loading menu...</p>
          ) : null}
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onOpenDetail={setSelectedProduct} />
          ))}
          {!loadError && filteredProducts.length === 0 ? (
            <p style={{ gridColumn: "1 / -1", color: "#6b7280" }}>No products found in this category.</p>
          ) : null}
        </div>
      </main>

      <ActiveOrdersDock />
      <ProductDetailModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} />
      <UniversalBottomNav active="home" />
    </div>
  );
}
