import { useMemo, useState } from 'react';
import type { ReviewCategory, SelectedLineItem } from '../../types';
import { config } from '../../data/catalog';
import { useBundleStore } from '../../store/bundleStore';
import {
  groupByCategory,
  resolveLineProduct,
  selectedLineItems,
} from '../../utils/selectors';
import { computeTotals, formatMoney } from '../../utils/pricing';
import { PriceDisplay } from '../common/PriceDisplay';
import { Toast } from '../common/Toast';
import { ReviewItem } from './ReviewItem';
import { CheckoutDialog } from './CheckoutDialog';
import styles from './ReviewPanel.module.css';

const GROUP_LABELS: Record<ReviewCategory, string> = {
  cameras: 'Cameras',
  sensors: 'Sensors',
  accessories: 'Accessories',
  plan: 'Plan',
};

/** Splits "Cam Unlimited" into dark + purple segments as styled in the design. */
function PlanName({ title }: { title: string }) {
  const [first, ...rest] = title.split(' ');
  return (
    <span className={styles.planName}>
      <strong>{first}</strong>
      {rest.length > 0 && <em> {rest.join(' ')}</em>}
    </span>
  );
}

function PlanRow({ item }: { item: SelectedLineItem }) {
  return (
    <div className={styles.planRow}>
      {/* Supplied Wyze shield logo displayed before the plan name. */}
      <img
        className={styles.planLogo}
        src="/assets/review/cam-unlimited-logo.png"
        alt=""
        aria-hidden
      />
      <PlanName title={item.product.title} />
      <PriceDisplay
        price={item.lineTotal}
        originalPrice={item.lineOriginalTotal}
        priceNote={item.product.priceNote}
        context="review"
      />
    </div>
  );
}

export function ReviewPanel() {
  const quantities = useBundleStore((s) => s.quantities);
  const saveSystem = useBundleStore((s) => s.saveSystem);

  const [toast, setToast] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const items = useMemo(() => selectedLineItems(quantities), [quantities]);
  const groups = useMemo(() => groupByCategory(items), [items]);
  const totals = useMemo(
    () => computeTotals(quantities, resolveLineProduct),
    [quantities],
  );

  // Variant names are appended only when a product has several variants
  // selected at once (the initial design state shows plain product names).
  const multiVariantProducts = useMemo(() => {
    const perProduct = new Map<string, number>();
    for (const item of items) {
      perProduct.set(item.product.id, (perProduct.get(item.product.id) ?? 0) + 1);
    }
    return new Set(
      [...perProduct.entries()].filter(([, lines]) => lines > 1).map(([id]) => id),
    );
  }, [items]);

  const handleSave = () => {
    const ok = saveSystem();
    setToast(
      ok
        ? 'Your system has been saved for later.'
        : 'Saving failed — storage is unavailable in this browser.',
    );
  };

  const { shipping, financingLabel } = config;

  return (
    <section className={styles.panel} aria-label="Your security system review">
      <p className={styles.eyebrow}>REVIEW</p>
      <h2 className={styles.title}>Your security system</h2>
      <p className={styles.subtitle}>
        Review your personalized protection system designed to keep what matters most
        safe.
      </p>

      <div className={styles.columns}>
        <div className={styles.itemsColumn}>
          {groups.map((group) => (
            <div key={group.category} className={styles.group}>
              <p className={styles.groupLabel}>
                {group.category === 'plan' ? (
                  <>
                    <span className={styles.planLabelDefault}>{GROUP_LABELS.plan}</span>
                    <span className={styles.planLabelMobile}>Home Monitoring Plan</span>
                  </>
                ) : (
                  GROUP_LABELS[group.category]
                )}
              </p>
              {group.items.map((item) =>
                group.category === 'plan' ? (
                  <PlanRow key={item.lineItemId} item={item} />
                ) : (
                  <ReviewItem
                    key={item.lineItemId}
                    item={item}
                    disambiguateVariant={multiVariantProducts.has(item.product.id)}
                  />
                ),
              )}
            </div>
          ))}

          <div className={styles.shippingRow}>
            <span className={styles.shippingIcon}>
              <img
                className={styles.shippingIconImg}
                src="/assets/review/fast-shipping.png"
                alt=""
                aria-hidden
              />
            </span>
            <span className={styles.shippingLabel}>{shipping.label}</span>
            <PriceDisplay
              price={shipping.price}
              originalPrice={shipping.originalPrice}
              context="review"
              freeLabel
            />
          </div>
        </div>

        <div className={styles.checkoutColumn}>
          <div className={styles.sealRow}>
            <img
              className={styles.seal}
              src="/assets/badges/satisfaction-guarantee.png"
              alt="100% Wyze satisfaction guarantee — try worry-free for 30 days"
            />
            <div className={styles.returnsCopy}>
              <h3>30-day hassle-free returns</h3>
              <p>
                If you&apos;re not totally in love with the product, we will refund you
                100%.
              </p>
            </div>
            <div className={styles.totalsBlock}>
              <span className={styles.financingPill}>{financingLabel}</span>
              <p className={styles.grandTotal}>
                {totals.savings > 0 && (
                  <s className={styles.grandOriginal}>
                    {formatMoney(totals.originalTotal)}
                  </s>
                )}
                <strong className={styles.grandCurrent}>
                  {formatMoney(totals.currentTotal)}
                </strong>
              </p>
            </div>
          </div>

          {totals.savings > 0 && (
            <p className={styles.congrats}>
              Congrats! You&apos;re saving {formatMoney(totals.savings)} on your security
              bundle!
            </p>
          )}

          <button
            type="button"
            className={styles.checkoutButton}
            onClick={() => setCheckoutOpen(true)}
          >
            Checkout
          </button>
          <button type="button" className={styles.saveLink} onClick={handleSave}>
            Save my system for later
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      {checkoutOpen && (
        <CheckoutDialog
          total={totals.currentTotal}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </section>
  );
}
