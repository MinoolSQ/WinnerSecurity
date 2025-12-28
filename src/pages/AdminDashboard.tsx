import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ShiftBadge, StatusBadge } from '@/components/Badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Calendar, Clock, Users, Plus } from 'lucide-react';
import type { Shift, ShiftType, User } from '@/types/database';
import { SHIFT_INFO } from '@/types/database';

interface ShiftWithUser extends Shift {
  users: User;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [pendingShifts, setPendingShifts] = useState<ShiftWithUser[]>([]);
  const [allShifts, setAllShifts] = useState<ShiftWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Add shift dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newShiftDate, setNewShiftDate] = useState('');
  const [newShiftType, setNewShiftType] = useState<ShiftType | ''>('');
  const [newShiftUserId, setNewShiftUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // Fetch pending shifts
    const { data: pending } = await supabase
      .from('shifts')
      .select('*, users(*)')
      .eq('status', 'pending')
      .order('date', { ascending: true });

    // Fetch all shifts for calendar
    const { data: all } = await supabase
      .from('shifts')
      .select('*, users(*)')
      .order('date', { ascending: false });

    // Fetch all workers
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'worker');

    setPendingShifts((pending || []) as ShiftWithUser[]);
    setAllShifts((all || []) as ShiftWithUser[]);
    setUsers((allUsers || []) as User[]);
    setLoading(false);
  }

  async function handleApprove(shiftId: string) {
    setProcessing(shiftId);
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'approved' })
      .eq('id', shiftId);

    if (error) {
      toast({ variant: 'destructive', title: 'Greška', description: error.message });
    } else {
      toast({ title: 'Odobreno' });
      fetchData();
    }
    setProcessing(null);
  }

  async function handleReject(shiftId: string) {
    setProcessing(shiftId);
    const { error } = await supabase
      .from('shifts')
      .update({ status: 'rejected' })
      .eq('id', shiftId);

    if (error) {
      toast({ variant: 'destructive', title: 'Greška', description: error.message });
    } else {
      toast({ title: 'Odbijeno' });
      fetchData();
    }
    setProcessing(null);
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newShiftDate || !newShiftType || !newShiftUserId) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Popunite sva polja',
      });
      return;
    }

    // Check if worker already has a shift for that date
    const existingShift = allShifts.find(
      s => s.user_id === newShiftUserId && s.date === newShiftDate
    );
    if (existingShift) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Radnik već ima smenu za taj datum',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('shifts')
      .insert({
        user_id: newShiftUserId,
        date: newShiftDate,
        shift_type: newShiftType,
        status: 'approved', // Admin-assigned shifts are auto-approved
      });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: error.message,
      });
    } else {
      toast({
        title: 'Uspešno',
        description: 'Smena je dodeljena radniku',
      });
      setNewShiftDate('');
      setNewShiftType('');
      setNewShiftUserId('');
      setDialogOpen(false);
      fetchData();
    }

    setSubmitting(false);
  }

  // Calculate hours per worker
  const hoursPerWorker = users.map((user) => {
    const approvedShifts = allShifts.filter(
      (s) => s.user_id === user.id && s.status === 'approved'
    );
    return {
      user,
      shiftCount: approvedShifts.length,
      hours: approvedShifts.length * 8,
    };
  }).sort((a, b) => b.hours - a.hours);

  // Group shifts by date for calendar view
  const shiftsByDate = allShifts.reduce((acc, shift) => {
    const date = shift.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, ShiftWithUser[]>);

  const sortedDates = Object.keys(shiftsByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const today = new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout title="Admin Panel">
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Zahtevi {pendingShifts.length > 0 && `(${pendingShifts.length})`}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs sm:text-sm">
            Kalendar
          </TabsTrigger>
          <TabsTrigger value="hours" className="text-xs sm:text-sm">
            Sati
          </TabsTrigger>
        </TabsList>

        {/* Pending requests */}
        <TabsContent value="pending" className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
          ) : pendingShifts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nema zahteva na čekanju
              </CardContent>
            </Card>
          ) : (
            pendingShifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{shift.users?.name}</div>
                      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(shift.date).toLocaleDateString('sr-Latn-RS', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                        <ShiftBadge type={shift.shift_type as ShiftType} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(shift.id)}
                        disabled={processing === shift.id}
                        className="flex-1 sm:flex-none"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Odobri
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(shift.id)}
                        disabled={processing === shift.id}
                        className="flex-1 sm:flex-none"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Odbij
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Calendar view */}
        <TabsContent value="calendar" className="space-y-4">
          {/* Add shift button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Dodeli smenu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodeli smenu radniku</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddShift} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="worker">Radnik</Label>
                  <Select value={newShiftUserId} onValueChange={setNewShiftUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite radnika" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Datum</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newShiftDate}
                    onChange={(e) => setNewShiftDate(e.target.value)}
                    min={today}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shift">Smena</Label>
                  <Select value={newShiftType} onValueChange={(v) => setNewShiftType(v as ShiftType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Izaberite smenu" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['1', '2', '3'] as ShiftType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {SHIFT_INFO[type].label} ({SHIFT_INFO[type].time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? 'Dodavanje...' : 'Dodeli smenu'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Otkaži
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
          ) : sortedDates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nema zakazanih smena
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sortedDates.map((date) => (
                <Card key={date}>
                  <CardHeader className="py-3 px-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {new Date(date).toLocaleDateString('sr-Latn-RS', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-2">
                    {shiftsByDate[date].map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between gap-2 py-1 border-t border-border first:border-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm">{shift.users?.name}</span>
                          <ShiftBadge type={shift.shift_type as ShiftType} />
                        </div>
                        <StatusBadge status={shift.status} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Hours tracking */}
        <TabsContent value="hours">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Evidencija sati (odobrene smene)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">Učitavanje...</div>
              ) : hoursPerWorker.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nema radnika
                </div>
              ) : (
                <div className="space-y-3">
                  {hoursPerWorker.map(({ user, shiftCount, hours }) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">{hours} sati</div>
                        <div className="text-muted-foreground">{shiftCount} smena</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
