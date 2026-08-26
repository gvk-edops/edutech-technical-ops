import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import axios from "@/utils/axios";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (values.password !== values.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (values.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await axios.post(`${API_URL}/auth/register`, values);
      toast.success("Account created successfully. Please log in.");
      navigate("/auth/adminlogin");
    } catch (error) {
      toast.error(error.response?.data?.Error || "Registration failed");
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-4 py-10">
      <Card className="w-full max-w-md border-white/10 bg-white/95 shadow-2xl backdrop-blur">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Create your admin account</CardTitle>
          <CardDescription>
            Register once, then use the same credentials to log in.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={values.password}
                onChange={(e) =>
                  setValues({ ...values, password: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                value={values.confirmPassword}
                onChange={(e) =>
                  setValues({ ...values, confirmPassword: e.target.value })
                }
              />
            </div>

            <Button className="w-full mt-4" type="submit">
              Sign Up
            </Button>

            <div className="pt-2 text-center text-sm text-muted-foreground">
              <Link
                to="/auth/adminlogin"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Already have an account? Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
