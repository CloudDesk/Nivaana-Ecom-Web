import React, { useId, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import type { AddressPayload } from "../services/addressService";
import {
  INVALID_MOBILE_MESSAGE,
  isValidIndianMobile,
  normalizeIndianMobileInput,
} from "../lib/phone";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

type FieldKey = "name" | "mobilenumber" | "pincode" | "doornumber" | "address" | "city" | "state";
type FieldErrors = Partial<Record<FieldKey, string>>;

const inputBase =
  "h-11 w-full rounded-[var(--radius-sm)] border bg-white px-3.5 text-sm text-[var(--color-text)] outline-none transition placeholder:text-[#9aa1ab] focus:ring-2";
const inputState = (hasError: boolean) =>
  hasError
    ? "border-red-400 focus:border-red-400 focus:ring-red-100"
    : "border-[var(--color-border)] focus:border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]/15";

/** Checks the same rules the pages enforce, so problems show under the field. */
const validateAddress = (form: AddressPayload): FieldErrors => {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Enter the full name.";
  if (!isValidIndianMobile(String(form.mobilenumber || ""))) errors.mobilenumber = INVALID_MOBILE_MESSAGE;
  if (!/^[1-9]\d{5}$/.test(String(form.pincode || ""))) errors.pincode = "Enter a valid 6-digit pincode.";
  if (!form.city.trim()) errors.city = "Enter the city or district.";
  if (!form.state) errors.state = "Select the state.";
  if (!form.doornumber.trim()) errors.doornumber = "Enter the house, flat or building number.";
  if (!form.address.trim()) errors.address = "Enter the area and street.";
  return errors;
};

/**
 * Shared delivery address form (Checkout and Saved Addresses). Field names and
 * the saved payload are unchanged: "House / Flat / Building no." is stored in
 * `doornumber`, shown first in every address line.
 */
export function AddressForm({
  form,
  isEditing,
  isPending,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: AddressPayload;
  isEditing: boolean;
  isPending: boolean;
  onChange: React.Dispatch<React.SetStateAction<AddressPayload>>;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const setField = (field: keyof AddressPayload, value: string | boolean) => {
    onChange((current) => ({
      ...current,
      [field]: field === "mobilenumber" || field === "pincode" ? Number(value) : value,
    }));
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field as FieldKey];
        return next;
      });
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const nextErrors = validateAddress(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col">
      <FormSection title="Contact details">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Full name"
            value={form.name}
            placeholder="Name of the person receiving the order"
            autoComplete="name"
            error={errors.name}
            onChange={(value) => setField("name", value)}
          />
          <MobileField
            value={form.mobilenumber ? String(form.mobilenumber) : ""}
            error={errors.mobilenumber}
            onChange={(value) => setField("mobilenumber", normalizeIndianMobileInput(value))}
          />
        </div>
      </FormSection>

      <FormSection title="Address" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Pincode"
            value={form.pincode ? String(form.pincode) : ""}
            placeholder="6-digit pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            error={errors.pincode}
            onChange={(value) => setField("pincode", value.replace(/\D/g, "").slice(0, 6))}
          />
          <TextField
            label="City / District"
            value={form.city}
            placeholder="City or district"
            autoComplete="address-level2"
            error={errors.city}
            onChange={(value) => setField("city", value)}
          />
          <SelectField
            label="State"
            value={form.state}
            options={INDIAN_STATES}
            error={errors.state}
            onChange={(value) => setField("state", value)}
          />
          <TextField
            className="sm:col-span-3"
            label="House / Flat / Building no."
            value={form.doornumber}
            placeholder="e.g. 12B, Lotus Apartments"
            autoComplete="address-line1"
            error={errors.doornumber}
            onChange={(value) => setField("doornumber", value)}
          />
          <TextField
            className="sm:col-span-3"
            label="Area and street"
            value={form.address}
            placeholder="Area, street, sector or village"
            autoComplete="address-line2"
            multiline
            error={errors.address}
            onChange={(value) => setField("address", value)}
          />
          <TextField
            className="sm:col-span-3"
            label="Landmark"
            optional
            value={form.landmark}
            placeholder="e.g. Near City Hospital"
            onChange={(value) => setField("landmark", value)}
          />
        </div>
      </FormSection>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-4 py-3">
        <input
          type="checkbox"
          checked={Boolean(form.isdefaultaddress)}
          onChange={(event) => setField("isdefaultaddress", event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-secondary)]"
        />
        <span>
          <span className="block text-sm font-semibold text-[var(--color-text)]">Make this my default address</span>
          <span className="mt-0.5 block text-xs text-[var(--color-muted)]">Used automatically at checkout.</span>
        </span>
      </label>

      {/* Actions stay visible at the bottom of the scrolling modal body. */}
      <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-end gap-3 border-t border-[var(--color-border)] bg-white px-6 py-4">
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="h-11 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white px-5 text-sm font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:opacity-50"
        >
          Cancel
        </button>
        <Button type="submit" className="h-11 min-w-36 shadow-none hover:translate-y-0 hover:shadow-none" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update address" : "Save address"}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={className}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function FieldShell({
  id,
  label,
  optional,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[var(--color-text)]">
        {label}
        {optional && <span className="ml-1 font-normal text-[var(--color-muted)]">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  autoComplete,
  multiline,
  optional,
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  multiline?: boolean;
  optional?: boolean;
  error?: string;
  className?: string;
}) {
  const id = useId();
  const shared = {
    id,
    value,
    placeholder,
    autoComplete,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} className={className}>
      {multiline ? (
        <textarea
          {...shared}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputBase} ${inputState(Boolean(error))} h-auto min-h-[4.5rem] resize-none py-2.5 leading-6`}
        />
      ) : (
        <input
          {...shared}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputBase} ${inputState(Boolean(error))}`}
        />
      )}
    </FieldShell>
  );
}

function MobileField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const id = useId();
  return (
    <FieldShell id={id} label="Mobile number" error={error}>
      <div
        className={`flex h-11 overflow-hidden rounded-[var(--radius-sm)] border bg-white transition focus-within:ring-2 ${
          error
            ? "border-red-400 focus-within:ring-red-100"
            : "border-[var(--color-border)] focus-within:border-[var(--color-secondary)] focus-within:ring-[var(--color-secondary)]/15"
        }`}
      >
        <span className="flex items-center border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-muted)]">
          +91
        </span>
        {/* No maxLength: the browser would cut autofilled "+91…" before it is normalised. */}
        <input
          id={id}
          value={value}
          placeholder="10-digit mobile number"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-3.5 text-sm text-[var(--color-text)] outline-none placeholder:text-[#9aa1ab]"
        />
      </div>
    </FieldShell>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error}>
      <div className="relative">
        <select
          id={id}
          value={value}
          autoComplete="address-level1"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputBase} ${inputState(Boolean(error))} appearance-none pr-9 ${value ? "" : "text-[#9aa1ab]"}`}
        >
          <option value="">Select state</option>
          {options.map((option) => (
            <option key={option} value={option} className="text-[var(--color-text)]">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
      </div>
    </FieldShell>
  );
}

export default AddressForm;
