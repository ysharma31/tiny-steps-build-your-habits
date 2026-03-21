import { NavLink } from "react-router-dom";
import { Home, Clock, Settings } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const BottomTabBar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 text-xs font-body transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomTabBar;
