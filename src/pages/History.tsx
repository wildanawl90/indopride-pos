import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function History() {
  const [dateFilter, setDateFilter] = useState("");

  const { data: transactions } = useQuery({
    queryKey: ["transactions-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_items (
            *,
            products (*)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredTransactions = transactions?.filter((t) => {
    if (!dateFilter) return true;
    return format(new Date(t.created_at), "yyyy-MM-dd") === dateFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">History Transaksi</h2>
          <p className="text-muted-foreground">Riwayat semua transaksi</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
          />
          {dateFilter && (
            <Button variant="outline" onClick={() => setDateFilter("")}>
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTransactions?.map((transaction) => (
          <Card key={transaction.id} className="shadow-soft hover:shadow-medium transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Transaksi #{transaction.id.slice(0, 8)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(transaction.created_at), "dd MMM yyyy HH:mm")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-primary">
                    Rp {Number(transaction.total_price).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Lihat Detail
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Detail Transaksi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border-b border-border pb-4">
                      <p className="text-sm text-muted-foreground">ID Transaksi</p>
                      <p className="font-medium">{transaction.id}</p>
                      <p className="text-sm text-muted-foreground mt-2">Tanggal</p>
                      <p className="font-medium">
                        {format(new Date(transaction.created_at), "dd MMMM yyyy HH:mm")}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Item yang dibeli:</h4>
                      <div className="space-y-2">
                        {transaction.transaction_items?.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between border-b border-border pb-2"
                          >
                            <div>
                              <p className="font-medium">{item.products.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} x Rp {Number(item.price).toLocaleString("id-ID")}
                              </p>
                            </div>
                            <p className="font-semibold">
                              Rp {(item.quantity * Number(item.price)).toLocaleString("id-ID")}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pajak</span>
                        <span>Rp {Number(transaction.tax).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Diskon</span>
                        <span>- Rp {Number(transaction.discount).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-border pt-2">
                        <span>Total</span>
                        <span className="text-primary">
                          Rp {Number(transaction.total_price).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dibayar</span>
                        <span>Rp {Number(transaction.paid).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-success">
                        <span>Kembalian</span>
                        <span>Rp {Number(transaction.change).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}

        {(!filteredTransactions || filteredTransactions.length === 0) && (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                {dateFilter ? "Tidak ada transaksi pada tanggal ini" : "Belum ada transaksi"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
