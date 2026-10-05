import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, MapPin, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "../components/ui/button";
import { addressService, type Address, type AddressPayload } from "../services/addressService";
import { sessionService } from "../services/sessionService";
import { PageSkeleton } from "../components/PageSkeleton";
import { AddressFormModal } from "../components/AddressFormModal";
import { AddressForm } from "../components/AddressForm";
import { toast } from "../components/toastApi";
import { INVALID_MOBILE_MESSAGE, isValidIndianMobile } from "../lib/phone";
import { AccountPageHeader } from "../components/AccountPageHeader";
import { ACCOUNT_PAGE_CONTAINER, ACCOUNT_PAGE_MAIN } from "../lib/accountLayout";


const emptyAddressForm = (userId: number, mobileNumber: number, customerName = ""): AddressPayload => ({
  userid: userId,
  name: customerName,
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
  // Prefill the name on new addresses from the profile; it stays editable.
  const storedCustomerName = [user?.firstname?.trim(), user?.lastname?.trim()].filter(Boolean).join(" ");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressPayload>(() =>
    emptyAddressForm(user?.id ?? 0, Number(user?.usermobilenumber ?? 0), storedCustomerName)
  );

  const addressesQuery = useQuery({
    queryKey: ["addresses", userId],
    queryFn: () => addressService.list(userId!),
    enabled: Boolean(userId),
  });

  const addresses = addressesQuery.data?.data ?? [];

  useEffect(() => {
    if (userId) {
      setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
    }
  }, [storedCustomerName, userId, userMobile]);

  useEffect(() => {
    if (addresses.length === 0 && !addressesQuery.isLoading) {
      setShowAddressForm(true);
    }
  }, [addresses.length, addressesQuery.isLoading]);


  const resetForm = () => {
    if (userId) {
      setAddressForm(emptyAddressForm(userId, userMobile, storedCustomerName));
    }
    setEditingAddressId(null);
  };

  const createAddressMutation = useMutation({
    mutationFn: (payload: AddressPayload) => addressService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      resetForm();
      setShowAddressForm(false);
      toast.success("Address saved.");
    },
    onError: () => {
      toast.error("Could not save this address. Please check the details and try again.");
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ addressId, payload }: { addressId: number; payload: AddressPayload }) =>
      addressService.update(addressId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses", userId] });
      resetForm();
      setShowAddressForm(false);
      toast.success("Address updated.");
    },
    onError: () => {
      toast.error("Could not update this address. Please try again.");
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
      toast.success("Address deleted.");
    },
    onError: (error) => {
      toast.error(addressErrorMessage(error, "Could not delete this address. Please try again."));
    },
  });

  const handleAddressSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) return;

    if (!addressForm.name.trim() || !addressForm.address.trim() || !addressForm.city.trim() || !addressForm.state.trim()) {
      toast.error("Please fill the required address fields.");
      return;
    }

    if (!isValidIndianMobile(String(addressForm.mobilenumber))) {
      toast.error(INVALID_MOBILE_MESSAGE);
      return;
    }
    if (String(addressForm.pincode).length !== 6) {
      toast.error("Please enter a valid 6-digit pincode.");
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
      <main className={ACCOUNT_PAGE_MAIN}>
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
    <main className={ACCOUNT_PAGE_MAIN}>
      <section className={ACCOUNT_PAGE_CONTAINER}>
        <AccountPageHeader
          currentPage="Saved Addresses"
          title="Saved Addresses"
          subtitle="Add, edit, and delete your delivery addresses."
          action={
          <Button
            className="gap-2"
            onClick={() => {
              resetForm();
              setShowAddressForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Address
          </Button>
          }
        />


        <section className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          {addressesQuery.isLoading ? (
            <PageSkeleton variant="addresses" count={4} hideHeader />
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
            <AddressFormModal
              open={showAddressForm}
              title={editingAddressId ? "Edit address" : "Add new address"}
              onClose={() => {
                resetForm();
                setShowAddressForm(addresses.length === 0);
              }}
            >
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
            </AddressFormModal>
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

export default SavedAddresses;
