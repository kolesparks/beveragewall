/**
 * Preprocesses strings so they can be inserted into html 
 * without causing rendering issues and protects against some security vulnerabilities.
 * This does not protect against all XSS vulnerabilities.
 */
export function escapeHtml(str: string) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

