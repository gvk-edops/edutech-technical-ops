import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Lock,
  Save,
  UserPlus,
  Users,
  Shield,
  ShieldOff,
  Trash2,
  KeyRound,
} from "lucide-react";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { toast } from "sonner";

const ROLES = ["admin", "manager", "technician"];
const roleBadge = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  technician: "bg-green-100 text-green-800",
  auditor: "bg-slate-100 text-slate-800",
};

export default function AccountSettings() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    full_name: "",
    email: "",
    role: "technician",
    password: "",
  });

  const [dialog, setDialog] = useState(null); // { type: 'disable'|'enable'|'delete'|'reset', user }
  const [resetPw, setResetPw] = useState("");

  useEffect(() => {
    fetchMe();
    fetchUsers();
  }, []);

  const fetchMe = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/auth/me`);
      if (data.Status) setMe(data.user);
    } catch {
      setMe(null);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/auth/users`);
      if (data.Status) setUsers(data.data);
    } catch {
      setUsers([]);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return toast.error("Passwords do not match");
    if (pwForm.newPassword.length < 6)
      return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await axios.put(`${API_URL}/auth/change-password`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.Error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.full_name || !newUser.password)
      return toast.error("Username, full name and password are required");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/users`, newUser);
      toast.success("User created");
      setShowCreate(false);
      setNewUser({
        username: "",
        full_name: "",
        email: "",
        role: "technician",
        password: "",
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.Error || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogConfirm = async () => {
    if (!dialog) return;
    setLoading(true);
    try {
      if (dialog.type === "delete") {
        await axios.delete(`${API_URL}/auth/users/${dialog.user.id}`);
        toast.success("User deleted");
      } else if (dialog.type === "reset") {
        if (!resetPw || resetPw.length < 6) {
          toast.error("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        await axios.put(
          `${API_URL}/auth/users/${dialog.user.id}/reset-password`,
          { password: resetPw },
        );
        toast.success("Password reset");
        setResetPw("");
      } else {
        await axios.put(`${API_URL}/auth/users/${dialog.user.id}`, {
          ...dialog.user,
          is_active: dialog.type === "enable" ? 1 : 0,
        });
        toast.success(
          dialog.type === "enable" ? "User enabled" : "User disabled",
        );
      }
      fetchUsers();
      setDialog(null);
    } catch (err) {
      toast.error(err.response?.data?.Error || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = me?.role === "admin";

  return (
    <main className="overflow-y-auto p-5">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/settings")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Change own password */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <CardTitle>Change Password</CardTitle>
            </div>
            <CardDescription>Update your login password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={pwForm.currentPassword}
                  required
                  onChange={(e) =>
                    setPwForm({ ...pwForm, currentPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={pwForm.newPassword}
                  required
                  minLength={6}
                  onChange={(e) =>
                    setPwForm({ ...pwForm, newPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={pwForm.confirmPassword}
                  required
                  minLength={6}
                  onChange={(e) =>
                    setPwForm({ ...pwForm, confirmPassword: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* User management — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  <CardTitle>System Users</CardTitle>
                </div>
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add User
                </Button>
              </div>
              <CardDescription>Manage operational users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => {
                  const isSelf = me?.id === user.id;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">
                            {user.full_name}
                          </span>
                          {isSelf && (
                            <span className="text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                          <Badge className={`text-xs ${roleBadge[user.role]}`}>
                            {user.role}
                          </Badge>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{user.username}
                          {user.email ? ` · ${user.email}` : ""}
                        </p>
                      </div>
                      {!isSelf && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset password"
                            onClick={() => {
                              setDialog({ type: "reset", user });
                              setResetPw("");
                            }}
                          >
                            <KeyRound className="h-4 w-4 text-blue-600" />
                          </Button>
                          {user.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Disable"
                              onClick={() =>
                                setDialog({ type: "disable", user })
                              }
                            >
                              <ShieldOff className="h-4 w-4 text-orange-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Enable"
                              onClick={() =>
                                setDialog({ type: "enable", user })
                              }
                            >
                              <Shield className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDialog({ type: "delete", user })}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create user dialog */}
      <AlertDialog open={showCreate} onOpenChange={setShowCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New User</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Username *</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Full Name *</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, full_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  minLength={6}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateUser} disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action confirmation dialog */}
      <AlertDialog
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.type === "delete"
                ? "Delete User"
                : dialog?.type === "reset"
                  ? "Reset Password"
                  : dialog?.type === "enable"
                    ? "Enable User"
                    : "Disable User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.type === "delete"
                ? `Delete "${dialog.user.full_name}"? This cannot be undone.`
                : dialog?.type === "reset"
                  ? `Set a new password for "${dialog?.user?.full_name}":`
                  : dialog?.type === "enable"
                    ? `Enable "${dialog.user.full_name}"?`
                    : `Disable "${dialog?.user?.full_name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dialog?.type === "reset" && (
            <Input
              type="password"
              placeholder="New password (min 6 chars)"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              className="mt-2"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDialogConfirm}
              disabled={loading}
              className={
                dialog?.type === "delete"
                  ? "bg-red-600 hover:bg-red-700"
                  : dialog?.type === "disable"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : ""
              }
            >
              {loading ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
