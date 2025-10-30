"use client";

import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Text, Badge, Input } from "@medusajs/ui";
import * as React from "react";

type Banner = {
  id: string;
  image_url: string;
  collection_handle: string;
  alt?: string | null;
  priority?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
};

const BannerManagerWidget = () => {
  const [banners, setBanners] = React.useState<Banner[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Upload state
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [handle, setHandle] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const [priority, setPriority] = React.useState<number>(0);
  const [isActive, setIsActive] = React.useState(true);

  const fetchBanners = React.useCallback(async () => {
    const res = await fetch("/admin/banners", { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Failed to fetch banners (${res.status})`);
    }
    const json = await res.json();
    setBanners(json?.banners || []);
  }, []);

  React.useEffect(() => {
    fetchBanners().catch((e) => setError(e.message));
  }, [fetchBanners]);

  function openPicker() {
    inputRef.current?.click();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file); // field must be named "file"
      form.append("collection_handle", handle.trim());
      if (alt.trim()) form.append("alt", alt.trim());
      form.append("priority", String(priority));
      form.append("is_active", String(isActive));

      const res = await fetch("/admin/banners", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${txt}`);
      }
      await fetchBanners();
      setHandle("");
      setAlt("");
      setPriority(0);
      setIsActive(true);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this banner?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/admin/banners/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!(res.ok || res.status === 204)) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed (${res.status}): ${txt}`);
      }
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Banner Manager</Heading>
      </div>

      <div className="px-6 py-4 space-y-4">
        <Text size="small" className="text-ui-fg-subtle">
          Upload homepage/collection banners mapped by{" "}
          <strong>collection handle</strong>.
        </Text>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={upload}
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[12px] text-ui-fg-subtle">
              Collection handle
            </label>
            <Input
              placeholder="e.g. summer-2025"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] text-ui-fg-subtle">
              Alt text (optional)
            </label>
            <Input
              placeholder="Short accessible description"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] text-ui-fg-subtle">
              Priority (lower shows first)
            </label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value || "0", 10))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[12px] text-ui-fg-subtle">Active</label>
            <div className="flex items-center gap-2">
              <input
                id="banner-active"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="banner-active">Active</label>
            </div>
          </div>
        </div>

        <div>
          <Button
            size="small"
            onClick={openPicker}
            disabled={busy || !handle.trim()}
          >
            {busy ? "Uploading…" : "Upload Banner Image"}
          </Button>
          {!handle.trim() && (
            <Text size="small" className="text-ui-fg-subtle ml-2">
              Enter a collection handle first
            </Text>
          )}
        </div>

        {error && <Text className="text-ui-fg-critical">{error}</Text>}

        <div className="border-t pt-4 mt-4 space-y-3">
          <Heading level="h3">Existing Banners</Heading>
          {banners.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              No banners yet.
            </Text>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {banners.map((b) => (
                <li key={b.id} className="border rounded-md p-3 flex gap-3">
                  <img
                    src={b.image_url}
                    alt={b.alt || ""}
                    className="w-28 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge size="2xsmall">{b.collection_handle}</Badge>
                      {!b.is_active && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    {b.alt && (
                      <Text size="small" className="text-ui-fg-subtle">
                        Alt: {b.alt}
                      </Text>
                    )}
                    <Text size="small" className="text-ui-fg-subtle">
                      Priority:{" "}
                      {typeof b.priority === "number" ? b.priority : 0}
                    </Text>
                  </div>
                  <div className="flex items-center">
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => remove(b.id)}
                      disabled={busy}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product_collection.list.before",
});

export default BannerManagerWidget;
