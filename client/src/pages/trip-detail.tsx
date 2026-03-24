import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
  X,
  ChevronUp,
  ChevronDown,
  Receipt,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/bottom-nav";
import type { Trip, TripExpense } from "@shared/schema";

type Settlement = { from: string; to: string; amount: number };

function computeSettlements(members: string[], expenses: TripExpense[]): Settlement[] {
  const balance: Record<string, number> = {};
  members.forEach((m) => (balance[m] = 0));

  for (const expense of expenses) {
    const share = expense.amount / expense.splitAmong.length;
    balance[expense.paidBy] = (balance[expense.paidBy] ?? 0) + expense.amount;
    for (const member of expense.splitAmong) {
      balance[member] = (balance[member] ?? 0) - share;
    }
  }

  const pos = Object.entries(balance)
    .filter(([, v]) => v > 0.01)
    .map(([name, amount]) => ({ name, amount }));
  const neg = Object.entries(balance)
    .filter(([, v]) => v < -0.01)
    .map(([name, amount]) => ({ name, amount: -amount }));

  const settlements: Settlement[] = [];
  let i = 0,
    j = 0;
  while (i < neg.length && j < pos.length) {
    const pay = Math.min(neg[i].amount, pos[j].amount);
    if (pay > 0.01) {
      settlements.push({ from: neg[i].name, to: pos[j].name, amount: pay });
    }
    neg[i].amount -= pay;
    pos[j].amount -= pay;
    if (neg[i].amount < 0.01) i++;
    if (pos[j].amount < 0.01) j++;
  }
  return settlements;
}

