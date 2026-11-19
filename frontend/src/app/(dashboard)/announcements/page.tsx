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
  Campaign,
  Close,
  PhotoCamera,
  Refresh as RefreshIcon
} from "@mui/icons-material";
import { getApiBaseUrl } from "@/lib/api-config";
import apiClient from "@/lib/api";

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
      const res = await apiClient.get("/api/v1/announcements/admin/list");
      const data = res.data;
      setAnnouncements(data.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to load announcements");
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
      { label: "SMSPAY Official Channel", url: "https://whatsapp.com/channel/smspay" },
      { label: "SMSPAY Mobile Application", url: "https://play.google.com/store/apps/details?id=com.smspay" }
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

      if (editingId) {
        await apiClient.put(`/api/v1/announcements/admin/${editingId}`, payload);
      } else {
        await apiClient.post("/api/v1/announcements/admin/create", payload);
      }

      setSuccessMsg(editingId ? "Announcement updated successfully!" : "Announcement created successfully!");
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to save announcement");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await apiClient.delete(`/api/v1/announcements/admin/${id}`);
      setSuccessMsg("Announcement deleted successfully!");
      fetchAnnouncements();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete");
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("display_order", String((activeAnnouncement.images?.length || 0) + 1));

      await apiClient.post(`/api/v1/announcements/admin/${activeAnnouncement.id}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSuccessMsg("Image uploaded directly to Backblaze B2 storage!");
      await fetchAnnouncements();
      const updatedRes = await apiClient.get("/api/v1/announcements/admin/list");
      const updatedAnn = (updatedRes.data?.data || []).find((a: AnnouncementItem) => a.id === activeAnnouncement.id);
      if (updatedAnn) setActiveAnnouncement(updatedAnn);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!activeAnnouncement) return;
    try {
      await apiClient.delete(`/api/v1/announcements/admin/${activeAnnouncement.id}/images/${imageId}`);
      await fetchAnnouncements();
      const updatedRes = await apiClient.get("/api/v1/announcements/admin/list");
      const updatedAnn = (updatedRes.data?.data || []).find((a: AnnouncementItem) => a.id === activeAnnouncement.id);
      if (updatedAnn) setActiveAnnouncement(updatedAnn);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to delete image");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                bgcolor: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
              }}
            >
              <Campaign sx={{ fontSize: 26, color: "#FFFFFF" }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
                Announcements Center
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748B", mt: 0.25 }}>
                Create, schedule, and broadcast dynamic banners and notices to workstations and portals
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={fetchAnnouncements}
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            disabled={loading}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: "10px",
              borderColor: "#CBD5E1",
              color: "#334155",
              "&:hover": { borderColor: "#94A3B8", bgcolor: "#F8FAFC" }
            }}
          >
            Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            variant="contained"
            startIcon={<Add />}
            sx={{
              bgcolor: "#2563EB",
              fontWeight: 700,
              borderRadius: "10px",
              px: 2.5,
              textTransform: "none",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
              "&:hover": { bgcolor: "#1D4ED8" }
            }}
          >
            Create Announcement
          </Button>
        </Stack>
      </Stack>

      {/* Feedback Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: "12px" }} onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      )}

      {/* Announcements Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: "16px",
          bgcolor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          overflow: "hidden"
        }}
      >
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: "#F8FAFC" }}>
              <TableRow>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Code</TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Title & Content</TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Audience</TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Priority</TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Images</TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }}>Status</TableCell>
                <TableCell sx={{ color: "#475569", fontWeight: 700, fontSize: "12px", textTransform: "uppercase" }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={32} sx={{ color: "#2563EB" }} />
                    <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5 }}>
                      Loading announcements...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : announcements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8, color: "#64748B" }}>
                    <Campaign sx={{ fontSize: 48, color: "#CBD5E1", mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#334155" }}>
                      No announcements found
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mt: 0.5 }}>
                      Click &quot;Create Announcement&quot; to publish your first announcement.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                announcements.map((ann) => (
                  <TableRow key={ann.id} sx={{ "&:hover": { bgcolor: "#F8FAFC" } }}>
                    <TableCell sx={{ color: "#2563EB", fontWeight: 700, fontFamily: "monospace", fontSize: "13px" }}>
                      {ann.announcement_code}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" sx={{ color: "#0F172A", fontWeight: 700 }}>
                        {ann.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ann.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ann.audience.replace(/_/g, " ")}
                        size="small"
                        sx={{ bgcolor: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, fontSize: "11px", borderRadius: "6px" }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "#334155", fontWeight: 700 }}>
                      {ann.priority}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PhotoCamera />}
                        onClick={() => handleOpenImageManager(ann)}
                        sx={{
                          borderColor: "#CBD5E1",
                          color: "#334155",
                          textTransform: "none",
                          fontSize: "12px",
                          borderRadius: "8px",
                          "&:hover": { borderColor: "#2563EB", color: "#2563EB", bgcolor: "#EFF6FF" }
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
                          bgcolor: ann.is_active ? "#DCFCE7" : "#F1F5F9",
                          color: ann.is_active ? "#15803D" : "#64748B",
                          fontWeight: 800,
                          fontSize: "11px",
                          borderRadius: "6px"
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenEdit(ann)}
                          title="Edit Announcement"
                          sx={{ color: "#2563EB", "&:hover": { bgcolor: "#EFF6FF" } }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          title="Delete Announcement"
                          sx={{ color: "#EF4444", "&:hover": { bgcolor: "#FEE2E2" } }}
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
            borderRadius: "16px",
            bgcolor: "#FFFFFF"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", borderBottom: "1px solid #E2E8F0" }}>
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
              placeholder="e.g. Important Service Notice"
            />

            <TextField
              label="Announcement Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="e.g. Please be informed that banking settlement will be processed..."
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Target Audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="ALL_RETAILERS">All Retailers</MenuItem>
                  <MenuItem value="ALL">All Users (Enterprise)</MenuItem>
                  <MenuItem value="DISTRIBUTOR">Distributors Only</MenuItem>
                  <MenuItem value="SUPER_DISTRIBUTOR">Super Distributors Only</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  type="number"
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} color="primary" />}
                  label="Active Status"
                  sx={{ mt: 1 }}
                />
              </Grid>
            </Grid>

            {/* Dynamic Links Section */}
            <Box sx={{ p: 2, bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", mb: 1.5 }}>
                Action Links (e.g. WhatsApp Channel, Support Link, Play Store)
              </Typography>

              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {links.map((lnk, idx) => (
                  <Stack key={idx} direction="row" alignItems="center" justifyContent="space-between" sx={{ bgcolor: "#FFFFFF", p: 1.5, borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A" }}>{lnk.label}</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>{lnk.url}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveLink(idx)} sx={{ color: "#EF4444" }}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Link Label"
                  placeholder="e.g. Official WhatsApp"
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Target URL"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  sx={{ flex: 2 }}
                />
                <Button onClick={handleAddLink} variant="outlined" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>
                  Add Link
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: "1px solid #E2E8F0" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#64748B", textTransform: "none" }}>
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
            borderRadius: "16px",
            bgcolor: "#FFFFFF"
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", borderBottom: "1px solid #E2E8F0" }}>
          Media & Image Manager — {activeAnnouncement?.announcement_code}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
              Upload banners and images directly to secure storage. Images will display dynamically in user modals and banners.
            </Typography>

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
                fontWeight: 700,
                borderRadius: "8px",
                textTransform: "none",
                "&:hover": { bgcolor: "#1D4ED8" }
              }}
            >
              {uploadingImage ? "Uploading Image..." : "Upload New Image"}
            </Button>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", mb: 1.5 }}>
            Attached Images ({activeAnnouncement?.images?.length || 0})
          </Typography>

          <Grid container spacing={2}>
            {activeAnnouncement?.images?.map((img) => (
              <Grid item xs={12} sm={6} md={4} key={img.id}>
                <Paper
                  elevation={0}
                  sx={{
                    bgcolor: "#FFFFFF",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid #E2E8F0"
                  }}
                >
                  <Box
                    component="img"
                    src={img.image_url}
                    alt={img.original_filename}
                    sx={{ width: "100%", height: 140, objectFit: "cover", bgcolor: "#F1F5F9" }}
                  />
                  <Box sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {img.original_filename}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                      Order: #{img.display_order} • {(img.file_size / 1024).toFixed(1)} KB
                    </Typography>

                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                      <IconButton size="small" onClick={() => handleDeleteImage(img.id)} sx={{ color: "#EF4444" }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #E2E8F0" }}>
          <Button onClick={() => setImageDialogOpen(false)} variant="contained" sx={{ bgcolor: "#2563EB", fontWeight: 700, textTransform: "none" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
