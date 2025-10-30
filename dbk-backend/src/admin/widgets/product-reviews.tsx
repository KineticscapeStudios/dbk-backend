import { defineWidgetConfig } from "@medusajs/admin-sdk";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Checkbox,
  Text,
} from "@medusajs/ui";
import * as React from "react";

type AdminReview = {
  id: string;
  title?: string | null;
  content: string;
  rating: number;
  first_name: string;
  last_name: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
};

type Props = { data: any }; // AdminProduct

function Badge({ status }: { status: AdminReview["status"] }) {
  const color =
    status === "approved" ? "green" : status === "rejected" ? "red" : "grey";
  return (
    <StatusBadge color={color}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </StatusBadge>
  );
}

async function fetchReviews(productId: string) {
  const res = await fetch(
    `/admin/reviews?product_id=${encodeURIComponent(
      productId
    )}&order=-created_at&limit=50`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Load reviews failed (${res.status}) ${t}`);
  }
  return (await res.json()) as { reviews: AdminReview[] };
}

async function bulkUpdate(ids: string[], status: AdminReview["status"]) {
  const res = await fetch(`/admin/reviews/status`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, status }),
  });
  if (!res.ok) throw new Error(`Update failed (${res.status})`);
}

const ProductReviewsWidget = ({ data }: Props) => {
  const productId = data?.id as string | undefined;

  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<AdminReview[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const hasSelection = React.useMemo(
    () => Object.values(selected).some(Boolean),
    [selected]
  );
  const selectedIds = React.useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );

  const reload = React.useCallback(async () => {
    if (!productId) return;
    setBusy(true);
    setErr(null);
    try {
      const { reviews } = await fetchReviews(productId);
      setRows(reviews);
      setSelected({});
    } catch (e: any) {
      if (!ctrl.signal.aborted) setErr(e?.message || "Failed to load reviews");
    } finally {
      setBusy(false);
    }
    return () => ctrl.abort();
  }, [productId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  if (!productId) return null;

  async function onApprove(id: string) {
    try {
      setBusy(true);
      await bulkUpdate([id], "approved");
      await reload();
    } catch (e: any) {
      alert(e?.message || "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function onReject(id: string) {
    try {
      setBusy(true);
      await bulkUpdate([id], "rejected");
      await reload();
    } catch (e: any) {
      alert(e?.message || "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk(status: AdminReview["status"]) {
    try {
      if (!selectedIds.length) return;
      setBusy(true);
      await bulkUpdate(selectedIds, status);
      await reload();
    } catch (e: any) {
      alert(e?.message || "Bulk update failed");
    } finally {
      setBusy(false);
    }
  }

  const allChecked = rows.length > 0 && rows.every((r) => selected[r.id]);
  const someChecked = rows.some((r) => selected[r.id]) && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      rows.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  }

  return (
    <Container className="p-0 divide-y">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product Reviews</Heading>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            onClick={reload}
            disabled={busy}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => onBulk("approved")}
            disabled={busy || !hasSelection}
          >
            Approve selected
          </Button>
          <Button
            size="small"
            variant="danger"
            onClick={() => onBulk("rejected")}
            disabled={busy || !hasSelection}
          >
            Reject selected
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        {rows.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No reviews yet.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b border-ui-border-base">
                <tr>
                  <th className="py-2 pr-3 w-8">
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Rating</th>
                  <th className="py-2 pr-3">Content</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-ui-border-base">
                    <td className="py-2 pr-3 align-top">
                      <Checkbox
                        checked={!!selected[r.id]}
                        onCheckedChange={() =>
                          setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))
                        }
                      />
                    </td>
                    <td className="py-2 pr-3 align-top whitespace-nowrap">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="py-2 pr-3 align-top">{r.title || "-"}</td>
                    <td className="py-2 pr-3 align-top">{r.rating}/5</td>
                    <td className="py-2 pr-3 align-top max-w-[420px]">
                      <div className="line-clamp-4">{r.content}</div>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <Badge status={r.status} />
                    </td>
                    <td className="py-2 pr-0 align-top">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => onApprove(r.id)}
                          disabled={busy || r.status === "approved"}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => onReject(r.id)}
                          disabled={busy || r.status === "rejected"}
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  // Good spots:
  // - "product.details.after" (below main details)
  // - "product.details.sidebar" (narrow column)
  zone: "product.details.after",
});

export default ProductReviewsWidget;
