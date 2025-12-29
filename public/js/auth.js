// Authentication Helper
function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function checkAuth() {
    if (!getToken()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// Check auth on page load
if (window.location.pathname !== '/' && !getToken()) {
    window.location.href = '/';
}