export default function TripDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/trips/:id");
  const tripId = params?.id ?? "";
  const { toast } = useToast();

  const [showExpenseForm, setShowExpenseForm] = useState(true);
  const [newMemberInput, setNewMemberInput] = useState("");

  // Expense form state
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [splitAmong, setSplitAmong] = useState<string[]>([]);

  const { data: trip, isLoading: tripLoading } = useQuery<Trip>({
    queryKey: ["/api/trips", tripId],
    enabled: !!tripId,
  });

  const { data: expenses = [], isLoading: expLoading } = useQuery<TripExpense[]>({
    queryKey: ["/api/trips", tripId, "expenses"],
    enabled: !!tripId,
  });

  // When trip loads and paidBy/splitAmong haven't been set yet, initialize them
  const initForm = (members: string[]) => {
    if (!paidBy && members.length > 0) setPaidBy(members[0]);
    if (splitAmong.length === 0 && members.length > 0) setSplitAmong([...members]);
  };
  if (trip && !paidBy) initForm(trip.members);

  const addMemberMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", `/api/trips/${tripId}/members`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setNewMemberInput("");
      toast({ title: "已新增成員" });
    },
    onError: () => toast({ title: "錯誤", description: "新增失敗", variant: "destructive" }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("DELETE", `/api/trips/${tripId}/members/${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: "已移除成員" });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/trips/${tripId}/expenses`, {
        id: crypto.randomUUID(),
        tripId,
        item: item.trim(),
        amount: parseFloat(amount),
        paidBy,
        splitAmong,
        date: format(new Date(), "yyyy-MM-dd"),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      setItem("");
      setAmount("");
      if (trip) {
        setPaidBy(trip.members[0] ?? "");
        setSplitAmong([...trip.members]);
      }
      toast({ title: "已記帳", description: "消費紀錄新增成功" });
    },
    onError: () => toast({ title: "錯誤", description: "新增失敗", variant: "destructive" }),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trips/${tripId}/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "expenses"] });
      toast({ title: "已刪除" });
    },
  });

  function handleAddMember() {
    const name = newMemberInput.trim();
    if (!name) return;
    if (trip?.members.includes(name)) {
      toast({ title: "重複", description: `「${name}」已在名單中`, variant: "destructive" });
      return;
    }
    addMemberMutation.mutate(name);
  }

  function handleAddExpense() {
    if (!item.trim()) return toast({ title: "請填寫消費項目", variant: "destructive" });
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) return toast({ title: "請輸入有效金額", variant: "destructive" });
    if (!paidBy) return toast({ title: "請選擇付款人", variant: "destructive" });
    if (splitAmong.length === 0) return toast({ title: "請選擇分攤成員", variant: "destructive" });
    createExpenseMutation.mutate();
  }

  function toggleSplitMember(name: string) {
    setSplitAmong((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  }

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">載入中...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">找不到行程</p>
      </div>
    );
  }

  const settlements = computeSettlements(trip.members, expenses);
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/trips")}
            className="h-8 w-8 -ml-1 text-muted-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">{trip.name}</h1>
          </div>
          <span className="text-xs text-muted-foreground">{expenses.length} 筆</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Members section */}
        <Card className="border border-card-border shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">成員</p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {trip.members.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  data-testid={`chip-trip-member-${m}`}
                >
                  {m}
                  {trip.members.length > 2 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          className="hover:text-destructive transition-colors"
                          data-testid={`button-remove-member-${m}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>移除成員「{m}」？</AlertDialogTitle>
                          <AlertDialogDescription>
                            相關的消費紀錄不會被刪除，但該成員將從行程中移除。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMemberMutation.mutate(m)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            移除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="新增成員姓名"
                value={newMemberInput}
                onChange={(e) => setNewMemberInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMember())}
                className="h-8 text-sm flex-1"
                data-testid="input-new-member"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddMember}
                disabled={addMemberMutation.isPending}
                className="h-8 gap-1 text-xs"
                data-testid="button-add-trip-member"
              >
                <UserPlus className="w-3.5 h-3.5" />
                新增
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settlement card */}
        <SettlementCard settlements={settlements} totalAmount={totalAmount} expenseCount={expenses.length} />

        {/* Add expense form */}
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
                onClick={() => setShowExpenseForm((v) => !v)}
                className="h-8 w-8 text-muted-foreground"
                data-testid="button-toggle-expense-form"
              >
                {showExpenseForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>

          {showExpenseForm && (
            <CardContent className="pt-0 space-y-4">
              {/* Item */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">消費項目</Label>
                <Input
                  placeholder="例如：晚餐、門票、計程車"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="h-9"
                  data-testid="input-trip-item"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">總金額 (NT$)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  min={0}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9"
                  data-testid="input-trip-amount"
                />
              </div>

              {/* Paid by */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">誰先付錢？</Label>
                <Select value={paidBy} onValueChange={setPaidBy}>
                  <SelectTrigger className="h-9" data-testid="select-paid-by">
                    <SelectValue placeholder="選擇付款人" />
                  </SelectTrigger>
                  <SelectContent>
                    {trip.members.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Split among */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">誰要分攤？</Label>
                <div className="flex flex-wrap gap-2">
                  {trip.members.map((m) => {
                    const checked = splitAmong.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleSplitMember(m)}
                        data-testid={`button-split-member-${m}`}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          checked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground border-transparent"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
                {splitAmong.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    每人 NT${amount && !isNaN(parseFloat(amount)) ? (parseFloat(amount) / splitAmong.length).toFixed(0) : "0"}
                  </p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleAddExpense}
                disabled={createExpenseMutation.isPending}
                data-testid="button-submit-expense"
              >
                {createExpenseMutation.isPending ? "記帳中..." : "記起來"}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Expense history */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            歷史紀錄
          </h2>

          {expLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
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
          ) : expenses.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Receipt className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">還沒有消費紀錄</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  memberCount={trip.members.length}
                  onDelete={() => deleteExpenseMutation.mutate(expense.id)}
                  isDeleting={
                    deleteExpenseMutation.isPending &&
                    deleteExpenseMutation.variables === expense.id
                  }
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

function SettlementCard({
  settlements,
  totalAmount,
  expenseCount,
}: {
  settlements: Settlement[];
  totalAmount: number;
  expenseCount: number;
}) {
  const isSettled = settlements.length === 0;

  return (
    <Card
      className={`border shadow-md overflow-hidden ${
        isSettled ? "border-card-border" : "border-amber-200 dark:border-amber-800"
      }`}
    >
      <div className={`h-1.5 w-full ${isSettled ? "bg-primary" : "bg-amber-500"}`} />
      <CardContent className="pt-5 pb-5">
        {expenseCount === 0 ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">目前結算</p>
              <p className="text-xl font-bold text-foreground">尚未記帳</p>
              <p className="text-xs text-muted-foreground mt-0.5">新增消費後即可計算分攤</p>
            </div>
          </div>
        ) : isSettled ? (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">目前結算</p>
              <p className="text-2xl font-bold text-foreground">帳目已清</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                共 {expenseCount} 筆 · 總計 NT${totalAmount.toFixed(0)}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">誰要付給誰</p>
              <p className="text-xs text-muted-foreground">
                共 {expenseCount} 筆 · NT${totalAmount.toFixed(0)}
              </p>
            </div>
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2"
                  data-testid={`settlement-${i}`}
                >
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {s.from}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    {s.to}
                  </span>
                  <span className="ml-auto text-sm font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    NT${s.amount.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpenseItem({
  expense,
  memberCount,
  onDelete,
  isDeleting,
}: {
  expense: TripExpense;
  memberCount: number;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const share = expense.amount / expense.splitAmong.length;

  return (
    <Card
      className="border border-card-border shadow-xs hover-elevate"
      data-testid={`card-expense-${expense.id}`}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
            {expense.paidBy.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate" data-testid={`text-expense-item-${expense.id}`}>
                {expense.item}
              </span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {expense.splitAmong.length === memberCount
                  ? "均分"
                  : expense.splitAmong.join("、")}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{expense.date}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{expense.paidBy}付</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">每人 NT${share.toFixed(0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-base font-semibold tabular-nums"
              data-testid={`text-expense-amount-${expense.id}`}
            >
              NT${expense.amount.toFixed(0)}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  className="h-7 w-7 text-muted-foreground"
                  data-testid={`button-delete-expense-${expense.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>刪除這筆紀錄？</AlertDialogTitle>
                  <AlertDialogDescription>
                    「{expense.item}」— NT${expense.amount.toFixed(0)} 將被永久刪除。
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
