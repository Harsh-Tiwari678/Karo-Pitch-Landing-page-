/**
 * Karo Pitch
 * App.js - Three.js WebGL Shader Background & GSAP Interactions
 */

document.addEventListener('DOMContentLoaded', () => {

    /* =========================================
       THREE.JS WEBGL BACKGROUND SHADER
       ========================================= */
    const canvas = document.getElementById('webgl-bg');
    if (canvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: false });
        
        const dpr = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(dpr);
        
        let width, height;

        const uniforms = {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2() },
            u_mouse: { value: new THREE.Vector2(0.5, 0.5) }
        };

        const vertexShader = `
            void main() {
                gl_Position = vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            #define PI 3.14159265359

            uniform float u_time;
            uniform vec2 u_resolution;
            uniform vec2 u_mouse;

            float random(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
            }

            // 2D Noise based on Morgan McGuire @morgan3d
            float noise(vec2 st) {
                vec2 i = floor(st);
                vec2 f = fract(st);

                float a = random(i);
                float b = random(i + vec2(1.0, 0.0));
                float c = random(i + vec2(0.0, 1.0));
                float d = random(i + vec2(1.0, 1.0));

                vec2 u = f*f*(3.0-2.0*f);

                return mix(a, b, u.x) +
                       (c - a)* u.y * (1.0 - u.x) +
                       (d - b) * u.x * u.y;
            }

            // Fractal Brownian Motion
            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                for (int i = 0; i < 4; i++) {
                    value += amplitude * noise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }

            void main() {
                // Normalize coordinates
                vec2 pos = gl_FragCoord.xy / u_resolution.xy;
                vec2 uv = pos;
                // Correct aspect ratio
                uv.x *= u_resolution.x / u_resolution.y;

                // Subtle parallax offset based on mouse
                vec2 mouseOffset = (u_mouse - 0.5) * 0.04;
                uv += mouseOffset;

                // Rotate coordinates by 45 degrees for diagonal streaks (top-right to bottom-left)
                float angle = PI * 0.25;
                mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                vec2 rotUV = rot * uv;

                // Time scaled for slow drift
                float t = u_time * 0.015;

               // Stretch noise along X to create bands/streaks, and compress along Y
                vec2 noiseUV = vec2(rotUV.x * 0.4 - t * 2.5, rotUV.y * 1.8 - t);
                float n = fbm(noiseUV);
                // Secondary noise for complex blending
                float n2 = fbm(noiseUV + vec2(10.0, 10.0));

                // Color Palette setup
                // Deep black base: #0B0B0B ~ rgb(11, 11, 11)
                vec3 baseColor = vec3(0.043, 0.043, 0.043); 
                
                // Streaks colors
                vec3 darkBlue = vec3(0.04, 0.09, 0.16);
                vec3 steelGrey = vec3(0.12, 0.13, 0.15);
                vec3 softGold = vec3(0.15, 0.13, 0.08);

                // Blend intensities
                float blueInt = smoothstep(0.35, 0.8, n);
                float greyInt = smoothstep(0.4, 0.9, n) * smoothstep(0.4, 0.6, n2);
                float goldInt = smoothstep(0.65, 1.0, fbm(noiseUV * 1.5 + vec2(t * 1.0))) * 0.6;

                // Composite the layers
                vec3 color = baseColor;
                color = mix(color, darkBlue, blueInt * 0.8);
                color = mix(color, steelGrey, greyInt * 0.5);
                color = mix(color, softGold, goldInt * 0.6);

                // Add a smooth global vignette to darken the edges
                float dist = length(pos - vec2(0.5));
                color *= smoothstep(1.0, 0.3, dist);

                // Add extremely subtle film grain organically based on time
                float grain = (random(uv * u_time) - 0.5) * 0.012;
                color += grain;

                gl_FragColor = vec4(color, 1.0);
            }
        `;

        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms,
            depthWrite: false,
            depthTest: false
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            renderer.setSize(width, height);
            uniforms.u_resolution.value.set(width * dpr, height * dpr);
        };

        window.addEventListener('resize', resize);
        resize();

        // Cursor parallax tracking
        let targetMouse = { x: 0.5, y: 0.5 };
        window.addEventListener('mousemove', (e) => {
            targetMouse.x = e.clientX / window.innerWidth;
            // WebGL coordinates have Y-axis going up (inverse of the DOM)
            targetMouse.y = 1.0 - (e.clientY / window.innerHeight);
        });

        const clock = new THREE.Clock();
        
        const animate = () => {
            requestAnimationFrame(animate);
            // Smoothly interpolate the uniform towards targetMouse for buttery parallax
            uniforms.u_mouse.value.x += (targetMouse.x - uniforms.u_mouse.value.x) * 0.05;
            uniforms.u_mouse.value.y += (targetMouse.y - uniforms.u_mouse.value.y) * 0.05;
            
            uniforms.u_time.value = clock.getElapsedTime();
            renderer.render(scene, camera);
        };
        
        animate();
    }

    /* =========================================
       GSAP INTERACTIVITY & REVEALS
       ========================================= */
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        gsap.registerPlugin(ScrollTrigger);

        // 1. Initial Hero Entry Timeline
        // Remove .reveal-on-load to manage it purely with GSAP
        const heroElementsQuery = '.hero-title, .hero-subtitle, .hero-actions';
        gsap.set(heroElementsQuery, { y: 30, opacity: 0 });

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.to('.hero-title', { y: 0, opacity: 1, duration: 1.0, delay: 0.2 })
          .to('.hero-subtitle', { y: 0, opacity: 1, duration: 0.8 }, "-=0.6")
          .to('.hero-actions', { y: 0, opacity: 1, duration: 0.8 }, "-=0.6");

        // 2. ScrollTrigger Section Revealer
        const revealElements = document.querySelectorAll('.scroll-reveal');
        gsap.set(revealElements, { y: 40, opacity: 0 });

        revealElements.forEach(el => {
            gsap.to(el, {
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                },
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: 'power2.out'
            });
        });
    }

    /* =========================================
       NAVBAR / UI UX
       ========================================= */
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 10) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

});
