import { useState, useEffect } from "react";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  Settings,
  Zap,
  Users,
  Package,
  Wrench,
  HeartPulse,
  Truck,
  KeyRound,
  UserCog,
  BarChart2,
  Handshake,
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
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/app/dashboard",
    roles: ["admin", "manager"],
  },
  {
    icon: Users,
    label: "Clients",
    href: "/app/clients",
    roles: ["admin", "manager"],
  },
  {
    icon: BriefcaseBusiness,
    label: "Jobs",
    href: "/app/jobs",
    roles: ["admin", "manager"],
  },
  {
    icon: Package,
    label: "Inventory",
    href: "/app/inventory",
    roles: ["admin", "manager"],
  },
  {
    icon: Wrench,
    label: "Assembly",
    href: "/app/assembly",
    roles: ["admin", "manager", "technician"],
  },
  {
    icon: Truck,
    label: "Delivery",
    href: "/app/delivery",
    roles: ["admin", "manager"],
  },
  {
    icon: KeyRound,
    label: "Software Keys",
    href: "/app/software-keys",
    roles: ["admin", "manager"],
  },
  {
    icon: HeartPulse,
    label: "After Service",
    href: "/app/afterservice",
    roles: ["admin", "manager"],
  },
  {
    icon: Handshake,
    label: "Lending",
    href: "/app/lending",
    roles: ["admin", "manager"],
  },
  { icon: UserCog, label: "Users", href: "/app/users", roles: ["admin"] },
  {
    icon: BarChart2,
    label: "Reports",
    href: "/app/reports",
    roles: ["admin", "manager"],
  },
  // TODO: add as sections are implemented
  // { icon: Briefcase,       label: 'Jobs',       href: '/app/jobs' },
  // { icon: Wrench,          label: 'Assembly',   href: '/app/assembly' },
  // { icon: Package,         label: 'Inventory',  href: '/app/inventory' },
  // { icon: Hammer,          label: 'Repairs',    href: '/app/repairs' },
  // { icon: BarChart2,       label: 'Reports',    href: '/app/reports' },
];

export default function Sidebar() {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [systemName, setSystemName] = useState("OPS Management");
  const [role, setRole] = useState("");

  useEffect(() => {
    axios
      .get(`${API_URL}/auth/me`, { withCredentials: true })
      .then(({ data }) => {
        const currentRole = data.Status ? data.user?.role : "";
        setRole(currentRole);
        if (["admin", "manager"].includes(currentRole)) {
          return axios.get(`${API_URL}/settings/system`, {
            withCredentials: true,
          });
        }
        return null;
      })
      .then((response) => {
        if (response?.data?.success)
          setSystemName(response.data.data.system_name || "OPS Management");
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
              {menuItems
                .filter((item) => item.roles.includes(role))
                .map((item) => (
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
            {["admin", "manager"].includes(role) && (
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
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
