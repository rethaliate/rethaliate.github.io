/* Minimally modified from https://slicker.me/javascript/physics/physics_engine.htm
*/

// Vector utilities
class Vec {
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }
    add(v) {
        return new Vec(this.x + v.x,this.y + v.y);
    }
    sub(v) {
        return new Vec(this.x - v.x,this.y - v.y);
    }
    mul(s) {
        return new Vec(this.x * s,this.y * s);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    len() {
        return Math.hypot(this.x, this.y);
    }
    norm() {
        let l = this.len() || 1;
        return this.mul(1 / l);
    }
}

// Circle body
class Circle {
    constructor(x, y, r, m=1) {
        this.pos = new Vec(x,y);
        this.vel = new Vec(0,0);
        this.r = r;
        this.m = m;
        this.invM = 1 / m;
    }
    applyImpulse(j) {
        this.vel = this.vel.add(j.mul(this.invM));
    }
    integrate(dt) {
        let gravity = new Vec(0,300);
        this.vel = this.vel.add(gravity.mul(dt));
        this.pos = this.pos.add(this.vel.mul(dt));
    }
}

// Peg
class Peg {
    constructor(x1, y1, r) {
        this.pos = new Vec(x1,y1);
        this.r = r;
    }
    closestPoint(p) {
        let diff = p.sub(this.pos);
        let d = diff.len();
        if (d === 0) {
            return;
        }
        if (d < this.r) {
            return p;
        }
        return this.pos.add(diff.norm().mul(this.r));
    }
}

// Collision and scene
function resolveCirclePeg(circle, peg) {
    let cp = peg.closestPoint(circle.pos);
    let diff = circle.pos.sub(cp);
    let dist = diff.len();
    if (dist < circle.r) {
        let n = diff.norm();
        let penetration = circle.r - dist;
        circle.pos = circle.pos.add(n.mul(penetration + 0.01));
        let vn = circle.vel.dot(n);
        if (vn < 0) {
            let e = 0.8;
            circle.vel = circle.vel.sub(n.mul((1 + e) * vn));
        }
    }
}

function resolveCircleCircle(a, b) {
    let diff = b.pos.sub(a.pos);
    let d = diff.len();
    if (d === 0) {
        return;
    }
    if (d < a.r + b.r) {
        let n = diff.mul(1 / d);
        let penetration = a.r + b.r - d;
        let totalInv = a.invM + b.invM;
        a.pos = a.pos.add(n.mul(-penetration * (a.invM / totalInv)));
        b.pos = b.pos.add(n.mul(penetration * (b.invM / totalInv)));
        let rel = b.vel.sub(a.vel);
        let vn = rel.dot(n);
        if (vn > 0) {
            return;
        }
        let e = 0.8;
        let j = -(1 + e) * vn / totalInv;
        let impulse = n.mul(j);
        a.applyImpulse(impulse.mul(-1));
        b.applyImpulse(impulse);
    }
}

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let counter = 0;
let circles = [];
let pegs = [];

const middle = canvas.width / 2;
const rowSpacing = 100;
const columnSpacing = 80;

const rowStartY = 250;

const circleSpawnLeft = middle - 2 * columnSpacing;
const circleSpawnRight = middle + 2 * columnSpacing;

for (let i = 0; i < 5; i++) {
    // Rows
    const pegCount = i % 2 === 0 ? 5 : 4;
    const centerIdx = (pegCount - 1) / 2;
    for (let j = 0; j < pegCount; j++) {
        pegs.push(new Peg(middle + (j - centerIdx) * columnSpacing, rowStartY + i * rowSpacing, 10));
    }
}

function step(dt) {
    for (let c of circles) {
        c.integrate(dt);
    }
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            resolveCircleCircle(circles[i], circles[j]);
        }
    }
    for (let c of circles) {
        for (let l of pegs) {
            resolveCirclePeg(c, l);
        }
    }
}

const horse = new Image(40, 40);
horse.src = "img/horse.webp";

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let l of pegs) {
        ctx.fillStyle = 'rgb(156, 156, 156)';
        ctx.beginPath();
        ctx.arc(l.pos.x, l.pos.y, l.r, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let c of circles) {
        ctx.drawImage(horse, c.pos.x-20, c.pos.y-20, 40, 40);
    }
}

const armLength = 70;
const speed = 0.009;
let last = performance.now();
function loop(t) {
    let dt = Math.min(0.033, (t - last) / 1000);
    step(dt);
    draw();
    last = t;

    circles = circles.filter(c => c.pos.y < canvas.height);

    if (Math.random() < 0.005) {
        const xPos = circleSpawnLeft + Math.random() * (circleSpawnRight - circleSpawnLeft);
        circles.push(new Circle(xPos, -10, 20, 10));
    }

    counter = counter + speed;
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.onpointerdown = function(e) {
    circles.push(new Circle(e.offsetX,e.offsetY,20,1));
}