"use client";

import { useRef, type KeyboardEvent } from "react";

import { AuditFindingItem } from "./audit-finding-item";
import { DEMO_FINDINGS } from "@/data/demo-architecture";

export interface AuditFindingListProps {
  selectedId: string;
  onSelect: (findingId: string) => void;
}

/**
 * Vertical tablist over the audit findings. Arrow keys move and select
 * (automatic activation); focus follows the selected tab.
 */
export function AuditFindingList({ selectedId, onSelect }: AuditFindingListProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectIndex = (index: number) => {
    const finding = DEMO_FINDINGS[index];
    if (finding !== undefined) {
      onSelect(finding.id);
      tabRefs.current[index]?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = DEMO_FINDINGS.findIndex((finding) => finding.id === selectedId);
    const lastIndex = DEMO_FINDINGS.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectIndex(currentIndex >= lastIndex ? 0 : currentIndex + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        selectIndex(currentIndex <= 0 ? lastIndex : currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        selectIndex(0);
        break;
      case "End":
        event.preventDefault();
        selectIndex(lastIndex);
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Audit findings"
      aria-orientation="vertical"
      className="flex flex-col gap-3"
    >
      {DEMO_FINDINGS.map((finding, index) => (
        <AuditFindingItem
          key={finding.id}
          finding={finding}
          selected={finding.id === selectedId}
          onSelect={() => {
            onSelect(finding.id);
          }}
          onKeyDown={onKeyDown}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
        />
      ))}
    </div>
  );
}
