"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  Grid
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  CloudUpload,
  Visibility,
  ArrowUpward,
  ArrowDownward,
  Campaign,
  Link as LinkIcon,
  Close,
  CheckCircle,
  PhotoCamera
} from "@mui/icons-material";
import { getApiBaseUrl } from "@/lib/api-config";
import { DashboardAnnouncementModal } from "@/components/common/DashboardAnnouncementModal";

interface AnnouncementLink {
  label: string;
  url: string;
}

interface AnnouncementImage {
  id: string;
  b2_object_key: string;
  image_url: string;
  original_filename: string;
  content_type: string;
  file_size: number;
  display_order: number;
}

interface AnnouncementItem {
  id: string;
  announcement_code: string;
  title: string;
  message: string;
  links: AnnouncementLink[];
  display_type: string;
  priority: number;
  audience: string;
  status: string;
  is_active: boolean;
  start_at?: string;
  end_at?: string;
  images: AnnouncementImage[];
  created_at?: string;
  updated_at?: string;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Create / Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [audience, setAudience] = useState<string>("ALL_RETAILERS");
  const [priority, setPriority] = useState<number>(10);
  const [displayType, setDisplayType] = useState<string>("MODAL");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [links, setLinks] = useState<AnnouncementLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");

  // Image Upload Dialog State
  const [imageDialogOpen, setImageDialogOpen] = useState<boolean>(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError("");
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/announcements/admin/list`);
      if (!res.ok) throw new Error("Failed to load announcements");
      const data = await res.json();
      setAnnouncements(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setAudience("ALL_RETAILERS");
    setPriority(10);
    setDisplayType("MODAL");
    setIsActive(true);
    setLinks([
      { label: "SLPE WhatsApp Channel", url: "https://whatsapp.com/channel/0029Vb94N1mKQuJB1o6T5L0Q" },
      { label: "Play Store Link: SLPE Mobile Application", url: "https://play.google.com/store/apps/details?id=com.slpe.pay" }
    ]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (ann: AnnouncementItem) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setMessage(ann.message);
    setAudience(ann.audience);
    setPriority(ann.priority);
    setDisplayType(ann.display_type);
    setIsActive(ann.is_active);
    setLinks(ann.links || []);
    setDialogOpen(true);
  };

  const handleAddLink = () => {
    if (!newLinkLabel || !newLinkUrl) return;
    setLinks([...links, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]);
    setNewLinkLabel("");
    setNewLinkUrl("");
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSaveAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required.");
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const payload = {
        title,
        message,
        audience,
        priority: Number(priority),
        display_type: displayType,
        is_active: isActive,
        status: isActive ? "ACTIVE" : "INACTIVE",
        links
      };

      let res;
      if (editingId) {
        res = await fetch(`${baseUrl}/announcements/admin/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${baseUrl}/announcements/admin/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) throw new Error("Failed to save announcement");

