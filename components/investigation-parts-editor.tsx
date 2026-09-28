"use client";

import { useState } from "react";
import { moveInvestigationPart, removeInvestigationPart } from "@/lib/investigation-actions";
import { buttonClass } from "@/components/ui/button";
import type { InvestigationPart } from "@/lib/investigations";

export function InvestigationPartsEditor({
  investigationId,
  parts,
}: {
  investigationId: string;
  parts: InvestigationPart[];
}) {
  const [order, setOrder] = useState(parts.map((part) => part.id));

  function move(id: string, direction: -1 | 1) {
    setOrder((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item!);
      return copy;
    });
  }

  const ordered = order
    .map((id) => parts.find((part) => part.id === id))
    .filter((part): part is InvestigationPart => Boolean(part));

  return (
    <div>
      <ol className="space-y-3">
        {ordered.map((part, index) => (
          <li key={part.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3">
            <div className="min-w-0">
              <p className="fh-label">Part {index + 1}</p>
              <p className="font-medium text-ink">{part.title}</p>
              <p className="fh-meta">{part.locationLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass("ghost", "h-9 px-3")} onClick={() => move(part.id, -1)} disabled={index === 0}>
                Move up
              </button>
              <button
                type="button"
                className={buttonClass("ghost", "h-9 px-3")}
                onClick={() => move(part.id, 1)}
                disabled={index === ordered.length - 1}
              >
                Move down
              </button>
              <form action={removeInvestigationPart}>
                <input type="hidden" name="investigation_id" value={investigationId} />
                <input type="hidden" name="item_id" value={part.id} />
                <button type="submit" className={buttonClass("ghost", "h-9 px-3")}>
                  Remove
                </button>
              </form>
            </div>
          </li>
        ))}
      </ol>
      <form action={moveInvestigationPart} className="mt-4">
        <input type="hidden" name="investigation_id" value={investigationId} />
        <input type="hidden" name="ordered_ids" value={order.join(",")} />
        <button type="submit" className={buttonClass("secondary")}>
          Save order
        </button>
      </form>
    </div>
  );
}
