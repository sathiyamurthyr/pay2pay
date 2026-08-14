export const getResponsiveGridDimensions = (width: number) => {
  if (width >= 1920) {
    return { sidebarWidth: "230px", operationsWidth: "320px" };
  } else if (width >= 1440) {
    return { sidebarWidth: "230px", operationsWidth: "300px" };
  } else if (width >= 1280) {
    return { sidebarWidth: "220px", operationsWidth: "280px" };
  }
  return { sidebarWidth: "220px", operationsWidth: "260px" };
};

export const gridLayoutAreas = `
  "header header header"
  "sidebar workspace operations"
  "footer footer footer"
`;
