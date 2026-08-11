import { useState, useEffect } from "react";

export type Breakpoint = "sm" | "md" | "lg" | "xl" | "xxl";

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("lg");

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 3840) setBreakpoint("xxl");
      else if (width >= 2560) setBreakpoint("xl");
      else if (width >= 1920) setBreakpoint("lg");
      else if (width >= 1600) setBreakpoint("md");
      else setBreakpoint("sm");
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return breakpoint;
}
