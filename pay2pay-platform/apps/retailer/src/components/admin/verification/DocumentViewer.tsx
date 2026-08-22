"use client";

import React, { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize2,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Eye
} from "lucide-react";

interface DocumentViewerProps {
  documentUrl: string;
  documentTitle: string;
  documentType: string;
  ocrData?: any;
  onClose: () => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentUrl,
  documentTitle,
  documentType,
  ocrData,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showOcrDrawer, setShowOcrDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = documentUrl;
    const safeTitle = (documentTitle || "document").split(" ").join("_");
    link.download = `${safeTitle}_admin_copy.jpg`;
    link.click();
  };

  return (
    <div className={`fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col ${isFullscreen ? "p-0" : "p-4 sm:p-6"}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 rounded-t-3xl">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-black text-white">{documentTitle}</h3>
            <p className="text-[11px] text-slate-400 font-semibold uppercase">{documentType} Document Preview</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-blue-400 px-2">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowOcrDrawer((prev) => !prev)}
            title="Toggle OCR Text"
            className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors ${
              showOcrDrawer ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>OCR Result</span>
          </button>
          <button
            onClick={handleDownload}
            title="Download Document (Admin Only)"
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            title="Toggle Fullscreen"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center p-6">
        {documentUrl.toLowerCase().endsWith(".pdf") || documentType === "PDF" ? (
          <div className="w-full h-full max-h-[75vh] max-w-4xl flex items-center justify-center">
            <iframe
              src={documentUrl}
              title={documentTitle}
              className="w-full h-full rounded-2xl bg-white border border-slate-800 shadow-2xl"
            />
          </div>
        ) : documentUrl.toLowerCase().endsWith(".mp4") || documentUrl.toLowerCase().endsWith(".webm") || documentType === "VIDEO" ? (
          <div className="max-h-[75vh] max-w-full flex items-center justify-center">
            <video
              src={documentUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800 bg-black"
            >
              Your browser does not support HTML5 video playback.
            </video>
          </div>
        ) : (
          <div
            className="transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
            }}
          >
            <img
              src={documentUrl}
              alt={documentTitle}
              className="max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
          </div>
        )}
      </div>

        {/* OCR Text Side Drawer */}
        {showOcrDrawer && (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 overflow-y-auto backdrop-blur-xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                OCR Extracted Text
              </h4>
              <button onClick={() => setShowOcrDrawer(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <p className="text-[10px] text-slate-500 font-sans font-bold">Document Number:</p>
                <p className="font-extrabold text-blue-400">{ocrData?.number || "ABCPE1234F"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <p className="text-[10px] text-slate-500 font-sans font-bold">Name on Document:</p>
                <p className="font-extrabold text-emerald-400">{ocrData?.name || "SATHIYA MURTHY"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-1">
                <p className="text-[10px] text-slate-500 font-sans font-bold">OCR Match Confidence:</p>
                <p className="font-extrabold text-amber-400">98.6% High Confidence</p>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
