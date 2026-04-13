// context/AuthContext.js
//
// React CONTEXT explained:
//   Normally you pass data from a parent component to a child via "props".
//   But when you need the SAME data (e.g. the login token) in many screens that
//   are far apart in the component tree, passing props becomes tedious.
//
//   Context solves this: you put data in a "context" at the top of the app, and
//   ANY component anywhere can read from it — no prop drilling needed.
//
// What we store here:
//   - token  : the JWT string returned by POST /login
//   - user   : the current user object { id, username, ... }
//
// What we expose:
//   - signIn(token, user)  : call this after a successful login
//   - signOut()            : clears token + user, sends user back to Login

import React, { createContext, useContext, useState } from 'react';

// 1. CREATE the context object.
//    Think of this as an empty "slot" that will hold our auth data.
//    Components will read from this slot using useContext() below.
const AuthContext = createContext(null);

// 2. CREATE the Provider component.
//    This wraps the whole app (see App.js) and makes the auth data available
//    to every screen inside it.
export function AuthProvider({ children }) {
  // useState explained:
  //   useState(initialValue) returns [currentValue, setterFunction].
  //   When setterFunction is called, React re-renders components that use the value.
  //   Here, token and user start as null (nobody is logged in yet).
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  // Called from LoginScreen after a successful POST /login
  function signIn(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
  }

  // Called from DashboardScreen's logout button.
  // Setting token back to null causes App.js to show the auth (Login/Signup) stack.
  function signOut() {
    setToken(null);
    setUser(null);
  }

  // The value object is what every consumer of this context will receive.
  // We spread token and user directly so screens can do:
  //   const { token, user, signIn, signOut } = useAuth();
  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. CUSTOM HOOK — useAuth()
//    Instead of writing useContext(AuthContext) in every screen, we export this
//    one-liner so screens just call: const { token, user } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
