import { useState, useEffect } from "react";
import {
  Package,
  Tag,
  AlertTriangle,
  DollarSign,
  Calendar,
  ShoppingCart,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";
import { API_URL } from "@/lib/api";

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  loading,
  highlight,
}) => (
  <Card className="relative overflow-hidden rounded-xl">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <div className="rounded-full bg-primary/10 p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <>
          <div
            className={`text-3xl font-bold ${highlight ? "text-destructive" : ""}`}
          >
            {value}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </>
      )}
    </CardContent>
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
  </Card>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { totalProducts: 0, totalCategories: 0, lowStock: 0, todaySales: 0 },
    recentSales: [],
    lowStockProducts: [],
  });

  useEffect(() => {
    axios
      .get(`${API_URL}/products/dashboard-stats`, { withCredentials: true })
      .then((r) => {
        if (r.data.success) setData(r.data);
      })
      .catch((err) => console.error("Dashboard error:", err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "N/A";

  return (
    <main className="overflow-y-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-muted-foreground text-sm">
            GT Electricals POS Overview
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          <Calendar className="inline-block h-4 w-4 mr-1" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Products"
          value={data.stats.totalProducts}
          icon={Package}
          description="Active products"
          loading={loading}
        />
        <StatCard
          title="Categories"
          value={data.stats.totalCategories}
          icon={Tag}
          description="Product categories"
          loading={loading}
        />
        <StatCard
          title="Low Stock"
          value={data.stats.lowStock}
          icon={AlertTriangle}
          description="Below reorder level"
          loading={loading}
          highlight={data.stats.lowStock > 0}
        />
        <StatCard
          title="Today's Sales"
          value={`Rs. ${Number(data.stats.todaySales).toLocaleString()}`}
          icon={DollarSign}
          description="Total revenue today"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Recent Sales
            </CardTitle>
            <CardDescription>Last 5 transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sales yet today
              </p>
            ) : (
              <div className="divide-y">
                {data.recentSales.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {s.invoice_no || `#${s.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.customer_name} · {formatDate(s.sale_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        Rs. {Number(s.final_amount).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {s.payment_method}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock
              Alerts
            </CardTitle>
            <CardDescription>
              Products at or below reorder level
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All products are well stocked
              </p>
            ) : (
              <div className="divide-y">
                {data.lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {p.sku}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-destructive">
                        {p.stock_quantity} left
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reorder at {p.reorder_level}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
