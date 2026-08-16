"use client";

import React, { useEffect, useRef } from "react";

export const EcosystemCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener("resize", handleResize);

    // Node definitions for fintech ecosystem
    const nodes = [
      { id: "core", label: "Pay2Pay Core", x: 0.5, y: 0.48, color: "#3B82F6", size: 14, isCenter: true },
      { id: "cust", label: "Customer", x: 0.16, y: 0.28, color: "#60A5FA", size: 8, isCenter: false },
      { id: "ret", label: "Retailer", x: 0.26, y: 0.68, color: "#FBBF24", size: 10, isCenter: false },
      { id: "dit_role", label: "Distributor", x: 0.44, y: 0.86, color: "#818CF8", size: 8, isCenter: false },
      { id: "sd", label: "Super Distributor", x: 0.70, y: 0.86, color: "#F59E0B", size: 8, isCenter: false },
      { id: "dit_ops", label: "DIT", x: 0.84, y: 0.60, color: "#06B6D4", size: 8, isCenter: false },
      { id: "partners", label: "Banking & Service Partners", x: 0.78, y: 0.26, color: "#34D399", size: 10, isCenter: false },
    ];

    // Pulsing particles traveling between connections
    interface Packet {
      fromIndex: number;
      toIndex: number;
      progress: number;
      speed: number;
      color: string;
    }

    const packets: Packet[] = [
      { fromIndex: 1, toIndex: 2, progress: 0.1, speed: 0.008, color: "#60A5FA" },
      { fromIndex: 2, toIndex: 0, progress: 0.4, speed: 0.009, color: "#FBBF24" },
      { fromIndex: 3, toIndex: 0, progress: 0.5, speed: 0.007, color: "#818CF8" },
      { fromIndex: 4, toIndex: 0, progress: 0.3, speed: 0.008, color: "#F59E0B" },
      { fromIndex: 5, toIndex: 0, progress: 0.6, speed: 0.007, color: "#06B6D4" },
      { fromIndex: 0, toIndex: 6, progress: 0.7, speed: 0.011, color: "#34D399" },
    ];

    const connections = [
      [1, 2], // Customer -> Retailer
      [2, 0], // Retailer -> Core
      [3, 0], // Distributor -> Core
      [4, 0], // Super Distributor -> Core
      [5, 0], // DIT -> Core
      [0, 6], // Core -> Banking & Service Partners
    ];

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Draw background ambient glow
      const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 10, width * 0.5, height * 0.5, width * 0.45);
      grad.addColorStop(0, "rgba(37, 99, 235, 0.12)");
      grad.addColorStop(1, "rgba(5, 11, 20, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Calculate actual node coordinates with slight floating motion
      const computedNodes = nodes.map((node, i) => {
        const floatX = Math.sin(time + i * 1.5) * 3;
        const floatY = Math.cos(time + i * 1.2) * 3;
        return {
          ...node,
          actualX: node.x * width + floatX,
          actualY: node.y * height + floatY,
        };
      });

      // Draw connecting lines
      connections.forEach(([from, to]) => {
        const start = computedNodes[from];
        const end = computedNodes[to];

        ctx.beginPath();
        ctx.moveTo(start.actualX, start.actualY);
        ctx.lineTo(end.actualX, end.actualY);
        ctx.strokeStyle = "rgba(59, 130, 246, 0.18)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw moving data packets
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const start = computedNodes[p.fromIndex];
        const end = computedNodes[p.toIndex];
        const curX = start.actualX + (end.actualX - start.actualX) * p.progress;
        const curY = start.actualY + (end.actualY - start.actualY) * p.progress;

        ctx.beginPath();
        ctx.arc(curX, curY, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw nodes
      computedNodes.forEach((node) => {
        // Outer pulsing ring for center
        if (node.isCenter) {
          const pulse = (Math.sin(time * 2) + 1) / 2;
          ctx.beginPath();
          ctx.arc(node.actualX, node.actualY, node.size + 8 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 - pulse * 0.25})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Main node circle
        ctx.beginPath();
        ctx.arc(node.actualX, node.actualY, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = node.isCenter ? 18 : 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner highlight
        ctx.beginPath();
        ctx.arc(node.actualX, node.actualY, node.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        // Node Label
        ctx.font = `600 ${node.isCenter ? "12px" : "11px"} Inter, sans-serif`;
        ctx.fillStyle = node.isCenter ? "#FFFFFF" : "#CBD5E1";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.actualX, node.actualY + node.size + 14);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-[280px] sm:h-[340px] lg:h-[380px] xl:h-[420px] 2xl:h-[480px] 3xl:h-[560px] 4k:h-[640px] max-h-[660px] rounded-3xl glass-panel p-2 overflow-hidden flex items-center justify-center shadow-xl shadow-blue-950/40 border border-slate-700/60">
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Overlay Status Badge */}
      <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-2 px-3 py-1 2xl:px-4 2xl:py-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 backdrop-blur-md">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] sm:text-[11px] 2xl:text-xs font-bold text-slate-200 tracking-wide">
          Multi-Rail Interoperability
        </span>
      </div>
      <div className="absolute bottom-3.5 right-3.5 text-[10px] 2xl:text-xs font-medium text-slate-500 bg-slate-950/70 px-2 py-0.5 2xl:px-3 2xl:py-1 rounded-md border border-slate-800/60">
        Encrypted Core Network
      </div>
    </div>
  );
};
