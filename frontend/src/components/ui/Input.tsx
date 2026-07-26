import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-line bg-raised px-3 py-2 text-[13px] text-fg " +
  "placeholder:text-faint focus:border-muted focus:outline-none";

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-medium text-muted"
    >
      {children}
    </label>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <input
        id={inputId}
        className={cn(fieldBase, error && "border-muted", className)}
        {...props}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

// Errors are neutral-but-emphasised, never red: severity red must never appear
// anywhere but the severity ramp, or a coordinator stops trusting it.
function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-fg">{children}</p>;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <textarea
        id={inputId}
        className={cn(fieldBase, "min-h-[96px] resize-y", error && "border-muted", className)}
        {...props}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <select id={inputId} className={cn(fieldBase, className)} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
