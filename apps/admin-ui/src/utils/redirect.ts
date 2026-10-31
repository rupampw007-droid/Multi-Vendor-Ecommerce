let redirectLogin = () => {
    window.location.href = "/login"
}

export const setRedirectHandler = (handler: () => void) => {
    redirectLogin = handler
}

export const runRedirectToLogin = () => {
    redirectLogin()
}