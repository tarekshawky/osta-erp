"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// The look of every search and filter row in the admin (shadcn/ui components): a card with even space between the items.
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-xs">{children}</div>;
}

export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" data-osta-search value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className="pl-9 pr-9" />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <XIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

const ALL = "__all__"; // Radix Select items cannot have an empty value

export function FilterSelect({ value, onChange, label, allLabel, options }: { value: string; onChange: (v: string) => void; label: string; allLabel: string; options: { value: string; label: string }[] }) {
  return (
    <Select value={value || ALL} onValueChange={(v) => onChange(v === ALL ? "" : v)}>
      <SelectTrigger aria-label={label} className="min-w-36 max-w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ClearFilters({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <XIcon /> Clear
    </Button>
  );
}

export function ResultCount({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto text-sm text-muted-foreground" role="status">{children}</span>;
}
