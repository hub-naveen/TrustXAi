import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "analyst" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  institution: string;
  role: UserRole;
  avatar: string;
}

export const ROLE_DASHBOARD_ROUTE: Record<UserRole, string> = {
  admin: "/dashboard/admin",
  analyst: "/dashboard/analyst",
  viewer: "/dashboard/viewer",
};

export const getDashboardRouteForRole = (role: UserRole) => ROLE_DASHBOARD_ROUTE[role];

const DEMO_USERS: Record<string, User> = {
  "admin@rbi.gov.in": {
    id: "usr_001",
    email: "admin@rbi.gov.in",
    name: "Rajesh Chandra",
    institution: "RBI CFMC",
    role: "admin",
    avatar: "RC",
  },
  "analyst@sbi.co.in": {
    id: "usr_002",
    email: "analyst@sbi.co.in",
    name: "Priya Sharma",
    institution: "State Bank of India",
    role: "analyst",
    avatar: "PS",
  },
  "viewer@hdfc.com": {
    id: "usr_003",
    email: "viewer@hdfc.com",
    name: "Amit Patel",
    institution: "HDFC Bank",
    role: "viewer",
    avatar: "AP",
  },
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  demoUsers: typeof DEMO_USERS;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tc_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem("tc_user"); }
    }
  }, []);

  const login = async (email: string, _password: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    await new Promise((r) => setTimeout(r, 800));
    const found = DEMO_USERS[email.toLowerCase()];
    if (!found) return { success: false, error: "Institution not found. Use a demo account." };
    setUser(found);
    localStorage.setItem("tc_user", JSON.stringify(found));
    return { success: true, user: found };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tc_user");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, demoUsers: DEMO_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
