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

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) { return a + b * cos(TAU * (c * t + d)); }

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1,0)), f.x),
               mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), f.x), f.y);
}

float fbm(vec2 p, float t) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p + t * 0.05);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

vec3 getStyle(vec2 uv, float t, float styleId, float bass, float treble) {
    float h = hash(styleId);
    float h2 = hash(styleId + 100.0);
    float h3 = hash(styleId + 200.0);

    // Rotation et symétrie - RÉACTIF AU BASS
    float segments = 3.0 + floor(h * 5.0);
    float angle = atan(uv.y, uv.x) + t * (h - 0.5) * 0.3;
    angle += bass * 0.5; // Rotation avec bass
    float radius = length(uv);

    float segAngle = TAU / segments;
    float a = mod(angle, segAngle);
    a = abs(a - segAngle * 0.5);

    vec2 p = vec2(cos(a), sin(a)) * radius;

    // Déformation fluide - AMPLIFIÉE PAR AUDIO
    float deform = 0.5 + bass * 0.8 + treble * 0.3;
    float f1 = fbm(p * 2.0 + t * 0.15, t);
    float f2 = fbm(p * 1.5 - t * 0.1, t);
    p += vec2(f1, f2) * deform;

    // Pulsation avec le bass
    p *= 1.0 + bass * 0.3;

    // Pattern avec variations
    float freq = 2.0 + h * 4.0;
    float val = fbm(p * freq, t * 0.2);

    // Vagues réactives
    val += sin(p.x * (3.0 + h * 5.0) + f1 * 3.0 + t * 0.4 + bass * 2.0) * (0.2 + treble * 0.3);
    val += sin(length(p) * (5.0 + h * 8.0) - t * 0.6 - bass * 3.0) * (0.15 + bass * 0.2);
    val += sin(atan(p.y, p.x) * (2.0 + h2 * 4.0) + t * 0.3) * (0.1 + treble * 0.2);

    // Effet stroboscope léger avec treble
    val += treble * 0.15 * sin(t * 8.0);

    val = smoothstep(0.15, 0.85, val + 0.3);

    // Couleurs uniques par style
    vec3 c1 = vec3(0.5 + h * 0.3, 0.4 + h2 * 0.3, 0.6 + h3 * 0.2);
    vec3 c2 = vec3(0.4 + h3 * 0.3, 0.5 + h * 0.3, 0.4 + h2 * 0.4);
    vec3 c3 = vec3(0.9, 0.7 + h * 0.2, 0.5 + h2 * 0.3);
    vec3 c4 = vec3(0.1 + h3 * 0.2, 0.15 + h * 0.15, 0.35 + h2 * 0.2);

    vec3 col = pal(val + t * 0.05 + bass * 0.3, c1, c2, c3, c4);

    // Saturation boost avec audio
    col = mix(col, col * 1.3, bass * 0.5);

    // Fade aux bords du segment
    col *= smoothstep(segAngle * 0.85, 0.0, a);

    // Vignette
    col *= smoothstep(2.0, 0.4, length(uv));

    // Luminosité globale réactive
    col *= 0.75 + bass * 0.4 + treble * 0.15;

    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
    float t = iTime * uSpeed;

    float bass = uBass * uSensitivity;
    float treble = uTreble * uSensitivity;

    // Timing des styles
    float duration = 12.0;
    float transitionTime = 3.0;
    float cycle = duration + transitionTime;

    float timeInCycle = mod(t, cycle);
    float styleId = floor(mod(t / cycle, 30.0));
    float nextStyleId = mod(styleId + 1.0, 30.0);

    vec3 col;

    if (timeInCycle < duration) {
        // Style actuel
        col = getStyle(uv, t, styleId, bass, treble);
    } else {
        // Transition fluide
        float transProgress = (timeInCycle - duration) / transitionTime;
        transProgress = smoothstep(0.0, 1.0, transProgress);
        transProgress = transProgress * transProgress * (3.0 - 2.0 * transProgress);

        // Zoom out du style actuel
        vec2 uv1 = uv * (1.0 + transProgress * 0.5);
        uv1 *= rot(transProgress * 0.3);
        vec3 col1 = getStyle(uv1, t, styleId, bass, treble);
        col1 *= (1.0 - transProgress * 0.5);

        // Zoom in du prochain style
        vec2 uv2 = uv * (1.5 - transProgress * 0.5);
        uv2 *= rot(-transProgress * 0.2);
        vec3 col2 = getStyle(uv2, t, nextStyleId, bass, treble);
        col2 *= transProgress;

        // Mix avec fondu croisé
        col = mix(col1, col2, smoothstep(0.2, 0.8, transProgress));

        // Flash subtil au milieu de la transition
        float flash = sin(transProgress * PI);
        col += vec3(1.0, 0.9, 0.8) * flash * flash * 0.1;
    }

    col = clamp(col, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
`;

const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
