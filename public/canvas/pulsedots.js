const ctx = document.getElementById('worldMapCanvas').getContext('2d');

const dots = [
  { x: 0.3, y: 0.35 },
  { x: 0.55, y: 0.32 },
  { x: 0.8, y: 0.5 },
];

let pulse = 0;
let growing = true;

function animateDots() {
  pulse += growing ? 0.02 : -0.02;
  if (pulse > 1 || pulse < 0.2) growing = !growing;

  dots.forEach(dot => {
    const x = dot.x * ctx.canvas.width;
    const y = dot.y * ctx.canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, 4 + pulse * 10, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(0, 191, 255, ${0.3 + pulse * 0.4})`;
    ctx.fill();
  });

  requestAnimationFrame(animateDots);
}
animateDots();
