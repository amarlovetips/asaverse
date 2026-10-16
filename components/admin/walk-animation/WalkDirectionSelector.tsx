import { WALK_DIRECTIONS, type WalkDirection } from "@/lib/character-design-json";
const names: Record<WalkDirection, string> = {
  north: "North", "north-east": "North-East", east: "East", "south-east": "South-East",
  south: "South", "south-west": "South-West", west: "West", "north-west": "North-West",
};
export default function WalkDirectionSelector({ value, onChange }: {
  value: WalkDirection[]; onChange: (directions: WalkDirection[]) => void;
}) {
  return <fieldset className="space-y-2">
    <legend className="text-xs font-semibold text-slate-200">Movement directions</legend>
    <div className="grid grid-cols-2 gap-1.5">
      {WALK_DIRECTIONS.map(direction => <label key={direction} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-300">
        <input type="checkbox" checked={value.includes(direction)} onChange={event => onChange(event.target.checked ? [...value, direction] : value.filter(item => item !== direction))} />
        {names[direction]}
      </label>)}
    </div>
  </fieldset>;
}
