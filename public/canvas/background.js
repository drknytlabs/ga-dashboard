const canvas = document.getElementById('worldMapCanvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = 'assets/blue-map.png';

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

img.onload = () => {
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.4;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  }
  draw();
};
