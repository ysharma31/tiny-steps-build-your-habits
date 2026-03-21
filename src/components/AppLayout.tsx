import { Outlet } from "react-router-dom";
import BottomTabBar from "./BottomTabBar";
import DesktopSidebar from "./DesktopSidebar";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="md:ml-60 pb-20 md:pb-6 px-4 md:px-8 py-6">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
};

export default AppLayout;
