// Reserved for custom line render animations
// canvas/pulseLines.js
const canvas = document.getElementById('worldMapCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let angle = 0;
function animateSweep() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const radius = Math.min(canvas.width, canvas.height) / 2;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Glowing sweep line
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, 'rgba(0,255,255,0.15)');
  gradient.addColorStop(1, 'transparent');

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius, 0);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  angle += 0.01;
  drawRadarPings();
  requestAnimationFrame(animateSweep);
}
animateSweep();

// Radar ping positions (normalized to canvas)
const radarPings = [
  { x: 0.25, y: 0.4 },
  { x: 0.6, y: 0.2 },
  { x: 0.7, y: 0.75 },
  { x: 0.4, y: 0.6 }
];

function drawRadarPings() {
  radarPings.forEach(ping => {
    const x = ping.x * canvas.width;
    const y = ping.y * canvas.height;
    const pulse = Math.sin(Date.now() / 300) * 6 + 8;

    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.fill();
  });
}