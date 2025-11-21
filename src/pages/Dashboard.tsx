import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const todayTransactions = transactions?.filter(t => 
    format(new Date(t.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ) || [];

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + Number(t.total_price), 0);
  const totalStock = products?.reduce((sum, p) => sum + p.stock, 0) || 0;

  const stats = [
    {
      title: "Omzet Hari Ini",
      value: `Rp ${todayRevenue.toLocaleString("id-ID")}`,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Transaksi Hari Ini",
      value: todayTransactions.length,
      icon: ShoppingBag,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Produk",
      value: products?.length || 0,
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Total Stok",
      value: totalStock,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Ringkasan aktivitas hari ini</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-soft hover:shadow-medium transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} rounded-lg p-2`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Transaksi Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions?.slice(0, 5).map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
              >
                <div>
                  <p className="font-medium">Transaksi #{transaction.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), "dd MMM yyyy HH:mm")}
                  </p>
                </div>
                <p className="font-semibold text-primary">
                  Rp {Number(transaction.total_price).toLocaleString("id-ID")}
                </p>
              </div>
            ))}
            {(!transactions || transactions.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Belum ada transaksi
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
