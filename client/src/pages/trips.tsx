import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { MapPin, Plus, Trash2, ChevronRight, X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Trip } from "@shared/schema";

export default function Trips() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [tripName, setTripName] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);

  const { data: trips = [], isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/trips", { name: tripName.trim(), members })
        .then((res) => res.json() as Promise<Trip>),
    onSuccess: (trip: Trip) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: "行程建立", description: `「${trip.name}」已建立` });
      setTripName("");
      setMembers([]);
      setShowCreate(false);
      navigate(`/trips/${trip.id}`);
    },
    onError: () => toast({ title: "錯誤", description: "建立失敗，請再試一次", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trips/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: "已刪除", description: "行程已移除" });
    },
  });

  function addMember() {
    const name = memberInput.trim();
    if (!name) return;
    if (members.includes(name)) {
      toast({ title: "重複", description: `「${name}」已在名單中`, variant: "destructive" });
      return;
    }
    setMembers((prev) => [...prev, name]);
    setMemberInput("");
  }

  function handleMemberKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addMember();
    }
  }

  function handleCreate() {
    if (!tripName.trim()) {
      toast({ title: "請填寫行程名稱", variant: "destructive" });
      return;
    }
    if (members.length < 2) {
      toast({ title: "至少需要兩位成員", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold tracking-tight flex-1">出遊記帳</h1>
          <Button
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
            data-testid="button-new-trip"
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            新增行程
          </Button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Create trip form */}
        {showCreate && (
          <Card className="border border-card-border shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">行程名稱</Label>
                <Input
                  placeholder="例如：墾丁三天兩夜"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  data-testid="input-trip-name"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">成員（至少兩位）</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="輸入姓名後按 Enter 或點 +"
                    value={memberInput}
                    onChange={(e) => setMemberInput(e.target.value)}
                    onKeyDown={handleMemberKeyDown}
                    data-testid="input-member-name"
                    className="h-9 flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={addMember}
                    className="h-9 w-9 flex-shrink-0"
                    data-testid="button-add-member"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        data-testid={`chip-member-${m}`}
                      >
                        {m}
                        <button
                          type="button"
                          onClick={() => setMembers((prev) => prev.filter((x) => x !== m))}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowCreate(false); setTripName(""); setMembers([]); }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  data-testid="button-create-trip"
                >
                  {createMutation.isPending ? "建立中..." : "建立行程"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Card key={i} className="border border-card-border">
                <CardContent className="py-4 px-4">
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-28 bg-muted rounded" />
                      <div className="h-3 w-20 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">還沒有出遊行程</p>
              <p className="text-xs text-muted-foreground mt-1">點擊「新增行程」開始記帳吧</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onOpen={() => navigate(`/trips/${trip.id}`)}
                onDelete={() => deleteMutation.mutate(trip.id)}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === trip.id}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function TripCard({
  trip,
  onOpen,
  onDelete,
  isDeleting,
}: {
  trip: Trip;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card
      className="border border-card-border shadow-xs hover-elevate cursor-pointer"
      data-testid={`card-trip-${trip.id}`}
      onClick={onOpen}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" data-testid={`text-trip-name-${trip.id}`}>
              {trip.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {trip.members.join("、")}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isDeleting}
                  onClick={(e) => e.stopPropagation()}
                  className="h-8 w-8 text-muted-foreground"
                  data-testid={`button-delete-trip-${trip.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>刪除行程「{trip.name}」？</AlertDialogTitle>
                  <AlertDialogDescription>
                    這個動作無法還原，所有消費紀錄也會一併刪除。
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
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
