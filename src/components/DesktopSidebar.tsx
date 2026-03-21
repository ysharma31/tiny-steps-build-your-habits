import { NavLink } from "react-router-dom";
import { Home, Clock, Settings } from "lucide-react";

const links = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/history", icon: Clock, label: "Habit History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const DesktopSidebar = () => {
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 md:left-0 z-40 border-r border-border bg-sidebar">
      <div className="flex flex-col h-full px-4 py-6">
        {/* Logo */}
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            🌱 Tiny Steps
          </h1>
          <p className="text-xs text-muted-foreground font-body mt-1">
            One tiny step at a time.
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Nova info */}
        <div className="mt-auto px-2 py-3 rounded-lg bg-sidebar-accent">
          <p className="text-xs text-muted-foreground font-body">
            📞 Call Nova
          </p>
          <p className="text-sm font-body font-medium text-foreground">
            +1 (509) 692-5293
          </p>
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
