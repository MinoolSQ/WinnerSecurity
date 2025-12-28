import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ShiftBadge, StatusBadge } from '@/components/Badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, Clock } from 'lucide-react';
import type { Shift, ShiftType } from '@/types/database';
import { SHIFT_INFO } from '@/types/database';

export default function WorkerDashboard() {
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [date, setDate] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType | ''>('');

  useEffect(() => {
    fetchShifts();
  }, []);

  async function fetchShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Nije moguće učitati smene',
      });
    } else {
      setShifts((data || []) as Shift[]);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!date || !shiftType) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Izaberite datum i smenu',
      });
      return;
    }

    // Check if shift already exists for this date
    const existingShift = shifts.find(s => s.date === date);
    if (existingShift) {
      toast({
        variant: 'destructive',
        title: 'Greška',
        description: 'Već imate smenu za taj datum',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('shifts')
      .insert({
        user_id: dbUser!.id,
        date,
        shift_type: shiftType,
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
        description: 'Zahtev za smenu je poslat',
      });
      setDate('');
      setShiftType('');
      setShowForm(false);
      fetchShifts();
    }

    setSubmitting(false);
  }

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout title="Moje smene">
      <div className="space-y-4">
        {/* Add shift button */}
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj smenu
          </Button>
        )}

        {/* Add shift form */}
        {showForm && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nova smena</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="date">Datum</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={today}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shift">Smena</Label>
                    <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftType)}>
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
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Slanje...' : 'Pošalji zahtev'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Otkaži
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Shifts list */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Vaše smene</h2>
          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Učitavanje...</div>
          ) : shifts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nemate zakazanih smena
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {shifts.map((shift) => (
                <Card key={shift.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(shift.date).toLocaleDateString('sr-Latn-RS', { 
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}</span>
                        </div>
                        <ShiftBadge type={shift.shift_type as ShiftType} />
                      </div>
                      <StatusBadge status={shift.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
