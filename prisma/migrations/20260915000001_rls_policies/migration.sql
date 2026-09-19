-- =========================================================================
-- MANA GRAMEENA — POSTGRESQL ROW LEVEL SECURITY (RLS) POLICIES
-- Phase 2 Database Security Layer
-- Enforces zero-trust data access across all 22 normalized models.
-- =========================================================================

-- Helper function for checking administrative roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$;

-- Helper function for checking super-administrative roles
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN'
  );
END;
$$;

-- Trigger to strictly prevent customer role escalation and unauthorized promotion
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'SUPER_ADMIN' AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only super administrators can create SUPER_ADMIN profiles';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user roles';
    END IF;
    IF (NEW.role = 'SUPER_ADMIN' OR OLD.role = 'SUPER_ADMIN') AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only super administrators can assign or revoke the SUPER_ADMIN role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Secure Execution Permissions: Revoke execution from PUBLIC and grant strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_escalation() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO authenticated;
  END IF;
  IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
    GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;
    GRANT EXECUTE ON FUNCTION public.prevent_profile_role_escalation() TO service_role;
  END IF;
END
$$;


-- 1. Profiles (1:1 with auth.users)
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON "profiles" FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update" ON "profiles" FOR UPDATE USING (auth.uid() = id OR public.is_admin()) WITH CHECK (
  (auth.uid() = id AND role = 'CUSTOMER') OR public.is_admin()
);
CREATE POLICY "profiles_insert" ON "profiles" FOR INSERT WITH CHECK (
  (auth.uid() = id AND role = 'CUSTOMER') OR public.is_admin()
);

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();

-- 2. Addresses
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses_all" ON "addresses" FOR ALL USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 3. Categories
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON "categories" FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "categories_admin" ON "categories" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Products
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select" ON "products" FOR SELECT USING (status = 'PUBLISHED' OR public.is_admin());
CREATE POLICY "products_admin" ON "products" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Product Images
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_images_select" ON "product_images" FOR SELECT USING (true);
CREATE POLICY "product_images_admin" ON "product_images" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Product Variants
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variants_select" ON "product_variants" FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "product_variants_admin" ON "product_variants" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Inventory
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_select" ON "inventory" FOR SELECT USING (true);
CREATE POLICY "inventory_admin" ON "inventory" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Inventory Transactions
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_transactions_admin" ON "inventory_transactions" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Carts
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carts_all" ON "carts" FOR ALL USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 10. Cart Items
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_items_all" ON "cart_items" FOR ALL USING (
  EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) OR public.is_admin()
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) OR public.is_admin()
);

-- 11. Wishlists
ALTER TABLE "wishlists" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlists_all" ON "wishlists" FOR ALL USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 12. Wishlist Items
ALTER TABLE "wishlist_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wishlist_items_all" ON "wishlist_items" FOR ALL USING (
  EXISTS (SELECT 1 FROM public.wishlists WHERE wishlists.id = wishlist_items.wishlist_id AND wishlists.user_id = auth.uid()) OR public.is_admin()
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.wishlists WHERE wishlists.id = wishlist_items.wishlist_id AND wishlists.user_id = auth.uid()) OR public.is_admin()
);

-- 13. Coupons
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_select" ON "coupons" FOR SELECT USING (
  (start_date <= now() AND expiry_date >= now()) OR public.is_admin()
);
CREATE POLICY "coupons_admin" ON "coupons" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 14. Coupon Usages
ALTER TABLE "coupon_usages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_usages_select" ON "coupon_usages" FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "coupon_usages_admin" ON "coupon_usages" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 15. Orders
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON "orders" FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "orders_admin" ON "orders" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 16. Order Items
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_select" ON "order_items" FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "order_items_admin" ON "order_items" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 17. Payments
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON "payments" FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = payments.order_id AND orders.user_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "payments_admin" ON "payments" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 18. Payment Proofs (Manual UPI)
ALTER TABLE "payment_proofs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_proofs_select" ON "payment_proofs" FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "payment_proofs_insert" ON "payment_proofs" FOR INSERT WITH CHECK (
  (
    auth.uid() = user_id
    AND review_status = 'UNDER_REVIEW'
    AND verified_by IS NULL
    AND verified_at IS NULL
    AND admin_notes IS NULL
    AND EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.orders o ON o.id = p.order_id
      WHERE p.id = payment_proofs.payment_id
        AND o.user_id = auth.uid()
    )
  )
  OR public.is_admin()
);
CREATE POLICY "payment_proofs_admin_update" ON "payment_proofs" FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 19. Shipments
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipments_select" ON "shipments" FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = shipments.order_id AND orders.user_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "shipments_admin" ON "shipments" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 20. Reviews
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select" ON "reviews" FOR SELECT USING (status = 'APPROVED' OR auth.uid() = user_id OR public.is_admin());
CREATE POLICY "reviews_insert" ON "reviews" FOR INSERT WITH CHECK (
  (
    auth.uid() = user_id 
    AND status = 'PENDING' 
    AND is_verified_purchase = false
    AND EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.user_id = auth.uid()
        AND oi.product_id = reviews.product_id
        AND o.order_status = 'DELIVERED'
    )
  )
  OR public.is_admin()
);
CREATE POLICY "reviews_admin" ON "reviews" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 21. Notifications
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_all" ON "notifications" FOR ALL USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 22. Admin Activity Logs
ALTER TABLE "admin_activity_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_activity_logs_admin" ON "admin_activity_logs" FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
