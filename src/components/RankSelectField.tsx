import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MARITIME_RANK_GROUPS, type RankOptionGroup } from '../types/portal';

const CUSTOM_SENTINEL = '__custom__';

interface RankSelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  groups?: RankOptionGroup[];
  flatOptions?: { label: string; options: string[] }[];
  placeholderOption?: string;
  customPlaceholder?: string;
  className?: string;
  ariaLabel?: string;
}

export function RankSelectField({
  id,
  value,
  onChange,
  groups = MARITIME_RANK_GROUPS,
  flatOptions,
  placeholderOption = 'Select Rank / Role',
  customPlaceholder = 'Enter custom rank or role title',
  className = 'w-full px-3.5 py-2.5 text-sm border border-[#CBD5E1] rounded-lg bg-white text-[#0A192F] focus:outline-none focus:border-[#0A192F]',
  ariaLabel,
}: RankSelectFieldProps) {
  const effectiveGroups: RankOptionGroup[] = flatOptions
    ? flatOptions.map((item) => ({ label: item.label, ranks: item.options }))
    : groups;

  const knownOptions = new Set(effectiveGroups.flatMap((g) => g.ranks));
  const isValueKnown = Boolean(value && knownOptions.has(value));
  const [customMode, setCustomMode] = useState<boolean>(
    () => Boolean(value.trim()) && !knownOptions.has(value)
  );

  useEffect(() => {
    if (value && knownOptions.has(value)) {
      setCustomMode(false);
    } else if (value.trim() && !knownOptions.has(value)) {
      setCustomMode(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const selectValue = customMode ? CUSTOM_SENTINEL : isValueKnown ? value : '';

  const handleSelectChange = (nextVal: string) => {
    if (nextVal === CUSTOM_SENTINEL) {
      setCustomMode(true);
      if (knownOptions.has(value)) {
        onChange('');
      }
      return;
    }
    setCustomMode(false);
    onChange(nextVal);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <select
          id={id}
          aria-label={ariaLabel}
          value={selectValue}
          onChange={(e) => handleSelectChange(e.target.value)}
          className={`${className} appearance-none pr-9 cursor-pointer`}
        >
          <option value="">{placeholderOption}</option>
          {effectiveGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.ranks.map((rank) => (
                <option key={rank} value={rank}>
                  {rank}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM_SENTINEL}>Other (Specify Custom Rank / Role)</option>
        </select>
        <ChevronDown
          aria-hidden="true"
          className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        />
      </div>

      {customMode && (
        <input
          id={`${id}-custom`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={customPlaceholder}
          className={className}
        />
      )}
    </div>
  );
}
