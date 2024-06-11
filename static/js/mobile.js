document.querySelector('body').addEventListener('touchmove', function(e) {
  // запретить жест обновления
  e.preventDefault();
}, { passive: false });