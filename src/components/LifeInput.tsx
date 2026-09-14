import { useState, useId, type ReactNode } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

/**
 * Campo de texto base (SPEC-07 §3.3). Puro: recibe `value`/`onChange` tipados;
 * el valor de password nunca se loguea ni se expone como texto (solo el toggle
 * controlado de visibilidad cambia el `type`). Foco = borde cian + glow;
 * error = borde eléctrico + mensaje accesible (aria-describedby, role=alert).
 */
export type LifeInputType = 'text' | 'email' | 'password' | 'tel' | 'search' | 'number';

export type LifeInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: LifeInputType;
  error?: string;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  accessibilityLabel?: string;
};

export function LifeInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  disabled = false,
  leftIcon,
  rightSlot,
  accessibilityLabel
}: LifeInputProps) {
  const rawId = useId();
  const id = `life-input-${rawId.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const errorId = error ? `${id}-error` : undefined;
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const resolvedType = type === 'password' && showPassword ? 'text' : type;

  const surfaceClasses = error
    ? 'border-lp-electric'
    : focused
      ? 'border-lp-cyan shadow-[0_0_0_3px_rgba(0,240,255,0.18)]'
      : 'border-lp-glass-border';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-lp-body text-[13px] font-medium text-lp-muted">
        {label}
      </label>
      <div
        data-testid="life-input-control"
        data-focused={focused ? 'true' : undefined}
        className={`flex items-center gap-2 rounded-lp border bg-white/[0.04] px-3 transition-[border-color,box-shadow] duration-[var(--lp-motion-fast)] ease-out ${surfaceClasses} ${disabled ? 'opacity-45' : ''}`}
      >
        {leftIcon}
        <input
          id={id}
          type={resolvedType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={accessibilityLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="h-10 w-full min-w-0 bg-transparent font-lp-body text-sm text-lp-primary placeholder:text-lp-muted/60 focus:outline-none disabled:cursor-not-allowed"
        />
        {type === 'password' && (
          <button
            type="button"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="shrink-0 rounded-full p-1 text-lp-muted transition-colors duration-[var(--lp-motion-fast)] ease-out hover:text-lp-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55 focus-visible:ring-offset-2 focus-visible:ring-offset-lp-base"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
        {rightSlot}
      </div>
      {error && (
        <p id={errorId} role="alert" className="font-lp-body text-[12px] leading-tight text-lp-electric">
          {error}
        </p>
      )}
    </div>
  );
}