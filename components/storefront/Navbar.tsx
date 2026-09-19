'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Leaf,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Search,
} from 'lucide-react';

interface NavbarProps {
  cartCount?: number;
  wishlistCount?: number;
  user?: {
    firstName: string;
    role: string;
  } | null;
}

export default function Navbar({ cartCount = 0, wishlistCount = 0, user }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  const navLinks = [
    { href: '/products', label: 'All Products' },
    { href: '/categories', label: 'Categories' },
    { href: '/about', label: 'Our Heritage' },
    { href: '/contact', label: 'Contact' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-herbal-950 text-cream-100 text-xs py-2 px-4 text-center font-medium tracking-wide">
        Handmade in small batches • 100% chemical-free herbal wellness essentials • Free delivery on orders above ₹999
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-40 bg-cream-100/95 backdrop-blur-md border-b border-cream-300 transition-all shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl text-herbal-900 hover:bg-cream-200 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-herbal-800 flex items-center justify-center text-cream-100 shadow-md group-hover:bg-herbal-700 transition-colors">
              <Leaf className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-herbal-950 block leading-none">
                Mana Grameena
              </span>
              <span className="text-[10px] tracking-widest text-terracotta-600 uppercase font-semibold block mt-1">
                Rural Herbal Heritage
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-herbal-900">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors py-1 relative ${
                    isActive
                      ? 'text-herbal-950 font-bold'
                      : 'text-herbal-800 hover:text-terracotta-600'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-herbal-800 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2.5 rounded-full text-herbal-900 hover:bg-cream-200 transition-colors"
              title="Search Products"
              aria-label="Search Products"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist Link */}
            <Link
              href="/account/wishlist"
              className="p-2.5 rounded-full text-herbal-900 hover:bg-cream-200 transition-colors relative"
              title="My Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-terracotta-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link */}
            <Link
              href="/cart"
              className="p-2.5 rounded-full text-herbal-900 hover:bg-cream-200 transition-colors relative"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-herbal-800 text-gold-400 text-[10px] font-bold flex items-center justify-center shadow">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* User Account / Sign In */}
            <Link
              href="/account"
              className="p-2 rounded-full text-herbal-900 hover:bg-cream-200 transition-colors flex items-center gap-2"
              title={user ? `Signed in as ${user.firstName}` : 'Account / Login'}
            >
              <div className="w-8 h-8 rounded-full bg-cream-200 text-herbal-900 flex items-center justify-center font-semibold text-xs border border-cream-300">
                {user ? user.firstName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            </Link>
          </div>
        </div>

        {/* Expandable Search Dropdown */}
        {searchOpen && (
          <div className="border-t border-cream-300 bg-white py-3 px-4 sm:px-6 shadow-inner animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-herbal-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search homemade oils, powders, honey, skincare..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-cream-300 focus:outline-none focus:ring-2 focus:ring-herbal-800 focus:border-transparent bg-cream-50"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-herbal-900 text-cream-100 rounded-xl text-xs font-semibold hover:bg-herbal-800 transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-herbal-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-cream-100 p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-cream-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-herbal-800 flex items-center justify-center text-cream-100">
                    <Leaf className="w-4 h-4 text-gold-400" />
                  </div>
                  <span className="font-serif text-lg font-bold text-herbal-950">
                    Mana Grameena
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-herbal-800 hover:bg-cream-200"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-herbal-700 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-cream-300 bg-white"
                />
              </form>

              {/* Mobile Nav Links */}
              <nav className="flex flex-col space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl text-sm font-semibold text-herbal-950 hover:bg-cream-200 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Mobile Footer Links */}
            <div className="pt-6 border-t border-cream-300 space-y-3">
              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white border border-cream-300 text-xs font-semibold text-herbal-950"
              >
                <User className="w-4 h-4 text-herbal-800" />
                <span>{user ? `Account (${user.firstName})` : 'Customer Sign In'}</span>
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-herbal-900 text-cream-100 text-xs font-semibold"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-gold-400" />
                  <span>My Cart</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-herbal-800 text-[10px]">
                  {cartCount} items
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
