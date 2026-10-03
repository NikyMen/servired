"use client";

import dynamic from "next/dynamic";

const PickerInner = dynamic(() => import("@/components/MapPickerInner"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />,
});

export function MapPicker({ latitude, longitude, onChange, radioM, sinMarca }: { latitude: number; longitude: number; onChange: (latitude: number, longitude: number) => void; radioM?: number; sinMarca?: boolean }) {
  return <PickerInner latitude={latitude} longitude={longitude} onChange={onChange} radioM={radioM} sinMarca={sinMarca} />;
}
