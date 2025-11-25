import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    image: "",
    dosis: "",
    expired_date: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("products").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk berhasil ditambahkan" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("products").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk berhasil diupdate" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produk berhasil dihapus" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", category: "", price: "", stock: "", image: "", dosis: "", expired_date: "" });
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      image: product.image || "",
      dosis: product.dosis || "",
      expired_date: product.expired_date || "",
    });
    setIsDialogOpen(true);
  };

  const filteredProducts = products?.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(products?.map((p) => p.category) || [])];

  const isExpiringSoon = (expiredDate: string | null) => {
    if (!expiredDate) return false;
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return new Date(expiredDate) <= threeMonthsFromNow;
  };

  const handleExportToExcel = () => {
    if (!products || products.length === 0) {
      toast({ 
        title: "Tidak ada data untuk diekspor",
        variant: "destructive" 
      });
      return;
    }

    // Format data untuk Excel
    const excelData = products.map((product, index) => ({
      No: index + 1,
      "Nama Produk": product.name,
      Kategori: product.category,
      "Harga (Rp)": product.price,
      Stok: product.stock,
      Dosis: product.dosis || "-",
      "Tanggal Kadaluarsa": product.expired_date 
        ? new Date(product.expired_date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : "-",
      Status: product.stock < 10 
        ? "Stok Rendah" 
        : isExpiringSoon(product.expired_date) 
        ? "Segera Expired" 
        : "Normal",
    }));

    // Buat worksheet dan workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Stok Obat");

    // Set column widths
    const columnWidths = [
      { wch: 5 },  // No
      { wch: 30 }, // Nama Produk
      { wch: 20 }, // Kategori
      { wch: 15 }, // Harga
      { wch: 10 }, // Stok
      { wch: 25 }, // Dosis
      { wch: 25 }, // Tanggal Kadaluarsa
      { wch: 15 }, // Status
    ];
    worksheet["!cols"] = columnWidths;

    // Generate file dengan timestamp
    const date = new Date().toISOString().split("T")[0];
    const filename = `Laporan_Stok_Obat_${date}.xlsx`;
    
    // Download file
    XLSX.writeFile(workbook, filename);
    
    toast({ 
      title: "Laporan berhasil diexport",
      description: `File ${filename} telah diunduh` 
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manajemen Produk</h2>
          <p className="text-muted-foreground">Kelola produk Anda</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Produk
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Produk</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Kategori</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Harga</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stok</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="dosis">Dosis</Label>
                <Input
                  id="dosis"
                  value={formData.dosis}
                  onChange={(e) => setFormData({ ...formData, dosis: e.target.value })}
                  placeholder="Contoh: 3x1 tablet/hari"
                />
              </div>
              <div>
                <Label htmlFor="expired_date">Tanggal Kadaluarsa</Label>
                <Input
                  id="expired_date"
                  type="date"
                  value={formData.expired_date}
                  onChange={(e) => setFormData({ ...formData, expired_date: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingProduct ? "Update Produk" : "Tambah Produk"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          filteredProducts?.map((product) => (
            <Card key={product.id} className="shadow-soft hover:shadow-medium transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                  {isExpiringSoon(product.expired_date) && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Segera Expired
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Harga</p>
                      <p className="text-xl font-bold text-primary">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Stok</p>
                      <p className={`text-xl font-bold ${product.stock < 10 ? "text-destructive" : "text-success"}`}>
                        {product.stock}
                      </p>
                    </div>
                  </div>
                  {product.dosis && (
                    <div>
                      <p className="text-sm text-muted-foreground">Dosis</p>
                      <p className="text-sm font-medium">{product.dosis}</p>
                    </div>
                  )}
                  {product.expired_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Kadaluarsa</p>
                      <p className="text-sm font-medium">
                        {new Date(product.expired_date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
