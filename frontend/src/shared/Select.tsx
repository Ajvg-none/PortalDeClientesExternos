import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Select accesible (patron WAI-ARIA combobox + listbox).
 * Reemplaza al <select> nativo: misma API de estado (value/onChange),
 * cero <select> en el DOM. Estilado con tokens del design system.
 * - Click fuera / Escape cierran el listbox.
 * - Teclado: ArrowDown/Up navega, Home/End extremos, Enter/Space selecciona.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
}: SelectProps) {
  const autoId = useId().replace(/:/g, '');
  const baseId = id ?? autoId;
  const listboxId = `${baseId}-listbox`;

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);

  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const showPlaceholder = !selected && Boolean(placeholder);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const el = menuRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function selectOption(index: number) {
    const opt = options[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectOption(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  const activeOptionId = open ? `${baseId}-opt-${activeIndex}` : undefined;

  return (
    <div className="select" ref={rootRef}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && options.length > 0 ? activeOptionId : undefined}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        className="select__trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={`select__value${showPlaceholder ? ' select__value--placeholder' : ''}`}>
          {showPlaceholder ? placeholder : selected?.label ?? ''}
        </span>
        <ChevronDown
          size={16}
          className={`select__icon${open ? ' select__icon--open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && options.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          ref={menuRef}
          className="select__menu"
          aria-label={ariaLabel}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={`${opt.value}-${i}`}
                id={`${baseId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                data-index={i}
                className={`select__option${isSelected ? ' select__option--selected' : ''}${
                  i === activeIndex ? ' select__option--active' : ''
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(i)}
              >
                <span className="select__check">
                  {isSelected && <Check size={14} aria-hidden="true" />}
                </span>
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
