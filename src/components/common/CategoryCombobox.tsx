import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, FolderOpen } from 'lucide-react';

interface CategoryComboboxProps {
  value: string;
  onChange: (category: string) => void;
  categories: string[];
  label?: string;
}

/**
 * A "select an existing category, or type a brand-new one" input. Used by
 * both Inventory materials and the Service Catalog — categories on either
 * are free-text fields, not a separate table, so creating a new one is just
 * picking text that doesn't match any existing option. This component makes
 * that flow visible and interactive instead of a plain <input>.
 */
export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({ value, onChange, categories, label = 'Categoría' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, query]);

  const exactMatch = categories.some((c) => c.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length > 0 && !exactMatch;

  const commit = (val: string) => {
    onChange(val);
    setQuery(val);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold text-stone-700 mb-1">{label} *</label>
      <div className="relative">
        <FolderOpen className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          required
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar o crear categoría..."
          className="w-full pl-8 pr-8 py-2 text-xs border border-stone-300 rounded-lg outline-hidden focus:ring-2 focus:ring-amber-500"
        />
        <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {open && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto py-1">
          {filtered.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(c)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50 transition-colors ${
                c === value ? 'font-bold text-amber-800 bg-amber-50/60' : 'text-stone-700'
              }`}
            >
              {c}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => commit(query.trim())}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 border-t border-stone-100 mt-1 pt-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear categoría "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
};
