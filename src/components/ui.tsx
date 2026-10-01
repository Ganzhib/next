import {
  ArrowUpRight,
  Bookmark,
  FileText,
  Mic,
  Code2,
  Network,
  BriefcaseBusiness,
  Columns3,
  ChartNoAxesCombined,
  BookOpen,
  Box,
  Plus,
  X,
  Search,
  SlidersHorizontal,
  Check,
  type LucideIcon,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../app/context";
import { pricingLabels, type Product } from "../domain/models";
const icons: Record<string, LucideIcon> = {
  file: FileText,
  mic: Mic,
  code: Code2,
  network: Network,
  briefcase: BriefcaseBusiness,
  columns: Columns3,
  chart: ChartNoAxesCombined,
  book: BookOpen,
  box: Box,
};
export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const I = icons[name] ?? Box;
  return <I size={size} strokeWidth={1.65} />;
}
export function ProductIcon({
  product,
  large = false,
}: {
  product: Product;
  large?: boolean;
}) {
  return (
    <span
      className={`product-icon ${large ? "large" : ""}`}
      style={{ "--accent": product.accent } as React.CSSProperties}
    >
      {product.logo ? (
        <img src={product.logo} alt="" />
      ) : (
        <Icon name={product.icon} size={large ? 32 : 24} />
      )}
    </span>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="关闭">
              <X size={20} />
            </Dialog.Close>
          </div>
          <Dialog.Description className={description ? "muted" : "sr-only"}>
            {description ?? title}
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title = "暂时还没有内容",
  description = "试试调整筛选条件，发现更多适合你的产品。",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Box size={35} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  to,
  label = "查看全部",
}: {
  eyebrow?: string;
  title: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {to && (
        <Link className="text-link" to={to}>
          {label}
          <ArrowUpRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function ProductCard({
  product: p,
  placement = "catalog",
  position = 0,
}: {
  product: Product;
  placement?: string;
  position?: number;
}) {
  const { favorite, profile, compare, toggleCompare, track, taxonomies } =
    useApp();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    const observer = new IntersectionObserver(
      ([e]) => {
        clearTimeout(timer);
        if (e.intersectionRatio >= 0.5 && !sent)
          timer = setTimeout(() => {
            sent = true;
            void track("product_impression", {
              productId: p.id,
              placement,
              position,
            });
          }, 1000);
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [p.id, placement, position, track]);
  return (
    <article className="product-card" ref={ref}>
      <div className="product-card-top">
        <ProductIcon product={p} />
        <button
          className={`icon-button favorite ${profile.favorites.includes(p.id) ? "active" : ""}`}
          aria-label={`收藏 ${p.name}`}
          onClick={() => void favorite(p.id)}
        >
          <Bookmark size={19} />
        </button>
      </div>
      <Link
        to={
          p.detailEnabled
            ? `/products/${p.slug}`
            : `/go/${p.slug}?placement=${encodeURIComponent(placement)}`
        }
        className="card-name"
        onClick={() =>
          void track("product_card_clicked", {
            productId: p.id,
            placement,
            position,
          })
        }
      >
        <h3>{p.name}</h3>
        <ArrowUpRight size={18} />
      </Link>
      <p>{p.tagline}</p>
      <div className="tag-list">
        {p.tags.slice(0, 2).map((t) => (
          <span key={t}>{t}</span>
        ))}
        {p.demo && <span className="demo-badge">演示</span>}
      </div>
      <div className="product-card-bottom">
        <span>
          {pricingLabels[p.pricing]}
          <i />{" "}
          {taxonomies.find((t) => t.id === p.category)?.name ?? p.category}
        </span>
        <button
          className={`compare-button ${compare.includes(p.id) ? "active" : ""}`}
          onClick={() => toggleCompare(p.id)}
          aria-label={`对比 ${p.name}`}
        >
          {compare.includes(p.id) ? <Check size={14} /> : <Plus size={14} />}
          对比
        </button>
      </div>
    </article>
  );
}
export function SearchInput({
  value,
  onChange,
  placeholder = "搜索产品、用途或关键词…",
}: {
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-field">
      <Search size={20} />
      <input
        aria-label="搜索产品"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value ? (
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange("")}
          aria-label="清除搜索"
        >
          <X size={16} />
        </button>
      ) : (
        <kbd>⌘ K</kbd>
      )}
    </div>
  );
}
export { ArrowUpRight, Bookmark, Plus, X, Search, SlidersHorizontal, Check };
