import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Loader2, MapPin, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { addressService, type Address, type AddressPayload } from "../services/addressService";
import { sessionService } from "../services/sessionService";

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

const emptyAddressForm = (userId: number, mobileNumber: number): AddressPayload => ({
  userid: userId,
  name: "",
  mobilenumber: mobileNumber || 0,
  pincode: 0,
  doornumber: "",
  address: "",
  landmark: "",
  state: "",
  city: "",
  isdefaultaddress: true,
});

const addressToPayload = (address: Address): AddressPayload => ({
  userid: address.userid,
  name: address.name || "",
  mobilenumber: Number(address.mobilenumber || 0),
  pincode: Number(address.pincode || 0),
  doornumber: address.doornumber || "",
  address: address.address || "",
  landmark: address.landmark || "",
  state: address.state || "",
  city: address.city || "",
  isdefaultaddress: Boolean(address.isdefaultaddress),
});

const notificationDisplayMs = 4200;
const notificationFadeMs = 350;

const addressErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as { message?: string; data?: { message?: string; details?: string } };
  const message = apiError.data?.message || apiError.message || "";
  const details = apiError.data?.details || "";

  if (/referenced table|foreign key|field reference/i.test(`${message} ${details}`)) {
    return "This address is linked to an order and cannot be deleted.";
  }

  return message || fallback;
};

