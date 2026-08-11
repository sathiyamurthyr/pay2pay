import { tokens } from "@/design-system/tokens/design-tokens";

export const getResponsiveGridDimensions = (width: number) => {
  if (width >= 3840) {
    return { sidebarWidth: "340px", operationsWidth: "420px" };
  } else if (width >= 2560) {
    return { sidebarWidth: "320px", operationsWidth: "380px" };
  } else if (width >= 1920) {
    return { sidebarWidth: "300px", operationsWidth: "360px" };
  } else if (width >= 1600) {
    return { sidebarWidth: "290px", operationsWidth: "340px" };
  }
  return { sidebarWidth: "280px", operationsWidth: "320px" };
};

export const gridLayoutAreas = `
  "header header header"
  "sidebar workspace operations"
  "footer footer footer"
`;
