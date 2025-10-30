import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import * as React from "react";

type Props = { data: any }; // AdminProduct

const ProductVideoWidget = ({ data }: Props) => {
  const productId = data?.id as string | undefined;
  const currentUrl = (data?.metadata?.video_url as string | undefined) ?? null;
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  if (!productId) return <></>;

  function openPicker() {
    inputRef.current?.click();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      console.log(file);
      form.append("file", file); // ← field name must be 'file'
      console.log("has file?", form.has("file"));
      for (const [key, val] of form.entries()) {
        if (val instanceof File) {
          console.log(key, val.name, val.type, val.size);
        } else {
          console.log(key, val);
        }
      }
      const url = new URL(
        `/admin/products/${productId}/video`,
        window.location.origin
      ).toString();

      const res = await fetch(url, {
        method: "POST",
        body: form,
        credentials: "include", // helpful if admin auth is cookie-based
        // DO NOT set Content-Type here
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed (${res.status}): ${txt}`);
      }

      location.reload();
    } catch (err) {
      console.error(err);
      alert("Video upload failed. Check console/network tab.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  async function remove() {
    if (!confirm("Remove product video?")) return;
    setBusy(true);
    try {
      const url = new URL(
        `/admin/products/${productId}/video`,
        window.location.origin
      ).toString();

      const res = await fetch(url, {
        method: "DELETE",
        // credentials: "include"
      });

      if (!res.ok && res.status !== 204) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed (${res.status}): ${txt}`);
      }

      location.reload();
    } catch (err) {
      console.error(err);
      alert("Delete failed. Check console/network tab.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Video</Heading>
      </div>

      <div className="px-6 py-4 space-y-3">
        {/* Hidden input lives once; we trigger it from buttons */}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only" // visually hidden but still interactive
          onChange={upload}
          aria-hidden="true"
          tabIndex={-1}
        />

        {currentUrl ? (
          <>
            <video className="w-full rounded-md" controls src={currentUrl} />
            <div className="flex items-center gap-3">
              <Button
                size="small"
                variant="secondary"
                onClick={openPicker}
                disabled={busy}
              >
                Replace Video
              </Button>
              <Button
                size="small"
                variant="danger"
                onClick={remove}
                disabled={busy}
              >
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              Upload a video to show on the product page.
            </Text>
            <Button size="small" onClick={openPicker} disabled={busy}>
              Upload Video
            </Button>
          </>
        )}
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductVideoWidget;