const SavedAddresses: React.FC = () => {
  const queryClient = useQueryClient();
  const [session] = useState(() => sessionService.getSession());
  const user = session?.user;
  const userId = user?.id;
  const userMobile = Number(user?.usermobilenumber ?? 0);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressPayload>(() =>
    emptyAddressForm(user?.id ?? 0, Number(user?.usermobilenumber ?? 0))
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [notificationVisible, setNotificationVisible] = useState(false);

  const addressesQuery = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => addressService.list(userId!),
    enabled: Boolean(userId),
  });

  const addresses = addressesQuery.data?.data ?? [];

  useEffect(() => {
    if (userId) {
      setAddressForm(emptyAddressForm(userId, userMobile));
    }
  }, [userId, userMobile]);

  useEffect(() => {
    if (addresses.length === 0 && !addressesQuery.isLoading) {
      setShowAddressForm(true);
    }
  }, [addresses.length, addressesQuery.isLoading]);

  useEffect(() => {
    if (!statusMessage && !errorMessage) {
      setNotificationVisible(false);
      return;
    }

    setNotificationVisible(true);
    const fadeTimer = window.setTimeout(() => setNotificationVisible(false), notificationDisplayMs);
    const clearTimer = window.setTimeout(() => {
      setStatusMessage("");
      setErrorMessage("");
    }, notificationDisplayMs + notificationFadeMs);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [statusMessage, errorMessage]);

  const resetForm = () => {
    if (userId) {
      setAddressForm(emptyAddressForm(userId, userMobile));
    }
    setEditingAddressId(null);
  };

  const createAddressMutation = useMutation({
    mutationFn: (payload: AddressPayload) => addressService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      resetForm();
      setShowAddressForm(false);
      setStatusMessage("Address saved.");
      setErrorMessage("");
    },
    onError: () => {
      setErrorMessage("Could not save this address. Please check the details and try again.");
      setStatusMessage("");
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ addressId, payload }: { addressId: number; payload: AddressPayload }) =>
      addressService.update(addressId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      resetForm();
      setShowAddressForm(false);
      setStatusMessage("Address updated.");
      setErrorMessage("");
    },
    onError: () => {
      setErrorMessage("Could not update this address. Please try again.");
      setStatusMessage("");
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (address: Address) => {
      const addressId = Number(address.id);
      if (!Number.isFinite(addressId)) {
        throw new Error("Could not delete this address because its id is missing.");
      }

      return addressService.remove(addressId);
    },
    onSuccess: (_, address) => {
      const addressId = Number(address.id);
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      if (editingAddressId === addressId) {
        resetForm();
      }
      setStatusMessage("Address deleted.");
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(addressErrorMessage(error, "Could not delete this address. Please try again."));
      setStatusMessage("");
    },
  });

  const handleAddressSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (!user) return;

    if (!addressForm.name.trim() || !addressForm.address.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      setErrorMessage("Please fill the required address fields.");
      return;
    }

    if (String(addressForm.mobilenumber).length !== 10 || String(addressForm.pincode).length !== 6) {
      setErrorMessage("Please enter a valid 10-digit mobile number and 6-digit pincode.");
      return;
    }

    const payload = { ...addressForm, userid: user.id };
    if (editingAddressId) {
      updateAddressMutation.mutate({ addressId: editingAddressId, payload });
      return;
    }

    createAddressMutation.mutate(payload);
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-[var(--color-surface)] px-4 py-12">
        <section className="mx-auto max-w-lg rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-8 text-center shadow-[var(--shadow-card)]">
          <UserRound className="mx-auto h-10 w-10 text-[var(--color-secondary)]" />
          <h1 className="mt-5 text-2xl font-bold text-[var(--color-text)]">Login to manage addresses</h1>
          <Link to="/login" className="mt-6 inline-flex">
            <Button>Login with OTP</Button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)]">Account</p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">Saved Addresses</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Add, edit, and delete your delivery addresses.</p>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              if (showAddressForm && !editingAddressId) {
                setShowAddressForm(false);
                return;
              }
              resetForm();
              setShowAddressForm(true);
              setErrorMessage("");
              setStatusMessage("");
            }}
          >
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
        </div>

        {(statusMessage || errorMessage) && (
          <div
            className={`mt-5 rounded-[var(--radius-md)] border bg-white p-4 text-sm font-semibold transition duration-300 ${
              notificationVisible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
            } ${
              errorMessage ? "border-red-200 text-red-600" : "border-green-200 text-green-700"
            }`}
          >
            {errorMessage || statusMessage}
          </div>
        )}

        <section className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          {addressesQuery.isLoading ? (
            <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-secondary)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading addresses
            </div>
          ) : addresses.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  isBusy={deleteAddressMutation.isPending || updateAddressMutation.isPending}
                  onEdit={() => {
                    setEditingAddressId(address.id);
                    setAddressForm(addressToPayload(address));
                    setShowAddressForm(true);
                    setErrorMessage("");
                    setStatusMessage("");
                  }}
                  onDelete={() => {
                    if (window.confirm("Delete this address?")) {
                      deleteAddressMutation.mutate(address);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface)] p-6 text-center">
              <MapPin className="mx-auto h-9 w-9 text-[var(--color-secondary)]" />
              <h2 className="mt-3 text-lg font-bold text-[var(--color-text)]">No saved addresses</h2>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Add your first delivery address below.</p>
            </div>
          )}

          {showAddressForm && (
            <AddressForm
              form={addressForm}
              isEditing={Boolean(editingAddressId)}
              isPending={createAddressMutation.isPending || updateAddressMutation.isPending}
              onChange={setAddressForm}
              onCancel={() => {
                resetForm();
                setShowAddressForm(addresses.length === 0);
              }}
              onSubmit={handleAddressSubmit}
            />
          )}
        </section>
      </section>
    </main>
  );
};

