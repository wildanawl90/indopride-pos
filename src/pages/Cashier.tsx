import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, ShoppingCart, Receipt, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BarcodeScanner from "@/components/BarcodeScanner";

interface CartItem {
  product: any;
  quantity: number;
}

interface TransactionWithItems {
  transaction: any;
  items: CartItem[];
}

export default function Cashier() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionWithItems | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const { data: transaction, error: transError } = await supabase
        .from("transactions")
        .insert([transactionData])
        .select()
        .single();
      
      if (transError) throw transError;

      const items = cart.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from("transaction_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setLastTransaction({
        transaction: data,
        items: [...cart]
      });
      setShowReceipt(true);
      setCart([]);
      setTax(0);
      setDiscount(0);
      setPaid("");
      toast({ title: "Transaksi berhasil!" });
    },
  });

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      } else {
        toast({ title: "Stok tidak cukup", variant: "destructive" });
      }
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + change;
          if (newQuantity <= 0) return item;
          if (newQuantity > item.product.stock) {
            toast({ title: "Stok tidak cukup", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );
  const total = subtotal + tax - discount;
  const change = parseFloat(paid) - total;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Keranjang kosong", variant: "destructive" });
      return;
    }

    if (!paid || parseFloat(paid) < total) {
      toast({ title: "Pembayaran tidak cukup", variant: "destructive" });
      return;
    }

    createTransactionMutation.mutate({
      total_price: total,
      tax,
      discount,
      paid: parseFloat(paid),
      change: change >= 0 ? change : 0,
    });
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products?.find((p) => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast({ 
        title: "Produk ditambahkan", 
        description: `${product.name} berhasil ditambahkan ke keranjang` 
      });
    } else {
      toast({ 
        title: "Produk tidak ditemukan", 
        description: `Barcode ${barcode} tidak terdaftar`,
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 animate-fade-in">
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Kasir</h2>
            <p className="text-muted-foreground">Pilih produk untuk ditambahkan ke keranjang</p>
          </div>
          <BarcodeScanner onScanSuccess={handleBarcodeScanned} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {products?.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer shadow-soft hover:shadow-medium transition-all"
              onClick={() => addToCart(product)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{product.category}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">
                    Rp {Number(product.price).toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm text-muted-foreground">Stok: {product.stock}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Card className="shadow-medium sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Keranjang Belanja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between border-b border-border pb-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Rp {Number(item.product.price).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Keranjang kosong</p>
              )}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <Label htmlFor="tax">Pajak (Rp)</Label>
                <Input
                  id="tax"
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="discount">Diskon (Rp)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pajak</span>
                <span className="font-medium">Rp {tax.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diskon</span>
                <span className="font-medium">- Rp {discount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total</span>
                <span className="text-primary">Rp {total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="paid">Dibayar (Rp)</Label>
              <Input
                id="paid"
                type="number"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0"
              />
              {paid && parseFloat(paid) >= total && (
                <p className="mt-2 text-sm font-medium text-success">
                  Kembalian: Rp {change.toLocaleString("id-ID")}
                </p>
              )}
            </div>

            <Button
              onClick={handleCheckout}
              className="w-full"
              disabled={cart.length === 0}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Bayar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Struk Pembayaran</DialogTitle>
          </DialogHeader>
          {lastTransaction && (
            <div id="receipt-content">
              <div className="space-y-4 text-sm">
                <div className="text-center border-b border-border pb-4">
                  <h3 className="font-bold text-lg">IndoPride POS</h3>
                  <p className="text-xs text-muted-foreground">Apotek Terpercaya</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(lastTransaction.transaction.created_at).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold border-b border-border pb-1">Detail Pembelian:</p>
                  {lastTransaction.items.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.product.name}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pl-2">
                        <span>{item.quantity} x Rp {Number(item.product.price).toLocaleString("id-ID")}</span>
                        <span className="font-medium">Rp {(item.quantity * Number(item.product.price)).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 border-t border-border pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>Rp {lastTransaction.items.reduce((sum, item) => sum + (item.quantity * Number(item.product.price)), 0).toLocaleString("id-ID")}</span>
                  </div>
                  {lastTransaction.transaction.tax > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Pajak</span>
                      <span>Rp {Number(lastTransaction.transaction.tax).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  {lastTransaction.transaction.discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Diskon</span>
                      <span>- Rp {Number(lastTransaction.transaction.discount).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-border pt-2">
                    <span>Total</span>
                    <span>Rp {Number(lastTransaction.transaction.total_price).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dibayar</span>
                    <span>Rp {Number(lastTransaction.transaction.paid).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-success">
                    <span>Kembalian</span>
                    <span>Rp {Number(lastTransaction.transaction.change).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
                  <p>Terima kasih atas kunjungan Anda!</p>
                  <p className="mt-1">Semoga lekas sembuh</p>
                </div>
              </div>
              
              <div className="mt-4 print:hidden">
                <Button onClick={handlePrintReceipt} className="w-full gap-2">
                  <Printer className="h-4 w-4" />
                  Cetak Struk
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10mm;
            font-size: 12px;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