      setSuccessMsg(editingId ? "Announcement updated successfully!" : "Announcement created successfully!");
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || "Failed to save announcement");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/announcements/admin/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      setSuccessMsg("Announcement deleted successfully!");
      fetchAnnouncements();
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    }
  };

  // Image Upload Handling
  const handleOpenImageManager = (ann: AnnouncementItem) => {
    setActiveAnnouncement(ann);
    setImageDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeAnnouncement || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    setError("");

    try {
      const baseUrl = getApiBaseUrl();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("display_order", String((activeAnnouncement.images?.length || 0) + 1));

      const res = await fetch(`${baseUrl}/announcements/admin/${activeAnnouncement.id}/images`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to upload image to Backblaze B2");
      }

      setSuccessMsg("Image uploaded directly to Backblaze B2!");
      await fetchAnnouncements();
      // Refresh active announcement in image dialog
      const updatedRes = await fetch(`${baseUrl}/announcements/admin/list`);
      const updatedData = await updatedRes.json();
      const updatedAnn = (updatedData.data || []).find((a: AnnouncementItem) => a.id === activeAnnouncement.id);
      if (updatedAnn) setActiveAnnouncement(updatedAnn);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!activeAnnouncement) return;
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/announcements/admin/${activeAnnouncement.id}/images/${imageId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to remove image");

      await fetchAnnouncements();
      const updatedRes = await fetch(`${baseUrl}/announcements/admin/list`);
      const updatedData = await updatedRes.json();
      const updatedAnn = (updatedData.data || []).find((a: AnnouncementItem) => a.id === activeAnnouncement.id);
      if (updatedAnn) setActiveAnnouncement(updatedAnn);
    } catch (err: any) {
      setError(err.message || "Failed to delete image");
    }
  };

  return (
    <Box sx={{ p: 4, bgcolor: "#0B0F19", minHeight: "100vh", color: "#F8FAFC" }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                bgcolor: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(37, 99, 235, 0.4)"
              }}
            >
              <Campaign sx={{ fontSize: 24, color: "#FFF" }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFF" }}>
                Dashboard Announcement Center
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                Create, schedule, and manage Backblaze B2-backed dynamic announcements for retail workstations
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Button
          onClick={handleOpenCreate}
          variant="contained"
          startIcon={<Add />}
          sx={{
            bgcolor: "#2563EB",
            fontWeight: 800,
            borderRadius: "10px",
            px: 3,
            py: 1.2,
            textTransform: "none",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
            "&:hover": { bgcolor: "#1D4ED8" }
          }}
        >
          Create Announcement
        </Button>
      </Stack>

      {/* Notifications */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: "rgba(239, 68, 68, 0.15)", color: "#F87171" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80" }} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}

      {/* Announcements Table */}
      <Paper
        sx={{
          borderRadius: "16px",
          bgcolor: "#131C2E",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          overflow: "hidden"
        }}
      >
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "#0F172A" }}>
              <TableRow>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Title & Content</TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Audience</TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Priority</TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>B2 Images</TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ color: "#94A3B8", fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: "#3B82F6" }} />
                  </TableCell>
                </TableRow>
              ) : announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748B" }}>
                    No announcements found. Click &quot;Create Announcement&quot; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((ann) => (
                  <TableRow key={ann.id} sx={{ "&:hover": { bgcolor: "rgba(255, 255, 255, 0.02)" } }}>
                    <TableCell sx={{ color: "#38BDF8", fontWeight: 700, fontFamily: "monospace" }}>
                      {ann.announcement_code}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: "#FFF", fontWeight: 700 }}>
                        {ann.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ann.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ann.audience}
                        size="small"
                        sx={{ bgcolor: "rgba(59, 130, 246, 0.15)", color: "#60A5FA", fontWeight: 700, borderRadius: "6px" }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "#F8FAFC", fontWeight: 700 }}>
                      {ann.priority}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        onClick={() => handleOpenImageManager(ann)}
                        sx={{
                          borderColor: "rgba(255, 255, 255, 0.2)",
                          color: "#CBD5E1",
                          textTransform: "none",
                          fontSize: "12px",
                          borderRadius: "8px",
                          "&:hover": { borderColor: "#3B82F6", color: "#3B82F6" }
                        }}
                      >
                        {ann.images?.length || 0} Images
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ann.is_active ? "ACTIVE" : "INACTIVE"}
                        size="small"
                        sx={{
                          bgcolor: ann.is_active ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                          color: ann.is_active ? "#4ADE80" : "#94A3B8",
                          fontWeight: 800,
                          borderRadius: "6px"
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(ann)}
                          sx={{ color: "#60A5FA", "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)" } }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          sx={{ color: "#F87171", "&:hover": { bgcolor: "rgba(239, 68, 68, 0.1)" } }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0F172A",
            color: "#FFF",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          {editingId ? "Edit Announcement" : "Create New Announcement"}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Announcement Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="e.g. Announcement"
              InputLabelProps={{ sx: { color: "#94A3B8" } }}
              sx={{ input: { color: "#FFF" }, fieldset: { borderColor: "rgba(255, 255, 255, 0.15)" } }}
            />

            <TextField
              label="Announcement Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="e.g. Get latest update on SLPE official channel"
              InputLabelProps={{ sx: { color: "#94A3B8" } }}
              sx={{ textarea: { color: "#FFF" }, fieldset: { borderColor: "rgba(255, 255, 255, 0.15)" } }}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Target Audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  fullWidth
                  InputLabelProps={{ sx: { color: "#94A3B8" } }}
                  sx={{ select: { color: "#FFF" }, fieldset: { borderColor: "rgba(255, 255, 255, 0.15)" } }}
                >
                  <MenuItem value="ALL_RETAILERS">All Retailers</MenuItem>
                  <MenuItem value="ALL">All Users (Enterprise)</MenuItem>
                  <MenuItem value="DISTRIBUTOR">Distributors</MenuItem>
                  <MenuItem value="SUPER_DISTRIBUTOR">Super Distributors</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={3}>
                <TextField
                  type="number"
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  fullWidth
                  InputLabelProps={{ sx: { color: "#94A3B8" } }}
                  sx={{ input: { color: "#FFF" }, fieldset: { borderColor: "rgba(255, 255, 255, 0.15)" } }}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />}
                  label="Is Active"
                  sx={{ color: "#FFF", mt: 1 }}
                />
              </Grid>
            </Grid>

            {/* Dynamic Links Section */}
            <Box sx={{ p: 2, bgcolor: "#1E293B", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#38BDF8", mb: 1.5 }}>
                Action Links (e.g. WhatsApp Channel, Play Store App)
              </Typography>

              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {links.map((lnk, idx) => (
                  <Stack key={idx} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: "#0F172A", p: 1.5, borderRadius: "8px" }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFF" }}>{lnk.label}</Typography>
                      <Typography variant="caption" sx={{ color: "#94A3B8" }}>{lnk.url}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveLink(idx)} sx={{ color: "#F87171" }}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" spacing={1.5}>
                <TextField
                  size="small"
                  label="Link Button Label"
                  placeholder="e.g. SLPE WhatsApp Channel"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  sx={{ flex: 1, input: { color: "#FFF" }, fieldset: { borderColor: "rgba(255, 255, 255, 0.15)" } }}
                  InputLabelProps={{ sx: { color: "#94A3B8" } }}
                />
                <TextField
                  size="small"
                  label="Target URL"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  sx={{ flex: 2, input: { color: "#FFF" }, fieldset: { borderColor: "rgba(255, 255, 255, 0.15)" } }}
                  InputLabelProps={{ sx: { color: "#94A3B8" } }}
                />
                <Button onClick={handleAddLink} variant="outlined" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>
                  Add Link
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#94A3B8", textTransform: "none" }}>
            Cancel
          </Button>
          <Button onClick={handleSaveAnnouncement} variant="contained" sx={{ bgcolor: "#2563EB", fontWeight: 800, textTransform: "none", borderRadius: "8px" }}>
            Save Announcement
          </Button>
        </DialogActions>
      </Dialog>

      {/* IMAGE MANAGEMENT DIALOG (BACKBLAZE B2) */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0F172A",
            color: "#FFF",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
          Backblaze B2 Image Manager — {activeAnnouncement?.announcement_code}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: "#94A3B8", mb: 2 }}>
              Upload images directly to Backblaze B2 storage bucket. All images are dynamically rendered in the retailer dashboard popup.
            </Typography>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            <Button
              variant="contained"
              startIcon={uploadingImage ? <CircularProgress size={18} sx={{ color: "#FFF" }} /> : <CloudUpload />}
              disabled={uploadingImage}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                bgcolor: "#2563EB",
                fontWeight: 800,
                borderRadius: "8px",
                textTransform: "none",
                "&:hover": { bgcolor: "#1D4ED8" }
              }}
            >
              {uploadingImage ? "Uploading to Backblaze B2..." : "Upload Image to B2"}
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#38BDF8", mb: 1.5 }}>
            Attached Images ({activeAnnouncement?.images?.length || 0})
          </Typography>

          <Grid container spacing={2}>
            {activeAnnouncement?.images?.map((img, idx) => (
              <Grid item xs={12} sm={6} md={4} key={img.id}>
                <Paper
                  sx={{
                    bgcolor: "#1E293B",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.08)"
                  }}
                >
                  <Box
                    component="img"
                    src={img.image_url}
                    alt={img.original_filename}
                    sx={{ width: "100%", height: 140, objectFit: "cover", bgcolor: "#000" }}
                  />
                  <Box sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFF", fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {img.original_filename}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>
                      Order: #{img.display_order} • {(img.file_size / 1024).toFixed(1)} KB
                    </Typography>

                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <IconButton size="small" onClick={() => handleDeleteImage(img.id)} sx={{ color: "#F87171" }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Button onClick={() => setImageDialogOpen(false)} variant="contained" sx={{ bgcolor: "#2563EB", fontWeight: 800, textTransform: "none" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
