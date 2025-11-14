// Authentication Module for Najm.ai
// Simple localStorage-based authentication

const AUTH = {
    TOKEN_KEY: 'najm_admin_token',
    USER_KEY: 'najm_user_data',

    /**
     * Set authentication token
     */
    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
        console.log('✅ Token saved:', token);
    },

    /**
     * Get authentication token
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Get current user data
     */
    getCurrentUser() {
        const userData = localStorage.getItem(this.USER_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Login with credentials
     */
    login(username, password) {
        const VALID_USER = 'admin';
        const VALID_PASS = '1234';

        if (username === VALID_USER && password === VALID_PASS) {
            const token = btoa(`${username}:${Date.now()}`);
            const userData = {
                username: username,
                loginTime: new Date().toISOString(),
                role: 'admin'
            };

            this.setToken(token);
            localStorage.setItem(this.USER_KEY, JSON.stringify(userData));

            console.log('✅ Login successful:', userData);
            return { success: true, message: 'تم تسجيل الدخول بنجاح' };
        } else {
            console.warn('❌ Login failed: Invalid credentials');
            return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
    },

    /**
     * Logout - clear token and user data
     */
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        console.log('✅ User logged out');
        window.location.href = 'index.html';
    },

    /**
     * Protect a route - redirect to login if not authenticated
     */
    protectRoute() {
        if (!this.isAuthenticated()) {
            console.warn('⚠️ Unauthorized access - redirecting to login');
            window.location.replace('login.html');
            return false;
        }
        return true;
    },

    /**
     * Redirect authenticated users away from login page
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            console.log('ℹ️ User already authenticated - redirecting to dashboard');
            window.location.href = 'admin.html';
            return true;
        }
        return false;
    }
};

// Make available globally
window.AUTH = AUTH;
