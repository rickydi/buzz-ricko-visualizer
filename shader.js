const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uSensitivity;
uniform float uSpeed;

#define PI 3.14159265359
#define TAU 6.28318530718

float hash(float n) { return fract(sin(n) * 43758.5453); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = p * 2.0 + 0.5;
        a *= 0.5;
    }
    return v;
}

vec3 pal(float t) {
    return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime * uSpeed;
    float bass = uBass * uSensitivity;
    float treble = uTreble * uSensitivity;

    // Style ID (0-29)
    float cycle = 15.0;
    float styleF = mod(t / cycle, 30.0);
    float styleId = floor(styleF);
    float h = hash(styleId);
    float h2 = hash(styleId + 10.0);
    float h3 = hash(styleId + 20.0);

    // Type de pattern (0-9) basé sur styleId
    float patternType = mod(styleId, 10.0);

    // Modificateurs basés sur styleId pour varier chaque groupe de 10
    float group = floor(styleId / 10.0);
    float symMod = 3.0 + group * 2.0;
    float colorShift = group * 0.33;

    vec2 p = uv;
    float val = 0.0;

    // Symétrie variable
    float angle = atan(p.y, p.x);
    float radius = length(p);
    float sym = floor(symMod + h * 3.0);
    float segAngle = TAU / sym;
    float a = mod(angle, segAngle);
    a = abs(a - segAngle * 0.5);
    vec2 sp = vec2(cos(a), sin(a)) * radius;

    // 10 patterns de base, modifiés par groupe
    if (patternType < 1.0) {
        // Plasma
        val = sin(sp.x * 8.0 + t) + sin(sp.y * 8.0 + t * 1.1);
        val += sin(length(sp) * 10.0 - t * 2.0 - bass * 3.0);
        val = val * 0.2 + 0.5;
    } else if (patternType < 2.0) {
        // Tunnel
        val = angle / PI + 1.0 / (radius + 0.1) - t * 0.5;
        val += bass * 0.5;
    } else if (patternType < 3.0) {
        // Cercles
        val = sin(radius * 15.0 - t * 3.0 - bass * 5.0) * 0.5 + 0.5;
    } else if (patternType < 4.0) {
        // Damier
        vec2 grid = sp * (4.0 + group * 2.0);
        val = mod(floor(grid.x) + floor(grid.y), 2.0);
        val = mix(val, 1.0 - val, sin(t + bass) * 0.5 + 0.5);
    } else if (patternType < 5.0) {
        // Spirale
        val = sin(angle * 5.0 + radius * 10.0 - t * 2.0 - bass * 3.0) * 0.5 + 0.5;
    } else if (patternType < 6.0) {
        // Noise/Feu
        vec2 np = sp * 3.0;
        np.y -= t * (1.0 + group);
        val = fbm(np) * (1.0 + bass * 0.5);
    } else if (patternType < 7.0) {
        // Étoiles/Points
        vec2 gp = fract(sp * (6.0 + group * 2.0)) - 0.5;
        val = 0.03 / (length(gp) + 0.01);
        val *= sin(t * 3.0 + hash21(floor(sp * 6.0)) * TAU) * 0.5 + 0.5;
        val = min(val, 1.0) * (1.0 + bass * 0.3);
    } else if (patternType < 8.0) {
        // Vagues
        val = sin(sp.x * 6.0 + fbm(sp * 2.0) * 3.0 + t) * 0.3;
        val += sin(sp.y * 5.0 + t * 0.8 + bass * 2.0) * 0.3;
        val = val + 0.5;
    } else if (patternType < 9.0) {
        // Hexagones/Cellules
        vec2 hp = sp * (4.0 + group);
        vec2 hf = fract(hp) - 0.5;
        val = smoothstep(0.4, 0.35, length(hf));
        val *= sin(t + length(uv) * 5.0 - bass * 3.0) * 0.5 + 0.5;
    } else {
        // Fractal simple
        vec2 z = sp * 2.0;
        float v = 0.0;
        for (int i = 0; i < 6; i++) {
            z = abs(z) / dot(z, z) - vec2(0.7 + sin(t * 0.2) * 0.1, 0.5);
            v += length(z);
        }
        val = v * 0.08;
    }

    // Couleur basée sur le style
    vec3 col = pal(val + colorShift + h * 0.5 + t * 0.03);

    // Teinte unique par style
    col *= vec3(0.8 + h * 0.4, 0.8 + h2 * 0.4, 0.8 + h3 * 0.4);

    // Réactivité audio
    col *= 0.7 + bass * 0.4 + treble * 0.2;

    // Saturation boost avec bass
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, 1.0 + bass * 0.5);

    // Vignette
    col *= smoothstep(1.8, 0.5, length(uv));

    // Transition entre styles
    float transStart = cycle - 2.0;
    float inCycle = mod(t, cycle);
    if (inCycle > transStart) {
        float tr = (inCycle - transStart) / 2.0;
        col *= 1.0 - tr * 0.3;
        col += pal(t * 0.1) * tr * 0.2;
    }

    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
