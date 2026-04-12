import { useEffect, useMemo, useState } from "react";
import { useFavoriteStore } from "../store/favoriteStore";
import { useAuthStore } from "../store/authStore";
import UniversalBottomNav from "../components/UniversalBottomNav";
import LocationHeader from "../components/LocationHeader";
import ActiveOrdersDock from "../components/ActiveOrdersDock";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductCard from "../components/ProductCard";
import { productApi } from "../services/api";
import "./HomePage.css";

export default function FavoritesPage() {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [products, setProducts] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const favoriteIds = useFavoriteStore((state) => state.favoriteIds);
  const profile = useAuthStore((state) => state.profile);

  useEffect(() => {
    let isMounted = true;
    productApi
      .list()
      .then((data) => {
        if (isMounted) {
          setProducts(data);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setProducts([]);
          setLoadError(error.message || "Unable to load favorites catalog from backend.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const favoriteProducts = products.filter((product) => favoriteIds.includes(String(product.id)));
    const unique = new Set(favoriteProducts.map((product) => product.category).filter(Boolean));
    return ["ALL", ...Array.from(unique)];
  }, [favoriteIds, products]);

  const favorites = useMemo(() => {
    return products.filter((product) => {
      const isFavoriteItem = favoriteIds.includes(String(product.id));
      const categoryMatches = selectedCategory === "ALL" || product.category === selectedCategory;
      const searchMatches = product.name.toLowerCase().includes(searchText.toLowerCase());
      return isFavoriteItem && categoryMatches && searchMatches;
    });
  }, [favoriteIds, products, searchText, selectedCategory]);

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
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} onOpenDetail={setSelectedProduct} />
          ))}
          {!loadError && favorites.length === 0 ? <p style={{ gridColumn: "1 / -1", color: "#6b7280" }}>No favorites yet. Add products from the product detail page.</p> : null}
        </div>
      </main>

      <ActiveOrdersDock />
      <ProductDetailModal product={selectedProduct} isOpen={Boolean(selectedProduct)} onClose={() => setSelectedProduct(null)} />
      <UniversalBottomNav active="favorites" />
    </div>
  );
}
