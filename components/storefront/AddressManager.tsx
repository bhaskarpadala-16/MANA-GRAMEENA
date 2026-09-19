'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AddressDto,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  AddressInput,
} from '@/lib/actions/address';
import { AddressType } from '@prisma/client';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Star,
  Loader2,
  X,
  AlertCircle,
  Phone,
} from 'lucide-react';

interface AddressManagerProps {
  initialAddresses: AddressDto[];
}

export default function AddressManager({ initialAddresses }: AddressManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addresses, setAddresses] = useState<AddressDto[]>(initialAddresses);

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [addressType, setAddressType] = useState<AddressType>(AddressType.SHIPPING);
  const [isDefault, setIsDefault] = useState(false);

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setAddressLine1('');
    setAddressLine2('');
    setLandmark('');
    setCity('');
    setState('');
    setPostalCode('');
    setCountry('India');
    setAddressType(AddressType.SHIPPING);
    setIsDefault(false);
    setEditingAddressId(null);
    setShowForm(false);
    setErrorMessage(null);
  };

  const handleOpenEdit = (addr: AddressDto) => {
    setEditingAddressId(addr.id);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city);
    setState(addr.state);
    setPostalCode(addr.postalCode);
    setCountry(addr.country);
    setAddressType(addr.addressType);
    setIsDefault(addr.isDefault);
    setShowForm(true);
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: AddressInput = {
      fullName,
      phone,
      addressLine1,
      addressLine2: addressLine2.trim() ? addressLine2.trim() : null,
      landmark: landmark.trim() ? landmark.trim() : null,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    };

    startTransition(async () => {
      if (editingAddressId) {
        const res = await updateAddress(editingAddressId, payload);
        if (res.success && res.address) {
          setSuccessMessage('Delivery address successfully updated.');
          resetForm();
          router.refresh();
        } else {
          setErrorMessage(res.error || 'Failed to update address.');
        }
      } else {
        const res = await createAddress(payload);
        if (res.success && res.address) {
          setSuccessMessage('New delivery address saved.');
          resetForm();
          router.refresh();
        } else {
          setErrorMessage(res.error || 'Failed to create address.');
        }
      }
    });
  };

  const handleDelete = (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await deleteAddress(addressId);
      if (res.success) {
        setAddresses((prev) => prev.filter((a) => a.id !== addressId));
        setSuccessMessage('Address removed.');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to delete address.');
      }
    });
  };

  const handleSetDefault = (addressId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await setDefaultAddress(addressId);
      if (res.success) {
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            isDefault: a.id === addressId,
          }))
        );
        setSuccessMessage('Default delivery address updated.');
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Failed to set default address.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-herbal-700 font-medium">
          {addresses.length} saved location{addresses.length === 1 ? '' : 's'}
        </span>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Add New Address</span>
          </button>
        )}
      </div>

      {/* Inline Address Form Modal / Expandable Panel */}
      {showForm && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-md space-y-5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-cream-200 pb-4">
            <h3 className="font-serif text-lg font-bold text-herbal-950">
              {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-1.5 rounded-lg text-herbal-600 hover:bg-cream-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Bhaskar Padala"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-herbal-800 mb-1">
                House / Flat / Street Address *
              </label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Door no, Building name, Street name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">
                  Apartment / Suite / Area (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Locality, Colony"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Temple / School"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">
                  City / Town *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Rajahmundry"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Andhra Pradesh"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-herbal-800 mb-1">
                  Postal PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="6-digit PIN"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50 text-xs text-herbal-950 focus:outline-none focus:ring-2 focus:ring-herbal-700/30"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-herbal-900 font-medium">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-herbal-800 border-cream-400 focus:ring-herbal-700"
                />
                <span>Set as my default delivery address</span>
              </label>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl border border-cream-300 text-xs font-semibold text-herbal-800 hover:bg-cream-100 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-herbal-800 hover:bg-herbal-900 text-cream-100 text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAddressId ? 'Update Address' : 'Save Address'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Addresses Grid */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between space-y-4 transition-all ${
                addr.isDefault ? 'border-herbal-800 ring-2 ring-herbal-800/10' : 'border-cream-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-herbal-950">{addr.fullName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cream-100 text-herbal-700 uppercase">
                      {addr.addressType}
                    </span>
                  </div>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                      Default
                    </span>
                  )}
                </div>

                <div className="text-xs text-herbal-800/90 leading-relaxed space-y-0.5">
                  <p>{addr.addressLine1}</p>
                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                  {addr.landmark && <p className="text-herbal-600">Landmark: {addr.landmark}</p>}
                  <p>
                    {addr.city}, {addr.state} - {addr.postalCode}
                  </p>
                  <p className="text-herbal-600">{addr.country}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-herbal-700 pt-1">
                  <Phone className="w-3.5 h-3.5 text-herbal-600" />
                  <span>{addr.phone}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-cream-200 flex items-center justify-between text-xs">
                {!addr.isDefault ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={isPending}
                    className="text-herbal-700 hover:text-herbal-950 font-semibold transition-colors disabled:opacity-50"
                  >
                    Set as Default
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Primary Destination
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(addr)}
                    disabled={isPending}
                    className="p-2 rounded-xl text-herbal-700 hover:text-herbal-950 hover:bg-cream-100 transition-colors"
                    title="Edit address"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    disabled={isPending}
                    className="p-2 rounded-xl text-herbal-600 hover:text-terracotta-600 hover:bg-cream-100 transition-colors"
                    title="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-white rounded-3xl p-12 text-center border border-cream-300 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-cream-100 text-herbal-800 flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-bold text-herbal-950">
              No Saved Delivery Addresses
            </h3>
            <p className="text-xs text-herbal-800 leading-relaxed">
              Add your home or office address to enable fast, seamless 1-click checkout with Cash on Delivery or UPI.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-herbal-800 text-cream-100 text-xs font-semibold hover:bg-herbal-900 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 text-gold-400" />
                <span>Add Your First Address</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
