# Server-Side Auth Endpoints Implementation

This document outlines the recommended server-side authentication endpoints to maintain provider abstraction and centralized auth logic.

## Architecture Benefits

- **Provider abstraction** - Can swap Supabase for Auth0, Cognito, etc. without changing frontend
- **Centralized auth logic** - One place to handle token validation, refresh, user data
- **Security** - Sensitive operations stay server-side
- **Consistent API** - Frontend doesn't need to know about auth provider details

## Recommended Endpoints

### 1. GET /me - Get Current User Info

```typescript
app.get("/me", authenticateToken, async (req, res) => {
  try {
    // Return user data from database, not just JWT payload
    const user = await getUserFromDatabase(req.user.id);

    res.json({
      code: 200,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
        // Add other user fields as needed
      },
      message: "User retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Failed to retrieve user",
      error: error.message
    });
  }
});
```

**Purpose:**

- Get current user info from database (not just JWT payload)
- Validate token freshness server-side
- Return latest user profile data

### 2. POST /auth/refresh - Refresh Access Token

```typescript
app.post("/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        code: 400,
        message: "Refresh token is required"
      });
    }

    // Validate refresh token with Supabase/provider
    const tokens = await refreshUserTokens(refreshToken);

    res.json({
      code: 200,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      },
      message: "Tokens refreshed successfully"
    });
  } catch (error) {
    res.status(401).json({
      code: 401,
      message: "Invalid refresh token",
      error: error.message
    });
  }
});
```

**Purpose:**

- Refresh expired access tokens using refresh tokens
- Maintain user sessions without forcing re-login
- Handle token rotation (security best practice)

### 3. POST /auth/logout - Server-Side Logout

```typescript
app.post("/auth/logout", authenticateToken, async (req, res) => {
  try {
    // Invalidate tokens on server (add to blacklist or remove from database)
    await invalidateUserTokens(req.user.id);

    // Optionally revoke tokens with Supabase
    await supabase.auth.signOut();

    res.json({
      code: 200,
      message: "Logged out successfully"
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: "Logout failed",
      error: error.message
    });
  }
});
```

**Purpose:**

- Invalidate tokens server-side
- Ensure complete session cleanup
- Handle provider-specific logout logic

## Frontend Integration

Update your auth store to use these endpoints:

```typescript
// stores/auth.ts
export const useAuthStore = defineStore("auth", () => {
  // ... existing state

  // Get current user from server
  async function getCurrentUser(): Promise<void> {
    try {
      const response = await $fetch<ApiResponse<User>>("/me");
      setUser(response.data);
      logger.info("User info retrieved", { email: response.data.email });
    } catch (error) {
      logger.error("Failed to get current user", { error });
      throw error;
    }
  }

  // Refresh tokens
  async function refreshAuth(): Promise<void> {
    try {
      if (!refreshToken.value) {
        throw new Error("No refresh token available");
      }

      const response = await $fetch<ApiResponse<TokenData>>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: refreshToken.value }
      });

      setTokens(response.data.accessToken, response.data.refreshToken);
      logger.info("Tokens refreshed successfully");
    } catch (error) {
      logger.error("Token refresh failed", { error });
      logout(); // Force logout if refresh fails
      throw error;
    }
  }

  // Server-side logout
  async function logout(): Promise<void> {
    try {
      if (token.value) {
        await $fetch("/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.value}`
          }
        });
      }
    } catch (error) {
      logger.error("Server logout failed", { error });
      // Continue with client-side cleanup even if server logout fails
    } finally {
      // Clear client-side state
      clearAuth();
      await navigateTo("/login");
    }
  }

  return {
    // ... existing exports
    getCurrentUser,
    refreshAuth,
    logout
  };
});
```

## Automatic Token Refresh

Consider implementing automatic token refresh:

```typescript
// composables/useTokenRefresh.ts
export const useTokenRefresh = () => {
  const authStore = useAuthStore();

  // Auto-refresh token before expiry
  const scheduleTokenRefresh = (expiresIn: number) => {
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;

    setTimeout(async () => {
      try {
        await authStore.refreshAuth();
      } catch (error) {
        console.error("Auto token refresh failed:", error);
      }
    }, refreshTime);
  };

  return { scheduleTokenRefresh };
};
```

## Helper Functions (Server-Side)

```typescript
// Helper function to get user from database
async function getUserFromDatabase(userId: string) {
  // Replace with your database query
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

  if (error) throw error;
  return data;
}

// Helper function to refresh tokens with Supabase
async function refreshUserTokens(refreshToken: string) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  });

  if (error) throw error;

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in
  };
}

// Helper function to invalidate tokens
async function invalidateUserTokens(userId: string) {
  // Add token to blacklist or remove from database
  // Implementation depends on your token storage strategy
}
```

## Error Handling

The frontend should handle these error scenarios:

- **401 on /me**: Token expired, try refresh
- **401 on /auth/refresh**: Refresh token expired, force logout
- **Network errors**: Show appropriate user feedback
- **Server errors**: Log for debugging, show generic error

## Security Considerations

1. **HTTPS only** - All auth endpoints must use HTTPS in production
2. **Rate limiting** - Implement rate limiting on auth endpoints
3. **Token storage** - Store refresh tokens securely (httpOnly cookies recommended)
4. **Token blacklisting** - Implement token blacklist for logout
5. **CSRF protection** - Use CSRF tokens for state-changing operations

This approach keeps your frontend provider-agnostic while allowing your Express API to handle all Supabase integration details.
