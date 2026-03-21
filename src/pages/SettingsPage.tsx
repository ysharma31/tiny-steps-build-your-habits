import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

const SettingsPage = () => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold text-foreground">
        Settings
      </h1>

      {/* Profile */}
      <Card className="shadow-warm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              🌱
            </div>
            <div className="flex-1 space-y-2">
              <Input placeholder="Display name" className="font-body" />
              <Input placeholder="Phone number" type="tel" className="font-body" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily check-in */}
      <Card className="shadow-warm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Daily Check-in</h2>
          <div className="flex items-center justify-between">
            <Label className="font-body text-sm">Nova calls me every day at</Label>
            <Input type="time" defaultValue="09:00" className="w-32 font-body text-sm" />
          </div>
          <p className="text-xs text-muted-foreground font-body">
            Nova will call you daily at the selected time
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-warm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-heading font-semibold">Notifications</h2>
          <div className="space-y-3">
            {[
              { label: "Browser notifications", key: "browser" },
              { label: "SMS reminder from Nova", key: "sms" },
              { label: "In-app reminder", key: "inapp" },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="font-body text-sm">{label}</Label>
                <Switch />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button variant="outline" className="w-full font-body">
        Sign out
      </Button>
    </div>
  );
};

export default SettingsPage;