function AddressCard({
  address,
  isBusy,
  onEdit,
  onDelete,
}: {
  address: Address;
  isBusy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="relative min-h-36 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-white p-4 pr-28 text-left transition hover:border-[var(--color-secondary)]/50">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Edit address for ${address.name}`}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] p-2.5 text-[var(--color-muted)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-secondary)] disabled:opacity-50"
          disabled={isBusy}
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete address for ${address.name}`}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] p-2.5 text-[var(--color-muted)] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          disabled={isBusy}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-start gap-3">
        <Home className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-secondary)]" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[var(--color-text)]">{address.name}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
            {address.doornumber}, {address.address}, {address.city}, {address.state} - {address.pincode}
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--color-secondary)]">{address.mobilenumber}</p>
          {address.isdefaultaddress && (
            <span className="mt-3 inline-flex rounded-full bg-[var(--color-primary)]/25 px-3 py-1 text-xs font-bold text-[var(--color-secondary)]">
              Default
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function AddressForm({
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
  const [alternatePhone, setAlternatePhone] = useState("");
  const [addressType, setAddressType] = useState<"home" | "work">("home");

  const setField = (field: keyof AddressPayload, value: string | boolean) => {
    onChange((current) => ({
      ...current,
      [field]: field === "mobilenumber" || field === "pincode" ? Number(value) : value,
    }));
  };

  return (
    <form className="mt-5 border-t border-[var(--color-border)] pt-5" onSubmit={onSubmit}>
      <div className="rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-secondary)]">
          {isEditing ? "Edit Address" : "Add New Address"}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={(value) => setField("name", value)} required />
          <Field
            label="10-digit mobile number"
            value={form.mobilenumber ? String(form.mobilenumber) : ""}
            inputMode="numeric"
            onChange={(value) => setField("mobilenumber", value.replace(/\D/g, "").slice(0, 10))}
            required
          />
          <Field
            label="Pincode"
            value={form.pincode ? String(form.pincode) : ""}
            inputMode="numeric"
            onChange={(value) => setField("pincode", value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <Field label="Locality" value={form.doornumber} onChange={(value) => setField("doornumber", value)} required />
          <Field
            className="sm:col-span-2"
            label="Address (Area and Street)"
            value={form.address}
            onChange={(value) => setField("address", value)}
            multiline
            required
          />
          <Field label="City/District/Town" value={form.city} onChange={(value) => setField("city", value)} required />
          <Field label="State" value={form.state} onChange={(value) => setField("state", value)} options={INDIAN_STATES} required />
          <Field label="Landmark (Optional)" value={form.landmark} onChange={(value) => setField("landmark", value)} />
          <Field
            label="Alternate Phone (Optional)"
            value={alternatePhone}
            inputMode="numeric"
            onChange={(value) => setAlternatePhone(value.replace(/\D/g, "").slice(0, 10))}
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-[var(--color-muted)]">Address Type</p>
          <div className="mt-3 flex flex-wrap gap-8">
            {(["home", "work"] as const).map((type) => (
              <label key={type} className="inline-flex items-center gap-3 text-sm font-semibold capitalize text-[var(--color-text)]">
                <input
                  type="radio"
                  name="address-type"
                  checked={addressType === type}
                  onChange={() => setAddressType(type)}
                  className="h-5 w-5 accent-[var(--color-secondary)]"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-[var(--color-text)]">
          <input
            type="checkbox"
            checked={Boolean(form.isdefaultaddress)}
            onChange={(event) => setField("isdefaultaddress", event.target.checked)}
            className="h-4 w-4 accent-[var(--color-secondary)]"
          />
          Default address
        </label>

        <div className="mt-6 flex flex-wrap items-center gap-5">
          <Button className="h-12 min-w-48 shadow-none hover:shadow-none" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Save"}
          </Button>
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="h-12 px-4 text-sm font-bold uppercase tracking-[0.04em] text-[var(--color-secondary)] transition hover:text-[var(--color-text)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
  inputMode,
  multiline,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  multiline?: boolean;
  options?: string[];
  required?: boolean;
}) {
  const shellClass =
    "block rounded-none border border-[var(--color-border)] bg-white px-4 py-3 transition focus-within:border-[var(--color-secondary)] focus-within:ring-1 focus-within:ring-[var(--color-secondary)]";
  const controlClass =
    "mt-1 w-full border-0 bg-transparent p-0 text-base font-medium text-[#050505] outline-none placeholder:text-[#858b94]";

  return (
    <label className={`${shellClass} ${multiline ? "min-h-28" : "min-h-[62px]"} ${className}`}>
      <span className="block text-sm font-medium text-[#767d87]">{label}</span>
      {options ? (
        <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className={`${controlClass} appearance-auto`}>
          <option value="">Select state</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea value={value} required={required} onChange={(event) => onChange(event.target.value)} className={`${controlClass} min-h-16 resize-none`} />
      ) : (
        <input value={value} inputMode={inputMode} required={required} onChange={(event) => onChange(event.target.value)} className={controlClass} />
      )}
    </label>
  );
}

export default SavedAddresses;
