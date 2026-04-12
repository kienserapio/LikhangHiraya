import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchInventoryProducts,
  quickEditProduct,
  restockProduct,
} from "../../services/adminApi";
import { supabase } from "../../services/supabaseClient";
import adminStyles from "./Admin.module.css";
import styles from "./Inventory.module.css";

const CATEGORY_FILTERS = ["ALL", "COFFEE", "FOOD", "BEVERAGE"];
const ROWS_PER_PAGE = 7;

function toPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function upsertProduct(list, updated) {
  const foundIndex = list.findIndex((item) => item.id === updated.id);
  if (foundIndex === -1) {
    return [updated, ...list];
  }

  const next = [...list];
  next[foundIndex] = updated;
  return next;
}

function buildSku(product) {
  const categoryPrefix = String(product?.category || "GEN").slice(0, 3).toUpperCase();
  const idPrefix = String(product?.id || "").replaceAll("-", "").slice(0, 6).toUpperCase();
  return `LH-${categoryPrefix}-${idPrefix || "000000"}`;
}

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [quickEditState, setQuickEditState] = useState(null);
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  const [restockState, setRestockState] = useState(null);
  const [isRestocking, setIsRestocking] = useState(false);

  const lowStockOnly = searchParams.get("stock") === "low";

  const loadProducts = useCallback(async (background = false) => {
    if (!background) {
      setIsLoading(true);
    }

    try {
      const next = await fetchInventoryProducts();
      setProducts(next);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load inventory.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-inventory-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, () => {
        loadProducts(true);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, () => {
        loadProducts(true);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "products" }, () => {
        loadProducts(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProducts]);

  const lowStockCount = useMemo(
    () => products.filter((product) => Number(product.stockQuantity || 0) <= 5).length,
    [products]
  );

  const inventoryValue = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.pricePhp || 0) * Number(product.stockQuantity || 0), 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatches = categoryFilter === "ALL" || String(product.category || "").toUpperCase() === categoryFilter;
      if (!categoryMatches) {
        return false;
      }

      if (lowStockOnly && Number(product.stockQuantity || 0) > 5) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [product.name, product.category, buildSku(product)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    });
  }, [categoryFilter, lowStockOnly, products, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ROWS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, lowStockOnly, searchText]);

  useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredProducts.slice(start, start + ROWS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  const viewStart = filteredProducts.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const viewEnd = filteredProducts.length === 0 ? 0 : Math.min(currentPage * ROWS_PER_PAGE, filteredProducts.length);

  function openQuickEdit(product) {
    setQuickEditState({
      id: product.id,
      name: product.name,
      pricePhp: String(product.pricePhp),
      availability: product.status === "Available" ? "SHOW" : "HIDE",
      currentStock: Number(product.stockQuantity || 0),
    });
  }

  async function handleSaveQuickEdit(event) {
    event.preventDefault();
    if (!quickEditState) {
      return;
    }

    setIsSavingQuickEdit(true);
    setError("");

    try {
      const updated = await quickEditProduct(quickEditState.id, {
        pricePhp: Number(quickEditState.pricePhp),
        availability: quickEditState.availability,
        currentStock: Number(quickEditState.currentStock || 0),
      });
      setProducts((current) => upsertProduct(current, updated));
      setQuickEditState(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to save product changes.");
    } finally {
      setIsSavingQuickEdit(false);
    }
  }

  function openRestock(product) {
    setRestockState({
      id: product.id,
      name: product.name,
      quantityToAdd: "1",
    });
  }

  async function handleRestock(event) {
    event.preventDefault();
    if (!restockState) {
      return;
    }

    const quantityToAdd = Number(restockState.quantityToAdd);
    if (!Number.isFinite(quantityToAdd) || quantityToAdd <= 0) {
      setError("Restock quantity should be greater than 0.");
      return;
    }

    setError("");
    setIsRestocking(true);

    try {
      const updated = await restockProduct(restockState.id, quantityToAdd);
      setProducts((current) => upsertProduct(current, updated));
      setRestockState(null);
    } catch (submitError) {
      setError(submitError.message || "Unable to restock product.");
    } finally {
      setIsRestocking(false);
    }
  }

  function clearLowStockFilter() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("stock");
    setSearchParams(nextParams);
  }

  return (
    <section className={styles.inventoryPage}>
      <header className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>Stock Management</h2>
          <p className={styles.pageSub}>Manage your artisan inventory and delivery logistics in real time.</p>
        </div>

        <div className={styles.pageHeaderActions}>
          <div className={styles.searchBox}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search inventory"
            />
          </div>
          <button type="button" className={adminStyles.buttonSecondary} onClick={() => loadProducts(false)}>
            Refresh
          </button>
          <button type="button" className={styles.addButton} onClick={() => navigate("/admin/inventory/new")}>
            Add New Product
          </button>
        </div>
      </header>

      {error ? <p className={adminStyles.error}>{error}</p> : null}

      <div className={styles.statsGrid}>
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Total SKU</p>
          <p className={styles.statValue}>{products.length}</p>
        </article>

        <article className={`${styles.statCard} ${styles.statCardWarn}`}>
          <p className={styles.statLabel}>Low Stock Alerts</p>
          <p className={styles.statValue}>{lowStockCount}</p>
        </article>

        <article className={styles.statCard}>
          <p className={styles.statLabel}>Inventory Value</p>
          <p className={styles.statValue}>{toPeso(inventoryValue)}</p>
        </article>
      </div>

      <section className={styles.tableSection}>
        <div className={styles.tableSectionHeader}>
          <div className={styles.categoryPills}>
            {CATEGORY_FILTERS.map((category) => {
              const active = categoryFilter === category;
              return (
                <button
                  key={category}
                  type="button"
                  className={`${styles.categoryPill} ${active ? styles.categoryPillActive : ""}`.trim()}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {lowStockOnly ? (
            <button type="button" className={styles.lowStockFilterBadge} onClick={clearLowStockFilter}>
              Low stock filter active (≤ 5) · Clear
            </button>
          ) : null}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.inventoryTable}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th className={styles.alignCenter}>Stock Level</th>
                <th className={styles.alignCenter}>Availability</th>
                <th className={styles.alignRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <p className={styles.emptyState}>{isLoading ? "Loading products..." : "No products found."}</p>
                  </td>
                </tr>
              ) : (
                pagedProducts.map((product) => {
                  const lowStock = Number(product.stockQuantity || 0) <= 5;
                  return (
                    <tr key={product.id} className={lowStock ? styles.rowLowStock : ""}>
                      <td>
                        <div className={styles.productImageWrap}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className={styles.productImage} />
                          ) : (
                            <div className={styles.productImageFallback}>No image</div>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className={styles.productMeta}>
                          <p className={styles.productName}>{product.name}</p>
                          <p className={styles.productSku}>SKU: {buildSku(product)}</p>
                        </div>
                      </td>

                      <td>
                        <span className={styles.categoryTag}>{product.category}</span>
                      </td>

                      <td>
                        <strong>{toPeso(product.pricePhp)}</strong>
                      </td>

                      <td className={styles.alignCenter}>
                        <span className={styles.stockQty}>{product.stockQuantity} Units</span>
                      </td>

                      <td className={styles.alignCenter}>
                        <span
                          className={
                            product.status === "Available" ? adminStyles.inventoryStatusAvailable : adminStyles.inventoryStatusHidden
                          }
                        >
                          {product.status}
                        </span>
                      </td>

                      <td className={styles.alignRight}>
                        <div className={styles.inlineActions}>
                          <button type="button" className={styles.inlineAction} onClick={() => openQuickEdit(product)}>
                            Quick Edit
                          </button>
                          <button type="button" className={styles.inlineAction} onClick={() => openRestock(product)}>
                            Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <footer className={styles.paginationBar}>
          <p>
            Showing <strong>{viewStart}</strong> to <strong>{viewEnd}</strong> of <strong>{filteredProducts.length}</strong> products
          </p>

          <div className={styles.paginationActions}>
            <button
              type="button"
              className={adminStyles.buttonSecondary}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
            >
              Previous
            </button>
            <span className={styles.pageIndicator}>Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              className={adminStyles.buttonSecondary}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {quickEditState ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h4 className={styles.modalTitle}>Quick Edit: {quickEditState.name}</h4>
            <form className={styles.modalForm} onSubmit={handleSaveQuickEdit}>
              <div className={styles.modalField}>
                <label htmlFor="quick-edit-price">Price (PHP)</label>
                <input
                  id="quick-edit-price"
                  type="number"
                  min="0"
                  step="1"
                  value={quickEditState.pricePhp}
                  onChange={(event) => setQuickEditState((prev) => ({ ...prev, pricePhp: event.target.value }))}
                />
              </div>

              <div className={styles.modalField}>
                <label htmlFor="quick-edit-availability">Availability (Show/Hide)</label>
                <select
                  id="quick-edit-availability"
                  value={quickEditState.availability}
                  onChange={(event) => setQuickEditState((prev) => ({ ...prev, availability: event.target.value }))}
                >
                  <option value="SHOW">Show</option>
                  <option value="HIDE">Hide</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.primaryButton} type="submit" disabled={isSavingQuickEdit}>
                  {isSavingQuickEdit ? "Saving..." : "Save"}
                </button>
                <button
                  className={adminStyles.buttonSecondary}
                  type="button"
                  disabled={isSavingQuickEdit}
                  onClick={() => setQuickEditState(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {restockState ? (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            <h4 className={styles.modalTitle}>Restock: {restockState.name}</h4>
            <form className={styles.modalForm} onSubmit={handleRestock}>
              <div className={styles.modalField}>
                <label htmlFor="restock-qty">Quantity to Add</label>
                <input
                  id="restock-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={restockState.quantityToAdd}
                  onChange={(event) => setRestockState((prev) => ({ ...prev, quantityToAdd: event.target.value }))}
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.primaryButton} type="submit" disabled={isRestocking}>
                  {isRestocking ? "Updating..." : "Apply Restock"}
                </button>
                <button
                  className={adminStyles.buttonSecondary}
                  type="button"
                  disabled={isRestocking}
                  onClick={() => setRestockState(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
