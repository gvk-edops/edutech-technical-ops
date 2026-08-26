import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Outlet } from "react-router-dom";

function PageLayout() {
  return (
    <SidebarProvider>
      <Sidebar />
      <SidebarInset>
        <Header />
        <Outlet /> 
      </SidebarInset>
    </SidebarProvider>
  );
}

export default PageLayout;
