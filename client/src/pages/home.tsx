import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Home as HomeIcon,
  Plus,
  Trash2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Receipt,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import type { Record } from "@shared/schema";

const formSchema = z.object({
  item: z.string().min(1, "請填寫消費項目"),
  amount: z.coerce.number().positive("金額必須大於 0"),
  paidBy: z.enum(["胡", "詹"]),
  splitMode: z.enum(["均分", "只有胡", "只有詹"]),
});

type FormValues = z.infer<typeof formSchema>;

function computeBalance(records: Record[]): number {
  let net = 0;
  for (const r of records) {
    let shareMe = 0;
    let shareRoommate = 0;
    if (r.splitMode === "均分") {
      shareMe = r.amount / 2;
      shareRoommate = r.amount / 2;
    } else if (r.splitMode === "只有胡") {
      shareMe = r.amount;
      shareRoommate = 0;
    } else {
      shareMe = 0;
      shareRoommate = r.amount;
    }
    if (r.paidBy === "胡") {
      net += shareRoommate;
    } else {
      net -= shareMe;
    }
  }
  return net;
}

function splitLabel(mode: string) {
  if (mode === "均分") return "各付一半";
  if (mode === "只有胡") return "胡全付";
  return "詹全付";
}

export default function Home() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item: "",
      amount: undefined as any,
      paidBy: "胡",
      splitMode: "均分",
    },
  });

  const { data: records = [], isLoading } = useQuery<Record[]>({
    queryKey: ["/api/records"],
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      apiRequest("POST", "/api/records", {
        id: crypto.randomUUID(),
        date: format(new Date(), "yyyy-MM-dd"),
        ...values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      form.reset({ item: "", amount: undefined as any, paidBy: "胡", splitMode: "均分" });
      toast({ title: "已記帳", description: "新增消費紀錄成功" });
    },
    onError: () => toast({ title: "錯誤", description: "新增失敗，請再試一次", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      toast({ title: "已刪除", description: "紀錄已移除" });
    },
    onError: () => toast({ title: "錯誤", description: "刪除失敗", variant: "destructive" }),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/records"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/records"] });
      toast({ title: "已清空", description: "所有記帳紀錄已清除" });
    },
    onError: () => toast({ title: "錯誤", description: "清空失敗", variant: "destructive" }),
  });

  const onSubmit = (values: FormValues) => createMutation.mutate(values);

  const balance = computeBalance(records);
  const paidByVal = form.watch("paidBy");
  const splitModeVal = form.watch("splitMode");

  return (
    <div className="min-h-screen bg-background pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <HomeIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">記帳本</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{records.length} 筆</span>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Balance Card */}
        <BalanceCard balance={balance} isLoading={isLoading} recordCount={records.length} />

        {/* Add Expense Form */}
        <Card className="border border-card-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                新增消費
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowForm((v) => !v)}
                data-testid="button-toggle-form"
                className="h-8 w-8 text-muted-foreground"
              >
                {showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>

          {showForm && (
            <CardContent className="pt-0">
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-sm font-medium">總金額 (NT$)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    min={0}
                    step={1}
                    data-testid="input-amount"
                    {...form.register("amount")}
                    className="h-9"
                  />
                  {form.formState.errors.amount && (
                    <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                  )}
                </div>

                {/* Item */}
                <div className="space-y-1.5">
                  <Label htmlFor="item" className="text-sm font-medium">消費項目</Label>
                  <Input
                    id="item"
                    type="text"
                    placeholder="例如：晚餐、衛生紙、電費"
                    data-testid="input-item"
                    {...form.register("item")}
                    className="h-9"
                  />
                  {form.formState.errors.item && (
                    <p className="text-xs text-destructive">{form.formState.errors.item.message}</p>
                  )}
                </div>

                {/* Paid By */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">誰先付錢？</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["胡", "詹"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        data-testid={`button-paidby-${option}`}
                        onClick={() => form.setValue("paidBy", option)}
                        className={`
                          relative h-10 rounded-md border text-sm font-medium transition-colors
                          ${paidByVal === option
                            ? "bg-primary text-primary-foreground border-primary-border"
                            : "bg-secondary text-secondary-foreground border-transparent hover-elevate"
                          }
                        `}
                      >
                        {option === "胡" ? "胡付的" : "詹付的"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Split Mode */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">怎麼分攤？</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["均分", "只有胡", "只有詹"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        data-testid={`button-split-${option}`}
                        onClick={() => form.setValue("splitMode", option)}
                        className={`
                          relative h-10 rounded-md border text-xs font-medium transition-colors
                          ${splitModeVal === option
                            ? "bg-primary text-primary-foreground border-primary-border"
                            : "bg-secondary text-secondary-foreground border-transparent hover-elevate"
                          }
                        `}
                      >
                        {option === "均分" ? "各付一半" : option === "只有胡" ? "只算胡的" : "只算詹的"}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? "記帳中..." : "記起來"}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>

        {/* History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              歷史紀錄
            </h2>
            {records.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground gap-1.5"
                    data-testid="button-clear-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    清空全部
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確定要清空所有紀錄嗎？</AlertDialogTitle>
                    <AlertDialogDescription>
                      這個動作無法還原，所有的消費紀錄都將被永久刪除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                      data-testid="button-confirm-clear"
                    >
                      確定清空
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {isLoading ? (
            <RecordSkeletons />
          ) : records.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <RecordItem
                  key={record.id}
                  record={record}
                  onDelete={() => deleteMutation.mutate(record.id)}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables === record.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function BalanceCard({ balance, isLoading, recordCount }: { balance: number; isLoading: boolean; recordCount: number }) {
  const isPositive = balance > 0;
  const isNeutral = balance === 0;

  return (
    <Card
      className={`border shadow-md overflow-hidden ${
        isNeutral
          ? "border-card-border"
          : isPositive
          ? "border-emerald-200 dark:border-emerald-800"
          : "border-rose-200 dark:border-rose-800"
      }`}
    >
      <div
        className={`h-1.5 w-full ${
          isNeutral
            ? "bg-primary"
            : isPositive
            ? "bg-emerald-500"
            : "bg-rose-500"
        }`}
      />
      <CardContent className="pt-5 pb-5">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-10 w-48 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        ) : isNeutral ? (
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 flex-shrink-0"
            >
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">目前結算</p>
              <p className="text-2xl font-bold text-foreground">帳目已清</p>
              {recordCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">共 {recordCount} 筆消費</p>
              )}
            </div>
          </div>
        ) : isPositive ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">目前結算</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">詹欠胡</span>
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  NT$ {balance.toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">共 {recordCount} 筆消費</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-rose-100 dark:bg-rose-900/30 flex-shrink-0">
              <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">目前結算</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">胡欠詹</span>
                <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                  NT$ {Math.abs(balance).toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">共 {recordCount} 筆消費</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecordItem({
  record,
  onDelete,
  isDeleting,
}: {
  record: Record;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isHu = record.paidBy === "胡";

  return (
    <Card
      className="border border-card-border shadow-xs hover-elevate"
      data-testid={`card-record-${record.id}`}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Paid-by indicator */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              isHu
                ? "bg-primary/10 text-primary"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {isHu ? "胡" : "詹"}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate" data-testid={`text-item-${record.id}`}>
                {record.item}
              </span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {splitLabel(record.splitMode)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{record.date}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{record.paidBy}付</span>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-base font-semibold tabular-nums"
              data-testid={`text-amount-${record.id}`}
            >
              NT${record.amount.toFixed(0)}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  data-testid={`button-delete-${record.id}`}
                  className="h-7 w-7 text-muted-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>刪除這筆紀錄？</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{record.item}」— NT${record.amount.toFixed(0)} 將被永久刪除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    刪除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecordSkeletons() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border border-card-border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
              <div className="h-5 w-16 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <Receipt className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">還沒有消費紀錄</p>
        <p className="text-xs text-muted-foreground mt-1">填寫上方表單，開始記帳吧</p>
      </div>
    </div>
  );
}
