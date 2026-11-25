// Entry for the plain inner pages (e.g. /terms/): shared fonts and styles, no scroll motion.
import './fonts.css';
import './styles.css';

document.documentElement.classList.add('js');
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
