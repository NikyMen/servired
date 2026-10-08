"use client";

import { useState } from "react";
import { idPorDefecto } from "@/lib/localidad-defecto";

type Localidad = { id: string; name: string; province: string };

export function LocalidadSelect({ localities, value, defaultValue, onChange, className }: {
  localities: Localidad[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className: string;
}) {
  const [internalId, setInternalId] = useState(defaultValue || idPorDefecto(localities));
  const selectedId = value ?? internalId;
  const province = localities.find((l) => l.id === selectedId)?.province ?? localities[0]?.province ?? "";
  const provinces = [...new Set(localities.map((l) => l.province))].sort((a, b) => a.localeCompare(b, "es"));
  const cities = localities.filter((l) => l.province === province);

  function select(id: string) {
    setInternalId(id);
    onChange?.(id);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">Provincia
        <select value={province} onChange={(e) => select(localities.find((l) => l.province === e.target.value)?.id ?? "")} required className={className}>
          {provinces.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">Ciudad
        <select name="localityId" value={selectedId} onChange={(e) => select(e.target.value)} required className={className}>
          {cities.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
    </div>
  );
}
