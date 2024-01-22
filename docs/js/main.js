const initApp = () => {
    // -- nav menu
    const hamburgerBtn = document.getElementById('hamburger-button')
    const mobileMenu = document.getElementById('mobile-menu')
    const toggleMenu = () => {
        mobileMenu.classList.toggle('hidden')
        mobileMenu.classList.toggle('flex')
    }

    hamburgerBtn.addEventListener('click', toggleMenu)
    mobileMenu.addEventListener('click', toggleMenu)

    // -- dark/light mode
    // set to the system default
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark')
        localStorage.theme = 'dark'
    } else {
        document.documentElement.classList.remove('dark')
        localStorage.theme = 'light'
    }
    // toggle the mode from the dark/light mode button
    const themeButtons = document.querySelectorAll('#theme-button')
    // add event listeners for each button
    themeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (localStorage.theme == 'light') {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark'
            }
            else if (localStorage.theme == 'dark') {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light'
            }
        })
    })
    // -- year in the footer
    document.getElementById('year').innerHTML = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', initApp)
