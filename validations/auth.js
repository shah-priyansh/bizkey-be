
const validateLogin = (data) => {
    // Check if required fields exist
    if (!data.username || !data.password) {
        return { 
            error: { 
                details: [{ message: 'Username and password are required' }] 
            } 
        };
    }
    
    // Check if username is valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.username)) {
        return { 
            error: { 
                details: [{ message: 'Please enter a valid email address' }] 
            } 
        };
    }
    
    // Check password length
    if (data.password.length < 6) {
        return { 
            error: { 
                details: [{ message: 'Password must be at least 6 characters long' }] 
            } 
        };
    }
    
    return { error: null };
};

const validateChangePassword = (data) => {
    if (!data.currentPassword || !data.newPassword) {
        return { 
            error: { 
                details: [{ message: 'Current password and new password are required' }] 
            } 
        };
    }
    
    if (data.newPassword.length < 6) {
        return { 
            error: { 
                details: [{ message: 'New password must be at least 6 characters long' }] 
            } 
        };
    }
    
    return { error: null };
};

module.exports = { validateLogin, validateChangePassword };