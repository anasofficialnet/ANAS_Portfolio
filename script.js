document.addEventListener('DOMContentLoaded', () => {
    
    /* --- SYSTEM BOOT SEQUENCE --- */
    const bootScreen = document.getElementById('boot-sequence');
    const bootLog = document.getElementById('boot-log');
    const logs = [
        "INITIALIZING KERNEL...",
        "LOADING SECURITY MODULES...",
        "MOUNTING FILE SYSTEM...",
        "ESTABLISHING SECURE CONNECTION...",
        "ACCESS GRANTED."
    ];
    
    let logIndex = 0;
    const logInterval = setInterval(() => {
        if(logIndex < logs.length) {
            bootLog.innerHTML += `<div>> ${logs[logIndex]}</div>`;
            logIndex++;
        } else {
            clearInterval(logInterval);
            setTimeout(() => {
                bootScreen.style.opacity = '0';
                setTimeout(() => {
                    bootScreen.style.display = 'none';
                    document.body.classList.add('booted');
                    document.dispatchEvent(new Event('boot:complete'));
                }, 500);
            }, 800);
        }
    }, 200);

    /* --- SKILL METERS (no percentages) --- */
    const armSkillMeters = (root = document) => {
        const meters = root.querySelectorAll('.skill-meter');
        meters.forEach((wrap) => {
            if (wrap.dataset.armed === '1') return;
            const rank = Math.max(0, Math.min(5, parseInt(wrap.dataset.rank || '0', 10)));
            const cells = Array.from(wrap.querySelectorAll('.meter span'));
            // reset
            cells.forEach(c => c.classList.remove('on'));
            // light up with a small stagger
            cells.slice(0, rank).forEach((cell, i) => {
                setTimeout(() => cell.classList.add('on'), 70 * i);
            });
            wrap.dataset.armed = '1';
        });
    };

    // Arm meters + small reveal animation right after boot finishes
    document.addEventListener('boot:complete', () => {
        setTimeout(() => armSkillMeters(document), 200);
    }, { once: true });

    /* --- CUSTOM CURSOR (optional, needs .cursor-dot + .cursor-outline in HTML) --- */
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorOutline = document.querySelector('.cursor-outline');
    if (cursorDot && cursorOutline) {
        window.addEventListener('mousemove', (e) => {
            const posX = e.clientX;
            const posY = e.clientY;

            cursorDot.style.left = `${posX}px`;
            cursorDot.style.top = `${posY}px`;

            cursorOutline.animate({
                left: `${posX}px`,
                top: `${posY}px`
            }, { duration: 500, fill: "forwards" });
        });

        window.addEventListener('mousedown', () => cursorOutline.classList.add('click'));
        window.addEventListener('mouseup', () => cursorOutline.classList.remove('click'));
        window.addEventListener('mouseleave', () => {
            cursorDot.style.opacity = '0';
            cursorOutline.style.opacity = '0';
        });
        window.addEventListener('mouseenter', () => {
            cursorDot.style.opacity = '';
            cursorOutline.style.opacity = '';
        });

        document.querySelectorAll('a, button, .project-card, .writeup-item, input, textarea').forEach(el => {
            el.addEventListener('mouseover', () => cursorOutline.classList.add('hover'));
            el.addEventListener('mouseout', () => cursorOutline.classList.remove('hover'));
        });
    }

    /* --- BACKGROUND CANVAS ANIMATION (NEURAL MESH) --- */
    const canvas = document.getElementById('neural-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];
    
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = 'rgba(122, 162, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const count = Math.min(window.innerWidth / 10, 100);
        for (let i = 0; i < count; i++) particles.push(new Particle());
    }
    initParticles();

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            for (let j = i; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.strokeStyle = `rgba(122, 162, 255, ${1 - dist / 150})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    /* --- TERMINAL LOGIC --- */
    const termInput = document.getElementById('terminal-input');
    const termOutput = document.getElementById('terminal-output');
    const termWindow = document.getElementById('terminal-window');

    // Typewriter effect helper
    const typeWriter = (text, element, speed = 10) => {
        let i = 0;
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                termOutput.scrollTop = termOutput.scrollHeight;
                setTimeout(type, speed);
            }
        }
        type();
    };

    const commands = {
        help: "Available commands: <span class='cmd-success'>about, skills, projects, contact, clear, whoami</span>",
        whoami: "Anas Abdul Aziz | Cybersecurity Student | CTF Player",
        about: "I am a student passionate about Offensive Security, currently focusing on Web Exploitation and Network Pentesting.",
        skills: "Core: Python, Bash, Burp Suite, Nmap, Linux (Kali/Ubuntu), Wireshark.",
        projects: "Check the Operations section below for my latest tools and scripts.",
        contact: "Opening mail client...",
        clear: ""
    };

    // Initial Greeting (fires once boot finishes)
    const greetOnce = () => {
        termOutput.innerHTML += `<div class="cmd-response">Welcome to Anas.SEC Terminal v2.0. Type <span class="cmd-success">'help'</span> to begin.</div>`;
        termOutput.scrollTop = termOutput.scrollHeight;
    };
    if (document.body.classList.contains('booted')) {
        setTimeout(greetOnce, 250);
    } else {
        document.addEventListener('boot:complete', () => setTimeout(greetOnce, 250), { once: true });
    }


    termInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            const input = this.value.toLowerCase().trim();
            const cmdLine = `<div><span class="prompt">guest@anas-sec:~$</span> ${this.value}</div>`;
            termOutput.innerHTML += cmdLine;

            if (input === 'clear') {
                termOutput.innerHTML = "";
            } else if (input === 'contact') {
                termOutput.innerHTML += `<div class="cmd-response">${commands[input]}</div>`;
                setTimeout(() => window.location.href = "#contact", 1000);
            } else if (commands[input]) {
                const responseDiv = document.createElement('div');
                responseDiv.className = "cmd-response";
                termOutput.appendChild(responseDiv);
                // Use innerHTML directly for commands with HTML tags, otherwise generic text
                if(input === 'help') responseDiv.innerHTML = commands[input];
                else typeWriter(commands[input], responseDiv);
            } else {
                termOutput.innerHTML += `<div class="cmd-response cmd-error">Command not found: ${input}</div>`;
            }

            this.value = "";
            termOutput.scrollTop = termOutput.scrollHeight;
        }
    });

    termWindow.addEventListener('click', () => termInput.focus());

    /* --- SCROLL REVEAL & NAVIGATION --- */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // If this section contains skill meters, animate them when it becomes visible
                if (entry.target.querySelector && entry.target.querySelector('.skill-meter')) {
                    armSkillMeters(entry.target);
                }
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

    // Scroll Progress
    window.addEventListener('scroll', () => {
        const scrolled = (document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight)) * 100;
        document.querySelector('.scroll-progress').style.width = scrolled + '%';
        document.querySelector('.scroll-progress').style.background = `linear-gradient(to right, #59F0C2 ${scrolled}%, #7AA2FF)`;
    });

    // Mobile Menu
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        hamburger.innerHTML = mobileMenu.classList.contains('active') ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    });
    
    // Close mobile menu on link click
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        });
    });
});