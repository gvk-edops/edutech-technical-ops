import { useState, useEffect } from "react";
import {
  BriefcaseBusiness, LayoutDashboard, Settings, Zap, Users, Package, Wrench, HeartPulse,
} from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "@/lib/api";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/app/dashboard" },
  { icon: Users, label: "Clients", href: "/app/clients" },
  { icon: BriefcaseBusiness, label: "Jobs", href: "/app/jobs" },
  { icon: Package, label: "Inventory", href: "/app/inventory" },
  { icon: Wrench,      label: "Assembly",      href: "/app/assembly" },
  { icon: HeartPulse,  label: "After Service",  href: "/app/afterservice" },
  // TODO: add as sections are implemented
  // { icon: Briefcase,       label: 'Jobs',       href: '/app/jobs' },
  // { icon: Wrench,          label: 'Assembly',   href: '/app/assembly' },
  // { icon: Package,         label: 'Inventory',  href: '/app/inventory' },
  // { icon: Key,             label: 'Licenses',   href: '/app/software-keys' },
  // { icon: Hammer,          label: 'Repairs',    href: '/app/repairs' },
  // { icon: BarChart2,       label: 'Reports',    href: '/app/reports' },
];

export default function Sidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [systemName, setSystemName] = useState("OPS Management");

  useEffect(() => {
    axios
      .get(`${API_URL}/settings/system`, { withCredentials: true })
      .then((r) => {
        if (r.data.success)
          setSystemName(r.data.data.system_name || "OPS Management");
      })
      .catch(() => {});
  }, []);

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <ShadcnSidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:justify-center"
            >
              <Zap className="shrink-0 w-8 h-8" />
              <span className="text-base font-bold tracking-wide group-data-[collapsible=icon]:hidden truncate">
                {systemName}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={location.pathname.startsWith(item.href)}
                    className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:justify-center"
                  >
                    <Link to={item.href} onClick={handleClick}>
                      <item.icon className="shrink-0 w-5 h-5" />
                      <span className="text-sm group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              isActive={location.pathname.startsWith("/app/settings")}
              className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground group-data-[collapsible=icon]:justify-center"
            >
              <Link to="/app/settings" onClick={handleClick}>
                <Settings className="shrink-0 w-5 h-5" />
                <span className="text-sm group-data-[collapsible=icon]:hidden">
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
