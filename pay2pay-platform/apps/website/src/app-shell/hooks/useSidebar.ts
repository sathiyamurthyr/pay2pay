import { useState } from "react";

export function useSidebar(initialCollapsed = false) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [favoriteModules, setFavoriteModules] = useState<string[]>(["/retailer/dmt", "/retailer/wallet"]);

  const toggleSidebar = () => setIsCollapsed((prev) => !prev);
  const toggleFavorite = (path: string) => {
    setFavoriteModules((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return {
    isCollapsed,
    toggleSidebar,
    favoriteModules,
    toggleFavorite,
  };
}
