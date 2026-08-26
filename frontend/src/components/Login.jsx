import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import axios from '@/utils/axios';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [values, setValues] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, values);
      if (data.loginStatus) {
        toast.success(`Welcome, ${data.full_name}!`);
        navigate('/app/dashboard');
      } else {
        toast.error(data.Error);
      }
    } catch {
      toast.error('Login failed');
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Smartboard OPS Management</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                required
                onChange={(e) => setValues({ ...values, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                onChange={(e) => setValues({ ...values, password: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
